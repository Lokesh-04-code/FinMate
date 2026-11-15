const jwt = require('jsonwebtoken');

/**
 * Auth middleware.
 *
 * FIX #3: Rewrote from callback-style jwt.verify to promisified form so errors
 *         propagate correctly through Express error handling.
 * FIX #4: Moved the missing-token check BEFORE the split, so a bare "Bearer"
 *         header (no actual token) returns 401 instead of hanging.
 * FIX #5: Does NOT use asyncHandler — the function is fully synchronous once
 *         jwt.verify runs synchronously with the promise wrapper.
 *
 * Token payload shape expected: { user: { id, username, email } }
 * This shape is preserved for future OAuth 2.1 / OIDC compatibility.
 */
const validateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401);
      throw new Error('No token provided — authorization required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401);
      throw new Error('Token missing after Bearer prefix');
    }

    // jwt.verify throws synchronously on invalid/expired tokens
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded.user; // { id, username, email }
    next();
  } catch (err) {
    // Distinguish between JWT-specific errors and other errors
    if (err.name === 'TokenExpiredError') {
      res.status(401);
      return next(new Error('Token has expired — please log in again'));
    }
    if (err.name === 'JsonWebTokenError') {
      res.status(401);
      return next(new Error('Invalid token — authorization denied'));
    }
    // res.statusCode was already set above for missing-token cases
    if (!res.statusCode || res.statusCode === 200) res.status(401);
    return next(err);
  }
};

module.exports = validateToken;
