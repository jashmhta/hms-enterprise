import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3005'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'hms_billing',
    user: process.env.DB_USER || 'hms_user',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production',
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  },
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  
  // Event Bus Configuration
  eventBus: {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    serviceName: 'billing-service',
    maxRetries: parseInt(process.env.EVENT_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.EVENT_RETRY_DELAY || '1000'),
  },
  
  // JWT Configuration
  jwt: {
    publicKey: process.env.JWT_PUBLIC_KEY || '',
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER || 'hms-system',
    audience: process.env.JWT_AUDIENCE || 'hms-users',
  },
  
  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutTime: parseInt(process.env.LOCKOUT_TIME || '900000'), // 15 minutes
  },
  
  // Payment Gateway Configuration
  payment: {
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      environment: process.env.RAZORPAY_ENVIRONMENT || 'development',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },
    stripe: {
      publicKey: process.env.STRIPE_PUBLIC_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    upi: {
      merchantCode: process.env.UPI_MERCHANT_CODE || '',
      vpa: process.env.UPI_VPA || '',
    },
  },
  
  // GST Configuration
  gst: {
    enabled: process.env.GST_ENABLED === 'true',
    gstin: process.env.GSTIN || '',
    companyPan: process.env.COMPANY_PAN || '',
    defaultTaxRate: {
      cgst: parseFloat(process.env.DEFAULT_CGST_RATE || '9'),
      sgst: parseFloat(process.env.DEFAULT_SGST_RATE || '9'),
      igst: parseFloat(process.env.DEFAULT_IGST_RATE || '18'),
      cess: parseFloat(process.env.DEFAULT_CESS_RATE || '0'),
    },
    einvoice: {
      enabled: process.env.EINVOICE_ENABLED === 'true',
      apiUrl: process.env.EINVOICE_API_URL || 'https://einv-apisandbox.nic.in',
      username: process.env.EINVOICE_USERNAME || '',
      password: process.env.EINVOICE_PASSWORD || '',
      clientId: process.env.EINVOICE_CLIENT_ID || '',
      clientSecret: process.env.EINVOICE_CLIENT_SECRET || '',
      gstin: process.env.EINVOICE_GSTIN || '',
    },
  },
  
  // File Storage Configuration
  storage: {
    uploadPath: process.env.UPLOAD_PATH || './uploads/billing',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'jpg', 'jpeg', 'png'],
  },
  
  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
    },
    from: process.env.EMAIL_FROM || 'noreply@hospital.com',
    templates: {
      invoice: process.env.EMAIL_TEMPLATE_INVOICE || 'invoice-template',
      receipt: process.env.EMAIL_TEMPLATE_RECEIPT || 'receipt-template',
      overdue: process.env.EMAIL_TEMPLATE_OVERDUE || 'overdue-template',
    },
  },
  
  // SMS Configuration
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    apiKey: process.env.SMS_API_KEY || '',
    apiSecret: process.env.SMS_API_SECRET || '',
    from: process.env.SMS_FROM || '',
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    colorize: process.env.NODE_ENV !== 'production',
    timestamp: true,
  },
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later.',
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization'],
  },
  
  // External Service Configuration
  externalServices: {
    userService: {
      url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.USER_SERVICE_TIMEOUT || '5000'),
    },
    patientService: {
      url: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.PATIENT_SERVICE_TIMEOUT || '5000'),
    },
    appointmentService: {
      url: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.APPOINTMENT_SERVICE_TIMEOUT || '5000'),
    },
    clinicalService: {
      url: process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
      timeout: parseInt(process.env.CLINICAL_SERVICE_TIMEOUT || '5000'),
    },
  },
  
  // Business Rules Configuration
  businessRules: {
    invoice: {
      prefix: process.env.INVOICE_PREFIX || 'INV',
      startingNumber: parseInt(process.env.INVOICE_STARTING_NUMBER || '1'),
      numberLength: parseInt(process.env.INVOICE_NUMBER_LENGTH || '8'),
      resetFrequency: process.env.INVOICE_RESET_FREQUENCY || 'monthly', // daily, monthly, yearly
      defaultPaymentTerms: parseInt(process.env.DEFAULT_PAYMENT_TERMS || '7'), // days
    },
    payment: {
      acceptedMethods: process.env.ACCEPTED_PAYMENT_METHODS?.split(',') || ['CASH', 'CARD', 'UPI'],
      refundPolicy: {
        allowed: process.env.REFUND_POLICY_ALLOWED !== 'false',
        timeLimit: parseInt(process.env.REFUND_TIME_LIMIT || '72'), // hours
        approvalRequired: process.env.REFUND_APPROVAL_REQUIRED === 'true',
        charges: {
          percentage: parseFloat(process.env.REFUND_CHARGE_PERCENTAGE || '0'),
          maxAmount: parseFloat(process.env.REFUND_CHARGE_MAX_AMOUNT || '0'),
        },
      },
    },
    lateFee: {
      enabled: process.env.LATE_FEE_ENABLED === 'true',
      feeType: process.env.LATE_FEE_TYPE || 'percentage', // percentage or fixed
      feeAmount: parseFloat(process.env.LATE_FEE_AMOUNT || '5'),
      applicableAfter: parseInt(process.env.LATE_FEE_APPLICABLE_AFTER || '30'), // days
    },
  },
  
  // Notification Configuration
  notifications: {
    paymentReminders: {
      enabled: process.env.PAYMENT_REMINDERS_ENABLED !== 'false',
      frequency: parseInt(process.env.PAYMENT_REMINDER_FREQUENCY || '3'), // days
      sendBeforeDue: parseInt(process.env.SEND_REMINDER_BEFORE_DUE || '2'), // days
    },
    receiptNotifications: {
      enabled: process.env.RECEIPT_NOTIFICATIONS_ENABLED !== 'false',
      email: process.env.RECEIPT_EMAIL_NOTIFICATIONS_ENABLED !== 'false',
      sms: process.env.RECEIPT_SMS_NOTIFICATIONS_ENABLED === 'true',
      whatsapp: process.env.RECEIPT_WHATSAPP_NOTIFICATIONS_ENABLED === 'true',
    },
    overdueNotifications: {
      enabled: process.env.OVERDUE_NOTIFICATIONS_ENABLED !== 'false',
      frequency: parseInt(process.env.OVERDUE_NOTIFICATION_FREQUENCY || '7'), // days
    },
  },
};

// Validation function
export const validateConfig = (): void => {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_PUBLIC_KEY',
    'REDIS_HOST',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate numeric values
  const numericConfigs = [
    'port',
    'database.port',
    'database.min',
    'database.max',
    'security.bcryptRounds',
    'security.sessionTimeout',
    'storage.maxFileSize',
  ];

  for (const configPath of numericConfigs) {
    const value = configPath.split('.').reduce((obj, key) => obj[key], config);
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Invalid numeric configuration for ${configPath}: ${value}`);
    }
  }
};

export default config;