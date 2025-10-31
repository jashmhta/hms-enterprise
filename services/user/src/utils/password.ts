// HMS User Service Password Utilities
// Secure password hashing and validation with bcrypt

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from '@/config';
import { Logger } from '@hms/shared/logger';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  forbiddenPatterns: string[];
  forbiddenPasswords: string[];
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
}

export enum PasswordStrength {
  VERY_WEAK = 'very_weak',
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong'
}

export interface PasswordResetData {
  userId: string;
  tokenId: string;
  email: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================================================
// PASSWORD MANAGER CLASS
// =============================================================================

export class PasswordManager {
  private logger: Logger;
  private policy: PasswordPolicy;

  constructor(logger: Logger) {
    this.logger = logger;
    this.policy = this.loadPasswordPolicy();
  }

  // =============================================================================
  // PASSWORD HASHING
  // =============================================================================

  async hashPassword(password: string): Promise<string> {
    try {
      // Validate password before hashing
      const validation = this.validatePassword(password);
      if (!validation.isValid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate salt and hash
      const saltRounds = config.password.saltRounds;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      this.logger.debug('Password hashed successfully', {
        passwordLength: password.length,
        saltRounds,
        hashLength: hashedPassword.length
      });

      return hashedPassword;

    } catch (error) {
      this.logger.error('Password hashing failed', { error: error.message });
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);

      this.logger.debug('Password verification completed', {
        isValid,
        passwordLength: password.length,
        hashLength: hashedPassword.length
      });

      return isValid;

    } catch (error) {
      this.logger.error('Password verification failed', { error: error.message });
      throw new Error(`Password verification failed: ${error.message}`);
    }
  }

  // =============================================================================
  // PASSWORD VALIDATION
  // =============================================================================

  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    // Length validation
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    }

    if (password.length > this.policy.maxLength) {
      errors.push(`Password must not exceed ${this.policy.maxLength} characters`);
    }

    // Character type validation
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Forbidden patterns
    for (const pattern of this.policy.forbiddenPatterns) {
      if (new RegExp(pattern, 'i').test(password)) {
        errors.push(`Password contains forbidden pattern: ${pattern}`);
        break;
      }
    }

    // Forbidden passwords
    const normalizedPassword = password.toLowerCase();
    for (const forbidden of this.policy.forbiddenPasswords) {
      if (normalizedPassword === forbidden.toLowerCase()) {
        errors.push('Password is too common and not allowed');
        break;
      }
    }

    // Common weak password checks
    if (this.isCommonWeakPassword(password)) {
      errors.push('Password is too weak and easily guessable');
    }

    // Sequential character checks
    if (this.hasSequentialChars(password)) {
      errors.push('Password must not contain sequential characters');
    }

    // Repeated character checks
    if (this.hasRepeatedChars(password)) {
      errors.push('Password must not contain too many repeated characters');
    }

    const strength = this.calculatePasswordStrength(password);

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  // =============================================================================
  // PASSWORD STRENGTH CALCULATION
  // =============================================================================

  private calculatePasswordStrength(password: string): PasswordStrength {
    let score = 0;

    // Length score
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety score
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    // Complexity score
    if (password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 2;
    }

    // Penalty for common patterns
    if (this.isCommonWeakPassword(password)) score -= 2;
    if (this.hasSequentialChars(password)) score -= 1;
    if (this.hasRepeatedChars(password)) score -= 1;

    if (score <= 2) return PasswordStrength.VERY_WEAK;
    if (score <= 4) return PasswordStrength.WEAK;
    if (score <= 6) return PasswordStrength.FAIR;
    if (score <= 8) return PasswordStrength.GOOD;
    if (score <= 10) return PasswordStrength.STRONG;
    return PasswordStrength.VERY_STRONG;
  }

  // =============================================================================
  // PASSWORD POLICY HELPERS
  // =============================================================================

  private loadPasswordPolicy(): PasswordPolicy {
    return {
      minLength: config.password.minLength,
      maxLength: config.password.maxLength,
      requireUppercase: config.password.requireUppercase,
      requireLowercase: config.password.requireLowercase,
      requireNumbers: config.password.requireNumbers,
      requireSymbols: config.password.requireSymbols,
      forbiddenPatterns: [
        'password',
        '123456',
        'qwerty',
        'abc123',
        '(.)\\1{3,}', // Repeated characters
        '(?:012|123|234|345|456|567|678|789|890)', // Sequential numbers
        '(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)' // Sequential letters
      ],
      forbiddenPasswords: [
        'password',
        '123456',
        '123456789',
        'qwerty',
        'password123',
        'admin',
        'root',
        'user',
        'test',
        'guest',
        'default',
        'changeme',
        'hms123456',
        'admin123'
      ]
    };
  }

  private isCommonWeakPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890',
      'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'iloveyou',
      '123123', 'abc123', 'Password1', 'admin123', 'root123'
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  private hasSequentialChars(password: string): boolean {
    // Check for sequential numbers
    for (let i = 0; i < password.length - 2; i++) {
      if (password.charCodeAt(i) + 1 === password.charCodeAt(i + 1) &&
          password.charCodeAt(i + 1) + 1 === password.charCodeAt(i + 2)) {
        return true;
      }
    }

    // Check for sequential letters
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.toLowerCase().charCodeAt(i);
      const char2 = password.toLowerCase().charCodeAt(i + 1);
      const char3 = password.toLowerCase().charCodeAt(i + 2);

      if (char1 + 1 === char2 && char2 + 1 === char3 &&
          char1 >= 97 && char1 <= 122) { // a-z range
        return true;
      }
    }

    return false;
  }

  private hasRepeatedChars(password: string): boolean {
    // Check for 3 or more consecutive identical characters
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i + 1] === password[i + 2]) {
        return true;
      }
    }
    return false;
  }

  // =============================================================================
  // PASSWORD RESET TOKENS
  // =============================================================================

  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';

    // Ensure at least one character from each required category
    if (this.policy.requireUppercase) {
      password += this.getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }
    if (this.policy.requireLowercase) {
      password += this.getRandomChar('abcdefghijklmnopqrstuvwxyz');
    }
    if (this.policy.requireNumbers) {
      password += this.getRandomChar('0123456789');
    }
    if (this.policy.requireSymbols) {
      password += this.getRandomChar('!@#$%^&*()_+-=[]{}|;:,.<>?');
    }

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(charset);
    }

    // Shuffle the password
    return password.split('').sort(() => crypto.randomInt(0, password.length)).join('');
  }

  private getRandomChar(charset: string): string {
    return charset[crypto.randomInt(0, charset.length)];
  }

  // =============================================================================
  // PASSWORD SECURITY UTILITIES
  // =============================================================================

  async checkForCompromisedPassword(password: string): Promise<boolean> {
    // In a production environment, this would check against HaveIBeenPwned API
    // For now, we'll do basic checks
    const commonCompromisedPasswords = [
      'password', '123456', '123456789', 'qwerty', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890'
    ];

    return commonCompromisedPasswords.includes(password.toLowerCase());
  }

  calculatePasswordEntropy(password: string): number {
    const charSets = [
      { regex: /[a-z]/, size: 26 }, // lowercase
      { regex: /[A-Z]/, size: 26 }, // uppercase
      { regex: /\d/, size: 10 },     // numbers
      { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, size: 32 } // symbols
    ];

    let charsetSize = 0;
    for (const charSet of charSets) {
      if (charSet.regex.test(password)) {
        charsetSize += charSet.size;
      }
    }

    return Math.log2(Math.pow(charsetSize, password.length));
  }

  // =============================================================================
  // POLICY MANAGEMENT
  // =============================================================================

  getPasswordPolicy(): PasswordPolicy {
    return { ...this.policy };
  }

  updatePasswordPolicy(newPolicy: Partial<PasswordPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
    this.logger.info('Password policy updated', { policy: this.policy });
  }

  // =============================================================================
  // AUDIT AND LOGGING
  // =============================================================================

  async auditPasswordChange(
    userId: string,
    action: 'change' | 'reset' | 'force_reset',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    this.logger.audit(`Password ${action}`, {
      userId,
      action,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  async auditPasswordValidation(
    userId: string,
    validation: PasswordValidationResult,
    ipAddress?: string
  ): Promise<void> {
    if (!validation.isValid) {
      this.logger.security('Password validation failed', {
        userId,
        errors: validation.errors,
        strength: validation.strength,
        ipAddress,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let passwordManagerInstance: PasswordManager | null = null;

export function getPasswordManager(logger?: Logger): PasswordManager {
  if (!passwordManagerInstance) {
    if (!logger) {
      throw new Error('Logger instance required for Password Manager initialization');
    }
    passwordManagerInstance = new PasswordManager(logger);
  }
  return passwordManagerInstance;
}

export function initializePasswordManager(logger: Logger): PasswordManager {
  passwordManagerInstance = new PasswordManager(logger);
  return passwordManagerInstance;
}

export default PasswordManager;