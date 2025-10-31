// HMS User Service User Management Service
// Business logic layer for user CRUD operations and role management

import { getEventBus, HMSEvent } from '@hms/shared/event-bus';
import { DatabaseManager } from '@hms/shared/database';
import { Logger } from '@hms/shared/logger';
import { UserRepository } from '@/repositories/user.repository';
import { PasswordManager } from '@/utils/password';
import {
  User,
  UserCreationData,
  UserUpdateData,
  UserProfile,
  CreateUserRequest,
  UpdateUserRequest,
  UserListQuery,
  UserListResponse,
  UserStatistics,
  UserActivity,
  ActivityType
} from '@/models/user';
import { v7 as uuidv7 } from 'uuid';

// =============================================================================
// INTERFACES
// =============================================================================

export interface UserCreationResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  tempPassword?: string;
}

export interface UserUpdateResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export interface UserDeletionResult {
  success: boolean;
  error?: string;
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

// =============================================================================
// USER SERVICE CLASS
// =============================================================================

export class UserService {
  private userRepository: UserRepository;
  private passwordManager: PasswordManager;
  private eventBus: any;
  private logger: Logger;
  private db: DatabaseManager;

  constructor(
    userRepository: UserRepository,
    passwordManager: PasswordManager,
    eventBus: any,
    logger: Logger,
    db: DatabaseManager
  ) {
    this.userRepository = userRepository;
    this.passwordManager = passwordManager;
    this.eventBus = eventBus;
    this.logger = logger.withContext({ service: 'UserService' });
    this.db = db;
  }

  // =============================================================================
  // USER CRUD OPERATIONS
  // =============================================================================

  async createUser(request: CreateUserRequest, createdBy: string): Promise<UserCreationResult> {
    try {
      // Validate input data
      const validationResult = this.validateCreateUserRequest(request);
      if (!validationResult.isValid) {
        return { success: false, error: validationResult.errors.join(', ') };
      }

      // Check if username or email already exists
      const existingUser = await this.checkForExistingUser(request.username, request.email, request.mobile);
      if (existingUser) {
        return { success: false, error: `User already exists with ${existingUser}` };
      }

      // Generate password if not provided
      let password = request.password;
      let tempPassword: string | undefined;

      if (!password) {
        password = this.passwordManager.generateSecurePassword();
        tempPassword = password;
      }

      // Validate password
      const passwordValidation = this.passwordManager.validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.errors.join(', ') };
      }

      // Hash password
      const passwordHash = await this.passwordManager.hashPassword(password);

      // Prepare user creation data
      const userData: UserCreationData = {
        username: request.username,
        email: request.email,
        password: passwordHash,
        firstName: request.firstName,
        lastName: request.lastName,
        mobile: request.mobile,
        userType: request.userType,
        specialization: request.specialization,
        department: request.department,
        hprId: request.hprId,
        roles: request.roles,
        isActive: request.isActive ?? true,
        createdBy
      };

      // Create user
      const user = await this.userRepository.create(userData);

      // TODO: Send welcome email if requested
      if (request.sendWelcomeEmail && tempPassword) {
        // await this.sendWelcomeEmail(user.email, user.firstName, tempPassword);
      }

      // Publish user creation event
      await this.publishUserCreatedEvent(user, createdBy);

      this.logger.info('User created successfully', {
        userId: user.id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        roles: user.roles,
        createdBy
      });

      return {
        success: true,
        user: this.mapUserToProfile(user),
        tempPassword
      };

    } catch (error) {
      this.logger.error('User creation failed', {
        request: { ...request, password: '[REDACTED]' },
        error: error.message
      });

      return { success: false, error: `User creation failed: ${error.message}` };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<UserUpdateResult> {
    try {
      // Validate input data
      const validationResult = this.validateUpdateUserRequest(request);
      if (!validationResult.isValid) {
        return { success: false, error: validationResult.errors.join(', ') };
      }

      // Check if user exists
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        return { success: false, error: 'User not found' };
      }

      // Check for duplicate email/mobile if being updated
      if (request.email && request.email !== existingUser.email) {
        const emailUser = await this.userRepository.findByEmail(request.email);
        if (emailUser && emailUser.id !== userId) {
          return { success: false, error: 'Email already exists' };
        }
      }

      if (request.mobile && request.mobile !== existingUser.mobile) {
        const mobileUser = await this.userRepository.findByMobile(request.mobile);
        if (mobileUser && mobileUser.id !== userId) {
          return { success: false, error: 'Mobile number already exists' };
        }
      }

      // Prepare update data
      const updateData: UserUpdateData = {
        ...request,
        updatedBy
      };

      // Update user
      const updatedUser = await this.userRepository.update(userId, updateData);

      // Publish user update event
      await this.publishUserUpdatedEvent(existingUser, updatedUser, updatedBy);

      this.logger.info('User updated successfully', {
        userId,
        updatedFields: Object.keys(request),
        updatedBy
      });

      return {
        success: true,
        user: this.mapUserToProfile(updatedUser)
      };

    } catch (error) {
      this.logger.error('User update failed', {
        userId,
        request,
        error: error.message
      });

      return { success: false, error: `User update failed: ${error.message}` };
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<UserDeletionResult> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Soft delete user
      await this.userRepository.softDelete(userId, deletedBy);

      // Publish user deletion event
      await this.publishUserDeletedEvent(user, deletedBy);

      this.logger.info('User deleted successfully', {
        userId,
        username: user.username,
        deletedBy
      });

      return { success: true };

    } catch (error) {
      this.logger.error('User deletion failed', {
        userId,
        error: error.message
      });

      return { success: false, error: `User deletion failed: ${error.message}` };
    }
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const user = await this.userRepository.findById(userId);
      return user ? this.mapUserToProfile(user) : null;

    } catch (error) {
      this.logger.error('Failed to get user by ID', {
        userId,
        error: error.message
      });
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  async getUsers(query: UserListQuery): Promise<UserListResponse> {
    try {
      return await this.userRepository.findAll(query);

    } catch (error) {
      this.logger.error('Failed to get users', {
        query,
        error: error.message
      });
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  async getUsersStatistics(): Promise<UserStatistics> {
    try {
      return await this.userRepository.getStatistics();

    } catch (error) {
      this.logger.error('Failed to get user statistics', {
        error: error.message
      });
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  async bulkUpdateUsers(userIds: string[], updateData: UpdateUserRequest, updatedBy: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: []
    };

    try {
      for (const userId of userIds) {
        try {
          const updateResult = await this.updateUser(userId, updateData, updatedBy);
          if (updateResult.success) {
            result.processed++;
          } else {
            result.failed++;
            result.errors.push({ userId, error: updateResult.error });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({ userId, error: error.message });
        }
      }

      result.success = result.failed === 0;

      this.logger.info('Bulk user update completed', {
        totalUsers: userIds.length,
        processed: result.processed,
        failed: result.failed,
        updatedBy
      });

      return result;

    } catch (error) {
      this.logger.error('Bulk user update failed', {
        userIds,
        error: error.message
      });

      return {
        success: false,
        processed: result.processed,
        failed: result.failed + (userIds.length - result.processed),
        errors: [{ userId: 'bulk', error: error.message }]
      };
    }
  }

  async bulkDeleteUsers(userIds: string[], deletedBy: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: []
    };

    try {
      for (const userId of userIds) {
        try {
          const deleteResult = await this.deleteUser(userId, deletedBy);
          if (deleteResult.success) {
            result.processed++;
          } else {
            result.failed++;
            result.errors.push({ userId, error: deleteResult.error });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({ userId, error: error.message });
        }
      }

      result.success = result.failed === 0;

      this.logger.info('Bulk user deletion completed', {
        totalUsers: userIds.length,
        processed: result.processed,
        failed: result.failed,
        deletedBy
      });

      return result;

    } catch (error) {
      this.logger.error('Bulk user deletion failed', {
        userIds,
        error: error.message
      });

      return {
        success: false,
        processed: result.processed,
        failed: result.failed + (userIds.length - result.processed),
        errors: [{ userId: 'bulk', error: error.message }]
      };
    }
  }

  // =============================================================================
  // USER ACTIVITY TRACKING
  // =============================================================================

  async recordUserActivity(
    userId: string,
    activityType: ActivityType,
    description: string,
    metadata?: Record<string, any>,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
    correlationId?: string
  ): Promise<void> {
    try {
      const activity: UserActivity = {
        id: uuidv7(),
        userId,
        activityType,
        activityTypeCode: activityType,
        description,
        metadata,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        timestamp: new Date(),
        sessionId,
        requestId: correlationId,
        correlationId
      };

      // TODO: Store activity in database
      // await this.userRepository.recordActivity(activity);

      this.logger.debug('User activity recorded', {
        userId,
        activityType,
        description
      });

    } catch (error) {
      this.logger.error('Failed to record user activity', {
        userId,
        activityType,
        error: error.message
      });
    }
  }

  async getUserActivities(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserActivity[]> {
    try {
      // TODO: Implement activity retrieval
      return [];

    } catch (error) {
      this.logger.error('Failed to get user activities', {
        userId,
        error: error.message
      });
      return [];
    }
  }

  // =============================================================================
  // USER PROFILE OPERATIONS
  // =============================================================================

  async updateProfile(
    userId: string,
    profileData: Partial<{
      firstName?: string;
      lastName?: string;
      mobile?: string;
      timezone?: string;
      language?: string;
      theme?: 'light' | 'dark' | 'auto';
    }>,
    updatedBy: string
  ): Promise<UserUpdateResult> {
    try {
      // Validate input
      const validationResult = this.validateProfileUpdate(profileData);
      if (!validationResult.isValid) {
        return { success: false, error: validationResult.errors.join(', ') };
      }

      // Check for duplicate mobile if being updated
      if (profileData.mobile) {
        const mobileUser = await this.userRepository.findByMobile(profileData.mobile);
        if (mobileUser && mobileUser.id !== userId) {
          return { success: false, error: 'Mobile number already exists' };
        }
      }

      // Update user profile
      const updateData: UserUpdateData = {
        ...profileData,
        updatedBy
      };

      const updatedUser = await this.userRepository.update(userId, updateData);

      // Record activity
      await this.recordUserActivity(
        userId,
        ActivityType.PROFILE_UPDATE,
        'User updated their profile',
        { updatedFields: Object.keys(profileData) },
        undefined,
        undefined,
        undefined,
        undefined
      );

      this.logger.info('User profile updated', {
        userId,
        updatedFields: Object.keys(profileData),
        updatedBy
      });

      return {
        success: true,
        user: this.mapUserToProfile(updatedUser)
      };

    } catch (error) {
      this.logger.error('Profile update failed', {
        userId,
        profileData,
        error: error.message
      });

      return { success: false, error: `Profile update failed: ${error.message}` };
    }
  }

  async uploadProfileImage(userId: string, imageUrl: string, updatedBy: string): Promise<UserUpdateResult> {
    try {
      const updateData: UserUpdateData = {
        profileImage: imageUrl,
        updatedBy
      };

      const updatedUser = await this.userRepository.update(userId, updateData);

      // Record activity
      await this.recordUserActivity(
        userId,
        ActivityType.PROFILE_UPDATE,
        'User uploaded profile image',
        { imageUrl },
        undefined,
        undefined,
        undefined,
        undefined
      );

      this.logger.info('Profile image uploaded', {
        userId,
        imageUrl,
        updatedBy
      });

      return {
        success: true,
        user: this.mapUserToProfile(updatedUser)
      };

    } catch (error) {
      this.logger.error('Profile image upload failed', {
        userId,
        error: error.message
      });

      return { success: false, error: `Profile image upload failed: ${error.message}` };
    }
  }

  // =============================================================================
  // USER STATUS MANAGEMENT
  // =============================================================================

  async activateUser(userId: string, activatedBy: string): Promise<UserUpdateResult> {
    try {
      const updateData: UserUpdateData = {
        isActive: true,
        updatedBy: activatedBy
      };

      const updatedUser = await this.userRepository.update(userId, updateData);

      // Record activity
      await this.recordUserActivity(
        userId,
        ActivityType.ACCOUNT_UNLOCKED,
        'User account activated',
        { activatedBy },
        undefined,
        undefined,
        undefined,
        undefined
      );

      this.logger.info('User activated', {
        userId,
        activatedBy
      });

      return {
        success: true,
        user: this.mapUserToProfile(updatedUser)
      };

    } catch (error) {
      this.logger.error('User activation failed', {
        userId,
        error: error.message
      });

      return { success: false, error: `User activation failed: ${error.message}` };
    }
  }

  async deactivateUser(userId: string, deactivatedBy: string): Promise<UserUpdateResult> {
    try {
      const updateData: UserUpdateData = {
        isActive: false,
        updatedBy: deactivatedBy
      };

      const updatedUser = await this.userRepository.update(userId, updateData);

      // Record activity
      await this.recordUserActivity(
        userId,
        ActivityType.ACCOUNT_LOCKED,
        'User account deactivated',
        { deactivatedBy },
        undefined,
        undefined,
        undefined,
        undefined
      );

      this.logger.info('User deactivated', {
        userId,
        deactivatedBy
      });

      return {
        success: true,
        user: this.mapUserToProfile(updatedUser)
      };

    } catch (error) {
      this.logger.error('User deactivation failed', {
        userId,
        error: error.message
      });

      return { success: false, error: `User deactivation failed: ${error.message}` };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private validateCreateUserRequest(request: CreateUserRequest): { isValid: boolean; errors: string[] } {
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

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateUpdateUserRequest(request: UpdateUserRequest): { isValid: boolean; errors: string[] } {
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

  private validateProfileUpdate(profileData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (profileData.firstName && profileData.firstName.trim().length < 1) {
      errors.push('First name must be at least 1 character long');
    }

    if (profileData.mobile && !this.isValidMobile(profileData.mobile)) {
      errors.push('Valid mobile number is required');
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

  private async checkForExistingUser(username: string, email: string, mobile?: string): Promise<string | null> {
    try {
      // Check username
      const userByUsername = await this.userRepository.findByUsername(username);
      if (userByUsername) {
        return 'username';
      }

      // Check email
      const userByEmail = await this.userRepository.findByEmail(email);
      if (userByEmail) {
        return 'email';
      }

      // Check mobile if provided
      if (mobile) {
        const userByMobile = await this.userRepository.findByMobile(mobile);
        if (userByMobile) {
          return 'mobile';
        }
      }

      return null;

    } catch (error) {
      this.logger.error('Error checking for existing user', {
        username,
        email,
        mobile,
        error: error.message
      });
      return null;
    }
  }

  private mapUserToProfile(user: User): UserProfile {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      mobile: user.mobile,
      userType: user.userType,
      specialization: user.specialization,
      department: user.department,
      hprId: user.hprId,
      isDoctor: user.isDoctor,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      isMobileVerified: user.isMobileVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      profileImage: user.profileImage,
      timezone: user.timezone,
      language: user.language,
      theme: user.theme,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  // =============================================================================
  // EVENT PUBLISHING
  // =============================================================================

  private async publishUserCreatedEvent(user: User, createdBy: string): Promise<void> {
    try {
      await this.eventBus.publish('user.created', {
        userId: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        isDoctor: user.isDoctor,
        specialization: user.specialization,
        department: user.department,
        hprId: user.hprId,
        isActive: user.isActive,
        roles: user.roles,
        permissions: user.permissions,
        createdBy,
        createdAt: user.createdAt
      });

    } catch (error) {
      this.logger.error('Failed to publish user creation event', {
        userId: user.id,
        error: error.message
      });
    }
  }

  private async publishUserUpdatedEvent(oldUser: User, newUser: User, updatedBy: string): Promise<void> {
    try {
      const changedFields = this.getChangedFields(oldUser, newUser);

      await this.eventBus.publish('user.updated', {
        userId: newUser.id,
        username: newUser.username,
        changedFields,
        previousValues: this.getPreviousValues(oldUser, changedFields),
        newValues: this.getNewValues(newUser, changedFields),
        updatedBy,
        updatedAt: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to publish user update event', {
        userId: newUser.id,
        error: error.message
      });
    }
  }

  private async publishUserDeletedEvent(user: User, deletedBy: string): Promise<void> {
    try {
      await this.eventBus.publish('user.deleted', {
        userId: user.id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        deletedBy,
        deletedAt: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to publish user deletion event', {
        userId: user.id,
        error: error.message
      });
    }
  }

  private getChangedFields(oldUser: User, newUser: User): string[] {
    const changedFields: string[] = [];

    const fieldsToCheck = [
      'email', 'firstName', 'lastName', 'mobile', 'specialization',
      'department', 'hprId', 'isActive', 'profileImage', 'timezone',
      'language', 'theme'
    ];

    for (const field of fieldsToCheck) {
      if (oldUser[field as keyof User] !== newUser[field as keyof User]) {
        changedFields.push(field);
      }
    }

    return changedFields;
  }

  private getPreviousValues(user: User, fields: string[]): Record<string, any> {
    const values: Record<string, any> = {};
    for (const field of fields) {
      values[field] = user[field as keyof User];
    }
    return values;
  }

  private getNewValues(user: User, fields: string[]): Record<string, any> {
    const values: Record<string, any> = {};
    for (const field of fields) {
      values[field] = user[field as keyof User];
    }
    return values;
  }
}

export default UserService;