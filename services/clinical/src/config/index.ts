/**
 * Clinical Service Configuration
 * HMS Enterprise
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
}

interface JWTConfig {
  secret: string;
  publicKey: string;
  privateKey: string;
  issuer: string;
  audience: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  algorithm: string;
}

interface EventBusConfig {
  redis: RedisConfig;
  namespace: string;
  maxRetries: number;
  retryDelay: number;
}

interface LoggingConfig {
  level: string;
  format: string;
  datePattern: string;
  filename: string;
  maxSize: string;
  maxFiles: string;
  colorize: boolean;
  prettyPrint: boolean;
}

interface FileUploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  uploadPath: string;
  tempPath: string;
  useS3: boolean;
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

interface ClinicalConfig {
  maxVisitDuration: number;
  allowedVisitTypes: string[];
  criticalVitalSigns: {
    bloodPressure: {
      systolic: { high: number; low: number };
      diastolic: { high: number; low: number };
    };
    heartRate: { high: number; low: number };
    temperature: { high: number; low: number };
    oxygenSaturation: { low: number };
    respiratoryRate: { high: number; low: number };
  };
  prescriptionValidation: {
    maxDuration: number;
    maxQuantity: number;
    maxRefills: number;
    controlledSubstanceCheck: boolean;
    drugInteractionCheck: boolean;
    allergyCheck: boolean;
  };
  labConfig: {
    maxTestsPerOrder: number;
    duplicateOrderTimeWindow: number;
    criticalValueNotification: boolean;
    autoReflexTesting: boolean;
  };
  imagingConfig: {
    maxRadiationDose: number;
    pregnancyCheckRequired: boolean;
    contrastAllergyCheck: boolean;
    sedationRequiredProcedures: string[];
  };
  medicalRecordConfig: {
    maxDocumentSize: number;
    allowedDocumentTypes: string[];
    retentionPeriod: number;
    auditTrailRequired: boolean;
    digitalSignatureRequired: boolean;
  };
}

interface NotificationConfig {
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    from: string;
  };
  sms: {
    enabled: boolean;
    provider: string;
    apiKey: string;
    from: string;
  };
  push: {
    enabled: boolean;
    vapidPublicKey: string;
    vapidPrivateKey: string;
    vapidEmail: string;
  };
  alerts: {
    criticalFindings: boolean;
    appointmentReminders: boolean;
    prescriptionReminders: boolean;
    followUpReminders: boolean;
  };
}

interface IntegrationConfig {
  abdm: {
    enabled: boolean;
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    healthIdUrl: string;
    consentManagerUrl: string;
  };
  lis: {
    enabled: boolean;
    endpoint: string;
    apiKey: string;
    hl7Version: string;
  };
  ris: {
    enabled: boolean;
    endpoint: string;
    dicomPort: number;
    aeTitle: string;
  };
  pharmacy: {
    enabled: boolean;
    defaultPharmacyId: string;
    electronicPrescribing: boolean;
    formularyCheck: boolean;
  };
  laboratory: {
    enabled: boolean;
    defaultLabId: string;
    resultReporting: boolean;
    specimenTracking: boolean;
  };
  radiology: {
    enabled: boolean;
    defaultRadiologyId: string;
    imageSharing: boolean;
    reportDistribution: boolean;
  };
}

interface SecurityConfig {
  encryptionKey: string;
  bcryptRounds: number;
  sessionSecret: string;
  cors: {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    message: string;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
  };
}

interface PerformanceConfig {
  compression: boolean;
  compressionLevel: number;
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  monitoring: {
    enabled: boolean;
    metricsPath: string;
    collectDefaultMetrics: boolean;
  };
  healthCheck: {
    enabled: boolean;
    path: string;
    interval: number;
  };
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  hostname: string;
  logLevel: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JWTConfig;
  eventBus: EventBusConfig;
  logging: LoggingConfig;
  fileUpload: FileUploadConfig;
  clinical: ClinicalConfig;
  notification: NotificationConfig;
  integration: IntegrationConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
}

const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3004'),
  hostname: process.env.HOSTNAME || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hms_enterprise',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000')
    }
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3')
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    publicKey: process.env.JWT_PUBLIC_KEY || '',
    privateKey: process.env.JWT_PRIVATE_KEY || '',
    issuer: process.env.JWT_ISSUER || 'hms-enterprise',
    audience: process.env.JWT_AUDIENCE || 'hms-users',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    algorithm: process.env.JWT_ALGORITHM || 'RS256'
  },

  eventBus: {
    redis: {
      host: process.env.EVENT_BUS_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.EVENT_BUS_REDIS_PORT || process.env.REDIS_PORT || '6379'),
      password: process.env.EVENT_BUS_REDIS_PASSWORD || process.env.REDIS_PASSWORD,
      db: parseInt(process.env.EVENT_BUS_REDIS_DB || process.env.REDIS_DB || '1'),
      retryDelayOnFailover: parseInt(process.env.EVENT_BUS_RETRY_DELAY || '100'),
      maxRetriesPerRequest: parseInt(process.env.EVENT_BUS_MAX_RETRIES || '3')
    },
    namespace: process.env.EVENT_BUS_NAMESPACE || 'clinical-service',
    maxRetries: parseInt(process.env.EVENT_BUS_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.EVENT_BUS_RETRY_DELAY || '1000')
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
    filename: process.env.LOG_FILENAME || 'clinical-service.log',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    colorize: process.env.LOG_COLORIZE === 'true',
    prettyPrint: process.env.LOG_PRETTY_PRINT === 'true'
  },

  fileUpload: {
    maxFileSize: parseInt(process.env.FILE_MAX_SIZE || '10485760'), // 10MB
    allowedTypes: (process.env.FILE_ALLOWED_TYPES || 'pdf,jpg,jpeg,png,tiff,dicom').split(','),
    uploadPath: process.env.FILE_UPLOAD_PATH || './uploads',
    tempPath: process.env.FILE_TEMP_PATH || './temp',
    useS3: process.env.FILE_USE_S3 === 'true',
    s3: process.env.FILE_USE_S3 === 'true' ? {
      bucket: process.env.AWS_S3_BUCKET || '',
      region: process.env.AWS_S3_REGION || '',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    } : undefined
  },

  clinical: {
    maxVisitDuration: parseInt(process.env.CLINICAL_MAX_VISIT_DURATION || '240'), // 4 hours
    allowedVisitTypes: (process.env.CLINICAL_ALLOWED_VISIT_TYPES || 'OUTPATIENT,INPATIENT,EMERGENCY,DAY_CARE,HOME_CARE,TELECONSULTATION').split(','),
    criticalVitalSigns: {
      bloodPressure: {
        systolic: { high: 180, low: 90 },
        diastolic: { high: 120, low: 60 }
      },
      heartRate: { high: 120, low: 40 },
      temperature: { high: 39, low: 35 },
      oxygenSaturation: { low: 90 },
      respiratoryRate: { high: 30, low: 8 }
    },
    prescriptionValidation: {
      maxDuration: parseInt(process.env.PRESCRIPTION_MAX_DURATION || '365'),
      maxQuantity: parseInt(process.env.PRESCRIPTION_MAX_QUANTITY || '1000'),
      maxRefills: parseInt(process.env.PRESCRIPTION_MAX_REFILLS || '12'),
      controlledSubstanceCheck: process.env.PRESCRIPTION_CONTROLLED_SUBSTANCE_CHECK !== 'false',
      drugInteractionCheck: process.env.PRESCRIPTION_DRUG_INTERACTION_CHECK !== 'false',
      allergyCheck: process.env.PRESCRIPTION_ALLERGY_CHECK !== 'false'
    },
    labConfig: {
      maxTestsPerOrder: parseInt(process.env.LAB_MAX_TESTS_PER_ORDER || '50'),
      duplicateOrderTimeWindow: parseInt(process.env.LAB_DUPLICATE_TIME_WINDOW || '86400000'), // 24 hours
      criticalValueNotification: process.env.LAB_CRITICAL_NOTIFICATION !== 'false',
      autoReflexTesting: process.env.LAB_AUTO_REFLEX_TESTING === 'true'
    },
    imagingConfig: {
      maxRadiationDose: parseInt(process.env.IMAGING_MAX_RADIATION_DOSE || '50'), // mSv per year
      pregnancyCheckRequired: process.env.IMAGING_PREGNANCY_CHECK !== 'false',
      contrastAllergyCheck: process.env.IMAGING_CONTRAST_ALLERGY_CHECK !== 'false',
      sedationRequiredProcedures: (process.env.IMAGING_SEDATION_PROCEDURES || 'MRI,CT_WITH_CONTRAST').split(',')
    },
    medicalRecordConfig: {
      maxDocumentSize: parseInt(process.env.MEDICAL_RECORD_MAX_SIZE || '52428800'), // 50MB
      allowedDocumentTypes: (process.env.MEDICAL_RECORD_ALLOWED_TYPES || 'pdf,jpg,jpeg,png,tiff,doc,docx,txt').split(','),
      retentionPeriod: parseInt(process.env.MEDICAL_RECORD_RETENTION_YEARS || '7') * 365 * 24 * 60 * 60 * 1000, // years to ms
      auditTrailRequired: process.env.MEDICAL_RECORD_AUDIT_TRAIL !== 'false',
      digitalSignatureRequired: process.env.MEDICAL_RECORD_DIGITAL_SIGNATURE === 'true'
    }
  },

  notification: {
    email: {
      enabled: process.env.EMAIL_ENABLED === 'true',
      smtpHost: process.env.EMAIL_SMTP_HOST || '',
      smtpPort: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
      username: process.env.EMAIL_USERNAME || '',
      password: process.env.EMAIL_PASSWORD || '',
      from: process.env.EMAIL_FROM || 'noreply@hms.com'
    },
    sms: {
      enabled: process.env.SMS_ENABLED === 'true',
      provider: process.env.SMS_PROVIDER || 'twilio',
      apiKey: process.env.SMS_API_KEY || '',
      from: process.env.SMS_FROM || ''
    },
    push: {
      enabled: process.env.PUSH_ENABLED === 'true',
      vapidPublicKey: process.env.PUSH_VAPID_PUBLIC_KEY || '',
      vapidPrivateKey: process.env.PUSH_VAPID_PRIVATE_KEY || '',
      vapidEmail: process.env.PUSH_VAPID_EMAIL || ''
    },
    alerts: {
      criticalFindings: process.env.ALERT_CRITICAL_FINDINGS !== 'false',
      appointmentReminders: process.env.ALERT_APPOINTMENT_REMINDERS !== 'false',
      prescriptionReminders: process.env.ALERT_PRESCRIPTION_REMINDERS !== 'false',
      followUpReminders: process.env.ALERT_FOLLOW_UP_REMINDERS !== 'false'
    }
  },

  integration: {
    abdm: {
      enabled: process.env.ABDM_ENABLED === 'true',
      baseUrl: process.env.ABDM_BASE_URL || 'https://healthids.abdm.gov.in',
      clientId: process.env.ABDM_CLIENT_ID || '',
      clientSecret: process.env.ABDM_CLIENT_SECRET || '',
      healthIdUrl: process.env.ABDM_HEALTH_ID_URL || '',
      consentManagerUrl: process.env.ABDM_CONSENT_MANAGER_URL || ''
    },
    lis: {
      enabled: process.env.LIS_ENABLED === 'true',
      endpoint: process.env.LIS_ENDPOINT || '',
      apiKey: process.env.LIS_API_KEY || '',
      hl7Version: process.env.LIS_HL7_VERSION || '2.5.1'
    },
    ris: {
      enabled: process.env.RIS_ENABLED === 'true',
      endpoint: process.env.RIS_ENDPOINT || '',
      dicomPort: parseInt(process.env.RIS_DICOM_PORT || '104'),
      aeTitle: process.env.RIS_AE_TITLE || 'HMS_RIS'
    },
    pharmacy: {
      enabled: process.env.PHARMACY_ENABLED === 'true',
      defaultPharmacyId: process.env.PHARMACY_DEFAULT_ID || '',
      electronicPrescribing: process.env.PHARMACY_E_PRESCRIBING !== 'false',
      formularyCheck: process.env.PHARMACY_FORMULARY_CHECK === 'true'
    },
    laboratory: {
      enabled: process.env.LAB_ENABLED === 'true',
      defaultLabId: process.env.LAB_DEFAULT_ID || '',
      resultReporting: process.env.LAB_RESULT_REPORTING !== 'false',
      specimenTracking: process.env.LAB_SPECIMEN_TRACKING === 'true'
    },
    radiology: {
      enabled: process.env.RADIOLOGY_ENABLED === 'true',
      defaultRadiologyId: process.env.RADIOLOGY_DEFAULT_ID || '',
      imageSharing: process.env.RADIOLOGY_IMAGE_SHARING === 'true',
      reportDistribution: process.env.RADIOLOGY_REPORT_DISTRIBUTION !== 'false'
    }
  },

  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    rateLimiting: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      message: 'Too many requests from this IP, please try again later'
    },
    helmet: {
      contentSecurityPolicy: process.env.HELMET_CSP === 'true',
      crossOriginEmbedderPolicy: process.env.HELMET_COEP === 'true',
      crossOriginOpenerPolicy: process.env.HELMET_COOP === 'true',
      crossOriginResourcePolicy: process.env.HELMET_CORP === 'true'
    }
  },

  performance: {
    compression: process.env.COMPRESSION_ENABLED !== 'false',
    compressionLevel: parseInt(process.env.COMPRESSION_LEVEL || '6'),
    caching: {
      enabled: process.env.CACHE_ENABLED === 'true',
      ttl: parseInt(process.env.CACHE_TTL || '300000'), // 5 minutes
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000')
    },
    monitoring: {
      enabled: process.env.MONITORING_ENABLED === 'true',
      metricsPath: process.env.METRICS_PATH || '/metrics',
      collectDefaultMetrics: process.env.COLLECT_DEFAULT_METRICS === 'true'
    },
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      path: process.env.HEALTH_CHECK_PATH || '/health',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000') // 30 seconds
    }
  }
};

export default config;