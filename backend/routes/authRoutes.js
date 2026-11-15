const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Student = require('../models/studentModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Token helpers (aligned with studentController)
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

const saveRefreshToken = async (user, rawToken) => {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Student.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } },
  });
  await Student.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: { tokenHash, expiresAt } },
  });
};

/**
 * GET /api/auth/google
 * Initiates the Google OAuth 2.0 redirect flow.
 */
router.get(
  '/google',
  asyncHandler(async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.status(500);
      throw new Error('GOOGLE_CLIENT_ID is not configured on server');
    }

    const host = req.get('host') || 'localhost:5000';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = req.protocol === 'https' || !isLocal ? 'https' : 'http';
    const defaultCallback = `${protocol}://${host}/api/auth/google/callback`;
    const redirectUri = isLocal
      ? defaultCallback
      : (process.env.GOOGLE_CALLBACK_URL || defaultCallback);

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('openid email profile')}&` +
      `access_type=offline&` +
      `prompt=consent`;

    res.redirect(googleAuthUrl);
  })
);

/**
 * GET & POST /api/auth/google/callback
 * Handles Google OAuth redirect callback.
 */
const handleGoogleCallback = asyncHandler(async (req, res) => {
  // Support both GET (?code=...) and POST (body.credential or body.code from GIS)
  const code = req.query.code || req.body?.code;
  const credential = req.body?.credential;
  const error = req.query.error;

  const host = req.get('host') || 'localhost:5000';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  const frontendUrl =
    process.env.FRONTEND_URL ||
    (isLocal
      ? 'http://localhost:5173'
      : (process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',')[0].trim()
          : 'https://backendfinmate.onrender.com'));

  if (error) {
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error)}`);
  }

  let googleUser;

  // Case 1: GIS POSTed an ID token credential directly
  if (credential) {
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    if (!verifyRes.ok) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('Invalid Google credential')}`
      );
    }
    const tokenInfo = await verifyRes.json();
    googleUser = {
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email.split('@')[0],
      sub: tokenInfo.sub,
    };
  }
  // Case 2: Server authorization code exchange
  else if (code) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const protocol = req.protocol === 'https' || !isLocal ? 'https' : 'http';
    const defaultCallback = `${protocol}://${host}/api/auth/google/callback`;
    const redirectUri = isLocal
      ? defaultCallback
      : (process.env.GOOGLE_CALLBACK_URL || defaultCallback);

    if (!clientId || !clientSecret) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('Server missing Google OAuth credentials')}`
      );
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Google token exchange error:', errBody);
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('Failed to exchange Google code')}`
      );
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;

    // Decode ID token via tokeninfo
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    if (!verifyRes.ok) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('Failed to verify Google identity')}`
      );
    }

    const tokenInfo = await verifyRes.json();
    googleUser = {
      email: tokenInfo.email,
      name: tokenInfo.name || tokenInfo.email.split('@')[0],
      sub: tokenInfo.sub,
    };
  } else {
    return res.redirect(
      `${frontendUrl}/login?error=${encodeURIComponent('No authorization code received')}`
    );
  }

  // Find or create student in database
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

  // Issue FinMate JWT tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await saveRefreshToken(user, refreshToken);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Redirect to frontend with access token in query param
  return res.redirect(`${frontendUrl}/?token=${encodeURIComponent(accessToken)}`);
});

router.get('/google/callback', handleGoogleCallback);
router.post('/google/callback', handleGoogleCallback);

module.exports = router;
