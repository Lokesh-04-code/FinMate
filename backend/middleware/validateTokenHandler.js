const jwt = require('jsonwebtoken');

/**
 * Hardened JWT Authentication Middleware
 *
 * Security enhancements:
 *  1. Strict algorithm pinning: forces HS256 to prevent algorithm confusion attacks (e.g. 'none').
 *  2. Required claims validation: ensures user.id or sub is present and non-empty.
 *  3. Explicit Bearer format checks.
 *  4. Clean error handling with accurate HTTP 401 status codes.
 */
const validateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401);
      throw new Error('No token provided — authorization required');
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      res.status(401);
      throw new Error('Token missing after Bearer prefix');
    }

    // Explicitly pin algorithm to HS256
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256'],
    });

    const userId = decoded.user?.id || decoded.sub;
    if (!userId || typeof userId !== 'string' && typeof userId !== 'object') {
      res.status(401);
      throw new Error('Invalid token payload: missing subject or user identifier');
    }

    // Attach normalized user payload to request
    req.user = {
      id: userId.toString(),
      username: decoded.user?.username || '',
      email: decoded.user?.email || '',
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      res.status(401);
      return next(new Error('Token has expired — please log in again'));
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      res.status(401);
      return next(new Error('Invalid token — authorization denied'));
    }
    if (!res.statusCode || res.statusCode === 200) {
      res.status(401);
    }
    return next(err);
  }
};

module.exports = validateToken;
