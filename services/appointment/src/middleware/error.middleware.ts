/**
 * Error Handling Middleware for Appointment Service
 * HMS Enterprise
 * 
 * Comprehensive error handling with structured responses,
 * error logging, and appropriate HTTP status codes.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../shared/utils/logger';

// Custom error types
export class AppointmentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppointmentError';
  }
}

export class ConflictError extends AppointmentError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class NotFoundError extends AppointmentError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends AppointmentError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class BusinessRuleError extends AppointmentError {
  constructor(message: string, details?: any) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422, details);
  }
}

export class ExternalServiceError extends AppointmentError {
  constructor(message: string, service: string, details?: any) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, { service, ...details });
  }
}

export class DatabaseError extends AppointmentError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error
  logger.error('Appointment Service Error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    tenantId: req.tenant?.id,
    timestamp: new Date().toISOString()
  });

  // Handle known error types
  if (error instanceof AppointmentError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      error: error.code,
      details: error.details,
      timestamp: new Date().toISOString()
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString()
    });
  }

  // Handle database constraint errors
  if (error.message.includes('duplicate key')) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate record found',
      error: 'DUPLICATE_RECORD',
      timestamp: new Date().toISOString()
    });
  }

  if (error.message.includes('foreign key constraint')) {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist',
      error: 'FOREIGN_KEY_VIOLATION',
      timestamp: new Date().toISOString()
    });
  }

  // Handle timeout errors
  if (error.message.includes('timeout')) {
    return res.status(504).json({
      success: false,
      message: 'Request timeout',
      error: 'TIMEOUT_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Handle rate limiting errors
  if (error.message.includes('rate limit')) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded',
      error: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString()
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    error: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Database error handler
 */
export function handleDatabaseError(error: any): DatabaseError {
  // PostgreSQL error codes
  const errorCode = error?.code;
  const errorMessage = error?.message || error?.detail || 'Database operation failed';

  switch (errorCode) {
    case '23505': // unique_violation
      return new DatabaseError('Duplicate record found', {
        constraint: error.constraint,
        table: error.table
      });

    case '23503': // foreign_key_violation
      return new DatabaseError('Referenced record does not exist', {
        constraint: error.constraint,
        table: error.table
      });

    case '23502': // not_null_violation
      return new DatabaseError('Required field is missing', {
        column: error.column
      });

    case '23514': // check_violation
      return new DatabaseError('Data violates business rules', {
        constraint: error.constraint
      });

    case '42P01': // undefined_table
      return new DatabaseError('Database table not found', {
        table: error.table
      });

    case '42703': // undefined_column
      return new DatabaseError('Database column not found', {
        column: error.column
      });

    case '08006': // connection_failure
    case '08001': // sqlclient_unable_to_establish_sqlconnection
    case '08004': // sqlserver_rejected_establishment_of_sqlconnection
      return new DatabaseError('Database connection failed', {
        code: errorCode
      });

    case '53100': // disk_full
      return new DatabaseError('Database disk full', {
        code: errorCode
      });

    case '53200': // out_of_memory
      return new DatabaseError('Database out of memory', {
        code: errorCode
      });

    case '55P03': // lock_not_available
    case '55P04': // deadlock_detected
      return new DatabaseError('Database lock conflict', {
        code: errorCode
      });

    default:
      return new DatabaseError(errorMessage, {
        code: errorCode,
        originalError: error
      });
  }
}

/**
 * External service error handler
 */
export function handleExternalServiceError(
  serviceName: string,
  error: any
): ExternalServiceError {
  const statusCode = error?.response?.status || error?.status || 500;
  const message = error?.response?.data?.message || error?.message || `External service ${serviceName} unavailable`;

  return new ExternalServiceError(message, serviceName, {
    statusCode,
    response: error?.response?.data,
    originalError: error
  });
}

/**
 * Conflict error factory
 */
export function createConflictError(
  message: string,
  conflictType: 'appointment' | 'slot' | 'resource',
  details?: any
): ConflictError {
  return new ConflictError(message, {
    conflictType,
    ...details
  });
}

/**
 * Validation error factory
 */
export function createValidationError(
  message: string,
  field?: string,
  value?: any
): ValidationError {
  return new ValidationError(message, {
    field,
    value
  });
}

/**
 * Business rule error factory
 */
export function createBusinessRuleError(
  message: string,
  rule: string,
  details?: any
): BusinessRuleError {
  return new BusinessRuleError(message, {
    violatedRule: rule,
    ...details
  });
}

/**
 * Error metrics collector
 */
class ErrorMetrics {
  private errors = new Map<string, number>();
  private lastReset = Date.now();
  private resetInterval = 60 * 60 * 1000; // 1 hour

  record(error: AppointmentError): void {
    const now = Date.now();
    
    // Reset counters if interval has passed
    if (now - this.lastReset > this.resetInterval) {
      this.errors.clear();
      this.lastReset = now;
    }

    const count = this.errors.get(error.code) || 0;
    this.errors.set(error.code, count + 1);

    // Log high error rates
    if (count > 10) {
      logger.warn('High error rate detected', {
        errorCode: error.code,
        count: count + 1,
        message: error.message
      });
    }
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.errors);
  }
}

export const errorMetrics = new ErrorMetrics();

/**
 * Error monitoring and alerting
 */
export function checkErrorThresholds(): void {
  const metrics = errorMetrics.getMetrics();
  
  // Check for critical errors
  const criticalErrors = ['DATABASE_ERROR', 'EXTERNAL_SERVICE_ERROR', 'INTERNAL_ERROR'];
  const criticalCount = criticalErrors.reduce((sum, code) => sum + (metrics[code] || 0), 0);

  if (criticalCount > 50) {
    logger.error('Critical error threshold exceeded', {
      criticalCount,
      metrics
    });
    
    // TODO: Send alert to monitoring system
  }

  // Check for high conflict rates (indicates scheduling issues)
  const conflictCount = metrics['CONFLICT'] || 0;
  if (conflictCount > 100) {
    logger.warn('High conflict rate detected', {
      conflictCount,
      metrics
    });
  }
}

// Run error threshold check every 5 minutes
setInterval(checkErrorThresholds, 5 * 60 * 1000);

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleDatabaseError,
  handleExternalServiceError,
  createConflictError,
  createValidationError,
  createBusinessRuleError,
  errorMetrics,
  checkErrorThresholds,
  AppointmentError,
  ConflictError,
  NotFoundError,
  ValidationError,
  BusinessRuleError,
  ExternalServiceError,
  DatabaseError
};