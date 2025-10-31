// HMS User Service User Repository
// Database access layer for user management

import { PoolClient, QueryResult } from 'pg';
import {
  User,
  UserCreationData,
  UserUpdateData,
  UserListQuery,
  UserListResponse,
  UserProfile,
  UserStatistics,
  UserStatus,
  DatabaseManager
} from '@/models/user';
import { DatabaseManager as SharedDatabaseManager } from '@hms/shared/database';
import { Logger } from '@hms/shared/logger';

// =============================================================================
// USER REPOSITORY CLASS
// =============================================================================

export class UserRepository {
  private db: SharedDatabaseManager;
  private logger: Logger;

  constructor(databaseManager: SharedDatabaseManager, logger: Logger) {
    this.db = databaseManager;
    this.logger = logger.withContext({ repository: 'UserRepository' });
  }

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  async findById(id: string): Promise<User | null> {
    try {
      const query = `
        SELECT
          u.*,
          array_agg(DISTINCT r.name) as roles,
          array_agg(DISTINCT p.code) as permissions
        FROM user_schema.users u
        LEFT JOIN user_schema.user_roles ur ON u.id = ur.user_id
        LEFT JOIN user_schema.roles r ON ur.role_id = r.id AND r.is_active = true
        LEFT JOIN user_schema.role_permissions rp ON r.id = rp.role_id
        LEFT JOIN user_schema.permissions p ON rp.permission_id = p.id AND p.is_active = true
        WHERE u.id = $1 AND u.is_deleted = false
        GROUP BY u.id
      `;

      const result = await this.db.query(query, [id]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to find user by ID', {
        id,
        error: error.message
      });
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const query = `
        SELECT
          u.*,
          array_agg(DISTINCT r.name) as roles,
          array_agg(DISTINCT p.code) as permissions
        FROM user_schema.users u
        LEFT JOIN user_schema.user_roles ur ON u.id = ur.user_id
        LEFT JOIN user_schema.roles r ON ur.role_id = r.id AND r.is_active = true
        LEFT JOIN user_schema.role_permissions rp ON r.id = rp.role_id
        LEFT JOIN user_schema.permissions p ON rp.permission_id = p.id AND p.is_active = true
        WHERE u.username = $1 AND u.is_deleted = false
        GROUP BY u.id
      `;

      const result = await this.db.query(query, [username]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to find user by username', {
        username,
        error: error.message
      });
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT
          u.*,
          array_agg(DISTINCT r.name) as roles,
          array_agg(DISTINCT p.code) as permissions
        FROM user_schema.users u
        LEFT JOIN user_schema.user_roles ur ON u.id = ur.user_id
        LEFT JOIN user_schema.roles r ON ur.role_id = r.id AND r.is_active = true
        LEFT JOIN user_schema.role_permissions rp ON r.id = rp.role_id
        LEFT JOIN user_schema.permissions p ON rp.permission_id = p.id AND p.is_active = true
        WHERE u.email = $1 AND u.is_deleted = false
        GROUP BY u.id
      `;

      const result = await this.db.query(query, [email]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to find user by email', {
        email,
        error: error.message
      });
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  async findByMobile(mobile: string): Promise<User | null> {
    try {
      const query = `
        SELECT
          u.*,
          array_agg(DISTINCT r.name) as roles,
          array_agg(DISTINCT p.code) as permissions
        FROM user_schema.users u
        LEFT JOIN user_schema.user_roles ur ON u.id = ur.user_id
        LEFT JOIN user_schema.roles r ON ur.role_id = r.id AND r.is_active = true
        LEFT JOIN user_schema.role_permissions rp ON r.id = rp.role_id
        LEFT JOIN user_schema.permissions p ON rp.permission_id = p.id AND p.is_active = true
        WHERE u.mobile = $1 AND u.is_deleted = false
        GROUP BY u.id
      `;

      const result = await this.db.query(query, [mobile]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to find user by mobile', {
        mobile,
        error: error.message
      });
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  async create(userData: UserCreationData): Promise<User> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Insert user
      const insertUserQuery = `
        INSERT INTO user_schema.users (
          username, email, password_hash, first_name, last_name, mobile,
          user_type, specialization, department, hpr_id, is_doctor,
          is_active, is_email_verified, is_mobile_verified, two_factor_enabled,
          password_changed_at, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          NOW(), $16, NOW(), NOW()
        ) RETURNING *
      `;

      const userValues = [
        userData.username,
        userData.email,
        userData.password,
        userData.firstName,
        userData.lastName || null,
        userData.mobile || null,
        userData.userType,
        userData.specialization || null,
        userData.department || null,
        userData.hprId || null,
        userData.userType === 'doctor',
        userData.isActive ?? true,
        false, // is_email_verified
        false, // is_mobile_verified
        false, // two_factor_enabled
        userData.createdBy
      ];

      const userResult = await client.query(insertUserQuery, userValues);
      const user = userResult.rows[0];

      // Assign roles if provided
      if (userData.roles && userData.roles.length > 0) {
        await this.assignRolesToUser(client, user.id, userData.roles);
      }

      // Get the complete user with roles and permissions
      const completeUser = await this.findByIdFromClient(client, user.id);

      await client.query('COMMIT');

      this.logger.info('User created successfully', {
        userId: user.id,
        username: userData.username,
        email: userData.email,
        userType: userData.userType,
        roles: userData.roles
      });

      return completeUser!;

    } catch (error) {
      await client.query('ROLLBACK');

      this.logger.error('Failed to create user', {
        userData: { ...userData, password: '[REDACTED]' },
        error: error.message
      });

      if (error.code === '23505') { // Unique violation
        if (error.constraint?.includes('username')) {
          throw new Error('Username already exists');
        } else if (error.constraint?.includes('email')) {
          throw new Error('Email already exists');
        } else if (error.constraint?.includes('mobile')) {
          throw new Error('Mobile number already exists');
        }
      }

      throw new Error(`Failed to create user: ${error.message}`);

    } finally {
      client.release();
    }
  }

  async update(id: string, updateData: UserUpdateData): Promise<User> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateData.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(updateData.email);
      }
      if (updateData.firstName !== undefined) {
        updateFields.push(`first_name = $${paramIndex++}`);
        updateValues.push(updateData.firstName);
      }
      if (updateData.lastName !== undefined) {
        updateFields.push(`last_name = $${paramIndex++}`);
        updateValues.push(updateData.lastName);
      }
      if (updateData.mobile !== undefined) {
        updateFields.push(`mobile = $${paramIndex++}`);
        updateValues.push(updateData.mobile);
      }
      if (updateData.specialization !== undefined) {
        updateFields.push(`specialization = $${paramIndex++}`);
        updateValues.push(updateData.specialization);
      }
      if (updateData.department !== undefined) {
        updateFields.push(`department = $${paramIndex++}`);
        updateValues.push(updateData.department);
      }
      if (updateData.hprId !== undefined) {
        updateFields.push(`hpr_id = $${paramIndex++}`);
        updateValues.push(updateData.hprId);
      }
      if (updateData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(updateData.isActive);
      }
      if (updateData.profileImage !== undefined) {
        updateFields.push(`profile_image = $${paramIndex++}`);
        updateValues.push(updateData.profileImage);
      }
      if (updateData.timezone !== undefined) {
        updateFields.push(`timezone = $${paramIndex++}`);
        updateValues.push(updateData.timezone);
      }
      if (updateData.language !== undefined) {
        updateFields.push(`language = $${paramIndex++}`);
        updateValues.push(updateData.language);
      }
      if (updateData.theme !== undefined) {
        updateFields.push(`theme = $${paramIndex++}`);
        updateValues.push(updateData.theme);
      }

      updateFields.push(`updated_by = $${paramIndex++}`);
      updateValues.push(updateData.updatedBy);
      updateFields.push(`updated_at = NOW()`);

      // Update user
      const updateQuery = `
        UPDATE user_schema.users
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND is_deleted = false
        RETURNING *
      `;

      updateValues.push(id);

      const updateResult = await client.query(updateQuery, updateValues);

      if (updateResult.rowCount === 0) {
        throw new Error('User not found');
      }

      // Update roles if provided
      if (updateData.roles !== undefined) {
        await this.updateUserRoles(client, id, updateData.roles);
      }

      // Get the complete updated user
      const updatedUser = await this.findByIdFromClient(client, id);

      await client.query('COMMIT');

      this.logger.info('User updated successfully', {
        userId: id,
        updatedFields: Object.keys(updateData),
        updatedBy: updateData.updatedBy
      });

      return updatedUser!;

    } catch (error) {
      await client.query('ROLLBACK');

      this.logger.error('Failed to update user', {
        userId: id,
        updateData,
        error: error.message
      });

      if (error.code === '23505') { // Unique violation
        if (error.constraint?.includes('email')) {
          throw new Error('Email already exists');
        } else if (error.constraint?.includes('mobile')) {
          throw new Error('Mobile number already exists');
        }
      }

      throw new Error(`Failed to update user: ${error.message}`);

    } finally {
      client.release();
    }
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    try {
      const query = `
        UPDATE user_schema.users
        SET is_deleted = true, deleted_at = NOW(), updated_by = $1
        WHERE id = $2 AND is_deleted = false
      `;

      const result = await this.db.query(query, [deletedBy, id]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      this.logger.info('User deleted successfully', {
        userId: id,
        deletedBy
      });

    } catch (error) {
      this.logger.error('Failed to delete user', {
        userId: id,
        deletedBy,
        error: error.message
      });
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    try {
      const query = `
        UPDATE user_schema.users
        SET is_deleted = true, deleted_at = NOW(), updated_by = $1, is_active = false
        WHERE id = $2 AND is_deleted = false
      `;

      const result = await this.db.query(query, [deletedBy, id]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      this.logger.info('User soft deleted successfully', {
        userId: id,
        deletedBy
      });

    } catch (error) {
      this.logger.error('Failed to soft delete user', {
        userId: id,
        deletedBy,
        error: error.message
      });
      throw new Error(`Failed to soft delete user: ${error.message}`);
    }
  }

  // =============================================================================
  // USER LISTING AND SEARCH
  // =============================================================================

  async findAll(query: UserListQuery): Promise<UserListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        userType,
        department,
        isActive,
        isDoctor,
        role,
        sortBy = 'name',
        sortOrder = 'asc'
      } = query;

      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = ['u.is_deleted = false'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(
          u.first_name ILIKE $${paramIndex} OR
          u.last_name ILIKE $${paramIndex} OR
          u.username ILIKE $${paramIndex} OR
          u.email ILIKE $${paramIndex} OR
          u.mobile ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (userType) {
        whereConditions.push(`u.user_type = $${paramIndex}`);
        queryParams.push(userType);
        paramIndex++;
      }

      if (department) {
        whereConditions.push(`u.department = $${paramIndex}`);
        queryParams.push(department);
        paramIndex++;
      }

      if (isActive !== undefined) {
        whereConditions.push(`u.is_active = $${paramIndex}`);
        queryParams.push(isActive);
        paramIndex++;
      }

      if (isDoctor !== undefined) {
        whereConditions.push(`u.is_doctor = $${paramIndex}`);
        queryParams.push(isDoctor);
        paramIndex++;
      }

      if (role) {
        whereConditions.push(`EXISTS (
          SELECT 1 FROM user_schema.user_roles ur
          JOIN user_schema.roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id AND r.name = $${paramIndex}
        )`);
        queryParams.push(role);
        paramIndex++;
      }

      // Build ORDER BY clause
      const orderByMap = {
        name: 'u.first_name, u.last_name',
        email: 'u.email',
        createdAt: 'u.created_at',
        lastLoginAt: 'u.last_login_at DESC NULLS LAST'
      };

      const orderBy = orderByMap[sortBy] || orderByMap.name;
      const direction = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM user_schema.users u
        ${role ? 'LEFT JOIN user_schema.user_roles ur ON u.id = ur.user_id LEFT JOIN user_schema.roles r ON ur.role_id = r.id' : ''}
        WHERE ${whereConditions.join(' AND ')}
      `;

      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get users
      const usersQuery = `
        SELECT DISTINCT
          u.*,
          array_agg(DISTINCT r.name) as roles,
          array_agg(DISTINCT p.code) as permissions
        FROM user_schema.users u
        LEFT JOIN user_schema.user_roles ur ON u.id = ur.user_id
        LEFT JOIN user_schema.roles r ON ur.role_id = r.id AND r.is_active = true
        LEFT JOIN user_schema.role_permissions rp ON r.id = rp.role_id
        LEFT JOIN user_schema.permissions p ON rp.permission_id = p.id AND p.is_active = true
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY u.id
        ORDER BY ${orderBy} ${direction}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const usersResult = await this.db.query(usersQuery, queryParams);

      const users = usersResult.rows.map(row => this.mapRowToUser(row));
      const totalPages = Math.ceil(total / limit);

      return {
        users: users.map(this.mapUserToProfile),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          search,
          userType,
          department,
          isActive,
          isDoctor,
          role
        }
      };

    } catch (error) {
      this.logger.error('Failed to find users', { query, error: error.message });
      throw new Error(`Failed to find users: ${error.message}`);
    }
  }

  // =============================================================================
  // USER AUTHENTICATION METHODS
  // =============================================================================

  async updatePassword(userId: string, passwordHash: string, updatedBy: string): Promise<void> {
    try {
      const query = `
        UPDATE user_schema.users
        SET password_hash = $1, password_changed_at = NOW(),
            failed_login_attempts = 0, locked_until = NULL,
            updated_by = $2, updated_at = NOW()
        WHERE id = $3 AND is_deleted = false
      `;

      const result = await this.db.query(query, [passwordHash, updatedBy, userId]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      this.logger.info('User password updated successfully', {
        userId,
        updatedBy
      });

    } catch (error) {
      this.logger.error('Failed to update user password', {
        userId,
        updatedBy,
        error: error.message
      });
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  async updateLastLogin(userId: string, ipAddress?: string): Promise<void> {
    try {
      const query = `
        UPDATE user_schema.users
        SET last_login_at = NOW(), last_login_ip = $2, updated_at = NOW()
        WHERE id = $1 AND is_deleted = false
      `;

      await this.db.query(query, [userId, ipAddress]);

    } catch (error) {
      this.logger.error('Failed to update last login', {
        userId,
        ipAddress,
        error: error.message
      });
      // Don't throw error for non-critical update
    }
  }

  async incrementFailedLoginAttempts(userId: string): Promise<number> {
    try {
      const query = `
        UPDATE user_schema.users
        SET failed_login_attempts = failed_login_attempts + 1, updated_at = NOW()
        WHERE id = $1 AND is_deleted = false
        RETURNING failed_login_attempts
      `;

      const result = await this.db.query(query, [userId]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      return result.rows[0].failed_login_attempts;

    } catch (error) {
      this.logger.error('Failed to increment failed login attempts', {
        userId,
        error: error.message
      });
      throw new Error(`Failed to update failed login attempts: ${error.message}`);
    }
  }

  async lockUser(userId: string, lockDuration: number): Promise<void> {
    try {
      const lockUntil = new Date(Date.now() + lockDuration);

      const query = `
        UPDATE user_schema.users
        SET locked_until = $1, updated_at = NOW()
        WHERE id = $2 AND is_deleted = false
      `;

      const result = await this.db.query(query, [lockUntil, userId]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      this.logger.info('User locked successfully', {
        userId,
        lockUntil
      });

    } catch (error) {
      this.logger.error('Failed to lock user', {
        userId,
        lockDuration,
        error: error.message
      });
      throw new Error(`Failed to lock user: ${error.message}`);
    }
  }

  async unlockUser(userId: string, unlockedBy: string): Promise<void> {
    try {
      const query = `
        UPDATE user_schema.users
        SET failed_login_attempts = 0, locked_until = NULL,
            updated_by = $1, updated_at = NOW()
        WHERE id = $2 AND is_deleted = false
      `;

      const result = await this.db.query(query, [unlockedBy, userId]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      this.logger.info('User unlocked successfully', {
        userId,
        unlockedBy
      });

    } catch (error) {
      this.logger.error('Failed to unlock user', {
        userId,
        unlockedBy,
        error: error.message
      });
      throw new Error(`Failed to unlock user: ${error.message}`);
    }
  }

  // =============================================================================
  // USER STATISTICS
  // =============================================================================

  async getStatistics(): Promise<UserStatistics> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_active = true AND is_deleted = false) as active_users,
          COUNT(*) FILTER (WHERE is_active = false AND is_deleted = false) as inactive_users,
          COUNT(*) FILTER (WHERE is_doctor = true AND is_deleted = false) as doctors,
          COUNT(*) FILTER (WHERE is_doctor = false AND is_deleted = false) as non_doctors,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days' AND is_deleted = false) as recent_registrations,
          COUNT(*) FILTER (WHERE is_email_verified = false AND is_deleted = false) as accounts_needing_verification,
          COUNT(*) FILTER (WHERE locked_until > NOW() AND is_deleted = false) as locked_accounts
        FROM user_schema.users
      `;

      const result = await this.db.query(query);
      const stats = result.rows[0];

      // Get users by type
      const typeQuery = `
        SELECT user_type, COUNT(*) as count
        FROM user_schema.users
        WHERE is_deleted = false
        GROUP BY user_type
      `;

      const typeResult = await this.db.query(typeQuery);
      const usersByType = typeResult.rows.reduce((acc, row) => {
        acc[row.user_type] = parseInt(row.count);
        return acc;
      }, {});

      // Get users by department
      const deptQuery = `
        SELECT COALESCE(department, 'Unknown') as department, COUNT(*) as count
        FROM user_schema.users
        WHERE is_deleted = false
        GROUP BY department
      `;

      const deptResult = await this.db.query(deptQuery);
      const usersByDepartment = deptResult.rows.reduce((acc, row) => {
        acc[row.department] = parseInt(row.count);
        return acc;
      }, {});

      return {
        totalUsers: parseInt(stats.total_users),
        activeUsers: parseInt(stats.active_users),
        inactiveUsers: parseInt(stats.inactive_users),
        doctors: parseInt(stats.doctors),
        nonDoctors: parseInt(stats.non_doctors),
        usersByType,
        usersByDepartment,
        recentRegistrations: parseInt(stats.recent_registrations),
        passwordExpiringSoon: 0, // TODO: Implement password expiry tracking
        accountsNeedingVerification: parseInt(stats.accounts_needing_verification),
        lockedAccounts: parseInt(stats.locked_accounts)
      };

    } catch (error) {
      this.logger.error('Failed to get user statistics', {
        error: error.message
      });
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private async findByIdFromClient(client: PoolClient, id: string): Promise<User | null> {
    const query = `
      SELECT
        u.*,
        array_agg(DISTINCT r.name) as roles,
        array_agg(DISTINCT p.code) as permissions
      FROM user_schema.users u
      LEFT JOIN user_schema.user_roles ur ON u.id = ur.user_id
      LEFT JOIN user_schema.roles r ON ur.role_id = r.id AND r.is_active = true
      LEFT JOIN user_schema.role_permissions rp ON r.id = rp.role_id
      LEFT JOIN user_schema.permissions p ON rp.permission_id = p.id AND p.is_active = true
      WHERE u.id = $1 AND u.is_deleted = false
      GROUP BY u.id
    `;

    const result = await client.query(query, [id]);

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  private async assignRolesToUser(client: PoolClient, userId: string, roleNames: string[]): Promise<void> {
    for (const roleName of roleNames) {
      // Get role ID
      const roleQuery = 'SELECT id FROM user_schema.roles WHERE name = $1 AND is_active = true';
      const roleResult = await client.query(roleQuery, [roleName]);

      if (roleResult.rowCount === 0) {
        throw new Error(`Role not found: ${roleName}`);
      }

      const roleId = roleResult.rows[0].id;

      // Check if user already has this role
      const existingQuery = `
        SELECT 1 FROM user_schema.user_roles
        WHERE user_id = $1 AND role_id = $2
      `;
      const existingResult = await client.query(existingQuery, [userId, roleId]);

      if (existingResult.rowCount === 0) {
        // Assign role to user
        const insertQuery = `
          INSERT INTO user_schema.user_roles (user_id, role_id, created_at)
          VALUES ($1, $2, NOW())
        `;
        await client.query(insertQuery, [userId, roleId]);
      }
    }
  }

  private async updateUserRoles(client: PoolClient, userId: string, roleNames: string[]): Promise<void> {
    // Remove existing roles
    const deleteQuery = 'DELETE FROM user_schema.user_roles WHERE user_id = $1';
    await client.query(deleteQuery, [userId]);

    // Assign new roles
    if (roleNames.length > 0) {
      await this.assignRolesToUser(client, userId, roleNames);
    }
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      mobile: row.mobile,
      userType: row.user_type,
      specialization: row.specialization,
      department: row.department,
      hprId: row.hpr_id,
      isDoctor: row.is_doctor,
      lastLoginAt: row.last_login_at,
      lastLoginIp: row.last_login_ip,
      passwordChangedAt: row.password_changed_at,
      failedLoginAttempts: row.failed_login_attempts,
      lockedUntil: row.locked_until,
      isActive: row.is_active,
      isEmailVerified: row.is_email_verified,
      isMobileVerified: row.is_mobile_verified,
      profileImage: row.profile_image,
      timezone: row.timezone,
      language: row.language,
      theme: row.theme,
      twoFactorEnabled: row.two_factor_enabled,
      twoFactorSecret: row.two_factor_secret,
      backupCodes: row.backup_codes,
      roles: row.roles?.filter((role: any) => role !== null) || [],
      permissions: row.permissions?.filter((perm: any) => perm !== null) || [],
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
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
}

export default UserRepository;