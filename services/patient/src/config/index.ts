// HMS Patient Service Configuration
// Environment-based configuration with ABDM integration settings

import dotenv from 'dotenv';

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

  // Document Storage Configuration
  storage: {
    type: 'local' | 's3' | 'minio';
    local: {
      uploadsPath: string;
      maxFileSize: number;
      allowedMimeTypes: string[];
    };
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
    minio?: {
      endpoint: string;
      port: number;
      useSSL: boolean;
      accessKey: string;
      secretKey: string;
      bucket: string;
    };
  };

  // ABDM Configuration
  abdm: {
    enabled: boolean;
    mode: 'sandbox' | 'production';
    clientId: string;
    clientSecret: string;
    hipId: string;
    hipName: string;
    baseUrl: string;
    tokenUrl: string;
    apiTimeout: number;
    retryAttempts: number;
    retryDelay: number;
    consentManagerUrl: string;
    healthIdVerificationUrl: string;
    abhaNumberUrl: string;
    profileUrl: string;
    linkedCareContextUrl: string;
    doctorConsultationUrl: string;
    discoverServicesUrl: string;
    nurseCareContextUrl: string;
    cmHealthFacilityUrl: string;
    pmsHealthFacilityUrl: string;
  };

  // Security Configuration
  security: {
    encryptionKey: string;
    saltRounds: number;
    maxFileSize: number;
    allowedMimeTypes: string[];
    enableEncryption: boolean;
  };

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    patientSearchWindowMs: number;
    patientSearchMaxRequests: number;
    documentUploadWindowMs: number;
    documentUploadMaxRequests: number;
  };

  // CORS Configuration
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    headers: string[];
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
}

// Helper function to convert duration strings to milliseconds
function parseDurationToMs(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1));

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 3600 * 1000;
    case 'd': return value * 24 * 3600 * 1000;
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
  port: getEnvNumber('PORT', 3002),
  serviceName: getEnvVar('SERVICE_NAME', 'patient-service'),
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

  // Document Storage Configuration
  storage: {
    type: getEnvVar('STORAGE_TYPE', 'local') as 'local' | 's3' | 'minio',
    local: {
      uploadsPath: getEnvVar('UPLOADS_PATH', './uploads'),
      maxFileSize: getEnvNumber('MAX_FILE_SIZE', 50 * 1024 * 1024), // 50MB
      allowedMimeTypes: getEnvVar('ALLOWED_MIME_TYPES', 'image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(',')
    }
  },

  // ABDM Configuration
  abdm: {
    enabled: getEnvBool('ABDM_ENABLED', true),
    mode: getEnvVar('ABDM_MODE', 'sandbox') as 'sandbox' | 'production',
    clientId: getEnvVar('ABDM_CLIENT_ID', ''),
    clientSecret: getEnvVar('ABDM_CLIENT_SECRET', ''),
    hipId: getEnvVar('ABDM_HIP_ID', ''),
    hipName: getEnvVar('ABDM_HIP_NAME', ''),
    baseUrl: getEnvVar('ABDM_BASE_URL', 'https://sbx.abdm.gov.in'),
    tokenUrl: getEnvVar('ABDM_TOKEN_URL', 'https://dev.abdm.gov.in/gateway/v0.5/sessions'),
    apiTimeout: getEnvNumber('ABDM_API_TIMEOUT', 30000),
    retryAttempts: getEnvNumber('ABDM_RETRY_ATTEMPTS', 3),
    retryDelay: getEnvNumber('ABDM_RETRY_DELAY', 2000),
    consentManagerUrl: getEnvVar('ABDM_CONSENT_MANAGER_URL', 'https://sbx.ndhm.gov.in/api/v1/consent/hid/hiu/collect-consent'),
    healthIdVerificationUrl: getEnvVar('ABDM_HEALTH_ID_VERIFICATION_URL', 'https://dev.abdm.gov.in/gateway/v0.5/health-id/hip/confirm/healthIdNumber'),
    abhaNumberUrl: getEnvVar('ABDM_ABHA_NUMBER_URL', 'https://dev.abdm.gov.in/gateway/v0.5/registration/aadhaar'),
    profileUrl: getEnvVar('ABDM_PROFILE_URL', 'https://dev.abdm.gov.in/gateway/v0.5/hid/hiu/health-information/fetch'),
    linkedCareContextUrl: getEnvVar('ABDM_LINKED_CARE_CONTEXT_URL', 'https://dev.abdm.gov.in/gateway/v0.5/hip/hiu/linked-care-contexts'),
    doctorConsultationUrl: getEnvVar('ABDM_DOCTOR_CONSULTATION_URL', 'https://dev.abdm.gov.in/gateway/v0.5/hip/hiu/consultation/links'),
    discoverServicesUrl: getEnvVar('ABDM_DISCOVER_SERVICES_URL', 'https://dev.abdm.gov.in/gateway/v0.5/hid/hiu/discover'),
    nurseCareContextUrl: getEnvVar('ABDM_NURSE_CARE_CONTEXT_URL', 'https://dev.abdm.gov.in/gateway/v0.5/hip/hiu/care-contexts'),
    cmHealthFacilityUrl: getEnvVar('ABDM_CM_HEALTH_FACILITY_URL', 'https://dev.abdm.gov.in/gateway/v0.5/facilities'),
    pmsHealthFacilityUrl: getEnvVar('ABDM_PMS_HEALTH_FACILITY_URL', 'https://dev.abdm.gov.in/gateway/v0.5/facilities')
  },

  // Security Configuration
  security: {
    encryptionKey: getEnvVar('ENCRYPTION_KEY'),
    saltRounds: getEnvNumber('SECURITY_SALT_ROUNDS', 12),
    maxFileSize: getEnvNumber('SECURITY_MAX_FILE_SIZE', 50 * 1024 * 1024), // 50MB
    allowedMimeTypes: getEnvVar('SECURITY_ALLOWED_MIME_TYPES', 'image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
    enableEncryption: getEnvBool('SECURITY_ENABLE_ENCRYPTION', true)
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    patientSearchWindowMs: getEnvNumber('PATIENT_SEARCH_WINDOW_MS', 60000), // 1 minute
    patientSearchMaxRequests: getEnvNumber('PATIENT_SEARCH_MAX_REQUESTS', 30),
    documentUploadWindowMs: getEnvNumber('DOCUMENT_UPLOAD_WINDOW_MS', 300000), // 5 minutes
    documentUploadMaxRequests: getEnvNumber('DOCUMENT_UPLOAD_MAX_REQUESTS', 10)
  },

  // CORS Configuration
  cors: {
    origin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: getEnvBool('CORS_CREDENTIALS', true),
    methods: getEnvVar('CORS_METHODS', 'GET,POST,PUT,DELETE,OPTIONS').split(','),
    headers: getEnvVar('CORS_HEADERS', 'Content-Type,Authorization,X-Correlation-ID,X-Request-ID,X-Trace-ID').split(',')
  },

  // Event Bus Configuration
  eventBus: {
    redis: {
      host: getEnvVar('EVENT_BUS_REDIS_HOST', getEnvVar('REDIS_HOST', 'localhost')),
      port: getEnvNumber('EVENT_BUS_REDIS_PORT', getEnvNumber('REDIS_PORT', '6379')),
      password: process.env.EVENT_BUS_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
      db: getEnvNumber('EVENT_BUS_REDIS_DB', 2)
    },
    enableDeadLetterQueue: getEnvBool('EVENT_BUS_ENABLE_DEAD_LETTER_QUEUE', true),
    defaultRetryAttempts: getEnvNumber('EVENT_BUS_DEFAULT_RETRY_ATTEMPTS', 3),
    defaultTimeout: getEnvNumber('EVENT_BUS_DEFAULT_TIMEOUT', 30000)
  }
};

// Add S3 configuration if using S3 storage
if (config.storage.type === 's3') {
  config.storage.s3 = {
    bucket: getEnvVar('AWS_S3_BUCKET'),
    region: getEnvVar('AWS_REGION', 'ap-south-1'),
    accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID'),
    secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY')
  };
}

// Add MinIO configuration if using MinIO storage
if (config.storage.type === 'minio') {
  config.storage.minio = {
    endpoint: getEnvVar('MINIO_ENDPOINT', 'localhost:9000'),
    port: getEnvNumber('MINIO_PORT', 9000),
    useSSL: getEnvBool('MINIO_USE_SSL', false),
    accessKey: getEnvVar('MINIO_ACCESS_KEY'),
    secretKey: getEnvVar('MINIO_SECRET_KEY'),
    bucket: getEnvVar('MINIO_BUCKET', 'hms-documents')
  };
}

// Validation
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate required environment variables
  if (config.abdm.enabled && (!config.abdm.clientId || !config.abdm.clientSecret)) {
    errors.push('ABDM client ID and client secret are required when ABDM is enabled');
  }

  if (!config.security.encryptionKey) {
    errors.push('ENCRYPTION_KEY is required for security');
  }

  if (config.storage.type === 's3' && (!config.storage.s3?.bucket || !config.storage.s3?.accessKeyId)) {
    errors.push('S3 bucket and access key are required when using S3 storage');
  }

  if (config.storage.type === 'minio' && (!config.storage.minio?.accessKey || !config.storage.minio?.bucket)) {
    errors.push('MinIO access key and bucket are required when using MinIO storage');
  }

  // Validate ABDM configuration
  if (config.abdm.enabled) {
    const abdmUrls = [
      config.abdm.baseUrl,
      config.abdm.tokenUrl,
      config.abdm.consentManagerUrl,
      config.abdm.healthIdVerificationUrl
    ];

    for (const url of abdmUrls) {
      if (!url.startsWith('https://')) {
        errors.push(`ABDM URL must use HTTPS: ${url}`);
      }
    }
  }

  // Validate storage configuration
  if (config.storage.local.maxFileSize > 100 * 1024 * 1024) { // 100MB limit
    errors.push('Local storage max file size cannot exceed 100MB');
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