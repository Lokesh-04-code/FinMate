const asyncHandler = require('express-async-handler');
const Student = require('../models/studentModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ─────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────

/**
 * Generate a short-lived access token (15 min).
 * Payload includes unique jti (JWT ID) to guarantee cryptographic uniqueness
 * even when generated within the same second, and minimal user claims.
 * Shape is compatible with future OAuth 2.1 / OIDC claims.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      user: { id: user._id, username: user.username, email: user.email },
      jti: crypto.randomUUID(),
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
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
    { expiresIn: '7d' }
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
 * FIX: Removed console.log(username, email, password) — was leaking credentials.
 * FIX: Added basic email format and password length validation.
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

  const hashPassword = await bcrypt.hash(password, 12); // FIX: use 12 rounds (was 10)
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
 * FIX: Changed && to || in guard (was only erroring when BOTH fields missing).
 * FIX: Removed console.log(email, password) — was leaking credentials.
 * FIX: Now returns both access token (15 min) and a refresh token (7 days).
 * Refresh token is set as an HttpOnly cookie AND returned in body for flexibility.
 */
const loginStudent = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // FIX: was `if (!email && !password)` — only caught when BOTH were missing
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide both email and password');
  }

  const user = await Student.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await saveRefreshToken(user, refreshToken);

  // HttpOnly cookie for refresh token (not accessible by JS → XSS-resistant)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  res.status(200).json({
    status: 'success',
    token: accessToken,          // short-lived, stored in memory on client
    refreshToken,                // also returned in body for clients that can't use cookies
  });
});

/**
 * POST /api/students/refresh
 * Issues a new access token when the old one expires.
 * Implements refresh token rotation: old token is invalidated, new one issued.
 * FIX: Proper server-side session invalidation via stored token hashes.
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Accept from cookie (preferred) or body fallback
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!rawToken) {
    res.status(401);
    throw new Error('Refresh token missing');
  }

  let decoded;
  try {
    decoded = jwt.verify(rawToken, process.env.REFRESH_TOKEN_SECRET);
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

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({ status: 'success', token: newAccessToken, refreshToken: newRefreshToken });
});

/**
 * POST /api/students/logout
 * FIX: Proper server-side logout — invalidates the specific refresh token.
 * Without this, logging out was purely cosmetic (token lived on for 2h).
 */
const logoutStudent = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    // Remove just this token so other devices stay logged in
    if (req.user?.id) {
      await Student.findByIdAndUpdate(req.user.id, {
        $pull: { refreshTokens: { tokenHash } },
      });
    }
  }

  res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});

/**
 * GET /api/students/current
 * FIX: Password hash is stripped from the response.
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
 * FIX: Uses req.user.id (from JWT) instead of email lookup for consistency.
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
    updateFields[`categories.${key}`] = updatedCategories[key];
  }

  const student = await Student.findByIdAndUpdate(
    req.user.id,
    { $set: { budget, ...updateFields } },
    { new: true }
  ).select('-password -refreshTokens');

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  res.status(200).json({ status: 'success', budget: student.budget, categories: student.categories });
});

/**
 * POST /api/students/oauth/google
 * OAuth 2.1 / OIDC Google Sign-In endpoint.
 * Accepts Google ID token (credential) from frontend, validates it,
 * creates or logs in the user, and issues secure access + refresh tokens.
 */
const googleOAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400);
    throw new Error('Google credential token is missing');
  }

  let googleUser;

  try {
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
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

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

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
