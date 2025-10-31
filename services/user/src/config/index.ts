// HMS User Service Configuration
// Environment-based configuration with validation

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface Config {
  // Service Configuration
  nodeEnv: string;
  port: number;
  serviceName: string;
  logLevel: string;

  // Database Configuration
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean | any;
    pool: {
      min: number;
      max: number;
      connectionTimeoutMillis: number;
      statementTimeout: number;
    };
  };

  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    connectionTimeoutMillis: number;
  };

  // JWT Configuration
  jwt: {
    publicKeyPath: string;
    privateKeyPath: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    keyRotationInterval: string;
    issuer: string;
    audience: string;
  };

  // Password Configuration
  password: {
    saltRounds: number;
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    maxFailedAttempts: number;
    lockoutDuration: string;
  };

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    loginWindowMs: number;
    loginMaxRequests: number;
    passwordResetWindowMs: number;
    passwordResetMaxRequests: number;
  };

  // Email Configuration
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
    fromName: string;
  };

  // CORS Configuration
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    headers: string[];
  };

  // Security Headers Configuration
  helmet: {
    cspDirective: string;
    hstsMaxAge: number;
    hstsIncludeSubdomains: boolean;
    hstsPreload: boolean;
  };

  // Session Configuration
  session: {
    secret: string;
    maxAge: string;
    secureCookie: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };

  // Event Bus Configuration
  eventBus: {
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
    enableDeadLetterQueue: boolean;
    defaultRetryAttempts: number;
    defaultTimeout: number;
  };

  // Audit Logging Configuration
  audit: {
    logPath: string;
    enabled: boolean;
    retentionDays: number;
  };

  // Monitoring Configuration
  monitoring: {
    enabled: boolean;
    metricsPort: number;
    healthCheckInterval: number;
  };

  // Development Settings
  development: {
    autoCreateAdmin: boolean;
    adminEmail: string;
    adminPassword: string;
    adminFirstName: string;
    adminLastName: string;
  };

  // API Documentation
  api: {
    enableSwagger: boolean;
    swaggerPath: string;
    swaggerTitle: string;
    swaggerDescription: string;
    swaggerVersion: string;
  };
}

// Helper function to convert duration strings to milliseconds
function parseDurationToMs(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1));

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return parseInt(duration);
  }
}

// Helper function to get environment variable with default
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

// Helper function to get boolean environment variable
function getEnvBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Helper function to get number environment variable
function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  const parsed = parseInt(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

// Create configuration object
export const config: Config = {
  // Service Configuration
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3001),
  serviceName: getEnvVar('SERVICE_NAME', 'user-service'),
  logLevel: getEnvVar('LOG_LEVEL', 'info'),

  // Database Configuration
  database: {
    host: getEnvVar('DB_HOST', 'localhost'),
    port: getEnvNumber('DB_PORT', 5432),
    name: getEnvVar('DB_NAME', 'hms'),
    user: getEnvVar('DB_USER', 'hmsuser'),
    password: getEnvVar('DB_PASSWORD', 'hmspassword'),
    ssl: getEnvBool('DB_SSL', false) ? {
      rejectUnauthorized: getEnvBool('DB_SSL_REJECT_UNAUTHORIZED', true)
    } : false,
    pool: {
      min: getEnvNumber('DB_POOL_MIN', 2),
      max: getEnvNumber('DB_POOL_MAX', 20),
      connectionTimeoutMillis: getEnvNumber('DB_CONNECTION_TIMEOUT', 10000),
      statementTimeout: getEnvNumber('DB_STATEMENT_TIMEOUT', 30000)
    }
  },

  // Redis Configuration
  redis: {
    host: getEnvVar('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: getEnvNumber('REDIS_DB', 0),
    connectionTimeoutMillis: getEnvNumber('REDIS_CONNECTION_TIMEOUT', 10000)
  },

  // JWT Configuration
  jwt: {
    publicKeyPath: getEnvVar('JWT_PUBLIC_KEY_FILE', './keys/jwt-public.pem'),
    privateKeyPath: getEnvVar('JWT_PRIVATE_KEY_FILE', './keys/jwt-private.pem'),
    accessTokenExpiry: getEnvVar('JWT_ACCESS_TOKEN_EXPIRY', '15m'),
    refreshTokenExpiry: getEnvVar('JWT_REFRESH_TOKEN_EXPIRY', '7d'),
    keyRotationInterval: getEnvVar('JWT_KEY_ROTATION_INTERVAL', '30d'),
    issuer: getEnvVar('JWT_ISSUER', 'hms-user-service'),
    audience: getEnvVar('JWT_AUDIENCE', 'hms-services')
  },

  // Password Configuration
  password: {
    saltRounds: getEnvNumber('PASSWORD_SALT_ROUNDS', 12),
    minLength: getEnvNumber('PASSWORD_MIN_LENGTH', 8),
    maxLength: getEnvNumber('PASSWORD_MAX_LENGTH', 128),
    requireUppercase: getEnvBool('PASSWORD_REQUIRE_UPPERCASE', true),
    requireLowercase: getEnvBool('PASSWORD_REQUIRE_LOWERCASE', true),
    requireNumbers: getEnvBool('PASSWORD_REQUIRE_NUMBERS', true),
    requireSymbols: getEnvBool('PASSWORD_REQUIRE_SYMBOLS', true),
    maxFailedAttempts: getEnvNumber('PASSWORD_MAX_FAILED_ATTEMPTS', 5),
    lockoutDuration: getEnvVar('PASSWORD_LOCKOUT_DURATION', '15m')
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    loginWindowMs: getEnvNumber('LOGIN_RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    loginMaxRequests: getEnvNumber('LOGIN_RATE_LIMIT_MAX_REQUESTS', 5),
    passwordResetWindowMs: getEnvNumber('PASSWORD_RESET_RATE_LIMIT_WINDOW_MS', 3600000), // 1 hour
    passwordResetMaxRequests: getEnvNumber('PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS', 3)
  },

  // Email Configuration
  email: {
    host: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
    port: getEnvNumber('SMTP_PORT', 587),
    secure: getEnvBool('SMTP_SECURE', false),
    user: getEnvVar('SMTP_USER', 'noreply@hms.com'),
    password: getEnvVar('SMTP_PASSWORD'),
    from: getEnvVar('EMAIL_FROM', 'noreply@hms.com'),
    fromName: getEnvVar('EMAIL_FROM_NAME', 'HMS User Service')
  },

  // CORS Configuration
  cors: {
    origin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: getEnvBool('CORS_CREDENTIALS', true),
    methods: getEnvVar('CORS_METHODS', 'GET,POST,PUT,DELETE,OPTIONS').split(','),
    headers: getEnvVar('CORS_HEADERS', 'Content-Type,Authorization,X-Correlation-ID,X-Request-ID,X-Trace-ID').split(',')
  },

  // Security Headers Configuration
  helmet: {
    cspDirective: getEnvVar('HELMET_CSP_DIRECTIVE', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'"),
    hstsMaxAge: getEnvNumber('HELMET_HSTS_MAX_AGE', 31536000),
    hstsIncludeSubdomains: getEnvBool('HELMET_HSTS_INCLUDE_SUBDOMAINS', true),
    hstsPreload: getEnvBool('HELMET_HSTS_PRELOAD', true)
  },

  // Session Configuration
  session: {
    secret: getEnvVar('SESSION_SECRET'),
    maxAge: getEnvVar('SESSION_MAX_AGE', '7d'),
    secureCookie: getEnvBool('SESSION_SECURE_COOKIE', false),
    httpOnly: getEnvBool('SESSION_HTTP_ONLY', true),
    sameSite: getEnvVar('SESSION_SAME_SITE', 'strict') as 'strict' | 'lax' | 'none'
  },

  // Event Bus Configuration
  eventBus: {
    redis: {
      host: getEnvVar('EVENT_BUS_REDIS_HOST', getEnvVar('REDIS_HOST', 'localhost')),
      port: getEnvNumber('EVENT_BUS_REDIS_PORT', getEnvVar('REDIS_PORT', '6379')),
      password: process.env.EVENT_BUS_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
      db: getEnvNumber('EVENT_BUS_REDIS_DB', 1)
    },
    enableDeadLetterQueue: getEnvBool('EVENT_BUS_ENABLE_DEAD_LETTER_QUEUE', true),
    defaultRetryAttempts: getEnvNumber('EVENT_BUS_DEFAULT_RETRY_ATTEMPTS', 3),
    defaultTimeout: getEnvNumber('EVENT_BUS_DEFAULT_TIMEOUT', 30000)
  },

  // Audit Logging Configuration
  audit: {
    logPath: getEnvVar('AUDIT_LOG_PATH', 'logs/audit.log'),
    enabled: getEnvBool('ENABLE_AUDIT_LOG', true),
    retentionDays: getEnvNumber('AUDIT_LOG_RETENTION_DAYS', 90)
  },

  // Monitoring Configuration
  monitoring: {
    enabled: getEnvBool('ENABLE_METRICS', true),
    metricsPort: getEnvNumber('METRICS_PORT', 9090),
    healthCheckInterval: getEnvNumber('HEALTH_CHECK_INTERVAL', 30000)
  },

  // Development Settings
  development: {
    autoCreateAdmin: getEnvBool('DEV_AUTO_CREATE_ADMIN', false),
    adminEmail: getEnvVar('DEV_ADMIN_EMAIL', 'admin@hms.com'),
    adminPassword: getEnvVar('DEV_ADMIN_PASSWORD', 'Admin@123456'),
    adminFirstName: getEnvVar('DEV_ADMIN_FIRST_NAME', 'System'),
    adminLastName: getEnvVar('DEV_ADMIN_LAST_NAME', 'Administrator')
  },

  // API Documentation
  api: {
    enableSwagger: getEnvBool('ENABLE_SWAGGER', false),
    swaggerPath: getEnvVar('SWAGGER_PATH', '/api-docs'),
    swaggerTitle: getEnvVar('SWAGGER_TITLE', 'HMS User Service API'),
    swaggerDescription: getEnvVar('SWAGGER_DESCRIPTION', 'User authentication and management service'),
    swaggerVersion: getEnvVar('SWAGGER_VERSION', '1.0.0')
  }
};

// Validation
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate required environment variables
  if (!config.email.password && config.nodeEnv === 'production') {
    errors.push('SMTP_PASSWORD is required in production');
  }

  if (!config.session.secret) {
    errors.push('SESSION_SECRET is required');
  }

  // Validate JWT key files exist in production
  if (config.nodeEnv === 'production') {
    const fs = require('fs');
    if (!fs.existsSync(config.jwt.publicKeyPath)) {
      errors.push(`JWT public key file not found: ${config.jwt.publicKeyPath}`);
    }
    if (!fs.existsSync(config.jwt.privateKeyPath)) {
      errors.push(`JWT private key file not found: ${config.jwt.privateKeyPath}`);
    }
  }

  // Validate password configuration
  if (config.password.minLength > config.password.maxLength) {
    errors.push('Password minimum length cannot be greater than maximum length');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Initialize configuration
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation error:', error);
  process.exit(1);
}

export default config;