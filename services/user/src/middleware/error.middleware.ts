// HMS User Service Error Handling Middleware
// Centralized error handling and response formatting

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@hms/shared/logger';
import { config } from '@/config';

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR', true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, { retryAfter });
  }
}

// =============================================================================
// ERROR RESPONSE INTERFACES
// =============================================================================

export interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
  correlationId?: string;
  path?: string;
  method?: string;
  details?: any;
  stack?: string;
}

export interface ValidationErrorDetails {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// =============================================================================
// ERROR MIDDLEWARE CLASS
// =============================================================================

export class ErrorMiddleware {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.withContext({ middleware: 'ErrorHandling' });
  }

  /**
   * Main error handling middleware
   */
  errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    let appError: AppError;

    // Convert regular errors to AppError
    if (!(error instanceof AppError)) {
      appError = new AppError(
        error.message || 'Internal server error',
        500,
        'INTERNAL_ERROR',
        false,
        { originalError: error.name, stack: error.stack }
      );
    } else {
      appError = error;
    }

    // Log error
    this.logError(appError, req);

    // Build error response
    const errorResponse: ErrorResponse = {
      success: false,
      message: appError.message,
      code: appError.code,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string,
      correlationId: req.headers['x-correlation-id'] as string,
      path: req.originalUrl,
      method: req.method
    };

    // Add details for validation errors
    if (appError instanceof ValidationError && appError.context) {
      errorResponse.details = appError.context;
    }

    // Add stack trace in development
    if (config.nodeEnv === 'development' && !appError.isOperational) {
      errorResponse.stack = appError.stack;
    }

    // Set additional headers
    if (appError.code === 'RATE_LIMIT_ERROR' && appError.context?.retryAfter) {
      res.set('Retry-After', appError.context.retryAfter.toString());
    }

    // Send response
    res.status(appError.statusCode).json(errorResponse);
  };

  /**
   * 404 Not Found handler
   */
  notFoundHandler = (req: Request, res: Response): void => {
    const errorResponse: ErrorResponse = {
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string,
      correlationId: req.headers['x-correlation-id'] as string,
      path: req.originalUrl,
      method: req.method
    };

    this.logger.warn('Route not found', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(404).json(errorResponse);
  };

  /**
   * Async error wrapper for controllers
   */
  asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // =============================================================================
  // ERROR LOGGING
  // =============================================================================

  private logError(error: AppError, req: Request): void {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        stack: error.stack,
        context: error.context
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id'],
        correlationId: req.headers['x-correlation-id']
      },
      user: (req as any).user ? {
        userId: (req as any).user.sub,
        username: (req as any).user.username,
        roles: (req as any).user.roles
      } : null
    };

    if (error.isOperational) {
      // Log operational errors as warnings
      this.logger.warn('Operational error occurred', logData);
    } else {
      // Log programming errors as errors
      this.logger.error('Application error occurred', logData);
    }

    // Log security-related errors separately
    if (this.isSecurityError(error)) {
      this.logger.security('Security error detected', {
        ...logData,
        securityContext: {
          authenticationFailed: error.code === 'AUTHENTICATION_ERROR',
          authorizationFailed: error.code === 'AUTHORIZATION_ERROR',
          rateLimitExceeded: error.code === 'RATE_LIMIT_ERROR',
          validationFailed: error.code === 'VALIDATION_ERROR',
          suspiciousActivity: this.isSuspiciousActivity(error, req)
        }
      });
    }
  }

  private isSecurityError(error: AppError): boolean {
    const securityErrorCodes = [
      'AUTHENTICATION_ERROR',
      'AUTHORIZATION_ERROR',
      'RATE_LIMIT_ERROR',
      'VALIDATION_ERROR',
      'CSRF_ERROR',
      'XSS_ERROR',
      'SQL_INJECTION_ERROR'
    ];

    return securityErrorCodes.includes(error.code);
  }

  private isSuspiciousActivity(error: AppError, req: Request): boolean {
    // Check for patterns that might indicate attacks
    const suspiciousPatterns = [
      /\bunion\s+select\b/i,           // SQL injection
      /\bdrop\s+table\b/i,             // SQL injection
      /<script[^>]*>/i,               // XSS
      /javascript:/i,                   // XSS
      /\.\./,                          // Path traversal
      /etc\/passwd/i,                   // Path traversal
      /\/etc\//i                       // Path traversal
    ];

    const requestString = JSON.stringify({
      url: req.originalUrl,
      query: req.query,
      body: req.body
    });

    return suspiciousPatterns.some(pattern => pattern.test(requestString));
  }

  // =============================================================================
  // HEALTH CHECK ERROR HANDLING
  // =============================================================================

  /**
   * Error handler specifically for health check endpoints
   */
  healthCheckErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // Don't log health check errors to avoid noise
    const healthCheckError: ErrorResponse = {
      success: false,
      message: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string
    };

    res.status(503).json(healthCheckError);
  };

  // =============================================================================
  // ERROR UTILITIES
  // =============================================================================

  /**
   * Create a validation error with field details
   */
  static createValidationError(errors: ValidationErrorDetails[]): ValidationError {
    const message = errors.map(e => `${e.field}: ${e.message}`).join(', ');
    return new ValidationError(message, errors);
  }

  /**
   * Create an authentication error
   */
  static createAuthenticationError(message: string = 'Authentication failed'): AuthenticationError {
    return new AuthenticationError(message);
  }

  /**
   * Create an authorization error
   */
  static createAuthorizationError(message: string = 'Access denied'): AuthorizationError {
    return new AuthorizationError(message);
  }

  /**
   * Create a not found error
   */
  static createNotFoundError(resource: string = 'Resource'): NotFoundError {
    return new NotFoundError(`${resource} not found`);
  }

  /**
   * Create a conflict error
   */
  static createConflictError(message: string = 'Resource conflict'): ConflictError {
    return new ConflictError(message);
  }

  /**
   * Create a rate limit error
   */
  static createRateLimitError(message: string = 'Rate limit exceeded', retryAfter?: number): RateLimitError {
    return new RateLimitError(message, retryAfter);
  }

  /**
   * Wrap an error with additional context
   */
  static wrapError(error: Error, message?: string, code?: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError(
      message || error.message || 'Unknown error occurred',
      500,
      code || 'UNKNOWN_ERROR',
      false,
      { originalError: error.name, stack: error.stack }
    );
  }
}

export default ErrorMiddleware;