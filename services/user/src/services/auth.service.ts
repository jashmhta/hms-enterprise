import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { User, LoginRequest } from '@/models/user.model';
import { DatabaseService } from './database.service';
import { RedisService } from './redis.service';
import { EmailService } from './email.service';

export class AuthService {
  private db: DatabaseService;
  private redis: RedisService;
  private emailService: EmailService;

  constructor() {
    this.db = new DatabaseService();
    this.redis = new RedisService();
    this.emailService = new EmailService();
  }

  async login(data: LoginRequest) {
    const user = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE email = $1 AND status = $2',
      [data.email, 'active']
    );

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    if (user.twoFactorStatus === 'enabled') {
      if (!data.twoFactorCode) {
        return {
          success: false,
          requiresTwoFactor: true,
          message: 'Two-factor authentication required'
        };
      }
    }

    const tokens = this.generateTokens(user);

    return {
      success: true,
      user: this.sanitizeUser(user),
      tokens
    };
  }

  async abdmLogin(data: any) {
    const user = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE abdm_health_id = $1',
      [data.healthId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    const tokens = this.generateTokens(user);
    return { success: true, user: this.sanitizeUser(user), tokens };
  }

  private generateTokens(user: User) {
    const accessToken = jwt.sign(
      { user: this.sanitizeUser(user) },
      process.env.JWT_PRIVATE_KEY as string,
      { expiresIn: '15m', algorithm: 'RS256' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_PRIVATE_KEY as string,
      { expiresIn: '7d', algorithm: 'RS256' }
    );

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private sanitizeUser(user: User) {
    const { passwordHash, twoFactorSecret, ...sanitized } = user;
    return sanitized;
  }
}
