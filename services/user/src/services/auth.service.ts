// HMS User Service Authentication Service
// Core business logic for user authentication and session management

import { getEventBus, HMSEvent } from '@hms/shared/event-bus';
import { DatabaseManager } from '@hms/shared/database';
import { Logger } from '@hms/shared/logger';
import { UserRepository } from '@/repositories/user.repository';
import { JWTManager, TokenPair, DeviceInfo } from '@/utils/jwt';
import { PasswordManager, PasswordValidationResult } from '@/utils/password';
import {
  User,
  LoginRequest,
  LoginResponse,
  LoginAttempt,
  PasswordResetToken,
  UserSession,
  LoginFailureReason,
  UserStatus
} from '@/models/user';
import { config } from '@/config';
import crypto from 'crypto';
import { v7 as uuidv7 } from 'uuid';

// =============================================================================
// INTERFACES
// =============================================================================

export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: TokenPair;
  session?: UserSession;
  error?: string;
  requiresTwoFactor?: boolean;
  twoFactorMethods?: string[];
}

export interface RefreshTokenResult {
  success: boolean;
  tokens?: TokenPair;
  error?: string;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  resetToken?: string;
}

export interface DeviceRegistration {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  trusted: boolean;
}

// =============================================================================
// AUTHENTICATION SERVICE CLASS
// =============================================================================

export class AuthService {
  private userRepository: UserRepository;
  private jwtManager: JWTManager;
  private passwordManager: PasswordManager;
  private eventBus: any;
  private logger: Logger;
  private db: DatabaseManager;

  constructor(
    userRepository: UserRepository,
    jwtManager: JWTManager,
    passwordManager: PasswordManager,
    eventBus: any,
    logger: Logger,
    db: DatabaseManager
  ) {
    this.userRepository = userRepository;
    this.jwtManager = jwtManager;
    this.passwordManager = passwordManager;
    this.eventBus = eventBus;
    this.logger = logger.withContext({ service: 'AuthService' });
    this.db = db;
  }

  // =============================================================================
  // AUTHENTICATION OPERATIONS
  // =============================================================================

  async login(request: LoginRequest, ipAddress: string, userAgent: string): Promise<AuthResult> {
    const startTime = Date.now();

    try {
      // Check rate limiting
      await this.checkLoginRateLimit(request.username, ipAddress);

      // Find user by username or email
      const user = await this.findUserForLogin(request.username);
      if (!user) {
        await this.recordFailedLoginAttempt(request.username, ipAddress, userAgent, LoginFailureReason.INVALID_CREDENTIALS);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check account status
      const statusCheck = this.checkAccountStatus(user);
      if (!statusCheck.isValid) {
        await this.recordFailedLoginAttempt(request.username, ipAddress, userAgent, statusCheck.reason);
        return { success: false, error: statusCheck.error };
      }

      // Verify password
      const isPasswordValid = await this.passwordManager.verifyPassword(request.password, user.passwordHash);
      if (!isPasswordValid) {
        await this.handleFailedLogin(user, ipAddress, userAgent);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await this.recordFailedLoginAttempt(request.username, ipAddress, userAgent, LoginFailureReason.ACCOUNT_LOCKED);
        return { success: false, error: 'Account is temporarily locked' };
      }

      // Extract device information
      const deviceInfo = this.jwtManager.extractDeviceInfo(userAgent, ipAddress);
      const deviceId = this.generateDeviceId(user.id, deviceInfo);

      // Check two-factor authentication
      if (user.twoFactorEnabled) {
        // TODO: Implement two-factor authentication
        return {
          success: false,
          error: 'Two-factor authentication required',
          requiresTwoFactor: true,
          twoFactorMethods: ['totp', 'sms', 'email']
        };
      }

      // Generate tokens and create session
      const tokens = this.jwtManager.generateTokenPair(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
          userType: user.userType,
          roles: user.roles,
          permissions: user.permissions,
          isDoctor: user.isDoctor
        },
        deviceId,
        deviceInfo
      );

      const session = await this.createUserSession(user.id, deviceId, deviceInfo, tokens);

      // Update last login and reset failed attempts
      await this.userRepository.updateLastLogin(user.id, ipAddress);
      await this.userRepository.unlockUser(user.id, 'system');

      // Record successful login
      await this.recordSuccessfulLoginAttempt(user, ipAddress, userAgent);

      // Publish login event
      await this.publishUserLoginEvent(user, deviceInfo, ipAddress);

      const duration = Date.now() - startTime;
      this.logger.performance('user_login', duration, {
        userId: user.id,
        username: user.username,
        deviceId
      });

      return {
        success: true,
        user,
        tokens,
        session
      };

    } catch (error) {
      this.logger.error('Login failed', {
        username: request.username,
        ipAddress,
        error: error.message
      });

      return { success: false, error: 'Authentication failed' };
    }
  }

  async loginWithTwoFactor(
    request: LoginRequest,
    twoFactorCode: string,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthResult> {
    // TODO: Implement two-factor authentication
    // This would validate TOTP, SMS, or email codes
    return { success: false, error: 'Two-factor authentication not yet implemented' };
  }

  async logout(userId: string, sessionId: string, refreshToken: string, reason: string = 'manual'): Promise<void> {
    try {
      // Invalidate refresh token
      await this.invalidateRefreshToken(refreshToken);

      // Update session
      await this.updateUserSession(sessionId, {
        isActive: false,
        logoutAt: new Date(),
        logoutReason: reason as any
      });

      // Publish logout event
      await this.publishUserLogoutEvent(userId, reason);

      this.logger.info('User logged out successfully', {
        userId,
        sessionId,
        reason
      });

    } catch (error) {
      this.logger.error('Logout failed', {
        userId,
        sessionId,
        error: error.message
      });
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  async refreshAccessToken(refreshToken: string, ipAddress: string, userAgent: string): Promise<RefreshTokenResult> {
    try {
      // Verify refresh token
      const tokenData = this.jwtManager.verifyRefreshToken(refreshToken);

      // Check if refresh token is still valid
      const isValidToken = await this.validateRefreshToken(tokenData.tokenId, tokenData.userId);
      if (!isValidToken) {
        return { success: false, error: 'Invalid or expired refresh token' };
      }

      // Get user
      const user = await this.userRepository.findById(tokenData.userId);
      if (!user || !user.isActive) {
        return { success: false, error: 'User account not found or inactive' };
      }

      // Extract device information
      const deviceInfo = this.jwtManager.extractDeviceInfo(userAgent, ipAddress);

      // Generate new tokens
      const tokens = this.jwtManager.generateTokenPair(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
          userType: user.userType,
          roles: user.roles,
          permissions: user.permissions,
          isDoctor: user.isDoctor
        },
        tokenData.deviceId,
        deviceInfo
      );

      // Update refresh token usage
      await this.updateRefreshTokenUsage(tokenData.tokenId, ipAddress, userAgent);

      this.logger.info('Access token refreshed successfully', {
        userId: user.id,
        tokenId: tokenData.tokenId
      });

      return { success: true, tokens };

    } catch (error) {
      this.logger.error('Token refresh failed', {
        error: error.message
      });

      return { success: false, error: 'Token refresh failed' };
    }
  }

  // =============================================================================
  // PASSWORD MANAGEMENT
  // =============================================================================

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.passwordManager.verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Validate new password
      const passwordValidation = this.passwordManager.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.errors.join(', ') };
      }

      // Check password history (prevent reuse)
      const isPasswordInHistory = await this.checkPasswordHistory(userId, newPassword);
      if (isPasswordInHistory) {
        return { success: false, error: 'New password cannot be the same as recent passwords' };
      }

      // Hash new password
      const newPasswordHash = await this.passwordManager.hashPassword(newPassword);

      // Store current password in history
      await this.addToPasswordHistory(userId, user.passwordHash);

      // Update user password
      await this.userRepository.updatePassword(userId, newPasswordHash, userId);

      // Invalidate all user sessions
      await this.invalidateAllUserSessions(userId);

      // Audit password change
      await this.passwordManager.auditPasswordChange(userId, 'change', ipAddress, userAgent);

      // Publish password change event
      await this.publishPasswordChangeEvent(userId, ipAddress);

      this.logger.info('Password changed successfully', {
        userId,
        ipAddress
      });

      return { success: true };

    } catch (error) {
      this.logger.error('Password change failed', {
        userId,
        error: error.message
      });

      return { success: false, error: 'Password change failed' };
    }
  }

  async forgotPassword(email: string, ipAddress: string, userAgent: string): Promise<PasswordResetResult> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // Always return success to prevent email enumeration
        return { success: true, message: 'If an account exists with this email, a password reset link has been sent' };
      }

      // Check rate limiting for password reset
      await this.checkPasswordResetRateLimit(email, ipAddress);

      // Generate reset token
      const resetToken = this.generatePasswordResetToken();
      const tokenId = uuidv7();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store reset token
      await this.storePasswordResetToken({
        userId: user.id,
        tokenId,
        email,
        expiresAt,
        isUsed: false,
        createdAt: new Date(),
        ipAddress,
        userAgent
      });

      // TODO: Send password reset email
      // await this.sendPasswordResetEmail(user.email, resetToken);

      this.logger.info('Password reset token generated', {
        userId: user.id,
        email,
        tokenId,
        ipAddress
      });

      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
        resetToken
      };

    } catch (error) {
      this.logger.error('Forgot password failed', {
        email,
        error: error.message
      });

      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      };
    }
  }

  async resetPassword(token: string, newPassword: string, ipAddress: string, userAgent: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate reset token
      const resetTokenData = await this.validatePasswordResetToken(token);
      if (!resetTokenData) {
        return { success: false, error: 'Invalid or expired reset token' };
      }

      // Validate new password
      const passwordValidation = this.passwordManager.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.errors.join(', ') };
      }

      // Hash new password
      const newPasswordHash = await this.passwordManager.hashPassword(newPassword);

      // Update user password
      await this.userRepository.updatePassword(resetTokenData.userId, newPasswordHash, 'system');

      // Mark reset token as used
      await this.markPasswordResetTokenAsUsed(resetTokenData.id);

      // Invalidate all user sessions
      await this.invalidateAllUserSessions(resetTokenData.userId);

      // Audit password reset
      await this.passwordManager.auditPasswordChange(resetTokenData.userId, 'reset', ipAddress, userAgent);

      // Publish password reset event
      await this.publishPasswordResetEvent(resetTokenData.userId, ipAddress);

      this.logger.info('Password reset completed', {
        userId: resetTokenData.userId,
        tokenId: resetTokenData.tokenId,
        ipAddress
      });

      return { success: true };

    } catch (error) {
      this.logger.error('Password reset failed', {
        error: error.message
      });

      return { success: false, error: 'Password reset failed' };
    }
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  async getUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const query = `
        SELECT *
        FROM user_schema.user_sessions
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;

      const result = await this.db.query(query, [userId]);
      return result.rows.map(this.mapRowToSession);

    } catch (error) {
      this.logger.error('Failed to get user sessions', {
        userId,
        error: error.message
      });
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    try {
      const query = `
        UPDATE user_schema.user_sessions
        SET is_active = false, logout_at = NOW(), logout_reason = 'force'
        WHERE id = $1 AND user_id = $2
      `;

      await this.db.query(query, [sessionId, userId]);

      this.logger.info('Session revoked', {
        sessionId,
        userId
      });

    } catch (error) {
      this.logger.error('Failed to revoke session', {
        sessionId,
        userId,
        error: error.message
      });
      throw new Error(`Failed to revoke session: ${error.message}`);
    }
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    try {
      const query = `
        UPDATE user_schema.user_sessions
        SET is_active = false, logout_at = NOW(), logout_reason = 'force'
        WHERE user_id = $1 AND is_active = true
        ${exceptSessionId ? 'AND id != $2' : ''}
      `;

      const params = exceptSessionId ? [userId, exceptSessionId] : [userId];
      await this.db.query(query, params);

      this.logger.info('All sessions revoked for user', {
        userId,
        exceptSessionId
      });

    } catch (error) {
      this.logger.error('Failed to revoke all sessions', {
        userId,
        exceptSessionId,
        error: error.message
      });
      throw new Error(`Failed to revoke all sessions: ${error.message}`);
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private async findUserForLogin(identifier: string): Promise<User | null> {
    // Try username first, then email
    let user = await this.userRepository.findByUsername(identifier);
    if (!user) {
      user = await this.userRepository.findByEmail(identifier);
    }
    return user;
  }

  private checkAccountStatus(user: User): { isValid: boolean; reason?: LoginFailureReason; error?: string } {
    if (!user.isActive) {
      return { isValid: false, reason: LoginFailureReason.ACCOUNT_INACTIVE, error: 'Account is inactive' };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { isValid: false, reason: LoginFailureReason.ACCOUNT_LOCKED, error: 'Account is temporarily locked' };
    }

    return { isValid: true };
  }

  private async handleFailedLogin(user: User, ipAddress: string, userAgent: string): Promise<void> {
    const failedAttempts = await this.userRepository.incrementFailedLoginAttempts(user.id);

    if (failedAttempts >= config.password.maxFailedAttempts) {
      const lockDuration = this.parseDurationToMs(config.password.lockoutDuration);
      await this.userRepository.lockUser(user.id, lockDuration);

      this.logger.security('Account locked due to failed login attempts', {
        userId: user.id,
        username: user.username,
        failedAttempts,
        ipAddress
      });
    }

    await this.recordFailedLoginAttempt(user.username, ipAddress, userAgent, LoginFailureReason.INVALID_CREDENTIALS);
  }

  private generateDeviceId(userId: string, deviceInfo: DeviceInfo): string {
    const deviceString = `${userId}-${deviceInfo.ip}-${deviceInfo.platform}-${deviceInfo.browser}`;
    return crypto.createHash('sha256').update(deviceString).digest('hex').substring(0, 32);
  }

  private parseDurationToMs(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 3600 * 1000;
      case 'd': return value * 24 * 3600 * 1000;
      default: return parseInt(duration) * 1000;
    }
  }

  private generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async createUserSession(
    userId: string,
    deviceId: string,
    deviceInfo: DeviceInfo,
    tokens: TokenPair
  ): Promise<UserSession> {
    try {
      const session: UserSession = {
        id: uuidv7(),
        userId,
        deviceId,
        deviceInfo,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenId: uuidv7(),
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
        loginAt: new Date()
      };

      const query = `
        INSERT INTO user_schema.user_sessions (
          id, user_id, device_id, device_info, access_token, refresh_token,
          refresh_token_id, is_active, last_activity_at, expires_at,
          created_at, login_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `;

      await this.db.query(query, [
        session.id,
        session.userId,
        session.deviceId,
        JSON.stringify(session.deviceInfo),
        session.accessToken,
        session.refreshToken,
        session.refreshTokenId,
        session.isActive,
        session.lastActivityAt,
        session.expiresAt
      ]);

      return session;

    } catch (error) {
      this.logger.error('Failed to create user session', {
        userId,
        error: error.message
      });
      throw new Error(`Failed to create user session: ${error.message}`);
    }
  }

  private async updateUserSession(sessionId: string, updates: Partial<UserSession>): Promise<void> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const query = `UPDATE user_schema.user_sessions SET ${setClause} WHERE id = $1`;
    await this.db.query(query, [sessionId, ...values]);
  }

  private async recordFailedLoginAttempt(
    username: string,
    ipAddress: string,
    userAgent: string,
    reason: LoginFailureReason
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO user_schema.login_attempts (
          username, ip_address, user_agent, success, failure_reason, attempted_at
        ) VALUES ($1, $2, $3, false, $4, NOW())
      `;

      await this.db.query(query, [username, ipAddress, userAgent, reason]);

    } catch (error) {
      this.logger.error('Failed to record failed login attempt', {
        username,
        error: error.message
      });
    }
  }

  private async recordSuccessfulLoginAttempt(
    user: User,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO user_schema.login_attempts (
          username, ip_address, user_agent, success, user_id, attempted_at
        ) VALUES ($1, $2, $3, true, $4, NOW())
      `;

      await this.db.query(query, [user.username, ipAddress, userAgent, user.id]);

    } catch (error) {
      this.logger.error('Failed to record successful login attempt', {
        userId: user.id,
        error: error.message
      });
    }
  }

  // =============================================================================
  // EVENT PUBLISHING
  // =============================================================================

  private async publishUserLoginEvent(user: User, deviceInfo: DeviceInfo, ipAddress: string): Promise<void> {
    try {
      await this.eventBus.publish('user.login', {
        userId: user.id,
        username: user.username,
        userType: user.userType,
        loginAt: new Date(),
        ipAddress,
        userAgent: deviceInfo.userAgent,
        deviceInfo: {
          platform: deviceInfo.platform,
          browser: deviceInfo.browser,
          os: deviceInfo.os
        }
      });

    } catch (error) {
      this.logger.error('Failed to publish user login event', {
        userId: user.id,
        error: error.message
      });
    }
  }

  private async publishUserLogoutEvent(userId: string, reason: string): Promise<void> {
    try {
      await this.eventBus.publish('user.logout', {
        userId,
        logoutAt: new Date(),
        reason
      });

    } catch (error) {
      this.logger.error('Failed to publish user logout event', {
        userId,
        error: error.message
      });
    }
  }

  private async publishPasswordChangeEvent(userId: string, ipAddress: string): Promise<void> {
    try {
      await this.eventBus.publish('user.password_changed', {
        userId,
        changedAt: new Date(),
        ipAddress,
        changeReason: 'user_initiated'
      });

    } catch (error) {
      this.logger.error('Failed to publish password change event', {
        userId,
        error: error.message
      });
    }
  }

  private async publishPasswordResetEvent(userId: string, ipAddress: string): Promise<void> {
    try {
      await this.eventBus.publish('user.password_changed', {
        userId,
        changedAt: new Date(),
        ipAddress,
        changeReason: 'password_reset'
      });

    } catch (error) {
      this.logger.error('Failed to publish password reset event', {
        userId,
        error: error.message
      });
    }
  }

  // =============================================================================
  // PLACEHOLDER METHODS (TODO: Implement)
  // =============================================================================

  private async checkLoginRateLimit(username: string, ipAddress: string): Promise<void> {
    // TODO: Implement rate limiting using Redis
  }

  private async checkPasswordResetRateLimit(email: string, ipAddress: string): Promise<void> {
    // TODO: Implement password reset rate limiting
  }

  private async validateRefreshToken(tokenId: string, userId: string): Promise<boolean> {
    // TODO: Implement refresh token validation
    return true;
  }

  private async invalidateRefreshToken(refreshToken: string): Promise<void> {
    // TODO: Implement refresh token invalidation
  }

  private async updateRefreshTokenUsage(tokenId: string, ipAddress: string, userAgent: string): Promise<void> {
    // TODO: Implement refresh token usage tracking
  }

  private async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    // TODO: Implement password history check
    return false;
  }

  private async addToPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    // TODO: Implement password history tracking
  }

  private async invalidateAllUserSessions(userId: string): Promise<void> {
    // TODO: Implement session invalidation
  }

  private async storePasswordResetToken(tokenData: any): Promise<void> {
    // TODO: Implement password reset token storage
  }

  private async validatePasswordResetToken(token: string): Promise<any> {
    // TODO: Implement password reset token validation
    return null;
  }

  private async markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
    // TODO: Implement password reset token marking
  }

  private mapRowToSession(row: any): UserSession {
    return {
      id: row.id,
      userId: row.user_id,
      deviceId: row.device_id,
      deviceInfo: row.device_info,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      refreshTokenId: row.refresh_token_id,
      isActive: row.is_active,
      lastActivityAt: row.last_activity_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      loginAt: row.login_at,
      logoutAt: row.logout_at,
      logoutReason: row.logout_reason
    };
  }
}

export default AuthService;