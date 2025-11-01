import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3010,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hms_pharmacy',
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
    keyPrefix: 'hms:pharmacy:',
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
    partnerService: process.env.PARTNER_SERVICE_URL || 'http://localhost:3008',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009',
  },

  pharmacy: {
    autoRefillThreshold: parseInt(process.env.AUTO_REFILL_THRESHOLD || '20'),
    expiryWarningDays: parseInt(process.env.EXPIRY_WARNING_DAYS || '30'),
    reorderLevel: parseInt(process.env.REORDER_LEVEL || '50'),
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
    gstRate: parseFloat(process.env.GST_RATE || '0.18'),
    dispensingFee: parseFloat(process.env.DISPENSING_FEE || '5.00'),
    markupPercentage: parseFloat(process.env.MARKUP_PERCENTAGE || '25.0'),
  },

  inventory: {
    batchSize: parseInt(process.env.INVENTORY_BATCH_SIZE || '100'),
    syncInterval: parseInt(process.env.INVENTORY_SYNC_INTERVAL || '3600000'),
    lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD || '100'),
    criticalStockThreshold: parseInt(process.env.CRITICAL_STOCK_THRESHOLD || '50'),
  },

  prescriptions: {
    defaultDuration: parseInt(process.env.DEFAULT_PRESCRIPTION_DURATION || '30'),
    maxRefills: parseInt(process.env.MAX_REFILLS || '3'),
    requireVerification: process.env.REQUIRE_VERIFICATION === 'true',
    verificationTimeout: parseInt(process.env.VERIFICATION_TIMEOUT || '7200000'),
  },

  integrations: {
    externalPharmacy: {
      enabled: process.env.EXTERNAL_PHARMACY_ENABLED === 'true',
      apiUrl: process.env.EXTERNAL_PHARMACY_API_URL,
      apiKey: process.env.EXTERNAL_PHARMACY_API_KEY,
    },
    drugDatabase: {
      enabled: process.env.DRUG_DATABASE_ENABLED === 'true',
      apiUrl: process.env.DRUG_DATABASE_API_URL,
      apiKey: process.env.DRUG_DATABASE_API_KEY,
    },
  },

  fileStorage: {
    uploadDir: process.env.FILE_UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf,doc,docx').split(','),
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  reporting: {
    batchSize: parseInt(process.env.REPORTING_BATCH_SIZE || '1000'),
    exportFormats: (process.env.EXPORT_FORMATS || 'pdf,excel,csv').split(','),
    retentionDays: parseInt(process.env.REPORTING_RETENTION_DAYS || '2555'), // 7 years
  },
};