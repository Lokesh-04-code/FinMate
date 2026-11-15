const { constants } = require('../constants');

/**
 * Global Express error handler.
 *
 * FIX: Stack traces are hidden in production (leaking internals is a security risk).
 * FIX: Added missing `break` after FORBIDDEN case (was falling through to SERVER_ERROR).
 * FIX: Error responses now always include the HTTP status code.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const isDev = process.env.NODE_ENV !== 'production';

  const body = {
    statusCode,
    message: err.message,
    // Only expose stack trace in development
    ...(isDev && { stackTrace: err.stack }),
  };

  switch (statusCode) {
    case constants.VALIDATION_ERROR:
      return res.status(statusCode).json({ ...body, title: 'Validation Failed' });

    case constants.UNAUTHORIZED:
      return res.status(statusCode).json({ ...body, title: 'Unauthorized' });

    case constants.FORBIDDEN:
      return res.status(statusCode).json({ ...body, title: 'Forbidden' });
    // FIX: was missing break — fell through to SERVER_ERROR

    case constants.NOT_FOUND:
      return res.status(statusCode).json({ ...body, title: 'Not Found' });

    case constants.SERVER_ERROR:
    default:
      return res.status(statusCode).json({ ...body, title: 'Server Error' });
  }
};

module.exports = errorHandler;
