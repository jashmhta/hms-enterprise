// HMS User Service JWT Utilities
// Production-ready JWT implementation with RS256 and key rotation

import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '@/config';
import { Logger } from '@hms/shared/logger';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  username: string;
  userType: string;
  roles: string[];
  permissions: string[];
  isDoctor: boolean;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  jti?: string; // JWT ID for token tracking
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RefreshTokenData {
  userId: string;
  tokenId: string;
  deviceId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    platform?: string;
    browser?: string;
  };
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  lastUsed?: Date;
}

export interface DeviceInfo {
  userAgent: string;
  ip: string;
  platform?: string;
  browser?: string;
  os?: string;
}

// =============================================================================
// JWT MANAGER CLASS
// =============================================================================

export class JWTManager {
  private publicKey: string;
  private privateKey: string;
  private logger: Logger;
  private keyId: string;
  private currentKeyCreatedAt: Date;

  constructor(logger: Logger) {
    this.logger = logger;
    this.keyId = this.generateKeyId();
    this.currentKeyCreatedAt = new Date();
  }

  // =============================================================================
  // KEY MANAGEMENT
  // =============================================================================

  async initializeKeys(): Promise<void> {
    try {
      // Try to load existing keys
      const publicKeyExists = await this.fileExists(config.jwt.publicKeyPath);
      const privateKeyExists = await this.fileExists(config.jwt.privateKeyPath);

      if (publicKeyExists && privateKeyExists) {
        this.logger.info('Loading existing JWT keys', {
          publicKeyPath: config.jwt.publicKeyPath,
          privateKeyPath: config.jwt.privateKeyPath
        });

        this.publicKey = await fs.readFile(config.jwt.publicKeyPath, 'utf8');
        this.privateKey = await fs.readFile(config.jwt.privateKeyPath, 'utf8');
      } else {
        this.logger.info('Generating new JWT key pair', {
          publicKeyPath: config.jwt.publicKeyPath,
          privateKeyPath: config.jwt.privateKeyPath
        });

        await this.generateAndSaveKeys();
      }

      // Validate keys
      this.validateKeys();

    } catch (error) {
      this.logger.error('Failed to initialize JWT keys', { error: error.message });
      throw new Error(`JWT key initialization failed: ${error.message}`);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async generateAndSaveKeys(): Promise<void> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Ensure directory exists
    const publicKeyDir = path.dirname(config.jwt.publicKeyPath);
    const privateKeyDir = path.dirname(config.jwt.privateKeyPath);

    await fs.mkdir(publicKeyDir, { recursive: true });
    await fs.mkdir(privateKeyDir, { recursive: true });

    // Save keys with restricted permissions
    await fs.writeFile(config.jwt.publicKeyPath, publicKey, { mode: 0o644 });
    await fs.writeFile(config.jwt.privateKeyPath, privateKey, { mode: 0o600 });

    this.publicKey = publicKey;
    this.privateKey = privateKey;

    this.logger.info('Generated and saved new JWT key pair', { keyId: this.keyId });
  }

  private validateKeys(): void {
    try {
      // Test keys by creating and verifying a test token
      const testPayload = { test: 'validation' };
      const testToken = jwt.sign(testPayload, this.privateKey, {
        algorithm: 'RS256',
        expiresIn: '1m'
      });

      const decoded = jwt.verify(testToken, this.publicKey) as any;
      if (decoded.test !== 'validation') {
        throw new Error('Key validation failed');
      }

      this.logger.info('JWT keys validated successfully');

    } catch (error) {
      this.logger.error('JWT key validation failed', { error: error.message });
      throw new Error(`Invalid JWT keys: ${error.message}`);
    }
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  // =============================================================================
  // TOKEN CREATION
  // =============================================================================

  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>): string {
    const now = Math.floor(Date.now() / 1000);
    const jti = this.generateTokenId();

    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
      jti
    };

    return jwt.sign(fullPayload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: config.jwt.accessTokenExpiry,
      header: {
        kid: this.keyId,
        typ: 'JWT'
      }
    });
  }

  generateRefreshToken(userId: string, deviceId: string): string {
    const payload = {
      sub: userId,
      type: 'refresh',
      deviceId,
      iat: Math.floor(Date.now() / 1000),
      jti: this.generateTokenId()
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: config.jwt.refreshTokenExpiry,
      header: {
        kid: this.keyId,
        typ: 'JWT'
      }
    });
  }

  generateTokenPair(
    payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>,
    deviceId: string,
    deviceInfo: DeviceInfo
  ): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload.sub, deviceId);

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpirationToSeconds(config.jwt.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer'
    };
  }

  // =============================================================================
  // TOKEN VERIFICATION
  // =============================================================================

  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
      }) as JWTPayload;

      // Validate required fields
      this.validateAccessTokenPayload(decoded);

      return decoded;

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      } else {
        throw new Error(`Token verification failed: ${error.message}`);
      }
    }
  }

  verifyRefreshToken(token: string): { userId: string; deviceId: string; tokenId: string } {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: config.jwt.issuer
      }) as any;

      // Validate refresh token specific fields
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      if (!decoded.sub || !decoded.deviceId || !decoded.jti) {
        throw new Error('Invalid refresh token structure');
      }

      return {
        userId: decoded.sub,
        deviceId: decoded.deviceId,
        tokenId: decoded.jti
      };

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error(`Refresh token verification failed: ${error.message}`);
      }
    }
  }

  // =============================================================================
  // TOKEN VALIDATION HELPERS
  // =============================================================================

  private validateAccessTokenPayload(payload: JWTPayload): void {
    const requiredFields = ['sub', 'email', 'username', 'userType', 'roles', 'permissions'];

    for (const field of requiredFields) {
      if (!(field in payload)) {
        throw new Error(`Missing required field in access token: ${field}`);
      }
    }

    // Validate data types
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new Error('Invalid user ID in token');
    }

    if (!Array.isArray(payload.roles)) {
      throw new Error('Invalid roles in token');
    }

    if (!Array.isArray(payload.permissions)) {
      throw new Error('Invalid permissions in token');
    }

    if (typeof payload.isDoctor !== 'boolean') {
      throw new Error('Invalid isDoctor flag in token');
    }
  }

  // =============================================================================
  // TOKEN UTILITIES
  // =============================================================================

  private generateTokenId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private parseExpirationToSeconds(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return parseInt(expiration);
    }
  }

  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    return expiration ? expiration < new Date() : true;
  }

  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader) {
      throw new Error('Authorization header is missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format');
    }

    return parts[1];
  }

  // =============================================================================
  // DEVICE INFO EXTRACTION
  // =============================================================================

  extractDeviceInfo(userAgent: string, ip: string): DeviceInfo {
    // Simple user agent parsing (can be enhanced with ua-parser-js)
    let platform = 'unknown';
    let browser = 'unknown';
    let os = 'unknown';

    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
      platform = 'mobile';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
      platform = 'mobile';
    }

    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
    }

    return {
      userAgent,
      ip,
      platform: platform || 'desktop',
      browser,
      os
    };
  }

  // =============================================================================
  // KEY ROTATION (FUTURE IMPLEMENTATION)
  // =============================================================================

  async shouldRotateKeys(): Promise<boolean> {
    const keyAge = Date.now() - this.currentKeyCreatedAt.getTime();
    const rotationInterval = this.parseExpirationToMs(config.jwt.keyRotationInterval);

    return keyAge >= rotationInterval;
  }

  private parseExpirationToMs(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 3600 * 1000;
      case 'd': return value * 24 * 3600 * 1000;
      default: return parseInt(expiration) * 1000;
    }
  }

  async rotateKeys(): Promise<void> {
    this.logger.info('Starting JWT key rotation');

    // Backup old keys
    const backupSuffix = new Date().toISOString().replace(/[:.]/g, '-');
    const oldPublicKeyPath = `${config.jwt.publicKeyPath}.backup.${backupSuffix}`;
    const oldPrivateKeyPath = `${config.jwt.privateKeyPath}.backup.${backupSuffix}`;

    try {
      // Backup existing keys
      if (this.publicKey && this.privateKey) {
        await fs.writeFile(oldPublicKeyPath, this.publicKey);
        await fs.writeFile(oldPrivateKeyPath, this.privateKey);
        this.logger.info('Backup up old JWT keys', {
          oldPublicKeyPath,
          oldPrivateKeyPath
        });
      }

      // Generate new keys
      await this.generateAndSaveKeys();

      // Update key metadata
      this.keyId = this.generateKeyId();
      this.currentKeyCreatedAt = new Date();

      this.logger.info('JWT key rotation completed', {
        newKeyId: this.keyId,
        backupSuffix
      });

    } catch (error) {
      this.logger.error('JWT key rotation failed', { error: error.message });
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  // =============================================================================
  // GETTERS
  // =============================================================================

  getKeyId(): string {
    return this.keyId;
  }

  getKeyAge(): number {
    return Date.now() - this.currentKeyCreatedAt.getTime();
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let jwtManagerInstance: JWTManager | null = null;

export function getJWTManager(logger?: Logger): JWTManager {
  if (!jwtManagerInstance) {
    if (!logger) {
      throw new Error('Logger instance required for JWT Manager initialization');
    }
    jwtManagerInstance = new JWTManager(logger);
  }
  return jwtManagerInstance;
}

export function initializeJWTManager(logger: Logger): JWTManager {
  jwtManagerInstance = new JWTManager(logger);
  return jwtManagerInstance;
}

export default JWTManager;