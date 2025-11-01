import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3008,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hms_partner',
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
    keyPrefix: 'hms:partner:',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    patientService: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
    appointmentService: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
    billingService: process.env.BILLING_SERVICE_URL || 'http://localhost:3004',
    clinicalService: process.env.CLINICAL_SERVICE_URL || 'http://localhost:3005',
    accountingService: process.env.ACCOUNTING_SERVICE_URL || 'http://localhost:3007',
  },

  integrations: {
    abdm: {
      enabled: process.env.ABDM_ENABLED === 'true',
      apiUrl: process.env.ABDM_API_URL || 'https://dev.abdm.gov.in',
      clientId: process.env.ABDM_CLIENT_ID,
      clientSecret: process.env.ABDM_CLIENT_SECRET,
      callbackUrl: process.env.ABDM_CALLBACK_URL,
      healthIdUrl: process.env.ABDM_HEALTH_ID_URL,
    },
    labs: {
      drsutia: {
        enabled: process.env.DRSUTIA_ENABLED === 'true',
        apiKey: process.env.DRSUTIA_API_KEY,
        apiUrl: process.env.DRSUTIA_API_URL,
      },
      thyrocare: {
        enabled: process.env.THYROCARE_ENABLED === 'true',
        apiKey: process.env.THYROCARE_API_KEY,
        apiUrl: process.env.THYROCARE_API_URL,
      },
      metropolis: {
        enabled: process.env.METROPOLIS_ENABLED === 'true',
        apiKey: process.env.METROPOLIS_API_KEY,
        apiUrl: process.env.METROPOLIS_API_URL,
      },
    },
    pharmacies: {
      pharmeasy: {
        enabled: process.env.PHARMEASY_ENABLED === 'true',
        apiKey: process.env.PHARMEASY_API_KEY,
        apiUrl: process.env.PHARMEASY_API_URL,
      },
      netmeds: {
        enabled: process.env.NETMEDS_ENABLED === 'true',
        apiKey: process.env.NETMEDS_API_KEY,
        apiUrl: process.env.NETMEDS_API_URL,
      },
    },
    insurance: {
      icici: {
        enabled: process.env.ICICI_INSURANCE_ENABLED === 'true',
        apiKey: process.env.ICICI_INSURANCE_API_KEY,
        apiUrl: process.env.ICICI_INSURANCE_API_URL,
      },
      hdfc: {
        enabled: process.env.HDFC_INSURANCE_ENABLED === 'true',
        apiKey: process.env.HDFC_INSURANCE_API_KEY,
        apiUrl: process.env.HDFC_INSURANCE_API_URL,
      },
    },
    payments: {
      razorpay: {
        enabled: process.env.RAZORPAY_ENABLED === 'true',
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
      },
      stripe: {
        enabled: process.env.STRIPE_ENABLED === 'true',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
    },
  },

  webhooks: {
    secret: process.env.WEBHOOK_SECRET || 'your-webhook-secret',
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3'),
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    apiKeyLength: parseInt(process.env.API_KEY_LENGTH || '32'),
  },

  sync: {
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100'),
    syncInterval: parseInt(process.env.SYNC_INTERVAL || '3600000'), // 1 hour
    maxRetries: parseInt(process.env.SYNC_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.SYNC_RETRY_DELAY || '5000'),
  },

  fileStorage: {
    uploadDir: process.env.FILE_UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf,doc,docx').split(','),
  },
};