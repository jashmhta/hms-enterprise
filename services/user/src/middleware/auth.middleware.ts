// HMS User Service Authentication Middleware
// JWT authentication and RBAC authorization middleware

import { Request, Response, NextFunction } from 'express';
import { JWTManager } from '@/utils/jwt';
import { UserRepository } from '@/repositories/user.repository';
import { Logger } from '@hms/shared/logger';
import { config } from '@/config';

// =============================================================================
// INTERFACES
// =============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    username: string;
    userType: string;
    roles: string[];
    permissions: string[];
    isDoctor: boolean;
    iat?: number;
    exp?: number;
    jti?: string;
  };
  sessionId?: string;
}

export interface AuthorizationOptions {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireDoctor?: boolean;
  requireAdmin?: boolean;
  allowSameUser?: boolean; // Allow users to access their own resources
  userIdParam?: string; // Parameter name for user ID (e.g., ':id')
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

export class AuthenticationMiddleware {
  private jwtManager: JWTManager;
  private userRepository: UserRepository;
  private logger: Logger;

  constructor(jwtManager: JWTManager, userRepository: UserRepository, logger: Logger) {
    this.jwtManager = jwtManager;
    this.userRepository = userRepository;
    this.logger = logger.withContext({ middleware: 'Authentication' });
  }

  /**
   * JWT Authentication Middleware
   * Verifies JWT token and attaches user payload to request
   */
  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({
          success: false,
          message: 'Authorization header is required',
          code: 'MISSING_AUTH_HEADER'
        });
        return;
      }

      // Extract token from header
      const token = this.jwtManager.extractTokenFromHeader(authHeader);

      // Verify token
      const payload = this.jwtManager.verifyAccessToken(token);

      // Check if user still exists and is active
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'User account is inactive',
          code: 'USER_INACTIVE'
        });
        return;
      }

      // Check if token is not revoked (TODO: Implement token blacklist)
      // const isTokenRevoked = await this.isTokenRevoked(payload.jti);
      // if (isTokenRevoked) {
      //   res.status(401).json({
      //     success: false,
      //     message: 'Token has been revoked',
      //     code: 'TOKEN_REVOKED'
      //   });
      //   return;
      // }

      // Attach user payload to request
      req.user = payload;

      // Get session ID if available (from token or header)
      req.sessionId = req.headers['x-session-id'] as string || payload.jti;

      this.logger.debug('User authenticated successfully', {
        userId: payload.sub,
        username: payload.username,
        sessionId: req.sessionId
      });

      next();

    } catch (error) {
      this.logger.error('Authentication failed', {
        error: error.message,
        authHeader: req.headers.authorization ? '[PRESENT]' : '[MISSING]',
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        message: 'Authentication failed',
        code: 'INVALID_TOKEN'
      });
    }
  };

  /**
   * Optional Authentication Middleware
   * Attaches user payload if token is present, but doesn't fail if missing
   */
  optionalAuthenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        // No auth header, continue without authentication
        next();
        return;
      }

      try {
        // Try to authenticate
        const token = this.jwtManager.extractTokenFromHeader(authHeader);
        const payload = this.jwtManager.verifyAccessToken(token);

        const user = await this.userRepository.findById(payload.sub);
        if (user && user.isActive) {
          req.user = payload;
          req.sessionId = req.headers['x-session-id'] as string || payload.jti;
        }

      } catch (authError) {
        // Authentication failed, but we continue without user context
        this.logger.debug('Optional authentication failed', {
          error: authError.message
        });
      }

      next();

    } catch (error) {
      this.logger.error('Optional authentication middleware error', {
        error: error.message
      });
      next();
    }
  };

  /**
   * Role-based Authorization Middleware Factory
   * Returns middleware that checks if user has required roles/permissions
   */
  authorize = (options: AuthorizationOptions = {}) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
          });
          return;
        }

        const {
          requiredRoles,
          requiredPermissions,
          requireDoctor,
          requireAdmin,
          allowSameUser,
          userIdParam
        } = options;

        const userRoles = req.user.roles || [];
        const userPermissions = req.user.permissions || [];
        const isDoctor = req.user.isDoctor;

        // Check admin requirement
        if (requireAdmin && !userRoles.includes('admin')) {
          res.status(403).json({
            success: false,
            message: 'Admin access required',
            code: 'ADMIN_REQUIRED'
          });
          return;
        }

        // Check doctor requirement
        if (requireDoctor && !isDoctor) {
          res.status(403).json({
            success: false,
            message: 'Doctor access required',
            code: 'DOCTOR_REQUIRED'
          });
          return;
        }

        // Check same user access
        if (allowSameUser && userIdParam) {
          const targetUserId = req.params[userIdParam];
          const currentUserId = req.user.sub;

          if (targetUserId && targetUserId === currentUserId) {
            // User is accessing their own resource, allow access
            next();
            return;
          }
        }

        // Check required roles
        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
          if (!hasRequiredRole) {
            res.status(403).json({
              success: false,
              message: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
              code: 'INSUFFICIENT_ROLES'
            });
            return;
          }
        }

        // Check required permissions
        if (requiredPermissions && requiredPermissions.length > 0) {
          const hasRequiredPermission = requiredPermissions.some(perm => userPermissions.includes(perm));
          if (!hasRequiredPermission) {
            res.status(403).json({
              success: false,
              message: `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
              code: 'INSUFFICIENT_PERMISSIONS'
            });
            return;
          }
        }

        // All checks passed
        next();

      } catch (error) {
        this.logger.error('Authorization failed', {
          error: error.message,
          userId: req.user?.sub,
          options
        });

        res.status(500).json({
          success: false,
          message: 'Authorization check failed',
          code: 'AUTHORIZATION_ERROR'
        });
      }
    };
  };

  /**
   * Rate Limiting Middleware Factory
   * Applies rate limiting based on user or IP
   */
  rateLimit = (options: {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (req: Request) => string;
    message?: string;
  } = {}) => {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      maxRequests = 100,
      keyGenerator = (req) => req.user?.sub || req.ip,
      message = 'Too many requests, please try again later'
    } = options;

    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const key = keyGenerator(req);
        const now = Date.now();
        const resetTime = now + windowMs;

        let requestData = requests.get(key);

        if (!requestData || now > requestData.resetTime) {
          // Reset or create new request counter
          requestData = { count: 1, resetTime };
          requests.set(key, requestData);
        } else {
          requestData.count++;
        }

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, maxRequests - requestData.count).toString(),
          'X-RateLimit-Reset': new Date(requestData.resetTime).toISOString()
        });

        // Check if rate limit exceeded
        if (requestData.count > maxRequests) {
          res.status(429).json({
            success: false,
            message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
          });
          return;
        }

        next();

      } catch (error) {
        this.logger.error('Rate limiting middleware error', {
          error: error.message
        });
        // Don't block requests if rate limiting fails
        next();
      }
    };
  };

  // =============================================================================
  // PRECONFIGURED MIDDLEWARE FACTORIES
  // =============================================================================

  /**
   * Middleware that requires admin access
   */
  requireAdmin = this.authorize({ requireAdmin: true });

  /**
   * Middleware that requires doctor access
   */
  requireDoctor = this.authorize({ requireDoctor: true });

  /**
   * Middleware that requires admin or doctor access
   */
  requireAdminOrDoctor = this.authorize({
    requiredRoles: ['admin', 'doctor']
  });

  /**
   * Middleware that allows users to access their own resources
   */
  allowSelfOrAdmin = this.authorize({
    allowSameUser: true,
    userIdParam: 'id',
    requiredRoles: ['admin']
  });

  /**
   * Middleware for user management endpoints
   */
  requireUserManagement = this.authorize({
    requiredRoles: ['admin', 'receptionist']
  });

  /**
   * Middleware for reporting endpoints
   */
  requireReporting = this.authorize({
    requiredRoles: ['admin', 'accountant']
  });

  /**
   * Middleware for clinical endpoints
   */
  requireClinicalAccess = this.authorize({
    requiredRoles: ['admin', 'doctor', 'pharmacist', 'lab_technician']
  });

  // =============================================================================
  // SECURITY HEADERS MIDDLEWARE
  // =============================================================================

  /**
   * Security Headers Middleware
   * Adds important security headers to responses
   */
  securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Force HTTPS in production
    if (config.nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Content Security Policy
    res.setHeader('Content-Security-Policy', config.helmet.cspDirective);

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
  };

  /**
   * Request ID Middleware
   * Adds unique request ID for tracing
   */
  requestId = (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || this.generateRequestId();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  };

  /**
   * Correlation ID Middleware
   * Ensures correlation ID is present throughout the request
   */
  correlationId = (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = req.headers['x-correlation-id'] as string || this.generateRequestId();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  };

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async isTokenRevoked(tokenId: string): Promise<boolean> {
    // TODO: Implement token blacklist/revocation check
    // This could check Redis or database for revoked tokens
    return false;
  }
}

export default AuthenticationMiddleware;