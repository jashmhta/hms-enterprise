// HMS Enterprise Event Bus Validator
// Comprehensive event validation using Joi schemas

import Joi from 'joi';
import { BaseEvent, HMSEvent } from './types';
import { EventValidationError, ValidationError } from './errors';

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

// Core Event Metadata Schema
const EventMetadataSchema = Joi.object({
  correlationId: Joi.string().uuid().optional(),
  causationId: Joi.string().uuid().optional(),
  userId: Joi.string().uuid().optional(),
  sessionId: Joi.string().optional(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).default('1.0.0'),
  traceId: Joi.string().uuid().optional()
});

// Base Event Schema
const BaseEventSchema = Joi.object({
  id: Joi.string().uuid().required(),
  type: Joi.string().required().min(1).max(100),
  source: Joi.string().required().min(1).max(50),
  timestamp: Joi.date().required(),
  data: Joi.required(),
  metadata: EventMetadataSchema.required()
});

// Address Schema
const AddressSchema = Joi.object({
  line1: Joi.string().required().max(200),
  line2: Joi.string().max(200).optional(),
  city: Joi.string().required().max(50),
  state: Joi.string().required().max(50),
  pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).required(),
  country: Joi.string().max(50).default('India')
});

// Emergency Contact Schema
const EmergencyContactSchema = Joi.object({
  name: Joi.string().required().max(100),
  relationship: Joi.string().required().max(50),
  mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required()
});

// =============================================================================
// PATIENT EVENT SCHEMAS
// =============================================================================

export const PatientCreatedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('patient.created').required(),
  data: Joi.object({
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    firstName: Joi.string().required().max(100).min(1),
    lastName: Joi.string().max(100).optional(),
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    email: Joi.string().email().optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    dateOfBirth: Joi.date().max('now').optional(),
    address: AddressSchema.optional(),
    emergencyContact: EmergencyContactSchema.optional(),
    abhaNumber: Joi.string().pattern(/^(?:\d{2}-\d{4}-\d{4}-\d{4}|\d{17})$/).optional(),
    abhaAddress: Joi.string().max(100).optional(),
    healthIdVerified: Joi.boolean().required(),
    source: Joi.string().valid('registration', 'import', 'abdm_link', 'b2b', 'camp').required(),
    registeredBy: Joi.string().uuid().required()
  }).required()
});

export const PatientUpdatedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('patient.updated').required(),
  data: Joi.object({
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    changedFields: Joi.array().items(Joi.string()).required().min(1),
    previousValues: Joi.object().required(),
    newValues: Joi.object().required(),
    updatedBy: Joi.string().uuid().required(),
    reason: Joi.string().max(500).optional()
  }).required()
});

export const PatientAbhaLinkedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('patient.abha_linked').required(),
  data: Joi.object({
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    abhaNumber: Joi.string().pattern(/^(?:\d{2}-\d{4}-\d{4}-\d{4}|\d{17})$/).required(),
    abhaAddress: Joi.string().max(100).required(),
    healthIdVerified: Joi.boolean().required(),
    linkedAt: Joi.date().required(),
    linkedBy: Joi.string().uuid().required()
  }).required()
});

export const PatientDocumentUploadedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('patient.document_uploaded').required(),
  data: Joi.object({
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    documentId: Joi.string().uuid().required(),
    documentType: Joi.string().valid(
      'aadhaar', 'abha_card', 'pan', 'passport', 'insurance_policy',
      'medical_report', 'consent_form', 'id_proof', 'address_proof'
    ).required(),
    fileName: Joi.string().required().max(255),
    fileUrl: Joi.string().uri().required(),
    fileSize: Joi.number().integer().min(1).max(50 * 1024 * 1024).required(), // Max 50MB
    mimeType: Joi.string().pattern(/^[a-zA-Z]+\/[a-zA-Z0-9\-\.\+]+$/).required(),
    uploadedBy: Joi.string().uuid().required(),
    verified: Joi.boolean().required()
  }).required()
});

// =============================================================================
// APPOINTMENT EVENT SCHEMAS
// =============================================================================

export const AppointmentScheduledSchema = BaseEventSchema.keys({
  type: Joi.string().valid('appointment.scheduled').required(),
  data: Joi.object({
    appointmentId: Joi.string().uuid().required(),
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    doctorId: Joi.string().uuid().required(),
    doctorName: Joi.string().required().max(100),
    specialization: Joi.string().required().max(100),
    department: Joi.string().required().max(50),
    appointmentDate: Joi.date().required().min('now'),
    appointmentTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    duration: Joi.number().integer().min(5).max(480).required(), // 5 min to 8 hours
    appointmentType: Joi.string().valid('consultation', 'follow_up', 'review', 'emergency', 'surgery', 'therapy').required(),
    status: Joi.string().valid('scheduled', 'confirmed', 'pending').required(),
    consultationType: Joi.string().valid('in_person', 'video', 'phone').required(),
    notes: Joi.string().max(1000).optional(),
    bookedBy: Joi.string().uuid().required(),
    source: Joi.string().valid('walk_in', 'phone', 'online', 'referral', 'corporate', 'camp').required()
  }).required()
});

export const AppointmentConfirmedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('appointment.confirmed').required(),
  data: Joi.object({
    appointmentId: Joi.string().uuid().required(),
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    doctorId: Joi.string().uuid().required(),
    confirmedBy: Joi.string().uuid().required(),
    confirmedAt: Joi.date().required(),
    notes: Joi.string().max(500).optional()
  }).required()
});

export const AppointmentCancelledSchema = BaseEventSchema.keys({
  type: Joi.string().valid('appointment.cancelled').required(),
  data: Joi.object({
    appointmentId: Joi.string().uuid().required(),
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    doctorId: Joi.string().uuid().required(),
    cancelledBy: Joi.string().uuid().required(),
    cancelledAt: Joi.date().required(),
    cancellationReason: Joi.string().required().max(500),
    refundProcessed: Joi.boolean().optional(),
    refundAmount: Joi.number().min(0).optional()
  }).required()
});

// =============================================================================
// CLINICAL EVENT SCHEMAS
// =============================================================================

export const VisitStartedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('visit.started').required(),
  data: Joi.object({
    visitId: Joi.string().uuid().required(),
    appointmentId: Joi.string().uuid().required(),
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    doctorId: Joi.string().uuid().required(),
    doctorName: Joi.string().required().max(100),
    department: Joi.string().required().max(50),
    visitType: Joi.string().valid('new', 'follow_up', 'emergency', 'review').required(),
    chiefComplaint: Joi.string().required().max(500),
    symptoms: Joi.array().items(Joi.string().max(100)).required(),
    vitals: Joi.object({
      bloodPressure: Joi.object({
        systolic: Joi.number().integer().min(70).max(250).required(),
        diastolic: Joi.number().integer().min(40).max(150).required()
      }).optional(),
      heartRate: Joi.number().integer().min(40).max(200).optional(),
      temperature: Joi.number().min(35).max(42).optional(),
      oxygenSaturation: Joi.number().min(70).max(100).optional(),
      respiratoryRate: Joi.number().integer().min(10).max(40).optional(),
      height: Joi.number().min(50).max(250).optional(), // cm
      weight: Joi.number().min(2).max(300).optional(), // kg
      bmi: Joi.number().min(10).max(50).optional()
    }).required(),
    startedAt: Joi.date().required(),
    startedBy: Joi.string().uuid().required()
  }).required()
});

export const VisitCompletedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('visit.completed').required(),
  data: Joi.object({
    visitId: Joi.string().uuid().required(),
    appointmentId: Joi.string().uuid().required(),
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    doctorId: Joi.string().uuid().required(),
    diagnosis: Joi.array().items(Joi.object({
      code: Joi.string().pattern(/^[A-Z]\d{2}(\.\d{1,2})?$/).required(), // ICD-10 format
      description: Joi.string().required().max(200),
      type: Joi.string().valid('primary', 'secondary', 'provisional', 'final').required(),
      onsetDate: Joi.date().optional()
    })).min(1).required(),
    clinicalNotes: Joi.string().required().max(2000),
    treatmentPlan: Joi.string().required().max(1000),
    instructions: Joi.array().items(Joi.string().max(200)).required(),
    followUpDate: Joi.date().min('now').optional(),
    investigationsOrdered: Joi.array().items(Joi.object({
      testCode: Joi.string().required().max(50),
      testName: Joi.string().required().max(200),
      category: Joi.string().required().max(50),
      urgency: Joi.string().valid('routine', 'urgent', 'stat').required()
    })).optional(),
    completedAt: Joi.date().required(),
    completedBy: Joi.string().uuid().required()
  }).required()
});

export const PrescriptionCreatedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('prescription.created').required(),
  data: Joi.object({
    prescriptionId: Joi.string().uuid().required(),
    visitId: Joi.string().uuid().required(),
    appointmentId: Joi.string().uuid().required(),
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    doctorId: Joi.string().uuid().required(),
    doctorName: Joi.string().required().max(100),
    prescribedAt: Joi.date().required(),
    medications: Joi.array().items(Joi.object({
      medicineName: Joi.string().required().max(200),
      genericName: Joi.string().max(200).optional(),
      brandName: Joi.string().max(200).optional(),
      dosage: Joi.string().required().max(50),
      frequency: Joi.string().required().max(50),
      duration: Joi.string().required().max(50),
      route: Joi.string().valid('oral', 'topical', 'intravenous', 'intramuscular', 'inhalation', 'rectal', 'ocular', 'nasal').required(),
      instructions: Joi.string().max(500).optional(),
      quantity: Joi.number().integer().min(1).max(1000).required(),
      isControlled: Joi.boolean().required()
    })).min(1).required(),
    advice: Joi.array().items(Joi.string().max(200)).required(),
    validUntil: Joi.date().min('now').required(),
    status: Joi.string().valid('active', 'completed', 'cancelled').required()
  }).required()
});

// =============================================================================
// BILLING EVENT SCHEMAS
// =============================================================================

export const InvoiceGeneratedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('invoice.generated').required(),
  data: Joi.object({
    invoiceId: Joi.string().uuid().required(),
    invoiceNumber: Joi.string().pattern(/^INV-\d{4}-\d{6}$/).required(),
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    appointmentId: Joi.string().uuid().optional(),
    visitId: Joi.string().uuid().optional(),
    isB2B: Joi.boolean().required(),
    b2bClientId: Joi.string().uuid().optional(),
    campId: Joi.string().uuid().optional(),
    items: Joi.array().items(Joi.object({
      serviceId: Joi.string().uuid().required(),
      serviceName: Joi.string().required().max(200),
      category: Joi.string().required().max(50),
      hsnCode: Joi.string().pattern(/^\d{8}$/).optional(),
      quantity: Joi.number().integer().min(1).required(),
      unitPrice: Joi.number().min(0).precision(2).required(),
      discount: Joi.number().min(0).precision(2).default(0),
      discountReason: Joi.string().max(100).optional(),
      cgstRate: Joi.number().min(0).max(100).precision(2).required(),
      sgstRate: Joi.number().min(0).max(100).precision(2).required(),
      igstRate: Joi.number().min(0).max(100).precision(2).required(),
      cgstAmount: Joi.number().min(0).precision(2).required(),
      sgstAmount: Joi.number().min(0).precision(2).required(),
      igstAmount: Joi.number().min(0).precision(2).required(),
      totalAmount: Joi.number().min(0).precision(2).required()
    })).min(1).required(),
    subtotal: Joi.number().min(0).precision(2).required(),
    totalDiscount: Joi.number().min(0).precision(2).required(),
    cgstAmount: Joi.number().min(0).precision(2).required(),
    sgstAmount: Joi.number().min(0).precision(2).required(),
    igstAmount: Joi.number().min(0).precision(2).required(),
    totalAmount: Joi.number().min(0).precision(2).required(),
    paymentStatus: Joi.string().valid('unpaid', 'partial', 'paid').required(),
    dueDate: Joi.date().min('now').required(),
    generatedBy: Joi.string().uuid().required(),
    generatedAt: Joi.date().required()
  }).required()
});

export const PaymentReceivedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('payment.received').required(),
  data: Joi.object({
    paymentId: Joi.string().uuid().required(),
    invoiceId: Joi.string().uuid().required(),
    invoiceNumber: Joi.string().pattern(/^INV-\d{4}-\d{6}$/).required(),
    patientId: Joi.string().uuid().required(),
    mrn: Joi.string().pattern(/^MRN-\d{4}\d{7}$/).required(),
    amount: Joi.number().min(0.01).precision(2).required(),
    paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'wallet', 'bank_transfer', 'cheque', 'insurance', 'corporate').required(),
    transactionId: Joi.string().max(100).optional(),
    paymentGateway: Joi.string().max(50).optional(),
    paymentDetails: Joi.object({
      cardLast4: Joi.string().pattern(/^\d{4}$/).optional(),
      cardBrand: Joi.string().max(50).optional(),
      upiId: Joi.string().email().optional(),
      bankName: Joi.string().max(100).optional(),
      chequeNumber: Joi.string().max(20).optional(),
      policyNumber: Joi.string().max(50).optional()
    }).required(),
    paymentDate: Joi.date().required(),
    receivedBy: Joi.string().uuid().required(),
    instrumentType: Joi.string().valid('advance', 'full', 'partial', 'settlement', 'refund').required()
  }).required()
});

// =============================================================================
// USER EVENT SCHEMAS
// =============================================================================

export const UserCreatedSchema = BaseEventSchema.keys({
  type: Joi.string().valid('user.created').required(),
  data: Joi.object({
    userId: Joi.string().uuid().required(),
    username: Joi.string().alphanum().min(3).max(50).required(),
    email: Joi.string().email().required(),
    firstName: Joi.string().required().max(100),
    lastName: Joi.string().max(100).optional(),
    userType: Joi.string().valid('admin', 'doctor', 'receptionist', 'accountant', 'pharmacist', 'lab_technician', 'b2b_manager').required(),
    isDoctor: Joi.boolean().required(),
    specialization: Joi.string().max(100).optional(),
    department: Joi.string().max(50).optional(),
    hprId: Joi.string().max(50).optional(),
    isActive: Joi.boolean().required(),
    roles: Joi.array().items(Joi.string()).required(),
    permissions: Joi.array().items(Joi.string()).required(),
    createdBy: Joi.string().uuid().required(),
    createdAt: Joi.date().required()
  }).required()
});

export const UserLoginSchema = BaseEventSchema.keys({
  type: Joi.string().valid('user.login').required(),
  data: Joi.object({
    userId: Joi.string().uuid().required(),
    username: Joi.string().required(),
    userType: Joi.string().required(),
    loginAt: Joi.date().required(),
    ipAddress: Joi.string().ip().required(),
    userAgent: Joi.string().max(500).required(),
    loginMethod: Joi.string().valid('password', 'sso', 'oauth', 'biometric').required(),
    sessionId: Joi.string().required(),
    loginStatus: Joi.string().valid('success', 'failed', 'blocked').required(),
    failureReason: Joi.string().max(500).optional()
  }).required()
});

export const UserLogoutSchema = BaseEventSchema.keys({
  type: Joi.string().valid('user.logout').required(),
  data: Joi.object({
    userId: Joi.string().uuid().required(),
    username: Joi.string().required(),
    logoutAt: Joi.date().required(),
    sessionId: Joi.string().required(),
    logoutReason: Joi.string().valid('manual', 'timeout', 'forced', 'session_expired').required(),
    sessionDuration: Joi.number().integer().min(0).optional()
  }).required()
});

// =============================================================================
// SYSTEM EVENT SCHEMAS
// =============================================================================

export const SystemErrorSchema = BaseEventSchema.keys({
  type: Joi.string().valid('system.error').required(),
  data: Joi.object({
    errorId: Joi.string().uuid().required(),
    service: Joi.string().required().max(50),
    environment: Joi.string().valid('development', 'staging', 'production').required(),
    errorType: Joi.string().valid('system', 'business', 'integration', 'security').required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    errorCode: Joi.string().required().max(50),
    errorMessage: Joi.string().required().max(1000),
    stackTrace: Joi.string().max(5000).optional(),
    requestId: Joi.string().uuid().optional(),
    userId: Joi.string().uuid().optional(),
    metadata: Joi.object().optional(),
    occurredAt: Joi.date().required(),
    resolved: Joi.boolean().required(),
    resolvedAt: Joi.date().optional(),
    resolvedBy: Joi.string().uuid().optional()
  }).required()
});

// =============================================================================
// VALIDATION MAP
// =============================================================================

const EventValidationMap = new Map<string, Joi.Schema>([
  // Patient Events
  ['patient.created', PatientCreatedSchema],
  ['patient.updated', PatientUpdatedSchema],
  ['patient.abha_linked', PatientAbhaLinkedSchema],
  ['patient.document_uploaded', PatientDocumentUploadedSchema],

  // Appointment Events
  ['appointment.scheduled', AppointmentScheduledSchema],
  ['appointment.confirmed', AppointmentConfirmedSchema],
  ['appointment.cancelled', AppointmentCancelledSchema],

  // Clinical Events
  ['visit.started', VisitStartedSchema],
  ['visit.completed', VisitCompletedSchema],
  ['prescription.created', PrescriptionCreatedSchema],

  // Billing Events
  ['invoice.generated', InvoiceGeneratedSchema],
  ['payment.received', PaymentReceivedSchema],

  // User Events
  ['user.created', UserCreatedSchema],
  ['user.login', UserLoginSchema],
  ['user.logout', UserLogoutSchema],

  // System Events
  ['system.error', SystemErrorSchema]
]);

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateEvent(event: BaseEvent): void {
  try {
    // First validate the base event structure
    const { error: baseError } = BaseEventSchema.validate(event);
    if (baseError) {
      throw new ValidationError(`Base event validation failed: ${baseError.details[0]?.message}`);
    }

    // Check event size (prevent memory issues)
    const eventSize = JSON.stringify(event).length;
    if (eventSize > 1024 * 1024) { // 1MB limit
      throw new EventValidationError(`Event size (${eventSize} bytes) exceeds maximum allowed size (1MB)`);
    }

    // Validate against specific event schema if available
    const specificSchema = EventValidationMap.get(event.type);
    if (specificSchema) {
      const { error: specificError } = specificSchema.validate(event);
      if (specificError) {
        throw new EventValidationError(
          `Event validation failed for type '${event.type}': ${specificError.details[0]?.message}`,
          event
        );
      }
    } else {
      // For events without specific schemas, do basic validation
      console.warn(`No specific schema found for event type: ${event.type}`);
      validateGenericEvent(event);
    }

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new EventValidationError(`Event validation failed: ${error.message}`, event);
  }
}

function validateGenericEvent(event: BaseEvent): void {
  // Basic validation for events without specific schemas
  if (!event.data || typeof event.data !== 'object') {
    throw new ValidationError('Event data must be a non-null object', 'data', event.data);
  }

  if (event.timestamp > new Date()) {
    throw new ValidationError('Event timestamp cannot be in the future', 'timestamp', event.timestamp);
  }

  if (event.timestamp < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    console.warn(`Event timestamp is very old: ${event.timestamp}`);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function createValidator<T>(schema: Joi.Schema) {
  return (data: unknown): T => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(detail => detail.message).join(', ');
      throw new ValidationError(`Validation failed: ${details}`);
    }

    return value as T;
  };
}

export function isValidEvent(event: unknown): event is BaseEvent {
  try {
    const { error } = BaseEventSchema.validate(event);
    return !error;
  } catch {
    return false;
  }
}

export function getEventTypeValidator(eventType: string): Joi.Schema | null {
  return EventValidationMap.get(eventType) || null;
}

export function registerEventSchema(eventType: string, schema: Joi.Schema): void {
  EventValidationMap.set(eventType, schema);
}

export function removeEventSchema(eventType: string): void {
  EventValidationMap.delete(eventType);
}

export function getAllSupportedEventTypes(): string[] {
  return Array.from(EventValidationMap.keys());
}

// =============================================================================
// ASYNC VALIDATION
// =============================================================================

export async function validateEventAsync(event: BaseEvent): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      validateEvent(event);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// =============================================================================
// BATCH VALIDATION
// =============================================================================

export function validateEventBatch(events: BaseEvent[]): void {
  const errors: ValidationError[] = [];

  for (const [index, event] of events.entries()) {
    try {
      validateEvent(event);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error);
      } else {
        errors.push(new ValidationError(`Unknown validation error: ${error.message}`));
      }
    }
  }

  if (errors.length > 0) {
    throw new EventValidationError(
      `Batch validation failed: ${errors.length} events failed validation`,
      { errors, totalEvents: events.length }
    );
  }
}

export default {
  validateEvent,
  validateEventAsync,
  validateEventBatch,
  isValidEvent,
  createValidator,
  getEventTypeValidator,
  registerEventSchema,
  removeEventSchema,
  getAllSupportedEventTypes,
  // Schemas
  PatientCreatedSchema,
  AppointmentScheduledSchema,
  InvoiceGeneratedSchema,
  UserCreatedSchema,
  SystemErrorSchema
};