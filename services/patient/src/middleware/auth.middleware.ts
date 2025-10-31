// HMS Patient Service Authentication Middleware
// JWT token verification and user authentication

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '@hms/shared';
import { config } from '@/config';

// =============================================================================
// AUTHENTICATION INTERFACES
// =============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
    facilityId?: string;
    departmentId?: string;
  };
}

export interface JWTPayload {
  sub: string; // Subject (user ID)
  email: string;
  role: string;
  permissions: string[];
  facilityId?: string;
  departmentId?: string;
  iat: number; // Issued at
  exp: number; // Expiration
  iss: string; // Issuer
  aud: string; // Audience
  jti: string; // JWT ID
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        errors: ['Missing or invalid Authorization header']
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        errors: ['Access token not provided']
      });
      return;
    }

    // Verify JWT token
    let decodedToken: JWTPayload;
    try {
      // In a real implementation, you would verify the token signature
      // For now, we'll decode it without verification for development
      decodedToken = jwt.decode(token) as JWTPayload;

      // TODO: Add proper JWT verification in production
      // const publicKey = await getPublicKey(); // Get from JWT service or config
      // decodedToken = jwt.verify(token, publicKey, {
      //   issuer: config.jwt.issuer,
      //   audience: config.jwt.audience,
      //   algorithms: ['RS256']
      // }) as JWTPayload;

    } catch (tokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired access token',
        errors: [tokenError.message]
      });
      return;
    }

    // Check if token is expired
    if (decodedToken.exp && Date.now() >= decodedToken.exp * 1000) {
      res.status(401).json({
        success: false,
        message: 'Access token has expired',
        errors: ['Token expired']
      });
      return;
    }

    // Attach user information to request
    req.user = {
      userId: decodedToken.sub,
      email: decodedToken.email,
      role: decodedToken.role,
      permissions: decodedToken.permissions || [],
      facilityId: decodedToken.facilityId,
      departmentId: decodedToken.departmentId
    };

    // Log successful authentication
    const logger = new Logger({
      service: 'AuthMiddleware',
      level: config.logLevel
    });

    logger.debug('User authenticated successfully', {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    next();

  } catch (error) {
    const logger = new Logger({
      service: 'AuthMiddleware',
      level: config.logLevel
    });

    logger.error('Authentication middleware error', {
      error: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      headers: {
        authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'none'
      }
    });

    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      errors: ['Internal authentication error']
    });
  }
};

// =============================================================================
// ROLE-BASED AUTHORIZATION MIDDLEWARE
// =============================================================================

export const requireRole = (requiredRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['User not authenticated']
        });
        return;
      }

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (!roles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [`Role '${req.user.role}' is not authorized for this operation`]
        });
        return;
      }

      next();

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        errors: [error.message]
      });
    }
  };
};

export const requirePermission = (requiredPermissions: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['User not authenticated']
        });
        return;
      }

      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const userPermissions = req.user.permissions || [];

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [`Missing required permissions: ${permissions.join(', ')}`]
        });
        return;
      }

      next();

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Permission check failed',
        errors: [error.message]
      });
    }
  };
};

// =============================================================================
// FACILITY ACCESS MIDDLEWARE
// =============================================================================

export const requireFacilityAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated']
      });
      return;
    }

    // Allow access if user has system-wide permissions or is admin
    if (req.user.role === 'admin' || req.user.role === 'system_admin' || req.user.permissions.includes('system:all')) {
      next();
      return;
    }

    // Check facility access
    const userFacilityId = req.user.facilityId;
    const requestFacilityId = req.headers['x-facility-id'] as string || req.query.facilityId as string;

    if (!userFacilityId && !requestFacilityId) {
      next(); // No facility restriction
      return;
    }

    if (userFacilityId && requestFacilityId && userFacilityId !== requestFacilityId) {
      res.status(403).json({
        success: false,
        message: 'Facility access denied',
        errors: ['You do not have access to this facility']
      });
      return;
    }

    next();

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Facility access check failed',
      errors: [error.message]
    });
  }
};

// =============================================================================
// PATIENT ACCESS MIDDLEWARE
// =============================================================================

export const requirePatientAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: ['User not authenticated']
      });
      return;
    }

    const patientId = req.params.patientId;

    if (!patientId) {
      res.status(400).json({
        success: false,
        message: 'Patient ID is required',
        errors: ['Patient ID parameter is missing']
      });
      return;
    }

    // Allow access for system admin and users with patient:read permissions
    if (req.user.role === 'admin' ||
        req.user.role === 'system_admin' ||
        req.user.permissions.includes('patient:read') ||
        req.user.permissions.includes('system:all')) {
      next();
      return;
    }

    // TODO: Implement patient access check logic
    // This would typically involve:
    // 1. Checking if the user is assigned to the patient
    // 2. Checking if the user works at the same facility
    // 3. Checking if the user has department access
    // 4. Checking for specific care team assignments

    // For now, allow access if user has facility access
    const requestFacilityId = req.headers['x-facility-id'] as string;
    if (requestFacilityId && req.user.facilityId === requestFacilityId) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Patient access denied',
      errors: ['You do not have permission to access this patient\'s information']
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Patient access check failed',
      errors: [error.message]
    });
  }
};

// =============================================================================
// INTERNAL SERVICE MIDDLEWARE
// =============================================================================

export const requireInternalService = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const internalServiceToken = req.headers['x-internal-service-token'] as string;
    const expectedToken = config.internalServiceToken;

    if (!internalServiceToken || internalServiceToken !== expectedToken) {
      res.status(401).json({
        success: false,
        message: 'Internal service authentication required',
        errors: ['Invalid or missing internal service token']
      });
      return;
    }

    // Add internal service flag to request
    (req as any).isInternalService = true;

    next();

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal service authentication failed',
      errors: [error.message]
    });
  }
};

// =============================================================================
// OPTIONAL AUTH MIDDLEWARE
// =============================================================================

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      next();
      return;
    }

    // Try to verify token but don't block if it fails
    try {
      const decodedToken = jwt.decode(token) as JWTPayload;

      // Check if token is expired
      if (decodedToken.exp && Date.now() >= decodedToken.exp * 1000) {
        next();
        return;
      }

      // Attach user information to request
      req.user = {
        userId: decodedToken.sub,
        email: decodedToken.email,
        role: decodedToken.role,
        permissions: decodedToken.permissions || [],
        facilityId: decodedToken.facilityId,
        departmentId: decodedToken.departmentId
      };

    } catch (tokenError) {
      // Token is invalid, continue without authentication
      next();
      return;
    }

    next();

  } catch (error) {
    next();
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  type AuthenticatedRequest,
  type JWTPayload
};