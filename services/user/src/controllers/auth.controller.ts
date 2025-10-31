// HMS User Service Authentication Controller
// HTTP request handlers for authentication endpoints

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth.service';
import { Logger } from '@hms/shared/logger';
import {
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateSecurityRequest,
  ValidationResult
} from '@/models/user';
import { config } from '@/config';

// =============================================================================
// AUTHENTICATION CONTROLLER CLASS
// =============================================================================

export class AuthController {
  private authService: AuthService;
  private logger: Logger;

  constructor(authService: AuthService, logger: Logger) {
    this.authService = authService;
    this.logger = logger.withContext({ controller: 'AuthController' });
  }

  // =============================================================================
  // AUTHENTICATION ENDPOINTS
  // =============================================================================

  /**
   * POST /auth/login
   * User login with username/password
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loginRequest: LoginRequest = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Validate request body
      const validation = this.validateLoginRequest(loginRequest);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          errors: validation.errors
        });
        return;
      }

      // Attempt login
      const authResult = await this.authService.login(loginRequest, ipAddress, userAgent);

      if (!authResult.success) {
        res.status(401).json({
          success: false,
          message: authResult.error || 'Authentication failed',
          requiresTwoFactor: authResult.requiresTwoFactor,
          twoFactorMethods: authResult.twoFactorMethods
        });
        return;
      }

      // Build response
      const response: LoginResponse = {
        user: this.mapUserToProfile(authResult.user!),
        tokens: authResult.tokens!,
        session: {
          sessionId: authResult.session!.id,
          expiresAt: authResult.session!.expiresAt
        },
        permissions: authResult.user!.permissions,
        roles: authResult.user!.roles
      };

      // Set refresh token in secure cookie
      if (authResult.tokens?.refreshToken) {
        res.cookie('refreshToken', authResult.tokens.refreshToken, {
          httpOnly: true,
          secure: config.session.secureCookie,
          sameSite: config.session.sameSite,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: response
      });

      this.logger.info('User logged in successfully', {
        userId: authResult.user?.id,
        username: authResult.user?.username,
        ipAddress
      });

    } catch (error) {
      this.logger.error('Login endpoint error', {
        error: error.message,
        body: { ...req.body, password: '[REDACTED]' }
      });
      next(error);
    }
  }

  /**
   * POST /auth/login-with-2fa
   * User login with two-factor authentication
   */
  async loginWithTwoFactor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password, twoFactorCode } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!username || !password || !twoFactorCode) {
        res.status(400).json({
          success: false,
          message: 'Username, password, and two-factor code are required'
        });
        return;
      }

      const loginRequest: LoginRequest = { username, password };

      // Attempt login with 2FA
      const authResult = await this.authService.loginWithTwoFactor(
        loginRequest,
        twoFactorCode,
        ipAddress,
        userAgent
      );

      if (!authResult.success) {
        res.status(401).json({
          success: false,
          message: authResult.error || 'Two-factor authentication failed'
        });
        return;
      }

      // Build response
      const response: LoginResponse = {
        user: this.mapUserToProfile(authResult.user!),
        tokens: authResult.tokens!,
        session: {
          sessionId: authResult.session!.id,
          expiresAt: authResult.session!.expiresAt
        },
        permissions: authResult.user!.permissions,
        roles: authResult.user!.roles
      };

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: response
      });

    } catch (error) {
      this.logger.error('2FA login endpoint error', {
        error: error.message,
        body: { ...req.body, password: '[REDACTED]', twoFactorCode: '[REDACTED]' }
      });
      next(error);
    }
  }

  /**
   * POST /auth/logout
   * User logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub;
      const sessionId = (req as any).sessionId;
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      // Logout user
      await this.authService.logout(
        userId,
        sessionId || 'unknown',
        refreshToken || 'unknown',
        'manual'
      );

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.session.secureCookie,
        sameSite: config.session.sameSite,
        path: '/'
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

      this.logger.info('User logged out successfully', {
        userId,
        sessionId
      });

    } catch (error) {
      this.logger.error('Logout endpoint error', {
        error: error.message,
        userId: (req as any).user?.sub
      });
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Refresh token
      const refreshResult = await this.authService.refreshAccessToken(
        refreshToken,
        ipAddress,
        userAgent
      );

      if (!refreshResult.success) {
        res.status(401).json({
          success: false,
          message: refreshResult.error || 'Token refresh failed'
        });
        return;
      }

      // Set new refresh token in cookie
      if (refreshResult.tokens?.refreshToken) {
        res.cookie('refreshToken', refreshResult.tokens.refreshToken, {
          httpOnly: true,
          secure: config.session.secureCookie,
          sameSite: config.session.sameSite,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: refreshResult.tokens
      });

    } catch (error) {
      this.logger.error('Token refresh endpoint error', {
        error: error.message
      });
      next(error);
    }
  }

  // =============================================================================
  // PASSWORD MANAGEMENT ENDPOINTS
  // =============================================================================

  /**
   * POST /auth/change-password
   * Change user password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const changePasswordRequest: ChangePasswordRequest = req.body;

      // Validate request
      const validation = this.validateChangePasswordRequest(changePasswordRequest);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          errors: validation.errors
        });
        return;
      }

      // Change password
      const result = await this.authService.changePassword(
        userId,
        changePasswordRequest.currentPassword!,
        changePasswordRequest.newPassword!,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Password change failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

      this.logger.info('Password changed successfully', {
        userId,
        ipAddress
      });

    } catch (error) {
      this.logger.error('Change password endpoint error', {
        error: error.message,
        userId: (req as any).user?.sub
      });
      next(error);
    }
  }

  /**
   * POST /auth/forgot-password
   * Initiate password reset
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const forgotPasswordRequest: ForgotPasswordRequest = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Validate request
      const validation = this.validateForgotPasswordRequest(forgotPasswordRequest);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          errors: validation.errors
        });
        return;
      }

      // Process forgot password
      const result = await this.authService.forgotPassword(
        forgotPasswordRequest.email,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        message: result.message
      });

      this.logger.info('Password reset initiated', {
        email: forgotPasswordRequest.email,
        ipAddress
      });

    } catch (error) {
      this.logger.error('Forgot password endpoint error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  }

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resetPasswordRequest: ResetPasswordRequest = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Validate request
      const validation = this.validateResetPasswordRequest(resetPasswordRequest);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          errors: validation.errors
        });
        return;
      }

      // Reset password
      const result = await this.authService.resetPassword(
        resetPasswordRequest.token,
        resetPasswordRequest.newPassword!,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Password reset failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });

      this.logger.info('Password reset completed', {
        token: resetPasswordRequest.token.substring(0, 8) + '...',
        ipAddress
      });

    } catch (error) {
      this.logger.error('Reset password endpoint error', {
        error: error.message,
        body: { ...req.body, token: '[REDACTED]', newPassword: '[REDACTED]' }
      });
      next(error);
    }
  }

  // =============================================================================
  // SECURITY ENDPOINTS
  // =============================================================================

  /**
   * GET /auth/me
   * Get current user profile
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userPayload = (req as any).user;

      if (!userPayload) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: userPayload.sub,
          email: userPayload.email,
          username: userPayload.username,
          userType: userPayload.userType,
          roles: userPayload.roles,
          permissions: userPayload.permissions,
          isDoctor: userPayload.isDoctor
        }
      });

    } catch (error) {
      this.logger.error('Get me endpoint error', {
        error: error.message
      });
      next(error);
    }
  }

  /**
   * POST /auth/sessions
   * Get user sessions
   */
  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      // Get user sessions
      const sessions = await this.authService.getUserSessions(userId);

      res.status(200).json({
        success: true,
        data: sessions.map(session => ({
          id: session.id,
          deviceInfo: session.deviceInfo,
          isActive: session.isActive,
          createdAt: session.createdAt,
          lastActivityAt: session.lastActivityAt,
          expiresAt: session.expiresAt,
          currentSession: session.id === (req as any).sessionId
        }))
      });

    } catch (error) {
      this.logger.error('Get sessions endpoint error', {
        error: error.message
      });
      next(error);
    }
  }

  /**
   * DELETE /auth/sessions/:sessionId
   * Revoke a specific session
   */
  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub;
      const { sessionId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
        return;
      }

      // Revoke session
      await this.authService.revokeSession(sessionId, userId);

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully'
      });

      this.logger.info('Session revoked', {
        userId,
        sessionId
      });

    } catch (error) {
      this.logger.error('Revoke session endpoint error', {
        error: error.message,
        sessionId: req.params.sessionId
      });
      next(error);
    }
  }

  /**
   * DELETE /auth/sessions
   * Revoke all sessions except current
   */
  async revokeAllSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub;
      const currentSessionId = (req as any).sessionId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      // Revoke all sessions except current
      await this.authService.revokeAllSessions(userId, currentSessionId);

      res.status(200).json({
        success: true,
        message: 'All other sessions revoked successfully'
      });

      this.logger.info('All sessions revoked', {
        userId,
        currentSessionId
      });

    } catch (error) {
      this.logger.error('Revoke all sessions endpoint error', {
        error: error.message
      });
      next(error);
    }
  }

  // =============================================================================
  // PRIVATE VALIDATION METHODS
  // =============================================================================

  private validateLoginRequest(request: LoginRequest): ValidationResult {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    if (!request.username || request.username.trim().length < 1) {
      errors.push({
        field: 'username',
        message: 'Username is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!request.password || request.password.length < 1) {
      errors.push({
        field: 'password',
        message: 'Password is required',
        code: 'REQUIRED_FIELD'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  private validateChangePasswordRequest(request: ChangePasswordRequest): ValidationResult {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    if (!request.currentPassword || request.currentPassword.length < 1) {
      errors.push({
        field: 'currentPassword',
        message: 'Current password is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!request.newPassword || request.newPassword.length < 8) {
      errors.push({
        field: 'newPassword',
        message: 'New password must be at least 8 characters long',
        code: 'INVALID_PASSWORD'
      });
    }

    if (request.newPassword !== request.confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: 'Password confirmation does not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  private validateForgotPasswordRequest(request: ForgotPasswordRequest): ValidationResult {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    if (!request.email || !this.isValidEmail(request.email)) {
      errors.push({
        field: 'email',
        message: 'Valid email address is required',
        code: 'INVALID_EMAIL'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  private validateResetPasswordRequest(request: ResetPasswordRequest): ValidationResult {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    if (!request.token || request.token.trim().length < 1) {
      errors.push({
        field: 'token',
        message: 'Reset token is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!request.newPassword || request.newPassword.length < 8) {
      errors.push({
        field: 'newPassword',
        message: 'New password must be at least 8 characters long',
        code: 'INVALID_PASSWORD'
      });
    }

    if (request.newPassword !== request.confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: 'Password confirmation does not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.map(e => e.message)
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private mapUserToProfile(user: any): any {
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

export default AuthController;