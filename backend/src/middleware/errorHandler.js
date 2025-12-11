const logger = require('../utils/logger');

/**
 * Enhanced error handler middleware
 * Prevents information leakage while providing useful feedback
 */
const errorHandler = (err, req, res, next) => {
  // Log full error details for debugging (server-side only)
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });

  // Prisma validation error
  if (err.code === 'P2002') {
    const target = err.meta?.target || ['field'];
    return res.status(400).json({
      success: false,
      message: `${target[0]} already exists`
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found'
    });
  }

  // Prisma foreign key constraint
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference to related record'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired'
    });
  }

  // Validation errors (express-validator)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors
    });
  }

  // Default error - prevent stack trace leakage in production
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
};

module.exports = errorHandler;
