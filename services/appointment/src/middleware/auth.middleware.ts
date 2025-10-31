/**
 * Authentication Middleware for Appointment Service
 * HMS Enterprise
 * 
 * Handles authentication, authorization, and role-based access control
 * for appointment-related operations.
 */

import { Request, Response, NextFunction } from 'express';
import { JWTManager } from '../../../shared/utils/jwt';
import { config } from '../config/app.config';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
        permissions: string[];
        facilityId?: string;
        departmentId?: string;
        doctorId?: string;
        patientId?: string;
      };
      tenant?: {
        id: string;
        name: string;
        settings: Record<string, any>;
      };
    }
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * JWT Authentication middleware
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header is required',
        error: 'MISSING_AUTH_HEADER',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_ACCESS_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    const jwtManager = new JWTManager(config.jwt);
    const payload = jwtManager.verifyAccessToken(token);

    // Attach user data to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      facilityId: payload.facilityId,
      departmentId: payload.departmentId,
      doctorId: payload.doctorId,
      patientId: payload.patientId
    };

    // Attach tenant information
    req.tenant = {
      id: payload.tenantId,
      name: payload.tenantName || 'Default',
      settings: payload.tenantSettings || {}
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        message: error.message,
        error: 'AUTHENTICATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Role-based authorization middleware
 */
export function authorize(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        error: 'INSUFFICIENT_ROLES',
        details: {
          required: allowedRoles,
          current: userRoles
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`,
        error: 'INSUFFICIENT_PERMISSIONS',
        details: {
          required: permission,
          current: userPermissions
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

/**
 * Facility access control middleware
 */
export function requireFacilityAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTHENTICATION_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }

  // Super admins can access all facilities
  if (req.user.roles.includes('SUPER_ADMIN')) {
    return next();
  }

  // Check if user has facility access
  const facilityId = req.user.facilityId;
  const targetFacilityId = req.params.facilityId || req.body.facilityId || req.query.facilityId;

  if (!facilityId && !targetFacilityId) {
    return res.status(400).json({
      success: false,
      message: 'Facility ID is required',
      error: 'MISSING_FACILITY_ID',
      timestamp: new Date().toISOString()
    });
  }

  if (targetFacilityId && facilityId !== targetFacilityId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access this facility',
      error: 'FACILITY_ACCESS_DENIED',
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Doctor access control middleware
 */
export function requireDoctorAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTHENTICATION_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }

  const doctorId = req.user.doctorId;
  const targetDoctorId = req.params.doctorId || req.body.doctorId || req.query.doctorId;

  // Allow if user is a doctor accessing their own appointments
  if (doctorId && (!targetDoctorId || doctorId === targetDoctorId)) {
    return next();
  }

  // Allow admin roles to access any doctor's appointments
  const adminRoles = ['SUPER_ADMIN', 'FACILITY_ADMIN', 'DEPARTMENT_ADMIN'];
  if (adminRoles.some(role => req.user!.roles.includes(role))) {
    return next();
  }

  // Allow users with appointment management permission
  if (req.user.permissions.includes('appointment:manage_all')) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Cannot access doctor appointments',
    error: 'DOCTOR_ACCESS_DENIED',
    timestamp: new Date().toISOString()
  });
}

/**
 * Patient access control middleware
 */
export function requirePatientAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTHENTICATION_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }

  const patientId = req.user.patientId;
  const targetPatientId = req.params.patientId || req.body.patientId || req.query.patientId;

  // Allow if user is a patient accessing their own appointments
  if (patientId && (!targetPatientId || patientId === targetPatientId)) {
    return next();
  }

  // Allow admin roles to access any patient's appointments
  const adminRoles = ['SUPER_ADMIN', 'FACILITY_ADMIN', 'DEPARTMENT_ADMIN'];
  if (adminRoles.some(role => req.user!.roles.includes(role))) {
    return next();
  }

  // Allow users with appointment management permission
  if (req.user.permissions.includes('appointment:manage_all')) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Cannot access patient appointments',
    error: 'PATIENT_ACCESS_DENIED',
    timestamp: new Date().toISOString()
  });
}

/**
 * Self-access middleware for patients and doctors
 */
export function requireSelfAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTHENTICATION_REQUIRED',
      timestamp: new Date().toISOString()
    });
  }

  const { patientId, doctorId } = req.user;
  const { appointmentId } = req.params;

  // Admin roles can access any appointment
  const adminRoles = ['SUPER_ADMIN', 'FACILITY_ADMIN', 'DEPARTMENT_ADMIN'];
  if (adminRoles.some(role => req.user!.roles.includes(role))) {
    return next();
  }

  // Users with appointment management permission can access any appointment
  if (req.user.permissions.includes('appointment:manage_all')) {
    return next();
  }

  // TODO: This should check if the appointment belongs to the user
  // For now, we'll allow it to proceed and let the service layer handle the check
  
  next();
}

/**
 * Rate limiting middleware for appointment operations
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}) {
  const { windowMs, maxRequests, keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [k, data] of rateLimitStore.entries()) {
      if (data.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }

    const current = rateLimitStore.get(key);

    if (!current || current.resetTime < now) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (current.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED',
        details: {
          limit: maxRequests,
          windowMs,
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        },
        timestamp: new Date().toISOString()
      });
    }

    current.count++;
    next();
  };
}

/**
 * Appointment creation rate limit (more restrictive)
 */
export const appointmentCreationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,     // 10 appointments per minute
  keyGenerator: (req) => `appointment:create:${req.user?.id || req.ip}`
});

/**
 * Search rate limit
 */
export const searchLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,    // 100 searches per minute
  keyGenerator: (req) => `search:${req.user?.id || req.ip}`
});

/**
 * API key authentication for external integrations
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required',
      error: 'MISSING_API_KEY',
      timestamp: new Date().toISOString()
    });
  }

  // TODO: Implement actual API key validation
  // For now, we'll accept a placeholder
  if (apiKey !== process.env.APPOINTMENT_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key',
      error: 'INVALID_API_KEY',
      timestamp: new Date().toISOString()
    });
  }

  // Mark request as authenticated via API key
  req.user = {
    id: 'api-service',
    email: 'api-service@hms.com',
    roles: ['API_SERVICE'],
    permissions: ['appointment:read', 'appointment:create', 'appointment:update']
  };

  next();
}

export default {
  authenticate,
  authorize,
  requirePermission,
  requireFacilityAccess,
  requireDoctorAccess,
  requirePatientAccess,
  requireSelfAccess,
  rateLimit,
  appointmentCreationLimit,
  searchLimit,
  authenticateApiKey,
  AuthenticationError,
  AuthorizationError
};