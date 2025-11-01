import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3007,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hms_accounting',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60000'),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'hms:accounting:',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  services: {
    patientService: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
    billingService: process.env.BILLING_SERVICE_URL || 'http://localhost:3004',
    appointmentService: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    from: process.env.EMAIL_FROM || 'noreply@hms.com',
  },

  accounting: {
    fiscalYearStart: process.env.FISCAL_YEAR_START || '04-01',
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
    taxRates: {
      standard: parseFloat(process.env.TAX_STANDARD_RATE || '0.18'),
      reduced: parseFloat(process.env.TAX_REDUCED_RATE || '0.05'),
      zero: parseFloat(process.env.TAX_ZERO_RATE || '0'),
    },
    paymentTerms: parseInt(process.env.PAYMENT_TERMS_DAYS || '30'),
    lateFeeRate: parseFloat(process.env.LATE_FEE_RATE || '0.02'),
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
};