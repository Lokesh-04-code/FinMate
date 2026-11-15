const asyncHandler = require('express-async-handler');
const Student = require('../models/studentModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  getRefreshTokenCookieOptions,
  getCookieClearOptions,
} = require('../utils/cookieOptions');

// ─────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────

/**
 * Generate a short-lived access token (15 min).
 * Payload includes unique jti (JWT ID) to guarantee cryptographic uniqueness
 * even when generated within the same second, and minimal user claims.
 * Shape is compatible with OAuth 2.1 / OIDC claims.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      user: { id: user._id.toString(), username: user.username, email: user.email },
      jti: crypto.randomUUID(),
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m', algorithm: 'HS256' }
  );
};

/**
 * Generate a long-lived refresh token (7 days).
 * Uses a separate secret and unique jti so rotated tokens are distinct strings.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      jti: crypto.randomUUID(),
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
};

/** Persist a hashed refresh token to the user document (server-side session). */
const saveRefreshToken = async (user, rawToken) => {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // First prune expired tokens
  await Student.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } },
  });
  // Then push the new token
  await Student.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: { tokenHash, expiresAt } },
  });
};

// ─────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────

/**
 * POST /api/students/register
 */
const registerStudent = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    throw new Error('Please fill all the fields');
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400);
    throw new Error('Please provide a valid email address');
  }

  // Minimum password length
  if (password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters long');
  }

  const studentAvailable = await Student.findOne({ email });
  if (studentAvailable) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const hashPassword = await bcrypt.hash(password, 12);
  const student = await Student.create({ username, email, password: hashPassword });

  if (student) {
    res.status(201).json({ _id: student._id, email: student.email });
  } else {
    res.status(400);
    throw new Error('Student data is not valid');
  }
});

/**
 * POST /api/students/login
 */
const loginStudent = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide both email and password');
  }

  const user = await Student.findOne({ email });
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await saveRefreshToken(user, refreshToken);

  // Set secure HttpOnly cookie configured for Netlify/Render
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  res.status(200).json({
    status: 'success',
    token: accessToken,
    refreshToken, // Preserved for compatibility with mobile/non-cookie clients and test assertions
  });
});

/**
 * POST /api/students/refresh
 * Issues a new access token when the old one expires.
 * Implements refresh token rotation: old token is invalidated, new one issued.
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Read from HttpOnly cookie first, with fallback to request body for non-browser clients
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!rawToken) {
    res.status(401);
    throw new Error('Refresh token missing');
  }

  let decoded;
  try {
    decoded = jwt.verify(rawToken, process.env.REFRESH_TOKEN_SECRET, {
      algorithms: ['HS256'],
    });
  } catch (err) {
    res.status(401);
    throw new Error('Refresh token is invalid or expired — please log in again');
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await Student.findById(decoded.sub);

  if (!user) {
    res.status(401);
    throw new Error('User not found');
  }

  // Check the token hash exists in the DB and is not expired
  const storedToken = user.refreshTokens.find(
    (t) => t.tokenHash === tokenHash && t.expiresAt > new Date()
  );

  if (!storedToken) {
    // Possible token reuse attack — invalidate ALL sessions for this user
    await Student.findByIdAndUpdate(user._id, { $set: { refreshTokens: [] } });
    res.status(401);
    throw new Error('Refresh token reuse detected — all sessions invalidated');
  }

  // Rotation: remove the used token, issue a new one
  await Student.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: { tokenHash } },
  });

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  await saveRefreshToken(user, newRefreshToken);

  // Set updated cookie
  res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());

  res.status(200).json({
    status: 'success',
    token: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

/**
 * POST /api/students/logout
 * Server-side logout — invalidates refresh token in DB and clears cookie.
 */
const logoutStudent = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (req.user?.id) {
    if (req.body?.allDevices) {
      // Invalidate all active sessions for this account
      await Student.findByIdAndUpdate(req.user.id, {
        $set: { refreshTokens: [] },
      });
    } else if (rawToken) {
      // Invalidate current session
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await Student.findByIdAndUpdate(req.user.id, {
        $pull: { refreshTokens: { tokenHash } },
      });
    }
  }

  // Clear cookie using identical options (secure, sameSite, path)
  res.clearCookie('refreshToken', getCookieClearOptions());
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});

/**
 * GET /api/students/current
 * Strips password and refreshTokens.
 */
const currentStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user.id).select('-password -refreshTokens');
  if (!student) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json(student);
});

/**
 * PUT /api/students/update
 */
const categoryUpdate = asyncHandler(async (req, res) => {
  const budget = req.body.budget;
  const updatedCategories = req.body.categories;

  if (!updatedCategories || typeof updatedCategories !== 'object') {
    res.status(400);
    throw new Error('Invalid or missing category data');
  }

  const updateFields = {};
  for (const key in updatedCategories) {
    if (typeof updatedCategories[key] === 'number') {
      updateFields[`categories.${key}`] = updatedCategories[key];
    }
  }

  const student = await Student.findByIdAndUpdate(
    req.user.id,
    { $set: { budget, ...updateFields } },
    { new: true, runValidators: true }
  ).select('-password -refreshTokens');

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  res.status(200).json({
    status: 'success',
    budget: student.budget,
    categories: student.categories,
  });
});

/**
 * POST /api/students/oauth/google
 * Direct GIS ID Token authentication endpoint.
 */
const googleOAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400);
    throw new Error('Google credential token is missing');
  }

  let googleUser;

  try {
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!verifyRes.ok) {
      res.status(401);
      throw new Error('Invalid Google credential token');
    }
    const tokenInfo = await verifyRes.json();

    if (process.env.GOOGLE_CLIENT_ID && tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
      res.status(401);
      throw new Error('Google token audience mismatch');
    }

    googleUser = {
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email.split('@')[0],
      sub: tokenInfo.sub,
    };
  } catch (err) {
    if (!res.statusCode || res.statusCode === 200) res.status(401);
    throw new Error(err.message || 'Failed to verify Google token');
  }

  if (!googleUser || !googleUser.email) {
    res.status(400);
    throw new Error('Could not retrieve email from Google token');
  }

  let user = await Student.findOne({ email: googleUser.email });

  if (!user) {
    user = await Student.create({
      username: googleUser.name,
      email: googleUser.email,
      authProvider: 'google',
      googleId: googleUser.sub,
    });
  } else if (!user.googleId) {
    user.googleId = googleUser.sub;
    await user.save();
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await saveRefreshToken(user, refreshToken);

  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  res.status(200).json({
    status: 'success',
    token: accessToken,
    refreshToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
});

module.exports = {
  registerStudent,
  loginStudent,
  googleOAuth,
  refreshAccessToken,
  logoutStudent,
  currentStudent,
  categoryUpdate,
};
