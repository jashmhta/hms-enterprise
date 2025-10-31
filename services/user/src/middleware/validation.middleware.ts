// HMS User Service Validation Middleware
// Request validation using Joi schemas

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Logger } from '@hms/shared/logger';

// =============================================================================
// VALIDATION MIDDLEWARE CLASS
// =============================================================================

export class ValidationMiddleware {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.withContext({ middleware: 'Validation' });
  }

  /**
   * Generic validation middleware factory
   */
  validate(schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const data = req[source];
        const { error, value } = schema.validate(data, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            code: detail.type
          }));

          this.logger.warn('Request validation failed', {
            url: req.originalUrl,
            method: req.method,
            source,
            errors: validationErrors,
            data: source === 'body' ? this.sanitizeRequestBody(data) : data
          });

          res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: validationErrors.map(e => `${e.field}: ${e.message}`),
            code: 'VALIDATION_ERROR'
          });
          return;
        }

        // Replace original data with validated and sanitized data
        req[source] = value;
        next();

      } catch (err) {
        this.logger.error('Validation middleware error', {
          error: err.message,
          url: req.originalUrl,
          method: req.method,
          source
        });

        res.status(500).json({
          success: false,
          message: 'Validation error occurred',
          code: 'VALIDATION_SYSTEM_ERROR'
        });
      }
    };
  }

  // =============================================================================
  // PREDEFINED SCHEMAS
  // =============================================================================

  // Authentication schemas
  loginSchema = Joi.object({
    username: Joi.string().required().min(1).max(50),
    password: Joi.string().required().min(1).max(128),
    rememberMe: Joi.boolean().optional(),
    deviceInfo: Joi.object({
      deviceName: Joi.string().optional().max(100),
      platform: Joi.string().optional().max(50),
      browser: Joi.string().optional().max(50)
    }).optional()
  });

  loginWithTwoFactorSchema = Joi.object({
    username: Joi.string().required().min(1).max(50),
    password: Joi.string().required().min(1).max(128),
    twoFactorCode: Joi.string().required().min(4).max(10)
  });

  changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().min(1).max(128),
    newPassword: Joi.string().required().min(8).max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword'))
  });

  forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().max(100)
  });

  resetPasswordSchema = Joi.object({
    token: Joi.string().required().min(1).max(255),
    newPassword: Joi.string().required().min(8).max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword'))
  });

  // User management schemas
  createUserSchema = Joi.object({
    username: Joi.string().required().min(3).max(50).alphanum(),
    email: Joi.string().email().required().max(100),
    password: Joi.string().optional().min(8).max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    firstName: Joi.string().required().min(1).max(100).trim(),
    lastName: Joi.string().optional().max(100).trim(),
    mobile: Joi.string().optional().pattern(/^[6-9]\d{9}$/),
    userType: Joi.string().required().valid('admin', 'doctor', 'receptionist', 'accountant', 'pharmacist', 'lab_technician', 'b2b_manager'),
    specialization: Joi.string().optional().max(100),
    department: Joi.string().optional().max(50),
    hprId: Joi.string().optional().max(50),
    roles: Joi.array().items(Joi.string()).optional(),
    isActive: Joi.boolean().optional(),
    sendWelcomeEmail: Joi.boolean().optional()
  });

  updateUserSchema = Joi.object({
    email: Joi.string().email().optional().max(100),
    firstName: Joi.string().optional().min(1).max(100).trim(),
    lastName: Joi.string().optional().max(100).trim(),
    mobile: Joi.string().optional().pattern(/^[6-9]\d{9}$/),
    specialization: Joi.string().optional().max(100),
    department: Joi.string().optional().max(50),
    hprId: Joi.string().optional().max(50),
    isActive: Joi.boolean().optional(),
    roles: Joi.array().items(Joi.string()).optional(),
    permissions: Joi.array().items(Joi.string()).optional()
  });

  profileUpdateSchema = Joi.object({
    firstName: Joi.string().optional().min(1).max(100).trim(),
    lastName: Joi.string().optional().max(100).trim(),
    mobile: Joi.string().optional().pattern(/^[6-9]\d{9}$/),
    timezone: Joi.string().optional().max(50),
    language: Joi.string().optional().max(10).valid('en', 'hi', 'gu', 'mr', 'ta', 'te', 'kn', 'ml', 'pa', 'bn', 'or', 'as'),
    theme: Joi.string().optional().valid('light', 'dark', 'auto')
  });

  profileImageSchema = Joi.object({
    imageUrl: Joi.string().uri().required().max(500)
  });

  // Bulk operation schemas
  bulkUpdateSchema = Joi.object({
    userIds: Joi.array().items(Joi.string().uuid()).required().min(1).max(100),
    updateData: Joi.object().required().min(1)
  });

  bulkDeleteSchema = Joi.object({
    userIds: Joi.array().items(Joi.string().uuid()).required().min(1).max(100)
  });

  // Query parameter schemas
  userQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().optional().max(100),
    userType: Joi.string().optional().valid('admin', 'doctor', 'receptionist', 'accountant', 'pharmacist', 'lab_technician', 'b2b_manager'),
    department: Joi.string().optional().max(50),
    isActive: Joi.boolean().optional(),
    isDoctor: Joi.boolean().optional(),
    role: Joi.string().optional().max(50),
    sortBy: Joi.string().optional().valid('name', 'email', 'createdAt', 'lastLoginAt'),
    sortOrder: Joi.string().optional().valid('asc', 'desc'),
    createdAfter: Joi.date().optional(),
    createdBefore: Joi.date().optional(),
    lastLoginAfter: Joi.date().optional(),
    lastLoginBefore: Joi.date().optional()
  });

  // URL parameter schemas
  userIdSchema = Joi.object({
    id: Joi.string().uuid().required()
  });

  sessionIdSchema = Joi.object({
    sessionId: Joi.string().uuid().required()
  });

  // =============================================================================
  // PRECONFIGURED MIDDLEWARE
  // =============================================================================

  // Authentication validation
  validateLogin = this.validate(this.loginSchema);
  validateLoginWithTwoFactor = this.validate(this.loginWithTwoFactorSchema);
  validateChangePassword = this.validate(this.changePasswordSchema);
  validateForgotPassword = this.validate(this.forgotPasswordSchema);
  validateResetPassword = this.validate(this.resetPasswordSchema);

  // User management validation
  validateCreateUser = this.validate(this.createUserSchema);
  validateUpdateUser = this.validate(this.updateUserSchema);
  validateProfileUpdate = this.validate(this.profileUpdateSchema);
  validateProfileImage = this.validate(this.profileImageSchema);

  // Bulk operations validation
  validateBulkUpdate = this.validate(this.bulkUpdateSchema);
  validateBulkDelete = this.validate(this.bulkDeleteSchema);

  // Query and parameter validation
  validateUserQuery = this.validate(this.userQuerySchema, 'query');
  validateUserId = this.validate(this.userIdSchema, 'params');
  validateSessionId = this.validate(this.sessionIdSchema, 'params');

  // =============================================================================
  // SPECIALIZED VALIDATION MIDDLEWARE
  // =============================================================================

  /**
   * Validates that request body is JSON
   */
  validateJSON = (req: Request, res: Response, next: NextFunction): void => {
    if (req.is('application/json')) {
      next();
    } else {
      res.status(400).json({
        success: false,
        message: 'Request body must be JSON',
        code: 'INVALID_CONTENT_TYPE'
      });
    }
  };

  /**
   * Validates content length
   */
  validateContentLength = (maxLength: number = 10 * 1024 * 1024) => { // 10MB default
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentLength = parseInt(req.headers['content-length'] || '0');

      if (contentLength > maxLength) {
        res.status(413).json({
          success: false,
          message: 'Request entity too large',
          code: 'PAYLOAD_TOO_LARGE'
        });
        return;
      }

      next();
    };
  };

  /**
   * Sanitizes and validates file uploads
   */
  validateFileUpload = (options: {
    allowedMimeTypes?: string[];
    maxSize?: number;
    allowedExtensions?: string[];
  } = {}) => {
    const {
      allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
          code: 'NO_FILE'
        });
        return;
      }

      const file = req.file;

      // Check MIME type
      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message: `File type ${file.mimetype} is not allowed`,
          code: 'INVALID_FILE_TYPE'
        });
        return;
      }

      // Check file size
      if (file.size > maxSize) {
        res.status(400).json({
          success: false,
          message: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE'
        });
        return;
      }

      // Check file extension
      if (allowedExtensions.length > 0) {
        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExtension)) {
          res.status(400).json({
            success: false,
            message: `File extension ${fileExtension} is not allowed`,
            code: 'INVALID_FILE_EXTENSION'
          });
          return;
        }
      }

      next();
    };
  };

  /**
   * Rate limiting validation
   */
  validateRateLimit = (windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) => {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.ip || 'unknown';
      const now = Date.now();

      let requestData = requests.get(key);

      if (!requestData || now > requestData.resetTime) {
        requestData = { count: 1, resetTime: now + windowMs };
        requests.set(key, requestData);
      } else {
        requestData.count++;
      }

      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - requestData.count).toString(),
        'X-RateLimit-Reset': new Date(requestData.resetTime).toISOString()
      });

      if (requestData.count > maxRequests) {
        res.status(429).json({
          success: false,
          message: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
        });
        return;
      }

      next();
    };
  };

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'confirmPassword', 'token', 'twoFactorCode'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

export default ValidationMiddleware;