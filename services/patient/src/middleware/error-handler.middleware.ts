// HMS Patient Service Error Handler Middleware
// Centralized error handling for API endpoints

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@hms/shared';

// =============================================================================
// ERROR TYPES
// =============================================================================

export class APIError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, true, 'NOT_FOUND', details);
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, true, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, true, 'FORBIDDEN', details);
  }
}

export class ConflictError extends APIError {
  constructor(message: string = 'Conflict', details?: any) {
    super(message, 409, true, 'CONFLICT', details);
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 429, true, 'RATE_LIMIT', details);
  }
}

export class DatabaseError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 500, false, 'DATABASE_ERROR', details);
  }
}

export class ExternalServiceError extends APIError {
  constructor(message: string, service: string, details?: any) {
    super(message, 502, false, 'EXTERNAL_SERVICE_ERROR', { service, ...details });
  }
}

export class ABDMError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 502, false, 'ABDM_ERROR', details);
  }
}

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

export const errorHandlerMiddleware = (logger: Logger) => {
  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req as any).requestId;

    // Prepare error response
    let statusCode = 500;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let details: any = undefined;
    let shouldLogError = true;

    // Handle different types of errors
    if (error instanceof APIError) {
      statusCode = error.statusCode;
      message = error.message;
      errorCode = error.code || 'API_ERROR';
      details = error.details;
      shouldLogError = !error.isOperational || statusCode >= 500;
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      errorCode = 'VALIDATION_ERROR';
      shouldLogError = false;
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid data format';
      errorCode = 'INVALID_FORMAT';
      shouldLogError = false;
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid authentication token';
      errorCode = 'INVALID_TOKEN';
      shouldLogError = false;
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Authentication token expired';
      errorCode = 'TOKEN_EXPIRED';
      shouldLogError = false;
    } else if (error.name === 'MulterError') {
      if (error.message.includes('File too large')) {
        statusCode = 413;
        message = 'File too large';
        errorCode = 'FILE_TOO_LARGE';
      } else if (error.message.includes('Unexpected field')) {
        statusCode = 400;
        message = 'Unexpected field in file upload';
        errorCode = 'UNEXPECTED_FIELD';
      } else {
        statusCode = 400;
        message = 'File upload error';
        errorCode = 'FILE_UPLOAD_ERROR';
      }
      shouldLogError = false;
    }

    // Build error response object
    const errorResponse = {
      success: false,
      message,
      errors: formatErrors(error),
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: details || formatErrorDetails(error)
      }),
      ...(requestId && { requestId })
    };

    // Log error if needed
    if (shouldLogError) {
      const logData = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        ip: getClientIP(req),
        userAgent: req.get('User-Agent'),
        facilityId: req.get('X-Facility-ID'),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: errorCode,
          statusCode
        },
        details,
        timestamp: new Date().toISOString()
      };

      if (statusCode >= 500) {
        logger.error('Server error occurred', logData);
      } else if (statusCode >= 400) {
        logger.warn('Client error occurred', logData);
      }
    }

    // Add security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });

    // Send error response
    res.status(statusCode).json(errorResponse);
  };
};

// =============================================================================
// 404 HANDLER
// =============================================================================

export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse = {
    success: false,
    message: 'Endpoint not found',
    errors: [`The requested endpoint ${req.method} ${req.originalUrl} was not found`],
    availableEndpoints: {
      health: '/health',
      api: '/api/v1',
      patients: '/api/v1/patients',
      abdm: '/api/v1/abdm',
      docs: '/api/v1/docs'
    }
  };

  res.status(404).json(errorResponse);
};

// =============================================================================
// ASYNC ERROR WRAPPER
// =============================================================================

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// =============================================================================
// ERROR UTILITY FUNCTIONS
// =============================================================================

function formatErrors(error: Error): string[] {
  if (error instanceof APIError && error.details && Array.isArray(error.details.errors)) {
    return error.details.errors.map((err: any) => err.message || err);
  }

  if (error.message) {
    return [error.message];
  }

  return ['An unknown error occurred'];
}

function formatErrorDetails(error: Error): any {
  if (error instanceof APIError && error.details) {
    return error.details;
  }

  return {
    name: error.name,
    message: error.message
  };
}

function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection as any)?.socket?.remoteAddress ||
    'unknown'
  );
}

// =============================================================================
// SPECIALIZED ERROR HANDLERS
// =============================================================================

export const databaseErrorHandler = (error: any): APIError => {
  // PostgreSQL specific error codes
  switch (error.code) {
    case '23505': // Unique violation
      return new ConflictError('Data already exists', {
        field: error.detail,
        constraint: error.constraint
      });

    case '23503': // Foreign key violation
      return new ValidationError('Referenced data does not exist', {
        table: error.table,
        constraint: error.constraint
      });

    case '23502': // Not null violation
      return new ValidationError('Required field is missing', {
        column: error.column
      });

    case '23514': // Check violation
      return new ValidationError('Data validation failed', {
        constraint: error.constraint
      });

    case '42P01': // Undefined table
      return new DatabaseError('Database table not found', {
        table: error.table
      });

    case '42703': // Undefined column
      return new DatabaseError('Database column not found', {
        column: error.column
      });

    case '28P01': // Invalid password
      return new DatabaseError('Database authentication failed');

    case 'ECONNREFUSED':
      return new DatabaseError('Database connection refused');

    case 'ETIMEDOUT':
      return new DatabaseError('Database connection timeout');

    default:
      return new DatabaseError('Database operation failed', {
        code: error.code,
        message: error.message
      });
  }
};

export const abdmErrorHandler = (error: any): ABDMError => {
  // ABDM specific error handling
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return new ABDMError('ABDM request validation failed', {
          status,
          data: data?.message || data?.error
        });

      case 401:
        return new ABDMError('ABDM authentication failed', {
          status,
          data: data?.message || data?.error
        });

      case 403:
        return new ABDMError('ABDM access forbidden', {
          status,
          data: data?.message || data?.error
        });

      case 404:
        return new ABDMError('ABDM resource not found', {
          status,
          data: data?.message || data?.error
        });

      case 429:
        return new ABDMError('ABDM rate limit exceeded', {
          status,
          data: data?.message || data?.error
        });

      case 500:
        return new ABDMError('ABDM server error', {
          status,
          data: data?.message || data?.error
        });

      default:
        return new ABDMError('ABDM service error', {
          status,
          data: data?.message || data?.error || 'Unknown ABDM error'
        });
    }
  }

  return new ABDMError('ABDM connection error', {
    message: error.message,
    code: error.code
  });
};

export const redisErrorHandler = (error: any): APIError => {
  // Redis specific error handling
  if (error.code === 'ECONNREFUSED') {
    return new APIError('Redis connection refused', 503, false, 'REDIS_UNAVAILABLE');
  }

  if (error.code === 'ETIMEDOUT') {
    return new APIError('Redis connection timeout', 503, false, 'REDIS_TIMEOUT');
  }

  return new APIError('Redis operation failed', 500, false, 'REDIS_ERROR', {
    code: error.code,
    message: error.message
  });
};

// =============================================================================
// ERROR RECOVERY MIDDLEWARE
// =============================================================================

export const recoveryMiddleware = () => {
  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // Attempt to recover from certain types of errors

    // Recovery from database connection issues
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      // You could implement retry logic here or fallback behavior
      // For now, just log and continue to error handler
    }

    // Recovery from temporary service unavailability
    if (error.message.includes('service unavailable') || error.message.includes('temporarily')) {
      // You could implement circuit breaker pattern here
      // For now, just log and continue to error handler
    }

    // Pass to main error handler
    next(error);
  };
};

// =============================================================================
// METRICS COLLECTION FOR ERRORS
// =============================================================================

export const errorMetricsMiddleware = (logger: Logger) => {
  const errorCounts = new Map<string, number>();
  const errorCountsByStatus = new Map<number, number>();

  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const statusCode = error instanceof APIError ? error.statusCode : 500;
    const errorCode = error instanceof APIError ? error.code || error.name : error.name;

    // Increment error counters
    errorCounts.set(errorCode, (errorCounts.get(errorCode) || 0) + 1);
    errorCountsByStatus.set(statusCode, (errorCountsByStatus.get(statusCode) || 0) + 1);

    // Log metrics periodically
    const totalErrors = Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0);

    if (totalErrors % 100 === 0) {
      logger.info('Error metrics', {
        totalErrors,
        errorsByType: Object.fromEntries(errorCounts),
        errorsByStatus: Object.fromEntries(errorCountsByStatus),
        timestamp: new Date().toISOString()
      });
    }

    next(error);
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  errorHandlerMiddleware as default,
  notFoundHandler,
  asyncHandler,
  databaseErrorHandler,
  abdmErrorHandler,
  redisErrorHandler,
  recoveryMiddleware,
  errorMetricsMiddleware
};