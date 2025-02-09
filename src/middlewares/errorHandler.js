import logger from '../utils/logger.js';

/**
 * Express error handling middleware.
 *
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  logger.error(err);

  let errorResponse, statusCode;
  if (err.isJoi) {
    statusCode = 400;
    const errors = {};
    err.details.forEach((detail) => {
      errors[detail.path.join('.')] = detail.message;
    });
    errorResponse = { message: 'Validation Error', validationErrors: errors };
  } else if (err.name === 'ValidationError') {
    const errors = {};
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
    statusCode = 400;
    errorResponse = { message: 'Validation Error', validationErrors: errors };
  } else if (err.code === 11000) {
    statusCode = 409;
    errorResponse = {
      message: 'Duplicate key error',
      duplicateFields: err.keyValue,
    };
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorResponse = { message: `Invalid ${err.path}: ${err.value}` };
  } else {
    statusCode = err.statusCode || 500;
    errorResponse = { message: err.message || 'Internal Server Error' };
  }

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json({ error: errorResponse });
}
