// HMS Appointment Service Configuration
// Environment-based configuration for appointment scheduling and calendar management

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

  // Appointment Configuration
  appointment: {
    defaultDurationMinutes: number;
    maxBookingDaysInAdvance: number;
    minBookingHoursInAdvance: number;
    cancellationHoursBeforeAppointment: number;
    reschedulingHoursBeforeAppointment: number;
    maxAppointmentsPerSlot: number;
    slotDurationMinutes: number;
    workingDays: number[];
    workingHours: {
      start: string; // HH:mm format
      end: string;   // HH:mm format
    };
    breakTime: {
      start: string; // HH:mm format
      end: string;   // HH:mm format
    };
    bufferTimeMinutes: number;
    overlapBufferMinutes: number;
    autoConfirmAppointment: boolean;
    allowWaitlist: boolean;
    maxWaitlistSize: number;
    reminderSettings: {
      enabled: boolean;
      emailHoursBefore: number[];
      smsHoursBefore: number[];
      whatsappHoursBefore: number[];
    };
  };

  // Calendar Configuration
  calendar: {
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    weekStartsOn: number; // 0 = Sunday, 1 = Monday, etc.
    displayWeekends: boolean;
    defaultView: 'day' | 'week' | 'month' | 'agenda';
    enableRecurringAppointments: boolean;
    maxRecurringEndDate: string; // ISO date
    recurringAppointmentLimits: {
      maxOccurrences: number;
      maxEndDateDays: number;
    };
  };

  // Doctor Configuration
  doctor: {
    defaultConsultationFee: number;
    specializations: string[];
    departments: string[];
    qualificationLevels: string[];
    experienceLevels: string[];
    languages: string[];
    consultationTypes: {
      inPerson: string;
      video: string;
      phone: string;
      chat: string;
    };
  };

  // Notification Configuration
  notification: {
    email: {
      enabled: boolean;
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPassword: string;
      fromEmail: string;
      fromName: string;
      replyTo: string;
    };
    sms: {
      enabled: boolean;
      provider: string; // twilio, msg91, etc.
      apiKey: string;
      senderId: string;
    };
    whatsapp: {
      enabled: boolean;
      provider: string;
      apiKey: string;
      phoneNumber: string;
    };
    push: {
      enabled: boolean;
      serviceWorkerFilePath: string;
      publicKey: string;
      privateKey: string;
    };
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
    appointmentBookingWindowMs: number;
    appointmentBookingMaxRequests: number;
    searchWindowMs: number;
    searchMaxRequests: number;
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

  // External Service Configuration
  externalServices: {
    patientService: {
      baseUrl: string;
      timeout: number;
      retryAttempts: number;
    };
    userService: {
      baseUrl: string;
      timeout: number;
      retryAttempts: number;
    };
    clinicalService: {
      baseUrl: string;
      timeout: number;
      retryAttempts: number;
    };
    billingService: {
      baseUrl: string;
      timeout: number;
      retryAttempts: number;
    };
  };

  // Analytics Configuration
  analytics: {
    enabled: boolean;
    trackingEnabled: boolean;
    metricsCollectionInterval: number;
    appointmentMetrics: {
      trackShowRate: boolean;
      trackCancellationRate: boolean;
      trackRescheduleRate: boolean;
      trackNoShowRate: boolean;
      trackUtilizationRate: boolean;
    };
  };

  // Integration Configuration
  integrations: {
    googleCalendar: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      scopes: string[];
    };
    outlookCalendar: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      tenantId: string;
      scopes: string[];
    };
    zoom: {
      enabled: boolean;
      apiKey: string;
      apiSecret: string;
      webhookSecret: string;
    };
    payment: {
      enabled: boolean;
      provider: string; // stripe, razorpay, etc.
      publicKey: string;
      privateKey: string;
      webhookSecret: string;
    };
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

// Helper function to get array environment variable
function getEnvArray(key: string, defaultValue: string[] = []): string[] {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

// Create configuration object
export const config: Config = {
  // Service Configuration
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3003),
  serviceName: getEnvVar('SERVICE_NAME', 'appointment-service'),
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
    db: getEnvNumber('REDIS_DB', 1),
    connectionTimeoutMillis: getEnvNumber('REDIS_CONNECTION_TIMEOUT', 10000)
  },

  // Appointment Configuration
  appointment: {
    defaultDurationMinutes: getEnvNumber('APPOINTMENT_DEFAULT_DURATION_MINUTES', 30),
    maxBookingDaysInAdvance: getEnvNumber('APPOINTMENT_MAX_BOOKING_DAYS_ADVANCE', 90),
    minBookingHoursInAdvance: getEnvNumber('APPOINTMENT_MIN_BOOKING_HOURS_ADVANCE', 2),
    cancellationHoursBeforeAppointment: getEnvNumber('APPOINTMENT_CANCELLATION_HOURS_BEFORE', 24),
    reschedulingHoursBeforeAppointment: getEnvNumber('APPOINTMENT_RESCHEDULING_HOURS_BEFORE', 12),
    maxAppointmentsPerSlot: getEnvNumber('APPOINTMENT_MAX_PER_SLOT', 1),
    slotDurationMinutes: getEnvNumber('APPOINTMENT_SLOT_DURATION_MINUTES', 15),
    workingDays: getEnvArray('APPOINTMENT_WORKING_DAYS', [1, 2, 3, 4, 5]), // Monday to Friday
    workingHours: {
      start: getEnvVar('APPOINTMENT_WORKING_HOURS_START', '09:00'),
      end: getEnvVar('APPOINTMENT_WORKING_HOURS_END', '18:00')
    },
    breakTime: {
      start: getEnvVar('APPOINTMENT_BREAK_TIME_START', '13:00'),
      end: getEnvVar('APPOINTMENT_BREAK_TIME_END', '14:00')
    },
    bufferTimeMinutes: getEnvNumber('APPOINTMENT_BUFFER_TIME_MINUTES', 5),
    overlapBufferMinutes: getEnvNumber('APPOINTMENT_OVERLAP_BUFFER_MINUTES', 0),
    autoConfirmAppointment: getEnvBool('APPOINTMENT_AUTO_CONFIRM', false),
    allowWaitlist: getEnvBool('APPOINTMENT_ALLOW_WAITLIST', true),
    maxWaitlistSize: getEnvNumber('APPOINTMENT_MAX_WAITLIST_SIZE', 10),
    reminderSettings: {
      enabled: getEnvBool('APPOINTMENT_REMINDER_ENABLED', true),
      emailHoursBefore: getEnvArray('APPOINTMENT_REMINDER_EMAIL_HOURS', [24, 2]).map(Number),
      smsHoursBefore: getEnvArray('APPOINTMENT_REMINDER_SMS_HOURS', [24, 2]).map(Number),
      whatsappHoursBefore: getEnvArray('APPOINTMENT_REMINDER_WHATSAPP_HOURS', [2]).map(Number)
    }
  },

  // Calendar Configuration
  calendar: {
    timezone: getEnvVar('CALENDAR_TIMEZONE', 'Asia/Kolkata'),
    dateFormat: getEnvVar('CALENDAR_DATE_FORMAT', 'YYYY-MM-DD'),
    timeFormat: getEnvVar('CALENDAR_TIME_FORMAT', 'HH:mm'),
    weekStartsOn: getEnvNumber('CALENDAR_WEEK_STARTS_ON', 1), // Monday
    displayWeekends: getEnvBool('CALENDAR_DISPLAY_WEEKENDS', true),
    defaultView: getEnvVar('CALENDAR_DEFAULT_VIEW', 'week') as 'day' | 'week' | 'month' | 'agenda',
    enableRecurringAppointments: getEnvBool('CALENDAR_ENABLE_RECURRING', true),
    maxRecurringEndDate: getEnvVar('CALENDAR_MAX_RECURRING_END_DATE', '2030-12-31'),
    recurringAppointmentLimits: {
      maxOccurrences: getEnvNumber('CALENDAR_RECURRING_MAX_OCCURRENCES', 52),
      maxEndDateDays: getEnvNumber('CALENDAR_RECURRING_MAX_END_DAYS', 365)
    }
  },

  // Doctor Configuration
  doctor: {
    defaultConsultationFee: getEnvNumber('DOCTOR_DEFAULT_CONSULTATION_FEE', 500),
    specializations: getEnvArray('DOCTOR_SPECIALIZATIONS', [
      'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Medicine',
      'Gynecology', 'Dermatology', 'Ophthalmology', 'ENT', 'Psychiatry',
      'Dentistry', 'Urology', 'Gastroenterology', 'Endocrinology', 'Pulmonology'
    ]),
    departments: getEnvArray('DOCTOR_DEPARTMENTS', [
      'Emergency', 'OPD', 'IPD', 'ICU', 'Surgery', 'Radiology', 'Pathology',
      'Pharmacy', 'Physiotherapy', 'Dietetics', 'Administration'
    ]),
    qualificationLevels: getEnvArray('DOCTOR_QUALIFICATION_LEVELS', [
      'MBBS', 'MD', 'MS', 'DM', 'MCh', 'DNB', 'Diploma', 'BDS', 'BAMS', 'BHMS'
    ]),
    experienceLevels: getEnvArray('DOCTOR_EXPERIENCE_LEVELS', [
      'Junior (0-5 years)', 'Middle (5-10 years)', 'Senior (10-15 years)', 'Expert (15+ years)'
    ]),
    languages: getEnvArray('DOCTOR_LANGUAGES', [
      'English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati',
      'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia', 'Assamese'
    ]),
    consultationTypes: {
      inPerson: getEnvVar('DOCTOR_CONSULTATION_TYPE_IN_PERSON', 'In-Person'),
      video: getEnvVar('DOCTOR_CONSULTATION_TYPE_VIDEO', 'Video'),
      phone: getEnvVar('DOCTOR_CONSULTATION_TYPE_PHONE', 'Phone'),
      chat: getEnvVar('DOCTOR_CONSULTATION_TYPE_CHAT', 'Chat')
    }
  },

  // Notification Configuration
  notification: {
    email: {
      enabled: getEnvBool('NOTIFICATION_EMAIL_ENABLED', true),
      smtpHost: getEnvVar('NOTIFICATION_EMAIL_SMTP_HOST', 'smtp.gmail.com'),
      smtpPort: getEnvNumber('NOTIFICATION_EMAIL_SMTP_PORT', 587),
      smtpUser: getEnvVar('NOTIFICATION_EMAIL_SMTP_USER', ''),
      smtpPassword: getEnvVar('NOTIFICATION_EMAIL_SMTP_PASSWORD', ''),
      fromEmail: getEnvVar('NOTIFICATION_EMAIL_FROM', 'appointments@hms.com'),
      fromName: getEnvVar('NOTIFICATION_EMAIL_FROM_NAME', 'HMS Appointments'),
      replyTo: getEnvVar('NOTIFICATION_EMAIL_REPLY_TO', 'support@hms.com')
    },
    sms: {
      enabled: getEnvBool('NOTIFICATION_SMS_ENABLED', true),
      provider: getEnvVar('NOTIFICATION_SMS_PROVIDER', 'twilio'),
      apiKey: getEnvVar('NOTIFICATION_SMS_API_KEY', ''),
      senderId: getEnvVar('NOTIFICATION_SMS_SENDER_ID', 'HMSHLP')
    },
    whatsapp: {
      enabled: getEnvBool('NOTIFICATION_WHATSAPP_ENABLED', false),
      provider: getEnvVar('NOTIFICATION_WHATSAPP_PROVIDER', 'twilio'),
      apiKey: getEnvVar('NOTIFICATION_WHATSAPP_API_KEY', ''),
      phoneNumber: getEnvVar('NOTIFICATION_WHATSAPP_PHONE_NUMBER', '')
    },
    push: {
      enabled: getEnvBool('NOTIFICATION_PUSH_ENABLED', false),
      serviceWorkerFilePath: getEnvVar('NOTIFICATION_PUSH_SW_FILE_PATH', '/sw.js'),
      publicKey: getEnvVar('NOTIFICATION_PUSH_PUBLIC_KEY', ''),
      privateKey: getEnvVar('NOTIFICATION_PUSH_PRIVATE_KEY', '')
    }
  },

  // Security Configuration
  security: {
    encryptionKey: getEnvVar('ENCRYPTION_KEY'),
    saltRounds: getEnvNumber('SECURITY_SALT_ROUNDS', 12),
    maxFileSize: getEnvNumber('SECURITY_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    allowedMimeTypes: getEnvVar('SECURITY_ALLOWED_MIME_TYPES', 'image/jpeg,image/png,image/gif,application/pdf,text/plain').split(','),
    enableEncryption: getEnvBool('SECURITY_ENABLE_ENCRYPTION', true)
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    appointmentBookingWindowMs: getEnvNumber('APPOINTMENT_BOOKING_WINDOW_MS', 300000), // 5 minutes
    appointmentBookingMaxRequests: getEnvNumber('APPOINTMENT_BOOKING_MAX_REQUESTS', 10),
    searchWindowMs: getEnvNumber('APPOINTMENT_SEARCH_WINDOW_MS', 60000), // 1 minute
    searchMaxRequests: getEnvNumber('APPOINTMENT_SEARCH_MAX_REQUESTS', 30)
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
  },

  // External Service Configuration
  externalServices: {
    patientService: {
      baseUrl: getEnvVar('PATIENT_SERVICE_BASE_URL', 'http://localhost:3002'),
      timeout: getEnvNumber('PATIENT_SERVICE_TIMEOUT', 10000),
      retryAttempts: getEnvNumber('PATIENT_SERVICE_RETRY_ATTEMPTS', 3)
    },
    userService: {
      baseUrl: getEnvVar('USER_SERVICE_BASE_URL', 'http://localhost:3001'),
      timeout: getEnvNumber('USER_SERVICE_TIMEOUT', 10000),
      retryAttempts: getEnvNumber('USER_SERVICE_RETRY_ATTEMPTS', 3)
    },
    clinicalService: {
      baseUrl: getEnvVar('CLINICAL_SERVICE_BASE_URL', 'http://localhost:3004'),
      timeout: getEnvNumber('CLINICAL_SERVICE_TIMEOUT', 10000),
      retryAttempts: getEnvNumber('CLINICAL_SERVICE_RETRY_ATTEMPTS', 3)
    },
    billingService: {
      baseUrl: getEnvVar('BILLING_SERVICE_BASE_URL', 'http://localhost:3005'),
      timeout: getEnvNumber('BILLING_SERVICE_TIMEOUT', 10000),
      retryAttempts: getEnvNumber('BILLING_SERVICE_RETRY_ATTEMPTS', 3)
    }
  },

  // Analytics Configuration
  analytics: {
    enabled: getEnvBool('ANALYTICS_ENABLED', true),
    trackingEnabled: getEnvBool('ANALYTICS_TRACKING_ENABLED', true),
    metricsCollectionInterval: getEnvNumber('ANALYTICS_METRICS_COLLECTION_INTERVAL', 300000), // 5 minutes
    appointmentMetrics: {
      trackShowRate: getEnvBool('ANALYTICS_TRACK_SHOW_RATE', true),
      trackCancellationRate: getEnvBool('ANALYTICS_TRACK_CANCELLATION_RATE', true),
      trackRescheduleRate: getEnvBool('ANALYTICS_TRACK_RESCHEDULE_RATE', true),
      trackNoShowRate: getEnvBool('ANALYTICS_TRACK_NO_SHOW_RATE', true),
      trackUtilizationRate: getEnvBool('ANALYTICS_TRACK_UTILIZATION_RATE', true)
    }
  },

  // Integration Configuration
  integrations: {
    googleCalendar: {
      enabled: getEnvBool('INTEGRATION_GOOGLE_CALENDAR_ENABLED', false),
      clientId: getEnvVar('INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID', ''),
      clientSecret: getEnvVar('INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET', ''),
      redirectUri: getEnvVar('INTEGRATION_GOOGLE_CALENDAR_REDIRECT_URI', ''),
      scopes: getEnvArray('INTEGRATION_GOOGLE_CALENDAR_SCOPES', [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ])
    },
    outlookCalendar: {
      enabled: getEnvBool('INTEGRATION_OUTLOOK_CALENDAR_ENABLED', false),
      clientId: getEnvVar('INTEGRATION_OUTLOOK_CALENDAR_CLIENT_ID', ''),
      clientSecret: getEnvVar('INTEGRATION_OUTLOOK_CALENDAR_CLIENT_SECRET', ''),
      tenantId: getEnvVar('INTEGRATION_OUTLOOK_CALENDAR_TENANT_ID', ''),
      scopes: getEnvArray('INTEGRATION_OUTLOOK_CALENDAR_SCOPES', [
        'https://graph.microsoft.com/Calendars.ReadWrite'
      ])
    },
    zoom: {
      enabled: getEnvBool('INTEGRATION_ZOOM_ENABLED', false),
      apiKey: getEnvVar('INTEGRATION_ZOOM_API_KEY', ''),
      apiSecret: getEnvVar('INTEGRATION_ZOOM_API_SECRET', ''),
      webhookSecret: getEnvVar('INTEGRATION_ZOOM_WEBHOOK_SECRET', '')
    },
    payment: {
      enabled: getEnvBool('INTEGRATION_PAYMENT_ENABLED', false),
      provider: getEnvVar('INTEGRATION_PAYMENT_PROVIDER', 'stripe'),
      publicKey: getEnvVar('INTEGRATION_PAYMENT_PUBLIC_KEY', ''),
      privateKey: getEnvVar('INTEGRATION_PAYMENT_PRIVATE_KEY', ''),
      webhookSecret: getEnvVar('INTEGRATION_PAYMENT_WEBHOOK_SECRET', '')
    }
  }
};

// Validation
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate required environment variables
  if (!config.security.encryptionKey) {
    errors.push('ENCRYPTION_KEY is required for security');
  }

  // Validate appointment configuration
  if (config.appointment.defaultDurationMinutes <= 0) {
    errors.push('Appointment default duration must be greater than 0');
  }

  if (config.appointment.maxBookingDaysInAdvance <= 0) {
    errors.push('Max booking days in advance must be greater than 0');
  }

  if (config.appointment.minBookingHoursInAdvance < 0) {
    errors.push('Min booking hours in advance cannot be negative');
  }

  // Validate working hours format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(config.appointment.workingHours.start)) {
    errors.push('Working hours start must be in HH:mm format');
  }

  if (!timeRegex.test(config.appointment.workingHours.end)) {
    errors.push('Working hours end must be in HH:mm format');
  }

  if (!timeRegex.test(config.appointment.breakTime.start)) {
    errors.push('Break time start must be in HH:mm format');
  }

  if (!timeRegex.test(config.appointment.breakTime.end)) {
    errors.push('Break time end must be in HH:mm format');
  }

  // Validate working days
  if (config.appointment.workingDays.length === 0) {
    errors.push('At least one working day must be specified');
  }

  if (config.appointment.workingDays.some(day => day < 0 || day > 6)) {
    errors.push('Working days must be between 0 (Sunday) and 6 (Saturday)');
  }

  // Validate notification configuration
  if (config.notification.email.enabled && !config.notification.email.smtpUser) {
    errors.push('SMTP user is required when email notifications are enabled');
  }

  if (config.notification.email.enabled && !config.notification.email.smtpPassword) {
    errors.push('SMTP password is required when email notifications are enabled');
  }

  // Validate integration configuration
  if (config.integrations.googleCalendar.enabled) {
    if (!config.integrations.googleCalendar.clientId) {
      errors.push('Google Calendar client ID is required when Google Calendar integration is enabled');
    }
    if (!config.integrations.googleCalendar.clientSecret) {
      errors.push('Google Calendar client secret is required when Google Calendar integration is enabled');
    }
  }

  if (config.integrations.zoom.enabled) {
    if (!config.integrations.zoom.apiKey) {
      errors.push('Zoom API key is required when Zoom integration is enabled');
    }
    if (!config.integrations.zoom.apiSecret) {
      errors.push('Zoom API secret is required when Zoom integration is enabled');
    }
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