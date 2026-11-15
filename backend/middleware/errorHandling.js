const { constants } = require('../constants');

/**
 * Global Express Error Handler
 *
 * Catches Mongoose CastError (invalid ObjectId), JWT errors,
 * validation errors, and operational exceptions.
 * Stack traces are omitted in production to prevent information disclosure.
 */
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Mongoose CastError handling (invalid ObjectId format)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      statusCode: 400,
      title: 'Validation Failed',
      message: `Invalid identifier format: ${err.value}`,
      ...(isDev && { stackTrace: err.stack }),
    });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  const body = {
    statusCode,
    message: err.message,
    ...(isDev && { stackTrace: err.stack }),
  };

  switch (statusCode) {
    case constants.VALIDATION_ERROR:
      return res.status(statusCode).json({ ...body, title: 'Validation Failed' });

    case constants.UNAUTHORIZED:
      return res.status(statusCode).json({ ...body, title: 'Unauthorized' });

    case constants.FORBIDDEN:
      return res.status(statusCode).json({ ...body, title: 'Forbidden' });

    case constants.NOT_FOUND:
      return res.status(statusCode).json({ ...body, title: 'Not Found' });

    case constants.SERVER_ERROR:
    default:
      return res.status(statusCode).json({ ...body, title: 'Server Error' });
  }
};

module.exports = errorHandler;
