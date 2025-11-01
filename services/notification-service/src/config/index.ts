import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3009,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hms_notification',
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
    keyPrefix: 'hms:notification:',
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
    partnerService: process.env.PARTNER_SERVICE_URL || 'http://localhost:3008',
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
    templates: process.env.EMAIL_TEMPLATES_DIR || './templates/email',
  },

  sms: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_FROM_NUMBER,
      enabled: process.env.TWILIO_ENABLED === 'true',
    },
    templates: process.env.SMS_TEMPLATES_DIR || './templates/sms',
  },

  push: {
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      enabled: process.env.FIREBASE_ENABLED === 'true',
    },
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      platformApplicationArn: process.env.AWS_SNS_PLATFORM_ARN,
      enabled: process.env.AWS_SNS_ENABLED === 'true',
    },
  },

  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    apiUrl: process.env.WHATSAPP_API_URL,
    token: process.env.WHATSAPP_TOKEN,
    phoneId: process.env.WHATSAPP_PHONE_ID,
    version: process.env.WHATSAPP_API_VERSION || 'v13.0',
  },

  queue: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT || '6379'),
      password: process.env.QUEUE_REDIS_PASSWORD,
      db: parseInt(process.env.QUEUE_REDIS_DB || '1'),
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  notifications: {
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '100'),
    retryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '5000'),
    rateLimits: {
      email: {
        perMinute: parseInt(process.env.EMAIL_RATE_PER_MINUTE || '60'),
        perHour: parseInt(process.env.EMAIL_RATE_PER_HOUR || '1000'),
        perDay: parseInt(process.env.EMAIL_RATE_PER_DAY || '10000'),
      },
      sms: {
        perMinute: parseInt(process.env.SMS_RATE_PER_MINUTE || '30'),
        perHour: parseInt(process.env.SMS_RATE_PER_HOUR || '500'),
        perDay: parseInt(process.env.SMS_RATE_PER_DAY || '5000'),
      },
      push: {
        perMinute: parseInt(process.env.PUSH_RATE_PER_MINUTE || '100'),
        perHour: parseInt(process.env.PUSH_RATE_PER_HOUR || '2000'),
        perDay: parseInt(process.env.PUSH_RATE_PER_DAY || '20000'),
      },
    },
    defaultChannels: ['email', 'sms'],
    templates: process.env.NOTIFICATION_TEMPLATES_DIR || './templates',
  },

  audit: {
    enabled: process.env.AUDIT_ENABLED === 'true',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365'),
  },
};