// utils/errors.js

// Base error class
export class BaseError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request
export class BadRequestError extends BaseError {
  constructor(message = 'Bad Request', details = {}) {
    super(message, 400, details);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized', details = {}) {
    super(message, 401, details);
  }
}

// 403 Forbidden
export class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden', details = {}) {
    super(message, 403, details);
  }
}

// 404 Not Found
export class NotFoundError extends BaseError {
  constructor(message = 'Not Found', details = {}) {
    super(message, 404, details);
  }
}

// 409 Conflict
export class ConflictError extends BaseError {
  constructor(message = 'Conflict', details = {}) {
    super(message, 409, details);
  }
}

// 500 Internal Server Error
export class InternalServerError extends BaseError {
  constructor(message = 'Internal Server Error', details = {}) {
    super(message, 500, details);
  }
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(Object.keys(err.details).length > 0 && { details: err.details })
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Default to 500 server error
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
  });
};

// Export all error classes
export default {
  BaseError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  errorHandler
};