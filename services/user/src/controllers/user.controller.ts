// HMS User Service User Controller
// HTTP request handlers for user management endpoints

import { Request, Response, NextFunction } from 'express';
import { UserService } from '@/services/user.service';
import { Logger } from '@hms/shared/logger';
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserListQuery,
  BulkOperationResult,
  ValidationResult
} from '@/models/user';
import { config } from '@/config';

// =============================================================================
// USER CONTROLLER CLASS
// =============================================================================

export class UserController {
  private userService: UserService;
  private logger: Logger;

  constructor(userService: UserService, logger: Logger) {
    this.userService = userService;
    this.logger = logger.withContext({ controller: 'UserController' });
  }

  // =============================================================================
  // USER CRUD ENDPOINTS
  // =============================================================================

  /**
   * GET /users
   * Get list of users with filtering and pagination
   */
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: UserListQuery = {
        page: parseInt(req.query.page as string) || undefined,
        limit: parseInt(req.query.limit as string) || undefined,
        search: req.query.search as string,
        userType: req.query.userType as string,
        department: req.query.department as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        isDoctor: req.query.isDoctor === 'true' ? true : req.query.isDoctor === 'false' ? false : undefined,
        role: req.query.role as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      const result = await this.userService.getUsers(query);

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination,
        filters: result.filters
      });

    } catch (error) {
      this.logger.error('Get users endpoint error', {
        error: error.message,
        query: req.query
      });
      next(error);
    }
  }

  /**
   * GET /users/:id
   * Get user by ID
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.sub; // Get current user ID for authorization

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
        return;
      }

      const user = await this.userService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check if user has permission to view this user (simplified check)
      if (userId !== id && !this.isAdmin((req as any).user?.roles)) {
        // TODO: Implement proper RBAC check
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user
      });

    } catch (error) {
      this.logger.error('Get user by ID endpoint error', {
        error: error.message,
        userId: req.params.id
      });
      next(error);
    }
  }

  /**
   * POST /users
   * Create a new user
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createUserRequest: CreateUserRequest = req.body;
      const createdBy = (req as any).user?.sub;

      if (!createdBy) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      // Check if user has permission to create users
      if (!this.canCreateUsers((req as any).user?.roles)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create users'
        });
        return;
      }

      // Validate request
      const validation = this.validateCreateUserRequest(createUserRequest);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          errors: validation.errors
        });
        return;
      }

      // Create user
      const result = await this.userService.createUser(createUserRequest, createdBy);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'User creation failed'
        });
        return;
      }

      const statusCode = result.tempPassword ? 201 : 200;

      res.status(statusCode).json({
        success: true,
        message: 'User created successfully',
        data: result.user,
        tempPassword: result.tempPassword
      });

      this.logger.info('User created via API', {
        userId: result.user?.id,
        username: result.user?.username,
        createdBy
      });

    } catch (error) {
      this.logger.error('Create user endpoint error', {
        error: error.message,
        body: { ...req.body, password: '[REDACTED]' }
      });
      next(error);
    }
  }

  /**
   * PUT /users/:id
   * Update user by ID
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateRequest: UpdateUserRequest = req.body;
      const updatedBy = (req as any).user?.sub;

      if (!id || !updatedBy) {
        res.status(400).json({
          success: false,
          message: 'User ID and authentication are required'
        });
        return;
      }

      // Check if user has permission to update this user
      if (!this.canUpdateUser((req as any).user?.roles, updatedBy, id)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update this user'
        });
        return;
      }

      // Validate request
      const validation = this.validateUpdateUserRequest(updateRequest);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          errors: validation.errors
        });
        return;
      }

      // Update user
      const result = await this.userService.updateUser(id, updateRequest, updatedBy);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'User update failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: result.user
      });

      this.logger.info('User updated via API', {
        userId: id,
        updatedFields: Object.keys(updateRequest),
        updatedBy
      });

    } catch (error) {
      this.logger.error('Update user endpoint error', {
        error: error.message,
        userId: req.params.id,
        body: req.body
      });
      next(error);
    }
  }

  /**
   * DELETE /users/:id
   * Delete user by ID
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deletedBy = (req as any).user?.sub;

      if (!id || !deletedBy) {
        res.status(400).json({
          success: false,
          message: 'User ID and authentication are required'
        });
        return;
      }

      // Check if user has permission to delete users
      if (!this.canDeleteUsers((req as any).user?.roles)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete users'
        });
        return;
      }

      // Prevent users from deleting themselves
      if (deletedBy === id) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
        return;
      }

      // Delete user
      const result = await this.userService.deleteUser(id, deletedBy);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'User deletion failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

      this.logger.info('User deleted via API', {
        userId: id,
        deletedBy
      });

    } catch (error) {
      this.logger.error('Delete user endpoint error', {
        error: error.message,
        userId: req.params.id
      });
      next(error);
    }
  }

  // =============================================================================
  // BULK OPERATIONS ENDPOINTS
  // =============================================================================

  /**
   * POST /users/bulk-update
   * Bulk update users
   */
  async bulkUpdateUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds, updateData } = req.body;
      const updatedBy = (req as any).user?.sub;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'User IDs array is required'
        });
        return;
      }

      if (!updatedBy) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      // Check permissions
      if (!this.canBulkUpdateUsers((req as any).user?.roles)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions for bulk operations'
        });
        return;
      }

      // Validate update data
      const validation = this.validateUpdateUserRequest(updateData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid update data',
          errors: validation.errors
        });
        return;
      }

      // Bulk update
      const result: BulkOperationResult = await this.userService.bulkUpdateUsers(
        userIds,
        updateData,
        updatedBy
      );

      const statusCode = result.success ? 200 : 207; // Multi-Status for partial success

      res.status(statusCode).json({
        success: result.success,
        message: result.success
          ? 'All users updated successfully'
          : 'Partial success - some users failed to update',
        data: {
          total: userIds.length,
          processed: result.processed,
          failed: result.failed,
          errors: result.errors
        }
      });

      this.logger.info('Bulk user update completed', {
        totalUsers: userIds.length,
        processed: result.processed,
        failed: result.failed,
        updatedBy
      });

    } catch (error) {
      this.logger.error('Bulk update users endpoint error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  }

  /**
   * POST /users/bulk-delete
   * Bulk delete users
   */
  async bulkDeleteUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds } = req.body;
      const deletedBy = (req as any).user?.sub;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'User IDs array is required'
        });
        return;
      }

      if (!deletedBy) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      // Check permissions
      if (!this.canBulkDeleteUsers((req as any).user?.roles)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions for bulk delete operations'
        });
        return;
      }

      // Prevent users from deleting themselves
      if (userIds.includes(deletedBy)) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete your own account in bulk operations'
        });
        return;
      }

      // Bulk delete
      const result: BulkOperationResult = await this.userService.bulkDeleteUsers(userIds, deletedBy);

      const statusCode = result.success ? 200 : 207; // Multi-Status for partial success

      res.status(statusCode).json({
        success: result.success,
        message: result.success
          ? 'All users deleted successfully'
          : 'Partial success - some users failed to delete',
        data: {
          total: userIds.length,
          processed: result.processed,
          failed: result.failed,
          errors: result.errors
        }
      });

      this.logger.info('Bulk user deletion completed', {
        totalUsers: userIds.length,
        processed: result.processed,
        failed: result.failed,
        deletedBy
      });

    } catch (error) {
      this.logger.error('Bulk delete users endpoint error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  }

  // =============================================================================
  // USER STATISTICS ENDPOINTS
  // =============================================================================

  /**
   * GET /users/statistics
   * Get user statistics
   */
  async getUserStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check permissions
      if (!this.canViewStatistics((req as any).user?.roles)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view statistics'
        });
        return;
      }

      const statistics = await this.userService.getUsersStatistics();

      res.status(200).json({
        success: true,
        data: statistics
      });

    } catch (error) {
      this.logger.error('Get user statistics endpoint error', {
        error: error.message
      });
      next(error);
    }
  }

  // =============================================================================
  // USER PROFILE ENDPOINTS
  // =============================================================================

  /**
   * PUT /users/profile
   * Update current user's profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub;
      const profileData = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      // Validate profile data
      const validation = this.validateProfileUpdate(profileData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid profile data',
          errors: validation.errors
        });
        return;
      }

      // Update profile
      const result = await this.userService.updateProfile(userId, profileData, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Profile update failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: result.user
      });

    } catch (error) {
      this.logger.error('Update profile endpoint error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  }

  /**
   * POST /users/profile/image
   * Upload profile image
   */
  async uploadProfileImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub;
      const { imageUrl } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      if (!imageUrl) {
        res.status(400).json({
          success: false,
          message: 'Image URL is required'
        });
        return;
      }

      // Upload profile image
      const result = await this.userService.uploadProfileImage(userId, imageUrl, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Profile image upload failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          imageUrl: result.user?.profileImage
        }
      });

    } catch (error) {
      this.logger.error('Upload profile image endpoint error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  }

  // =============================================================================
  // USER STATUS MANAGEMENT ENDPOINTS
  // =============================================================================

  /**
   * POST /users/:id/activate
   * Activate user account
   */
  async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const activatedBy = (req as any).user?.sub;

      if (!id || !activatedBy) {
        res.status(400).json({
          success: false,
          message: 'User ID and authentication are required'
        });
        return;
      }

      // Check permissions
      if (!this.canManageUserStatus((req as any).user?.roles)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to manage user status'
        });
        return;
      }

      // Activate user
      const result = await this.userService.activateUser(id, activatedBy);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'User activation failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User activated successfully',
        data: result.user
      });

    } catch (error) {
      this.logger.error('Activate user endpoint error', {
        error: error.message,
        userId: req.params.id
      });
      next(error);
    }
  }

  /**
   * POST /users/:id/deactivate
   * Deactivate user account
   */
  async deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deactivatedBy = (req as any).user?.sub;

      if (!id || !deactivatedBy) {
        res.status(400).json({
          success: false,
          message: 'User ID and authentication are required'
        });
        return;
      }

      // Check permissions
      if (!this.canManageUserStatus((req as any).user?.roles)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to manage user status'
        });
        return;
      }

      // Prevent users from deactivating themselves
      if (deactivatedBy === id) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
        return;
      }

      // Deactivate user
      const result = await this.userService.deactivateUser(id, deactivatedBy);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'User deactivation failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: result.user
      });

    } catch (error) {
      this.logger.error('Deactivate user endpoint error', {
        error: error.message,
        userId: req.params.id
      });
      next(error);
    }
  }

  // =============================================================================
  // PRIVATE PERMISSION HELPER METHODS
  // =============================================================================

  private isAdmin(roles: string[] = []): boolean {
    return roles.includes('admin');
  }

  private canCreateUsers(roles: string[] = []): boolean {
    return roles.includes('admin') || roles.includes('receptionist');
  }

  private canUpdateUser(roles: string[] = [], currentUserId: string, targetUserId: string): boolean {
    // Users can always update their own profile
    if (currentUserId === targetUserId) {
      return true;
    }

    // Admin can update any user
    return this.isAdmin(roles);
  }

  private canDeleteUsers(roles: string[] = []): boolean {
    return this.isAdmin(roles);
  }

  private canBulkUpdateUsers(roles: string[] = []): boolean {
    return this.isAdmin(roles);
  }

  private canBulkDeleteUsers(roles: string[] = []): boolean {
    return this.isAdmin(roles);
  }

  private canViewStatistics(roles: string[] = []): boolean {
    return roles.includes('admin') || roles.includes('accountant');
  }

  private canManageUserStatus(roles: string[] = []): boolean {
    return this.isAdmin(roles);
  }

  // =============================================================================
  // PRIVATE VALIDATION METHODS
  // =============================================================================

  private validateCreateUserRequest(request: CreateUserRequest): ValidationResult {
    const errors: string[] = [];

    if (!request.username || request.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!request.email || !this.isValidEmail(request.email)) {
      errors.push('Valid email address is required');
    }

    if (!request.firstName || request.firstName.trim().length < 1) {
      errors.push('First name is required');
    }

    if (!request.userType) {
      errors.push('User type is required');
    }

    if (request.mobile && !this.isValidMobile(request.mobile)) {
      errors.push('Valid mobile number is required');
    }

    // If password is provided, validate it
    if (request.password && request.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateUpdateUserRequest(request: UpdateUserRequest): ValidationResult {
    const errors: string[] = [];

    if (request.email && !this.isValidEmail(request.email)) {
      errors.push('Valid email address is required');
    }

    if (request.firstName && request.firstName.trim().length < 1) {
      errors.push('First name must be at least 1 character long');
    }

    if (request.mobile && !this.isValidMobile(request.mobile)) {
      errors.push('Valid mobile number is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateProfileUpdate(profileData: any): ValidationResult {
    const errors: string[] = [];

    if (profileData.firstName && profileData.firstName.trim().length < 1) {
      errors.push('First name must be at least 1 character long');
    }

    if (profileData.mobile && !this.isValidMobile(profileData.mobile)) {
      errors.push('Valid mobile number is required');
    }

    if (profileData.theme && !['light', 'dark', 'auto'].includes(profileData.theme)) {
      errors.push('Theme must be light, dark, or auto');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidMobile(mobile: string): boolean {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(mobile);
  }
}

export default UserController;