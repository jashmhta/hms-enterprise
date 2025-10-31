// HMS User Service User Routes
// API route definitions for user management endpoints

import { Router } from 'express';
import { UserController } from '@/controllers/user.controller';
import { ValidationMiddleware } from '@/middleware/validation.middleware';
import { AuthenticationMiddleware } from '@/middleware/auth.middleware';
import { ErrorMiddleware, asyncHandler } from '@/middleware/error.middleware';

// =============================================================================
// USER MANAGEMENT ROUTES
// =============================================================================

export const createUserRoutes = (
  userController: UserController,
  validationMiddleware: ValidationMiddleware,
  authMiddleware: AuthenticationMiddleware,
  errorMiddleware: ErrorMiddleware
): Router => {
  const router = Router();

  // Apply authentication to all user routes
  router.use(authMiddleware.authenticate);

  // User CRUD operations
  router.get(
    '/',
    authMiddleware.authorize({ requiredRoles: ['admin', 'receptionist'] }),
    validationMiddleware.validateUserQuery,
    asyncHandler(userController.getUsers.bind(userController))
  );

  router.get(
    '/statistics',
    authMiddleware.authorize({ requiredRoles: ['admin', 'accountant'] }),
    asyncHandler(userController.getUserStatistics.bind(userController))
  );

  router.get(
    '/:id',
    authMiddleware.allowSelfOrAdmin,
    validationMiddleware.validateUserId,
    asyncHandler(userController.getUserById.bind(userController))
  );

  router.post(
    '/',
    authMiddleware.authorize({ requiredRoles: ['admin', 'receptionist'] }),
    validationMiddleware.validateCreateUser,
    asyncHandler(userController.createUser.bind(userController))
  );

  router.put(
    '/:id',
    authMiddleware.allowSelfOrAdmin,
    validationMiddleware.validateUserId,
    validationMiddleware.validateUpdateUser,
    asyncHandler(userController.updateUser.bind(userController))
  );

  router.delete(
    '/:id',
    authMiddleware.authorize({ requiredRoles: ['admin'] }),
    validationMiddleware.validateUserId,
    asyncHandler(userController.deleteUser.bind(userController))
  );

  // Bulk operations
  router.post(
    '/bulk-update',
    authMiddleware.authorize({ requiredRoles: ['admin'] }),
    validationMiddleware.validateBulkUpdate,
    asyncHandler(userController.bulkUpdateUsers.bind(userController))
  );

  router.post(
    '/bulk-delete',
    authMiddleware.authorize({ requiredRoles: ['admin'] }),
    validationMiddleware.validateBulkDelete,
    asyncHandler(userController.bulkDeleteUsers.bind(userController))
  );

  // Profile management (authenticated users can update their own profile)
  router.put(
    '/profile',
    validationMiddleware.validateProfileUpdate,
    asyncHandler(userController.updateProfile.bind(userController))
  );

  router.post(
    '/profile/image',
    validationMiddleware.validateProfileImage,
    asyncHandler(userController.uploadProfileImage.bind(userController))
  );

  // User status management (admin only)
  router.post(
    '/:id/activate',
    authMiddleware.authorize({ requiredRoles: ['admin'] }),
    validationMiddleware.validateUserId,
    asyncHandler(userController.activateUser.bind(userController))
  );

  router.post(
    '/:id/deactivate',
    authMiddleware.authorize({ requiredRoles: ['admin'] }),
    validationMiddleware.validateUserId,
    asyncHandler(userController.deactivateUser.bind(userController))
  );

  return router;
};

export default createUserRoutes;