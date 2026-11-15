const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Student = require('../models/studentModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  getRefreshTokenCookieOptions,
  getOAuthCookieOptions,
  getCookieClearOptions,
} = require('../utils/cookieOptions');

// ── In-Memory One-Time Authorization Code Handoff Store ───────
// Stores short-lived (60 sec) single-use codes to prevent leaking JWTs in URLs
const handoffStore = new Map();

// Periodic cleanup of expired handoff codes every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of handoffStore.entries()) {
    if (data.expiresAt <= now) {
      handoffStore.delete(code);
    }
  }
}, 60000);

// Token helpers (aligned with studentController)
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
 * Initiates the Google OAuth 2.1 authorization code flow with:
 *  - Cryptographic state parameter (anti-CSRF)
 *  - PKCE (Proof Key for Code Exchange via S256 code challenge)
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

    // 1. Generate cryptographic anti-CSRF state
    const state = crypto.randomBytes(32).toString('hex');

    // 2. Generate PKCE code verifier and code challenge (S256)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Store state and code verifier in secure, short-lived HttpOnly cookies
    const oAuthCookieOpts = getOAuthCookieOptions();
    res.cookie('oauth_state', state, oAuthCookieOpts);
    res.cookie('oauth_pkce_verifier', codeVerifier, oAuthCookieOpts);

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('openid email profile')}&` +
      `state=${encodeURIComponent(state)}&` +
      `code_challenge=${encodeURIComponent(codeChallenge)}&` +
      `code_challenge_method=S256&` +
      `access_type=offline&` +
      `prompt=consent`;

    res.redirect(googleAuthUrl);
  })
);

/**
 * GET & POST /api/auth/google/callback
 * Handles Google OAuth redirect callback with:
 *  - State verification
 *  - PKCE code_verifier token exchange
 *  - Secure one-time code handoff (no raw JWT in URL)
 */
const handleGoogleCallback = asyncHandler(async (req, res) => {
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

  // 1. State validation for authorization code redirect flow
  if (code && !credential) {
    const storedState = req.cookies?.oauth_state;
    const returnedState = req.query.state;

    // Clear state cookie immediately
    res.clearCookie('oauth_state', getCookieClearOptions());

    if (!returnedState || !storedState || returnedState !== storedState) {
      res.clearCookie('oauth_pkce_verifier', getCookieClearOptions());
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent('OAuth state verification failed. Possible CSRF attempt.')}`
      );
    }
  }

  let googleUser;

  // Case 1: GIS POSTed an ID token credential directly
  if (credential) {
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
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
  // Case 2: Server authorization code exchange with PKCE
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

    // Retrieve PKCE code verifier from cookie and clean it up
    const codeVerifier = req.cookies?.oauth_pkce_verifier;
    res.clearCookie('oauth_pkce_verifier', getCookieClearOptions());

    const tokenParams = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };

    // Attach PKCE verifier if available
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
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

    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
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

  // Set secure cross-site HttpOnly cookie for Netlify/Render
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  // 3. SECURE TOKEN HANDOFF:
  // Instead of passing the raw access token in the URL query string,
  // generate a single-use, 60-second handoff code.
  const handoffCode = crypto.randomBytes(32).toString('hex');
  handoffStore.set(handoffCode, {
    userId: user._id,
    accessToken,
    refreshToken,
    expiresAt: Date.now() + 60 * 1000, // 60 seconds TTL
  });

  // Redirect to frontend with the single-use handoff code
  return res.redirect(`${frontendUrl}/?code=${encodeURIComponent(handoffCode)}`);
});

router.get('/google/callback', handleGoogleCallback);
router.post('/google/callback', handleGoogleCallback);

/**
 * POST /api/auth/exchange
 * Exchanges a single-use handoff code for an access token.
 * This ensures the JWT access token is transmitted securely in an HTTP POST body,
 * never exposed in URL query parameters, browser history, or server access logs.
 */
router.post(
  '/exchange',
  asyncHandler(async (req, res) => {
    const { code } = req.body;

    if (!code) {
      res.status(400);
      throw new Error('Authorization handoff code is required');
    }

    const handoffData = handoffStore.get(code);

    if (!handoffData) {
      res.status(401);
      throw new Error('Invalid or already used authorization handoff code');
    }

    // Immediately remove from store to enforce single-use
    handoffStore.delete(code);

    if (Date.now() > handoffData.expiresAt) {
      res.status(401);
      throw new Error('Authorization handoff code has expired');
    }

    // Ensure refresh cookie is active
    res.cookie('refreshToken', handoffData.refreshToken, getRefreshTokenCookieOptions());

    res.status(200).json({
      status: 'success',
      token: handoffData.accessToken,
    });
  })
);

module.exports = router;
