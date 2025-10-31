// HMS User Service Authentication Routes
// API route definitions for authentication endpoints

import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { ValidationMiddleware } from '@/middleware/validation.middleware';
import { AuthenticationMiddleware, AuthenticatedRequest } from '@/middleware/auth.middleware';
import { ErrorMiddleware, asyncHandler } from '@/middleware/error.middleware';

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================

export const createAuthRoutes = (
  authController: AuthController,
  validationMiddleware: ValidationMiddleware,
  authMiddleware: AuthenticationMiddleware,
  errorMiddleware: ErrorMiddleware
): Router => {
  const router = Router();

  // Login endpoints
  router.post(
    '/login',
    validationMiddleware.validateLogin,
    asyncHandler(authController.login.bind(authController))
  );

  router.post(
    '/login-with-2fa',
    validationMiddleware.validateLoginWithTwoFactor,
    asyncHandler(authController.loginWithTwoFactor.bind(authController))
  );

  // Logout endpoints
  router.post(
    '/logout',
    authMiddleware.authenticate,
    asyncHandler(authController.logout.bind(authController))
  );

  // Token refresh endpoint
  router.post(
    '/refresh',
    asyncHandler(authController.refreshToken.bind(authController))
  );

  // Password management endpoints
  router.post(
    '/change-password',
    authMiddleware.authenticate,
    validationMiddleware.validateChangePassword,
    asyncHandler(authController.changePassword.bind(authController))
  );

  router.post(
    '/forgot-password',
    validationMiddleware.validateForgotPassword,
    asyncHandler(authController.forgotPassword.bind(authController))
  );

  router.post(
    '/reset-password',
    validationMiddleware.validateResetPassword,
    asyncHandler(authController.resetPassword.bind(authController))
  );

  // Current user info
  router.get(
    '/me',
    authMiddleware.authenticate,
    asyncHandler(authController.getMe.bind(authController))
  );

  // Session management endpoints
  router.get(
    '/sessions',
    authMiddleware.authenticate,
    asyncHandler(authController.getSessions.bind(authController))
  );

  router.delete(
    '/sessions/:sessionId',
    authMiddleware.authenticate,
    validationMiddleware.validateSessionId,
    asyncHandler(authController.revokeSession.bind(authController))
  );

  router.delete(
    '/sessions',
    authMiddleware.authenticate,
    asyncHandler(authController.revokeAllSessions.bind(authController))
  );

  return router;
};

export default createAuthRoutes;