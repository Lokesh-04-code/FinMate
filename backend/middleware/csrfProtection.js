/**
 * CSRF & Origin Validation Middleware
 *
 * Protects cookie-authenticated state-changing endpoints against CSRF attacks.
 * Since SameSite=None is required for cross-domain Netlify -> Render cookies,
 * Origin/Referer verification ensures that state-changing requests (POST, PUT, DELETE)
 * only originate from authorized frontend domains.
 */

const getAllowedOrigins = () => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  }
  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://backendfinmate.onrender.com',
    'https://studysave.netlify.app',
  ];
};

const verifyOrigin = (req, res, next) => {
  // Safe HTTP methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Non-browser clients (like curl, automated tests, Postman) don't have Origin/Referer
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);

  // If request includes Bearer token header, it was sent via fetch/XHR with explicit JS authorization,
  // which browsers do NOT automatically attach on cross-site form/img/link attacks.
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // For cookie-reliant requests, origin must match allowed list
  if (origin) {
    const allowed = getAllowedOrigins();
    if (!allowed.includes(origin)) {
      res.status(403);
      return next(new Error(`CSRF Protection: Origin '${origin}' is not authorized.`));
    }
  }

  next();
};

module.exports = { verifyOrigin, getAllowedOrigins };
