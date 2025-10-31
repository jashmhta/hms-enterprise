// HMS Enterprise Event Bus Type Definitions
// Comprehensive type system for all microservice events
// Enables type-safe inter-service communication

// Core Event Infrastructure Types
export interface BaseEvent {
  id: string; // UUID v7 for chronological ordering
  type: string;
  source: string; // Service name that generated the event
  timestamp: Date;
  data: unknown; // Event-specific payload
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId?: string; // Track request across service boundaries
  causationId?: string; // ID of event that triggered this event
  userId?: string; // User who initiated the action
  sessionId?: string; // User session for tracking
  version: string; // Event schema version (e.g., "1.0.0")
  traceId?: string; // Distributed tracing ID
}

export interface EventPublishOptions {
  delay?: number; // milliseconds
  retryCount?: number;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  deadLetterQueue?: boolean;
}

export interface EventBusConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxRetriesPerRequest?: number;
    retryDelayOnFailover?: number;
    lazyConnect?: boolean;
  };
  events: {
    defaultRetryAttempts?: number;
    defaultTimeout?: number;
    enableEventStore?: boolean;
    enableDeadLetterQueue?: boolean;
  };
}

// =============================================================================
// PATIENT SERVICE EVENTS
// =============================================================================

export interface PatientCreatedEvent extends BaseEvent {
  type: 'patient.created';
  data: {
    patientId: string;
    mrn: string;
    firstName: string;
    lastName?: string;
    mobile: string;
    email?: string;
    gender?: 'male' | 'female' | 'other';
    dateOfBirth?: Date;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
      country?: string;
    };
    emergencyContact?: {
      name: string;
      relationship: string;
      mobile: string;
    };
    abhaNumber?: string;
    abhaAddress?: string;
    healthIdVerified: boolean;
    source: 'registration' | 'import' | 'abdm_link' | 'b2b' | 'camp';
    registeredBy: string;
  };
}

export interface PatientUpdatedEvent extends BaseEvent {
  type: 'patient.updated';
  data: {
    patientId: string;
    mrn: string;
    changedFields: string[];
    previousValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    updatedBy: string;
    reason?: string;
  };
}

export interface PatientAbhaLinkedEvent extends BaseEvent {
  type: 'patient.abha_linked';
  data: {
    patientId: string;
    mrn: string;
    abhaNumber: string;
    abhaAddress: string;
    healthIdVerified: boolean;
    linkedAt: Date;
    linkedBy: string;
  };
}

export interface PatientDocumentUploadedEvent extends BaseEvent {
  type: 'patient.document_uploaded';
  data: {
    patientId: string;
    mrn: string;
    documentId: string;
    documentType: 'aadhaar' | 'abha_card' | 'pan' | 'passport' | 'insurance_policy' | 'medical_report' | 'consent_form' | 'id_proof' | 'address_proof';
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
    verified: boolean;
  };
}

export interface PatientMergedEvent extends BaseEvent {
  type: 'patient.merged';
  data: {
    primaryPatientId: string;
    primaryMrn: string;
    duplicatePatientId: string;
    duplicateMrn: string;
    mergeReason: string;
    mergedBy: string;
    mergedAt: Date;
  };
}

// =============================================================================
// APPOINTMENT SERVICE EVENTS
// =============================================================================

export interface AppointmentScheduledEvent extends BaseEvent {
  type: 'appointment.scheduled';
  data: {
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    doctorName: string;
    specialization: string;
    department: string;
    appointmentDate: Date;
    appointmentTime: string;
    duration: number; // minutes
    appointmentType: 'consultation' | 'follow_up' | 'review' | 'emergency' | 'surgery' | 'therapy';
    status: 'scheduled' | 'confirmed' | 'pending';
    consultationType: 'in_person' | 'video' | 'phone';
    notes?: string;
    bookedBy: string;
    source: 'walk_in' | 'phone' | 'online' | 'referral' | 'corporate' | 'camp';
  };
}

export interface AppointmentConfirmedEvent extends BaseEvent {
  type: 'appointment.confirmed';
  data: {
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    confirmedBy: string;
    confirmedAt: Date;
    notes?: string;
  };
}

export interface AppointmentRescheduledEvent extends BaseEvent {
  type: 'appointment.rescheduled';
  data: {
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    previousDate: Date;
    previousTime: string;
    newDate: Date;
    newTime: string;
    rescheduledBy: string;
    rescheduledAt: Date;
    reason?: string;
  };
}

export interface AppointmentCancelledEvent extends BaseEvent {
  type: 'appointment.cancelled';
  data: {
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    cancelledBy: string;
    cancelledAt: Date;
    cancellationReason: string;
    refundProcessed?: boolean;
    refundAmount?: number;
  };
}

export interface AppointmentStartedEvent extends BaseEvent {
  type: 'appointment.started';
  data: {
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    startedAt: Date;
    startedBy: string;
    actualStartTime?: string;
  };
}

export interface AppointmentCompletedEvent extends BaseEvent {
  type: 'appointment.completed';
  data: {
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    visitId: string;
    completedAt: Date;
    completedBy: string;
    actualEndTime?: string;
    nextAppointmentDate?: Date;
    followUpRequired: boolean;
    notes?: string;
  };
}

export interface AppointmentNoShowEvent extends BaseEvent {
  type: 'appointment.no_show';
  data: {
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    appointmentDate: Date;
    appointmentTime: string;
    markedBy: string;
    markedAt: Date;
    noShowReason?: string;
    actionTaken: 'rescheduled' | 'cancelled' | 'follow_up_required' | 'fee_charged';
    feeCharged?: number;
  };
}

// =============================================================================
// CLINICAL SERVICE EVENTS
// =============================================================================

export interface VisitStartedEvent extends BaseEvent {
  type: 'visit.started';
  data: {
    visitId: string;
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    doctorName: string;
    department: string;
    visitType: 'new' | 'follow_up' | 'emergency' | 'review';
    chiefComplaint: string;
    symptoms: string[];
    vitals: {
      bloodPressure?: {
        systolic: number;
        diastolic: number;
      };
      heartRate?: number;
      temperature?: number;
      oxygenSaturation?: number;
      respiratoryRate?: number;
      height?: number;
      weight?: number;
      bmi?: number;
    };
    startedAt: Date;
    startedBy: string;
  };
}

export interface VisitCompletedEvent extends BaseEvent {
  type: 'visit.completed';
  data: {
    visitId: string;
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    diagnosis: Array<{
      code: string; // ICD-10 code
      description: string;
      type: 'primary' | 'secondary' | 'provisional' | 'final';
      onsetDate?: Date;
    }>;
    clinicalNotes: string;
    treatmentPlan: string;
    instructions: string[];
    followUpDate?: Date;
    investigationsOrdered: Array<{
      testCode: string;
      testName: string;
      category: string;
      urgency: 'routine' | 'urgent' | 'stat';
    }>;
    completedAt: Date;
    completedBy: string;
  };
}

export interface PrescriptionCreatedEvent extends BaseEvent {
  type: 'prescription.created';
  data: {
    prescriptionId: string;
    visitId: string;
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    doctorName: string;
    prescribedAt: Date;
    medications: Array<{
      medicineName: string;
      genericName?: string;
      brandName?: string;
      dosage: string;
      frequency: string;
      duration: string;
      route: 'oral' | 'topical' | 'intravenous' | 'intramuscular' | 'inhalation' | 'rectal' | 'ocular' | 'nasal';
      instructions?: string;
      quantity: number;
      isControlled: boolean;
    }>;
    advice: string[];
    validUntil: Date;
    status: 'active' | 'completed' | 'cancelled';
  };
}

export interface InvestigationOrderedEvent extends BaseEvent {
  type: 'investigation.ordered';
  data: {
    investigationId: string;
    visitId: string;
    appointmentId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    tests: Array<{
      testCode: string;
      testName: string;
      category: 'pathology' | 'radiology' | 'cardiology' | 'neurology' | 'gastroenterology' | 'general';
      urgency: 'routine' | 'urgent' | 'stat';
      clinicalNotes?: string;
    }>;
    labId?: string;
    externalLab?: string;
    sampleCollected: boolean;
    estimatedReadyDate?: Date;
    orderedAt: Date;
    orderedBy: string;
  };
}

export interface InvestigationResultEvent extends BaseEvent {
  type: 'investigation.result_received';
  data: {
    investigationId: string;
    visitId: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    testResults: Array<{
      testCode: string;
      testName: string;
      result: string;
      normalRange?: string;
      unit?: string;
      status: 'normal' | 'abnormal' | 'critical' | 'pending';
      comments?: string;
    }>;
    reportedBy: string;
    reportedAt: Date;
    verifiedBy?: string;
    verifiedAt?: Date;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
    }>;
  };
}

// =============================================================================
// BILLING SERVICE EVENTS
// =============================================================================

export interface InvoiceGeneratedEvent extends BaseEvent {
  type: 'invoice.generated';
  data: {
    invoiceId: string;
    invoiceNumber: string;
    patientId: string;
    mrn: string;
    appointmentId?: string;
    visitId?: string;
    isB2B: boolean;
    b2bClientId?: string;
    campId?: string;
    items: Array<{
      serviceId: string;
      serviceName: string;
      category: string;
      hsnCode?: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      discountReason?: string;
      cgstRate: number;
      sgstRate: number;
      igstRate: number;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
      totalAmount: number;
    }>;
    subtotal: number;
    totalDiscount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    paymentStatus: 'unpaid' | 'partial' | 'paid';
    dueDate: Date;
    generatedBy: string;
    generatedAt: Date;
  };
}

export interface InvoiceUpdatedEvent extends BaseEvent {
  type: 'invoice.updated';
  data: {
    invoiceId: string;
    invoiceNumber: string;
    patientId: string;
    mrn: string;
    previousAmount: number;
    newAmount: number;
    reason: string;
    updatedBy: string;
    updatedAt: Date;
  };
}

export interface PaymentReceivedEvent extends BaseEvent {
  type: 'payment.received';
  data: {
    paymentId: string;
    invoiceId: string;
    invoiceNumber: string;
    patientId: string;
    mrn: string;
    amount: number;
    paymentMethod: 'cash' | 'card' | 'upi' | 'wallet' | 'bank_transfer' | 'cheque' | 'insurance' | 'corporate';
    transactionId?: string;
    paymentGateway?: string;
    paymentDetails: {
      cardLast4?: string;
      cardBrand?: string;
      upiId?: string;
      bankName?: string;
      chequeNumber?: string;
      policyNumber?: string;
    };
    paymentDate: Date;
    receivedBy: string;
    instrumentType: 'advance' | 'full' | 'partial' | 'settlement' | 'refund';
  };
}

export interface PaymentRefundedEvent extends BaseEvent {
  type: 'payment.refunded';
  data: {
    refundId: string;
    originalPaymentId: string;
    invoiceId: string;
    invoiceNumber: string;
    patientId: string;
    mrn: string;
    refundAmount: number;
    refundReason: string;
    refundMethod: 'cash' | 'card' | 'bank_transfer' | 'wallet';
    refundDate: Date;
    processedBy: string;
    refundStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

export interface GstInvoiceGeneratedEvent extends BaseEvent {
  type: 'gst_invoice.generated';
  data: {
    gstInvoiceId: string;
    invoiceId: string;
    invoiceNumber: string;
    irn: string; // Invoice Reference Number
    ackNumber: string;
    ackDate: Date;
    signedInvoice: string;
    signedQrCode: string;
    qrCodeUrl: string;
    ewayBillNumber?: string;
    ewayBillValidUntil?: Date;
    suppliedBy: {
      name: string;
      address: string;
      gstin: string;
      stateCode: string;
    };
    recipient: {
      name: string;
      address: string;
      gstin?: string;
      stateCode: string;
      placeOfSupply: string;
    };
    generatedAt: Date;
  };
}

// =============================================================================
// USER SERVICE EVENTS
// =============================================================================

export interface UserCreatedEvent extends BaseEvent {
  type: 'user.created';
  data: {
    userId: string;
    username: string;
    email: string;
    firstName: string;
    lastName?: string;
    userType: 'admin' | 'doctor' | 'receptionist' | 'accountant' | 'pharmacist' | 'lab_technician' | 'b2b_manager';
    isDoctor: boolean;
    specialization?: string;
    department?: string;
    hprId?: string;
    isActive: boolean;
    roles: string[];
    permissions: string[];
    createdBy: string;
    createdAt: Date;
  };
}

export interface UserUpdatedEvent extends BaseEvent {
  type: 'user.updated';
  data: {
    userId: string;
    username: string;
    changedFields: string[];
    previousValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    updatedBy: string;
    updatedAt: Date;
  };
}

export interface UserLoginEvent extends BaseEvent {
  type: 'user.login';
  data: {
    userId: string;
    username: string;
    userType: string;
    loginAt: Date;
    ipAddress: string;
    userAgent: string;
    loginMethod: 'password' | 'sso' | 'oauth' | 'biometric';
    sessionId: string;
    loginStatus: 'success' | 'failed' | 'blocked';
    failureReason?: string;
  };
}

export interface UserLogoutEvent extends BaseEvent {
  type: 'user.logout';
  data: {
    userId: string;
    username: string;
    logoutAt: Date;
    sessionId: string;
    logoutReason: 'manual' | 'timeout' | 'forced' | 'session_expired';
    sessionDuration?: number; // seconds
  };
}

export interface UserPasswordChangedEvent extends BaseEvent {
  type: 'user.password_changed';
  data: {
    userId: string;
    username: string;
    changedAt: Date;
    changedBy: string; // Self or admin
    changeReason: 'self_service' | 'admin_reset' | 'forced_reset' | 'expired';
    ipAddress: string;
    sessionId?: string;
  };
}

export interface UserRoleChangedEvent extends BaseEvent {
  type: 'user.role_changed';
  data: {
    userId: string;
    username: string;
    previousRoles: string[];
    newRoles: string[];
    changedBy: string;
    changedAt: Date;
    reason?: string;
  };
}

// =============================================================================
// ACCOUNTING SERVICE EVENTS
// =============================================================================

export interface JournalEntryCreatedEvent extends BaseEvent {
  type: 'journal_entry.created';
  data: {
    entryId: string;
    entryNumber: string;
    entryDate: Date;
    referenceNumber?: string;
    referenceType?: 'invoice' | 'payment' | 'refund' | 'expense' | 'adjustment';
    referenceId?: string;
    description: string;
    totalDebit: number;
    totalCredit: number;
    isPosted: boolean;
    lines: Array<{
      accountId: string;
      accountName: string;
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      description?: string;
      departmentId?: string;
      projectId?: string;
      doctorId?: string;
      patientId?: string;
    }>;
    createdBy: string;
    createdAt: Date;
    approvedBy?: string;
    approvedAt?: Date;
  };
}

export interface JournalEntryPostedEvent extends BaseEvent {
  type: 'journal_entry.posted';
  data: {
    entryId: string;
    entryNumber: string;
    postedAt: Date;
    postedBy: string;
    fiscalYear: string;
    accountingPeriod: string;
  };
}

export interface PaymentReceivedAccountingEvent extends BaseEvent {
  type: 'accounting.payment_received';
  data: {
    paymentId: string;
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    cashAccountId: string;
    revenueAccountId: string;
    patientId: string;
    mrn: string;
    recordedBy: string;
    recordedAt: Date;
  };
}

export interface ExpenseRecordedEvent extends BaseEvent {
  type: 'accounting.expense_recorded';
  data: {
    expenseId: string;
    expenseNumber: string;
    vendorName: string;
    category: string;
    description: string;
    amount: number;
    gstAmount: number;
    totalAmount: number;
    expenseDate: Date;
    billNumber?: string;
    billDate?: Date;
    dueDate?: Date;
    expenseAccountId: string;
    gstAccountId: string;
    recordedBy: string;
    recordedAt: Date;
    approvedBy?: string;
    approvedAt?: Date;
  };
}

// =============================================================================
// PARTNER SERVICE EVENTS
// =============================================================================

export interface PartnerCreatedEvent extends BaseEvent {
  type: 'partner.created';
  data: {
    partnerId: string;
    partnerCode: string;
    partnerName: string;
    partnerType: 'hospital' | 'lab' | 'pharmacy' | 'insurance' | 'vendor' | 'consultant' | 'ambulance';
    category: string;
    contactInfo: {
      primaryContact: string;
      email: string;
      phone: string;
      address: string;
    };
    billingInfo: {
      gstin?: string;
      pan?: string;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
    };
    services: Array<{
      serviceId: string;
      serviceName: string;
      category: string;
      rate: number;
      commissionRate?: number;
    }>;
    agreementDetails: {
      agreementType: string;
      startDate: Date;
      endDate?: Date;
      terms: string;
    };
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
  };
}

export interface PartnerServiceProvidedEvent extends BaseEvent {
  type: 'partner.service_provided';
  data: {
    partnerBillId: string;
    billNumber: string;
    partnerId: string;
    partnerName: string;
    patientId: string;
    mrn: string;
    appointmentId?: string;
    services: Array<{
      serviceId: string;
      serviceName: string;
      quantity: number;
      rate: number;
      amount: number;
      cgstAmount: number;
      sgstAmount: number;
      totalAmount: number;
    }>;
    subtotal: number;
    totalTax: number;
    totalAmount: number;
    serviceDate: Date;
    referenceNumber?: string;
    billedBy: string;
    billedAt: Date;
  };
}

export interface PartnerPaymentProcessedEvent extends BaseEvent {
  type: 'partner.payment_processed';
  data: {
    partnerTransactionId: string;
    partnerBillId: string;
    partnerId: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    paymentDate: Date;
    tdsAmount?: number;
    tdsSection?: string;
    netAmount: number;
    processedBy: string;
    processedAt: Date;
    paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

// =============================================================================
// B2B SERVICE EVENTS
// =============================================================================

export interface B2BClientCreatedEvent extends BaseEvent {
  type: 'b2b.client.created';
  data: {
    clientId: string;
    clientCode: string;
    companyName: string;
    industry: string;
    category: 'corporate' | 'insurance' | 'government' | 'educational' | 'other';
    contactInfo: {
      contactPerson: string;
      designation: string;
      email: string;
      phone: string;
      address: string;
    };
    billingInfo: {
      gstin?: string;
      pan?: string;
      creditLimit?: number;
      paymentTerms: number; // days
    };
    agreementDetails: {
      agreementType: string;
      startDate: Date;
      endDate?: Date;
      services: string[];
      rates: Record<string, number>;
      terms: string;
    };
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
  };
}

export interface B2BEmployeeRegisteredEvent extends BaseEvent {
  type: 'b2b.employee.registered';
  data: {
    employeeId: string;
    clientId: string;
    clientCode: string;
    employeeCode: string;
    firstName: string;
    lastName?: string;
    email: string;
    mobile: string;
    department: string;
    designation: string;
    dateOfJoining?: Date;
    benefits: Array<{
      benefitType: string;
      coverage: string;
      limits?: Record<string, number>;
    }>;
    isActive: boolean;
    registeredBy: string;
    registeredAt: Date;
  };
}

export interface B2BAppointmentBookedEvent extends BaseEvent {
  type: 'b2b.appointment.booked';
  data: {
    appointmentId: string;
    clientId: string;
    clientCode: string;
    employeeId: string;
    employeeName: string;
    patientId: string;
    mrn: string;
    doctorId: string;
    doctorName: string;
    appointmentDate: Date;
    appointmentTime: string;
    appointmentType: string;
    consultationType: string;
    billTo: 'corporate' | 'employee' | 'insurance';
    bookedBy: string;
    bookedAt: Date;
  };
}

export interface B2BInvoiceGeneratedEvent extends BaseEvent {
  type: 'b2b.invoice.generated';
  data: {
    invoiceId: string;
    invoiceNumber: string;
    clientId: string;
    clientCode: string;
    billingPeriod: {
      startDate: Date;
      endDate: Date;
    };
    employees: Array<{
      employeeId: string;
      employeeName: string;
      patientId: string;
      mrn: string;
      services: Array<{
        serviceName: string;
        date: Date;
        amount: number;
      }>;
      employeeTotal: number;
    }>;
    totalAmount: number;
    gstAmount: number;
    totalWithGst: number;
    discountAmount?: number;
    netAmount: number;
    dueDate: Date;
    generatedAt: Date;
    generatedBy: string;
  };
}

// =============================================================================
// CAMP SERVICE EVENTS
// =============================================================================

export interface CampCreatedEvent extends BaseEvent {
  type: 'camp.created';
  data: {
    campId: string;
    campCode: string;
    campName: string;
    campType: 'health_checkup' | 'vaccination' | 'awareness' | 'screening' | 'specialty';
    organizer: {
      name: string;
      contactPerson: string;
      email: string;
      phone: string;
    };
    venue: {
      name: string;
      address: string;
      city: string;
      capacity: number;
    };
    schedule: {
      startDate: Date;
      endDate: Date;
      startTime: string;
      endTime: string;
    };
    services: Array<{
      serviceName: string;
      category: string;
      rate?: number;
    }>;
    team: Array<{
      doctorId: string;
      doctorName: string;
      specialization: string;
      role: 'lead' | 'assistant' | 'consultant';
    }>;
    expectedRegistrations: number;
    budget?: {
      estimated: number;
      approved: number;
    };
    status: 'planning' | 'approved' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
    createdBy: string;
    createdAt: Date;
  };
}

export interface CampRegistrationEvent extends BaseEvent {
  type: 'camp.registration.completed';
  data: {
    registrationId: string;
    campId: string;
    campCode: string;
    patientId: string;
    mrn: string;
    firstName: string;
    lastName?: string;
    mobile: string;
    email?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';
    address?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      mobile: string;
    };
    medicalHistory?: {
      allergies?: string[];
      medications?: string[];
      chronicConditions?: string[];
    };
    registeredAt: Date;
    registeredBy: string;
    registrationSource: 'online' | 'onsite' | 'bulk';
  };
}

export interface CampExpenseRecordedEvent extends BaseEvent {
  type: 'camp.expense.recorded';
  data: {
    expenseId: string;
    campId: string;
    campCode: string;
    expenseCategory: 'venue' | 'equipment' | 'consumables' | 'staff' | 'marketing' | 'transport' | 'food' | 'other';
    description: string;
    amount: number;
    quantity?: number;
    unitPrice?: number;
    vendorName?: string;
    billNumber?: string;
    expenseDate: Date;
    approvedBy?: string;
    recordedBy: string;
    recordedAt: Date;
  };
}

// =============================================================================
// INTEGRATION SERVICE EVENTS
// =============================================================================

export interface ABHADataSyncedEvent extends BaseEvent {
  type: 'abdm.abha_data_synced';
  data: {
    patientId: string;
    mrn: string;
    abhaNumber: string;
    abhaAddress: string;
    syncType: 'profile' | 'health_records' | 'linked_facilities' | 'consents';
    syncedAt: Date;
    syncedBy: string;
    dataReceived: Record<string, unknown>;
  };
}

export interface ABHILinkedEvent extends BaseEvent {
  type: 'abdm.abhi_linked';
  data: {
    patientId: string;
    mrn: string;
    abhaNumber: string;
    abhiId: string;
    linkedAt: Date;
    linkedBy: string;
    consentArtifact: {
      id: string;
      status: 'GRANTED' | 'REVOKED' | 'EXPIRED';
      purpose: string;
      expiryDate?: Date;
    };
  };
}

export interface HealthRecordSharedEvent extends BaseEvent {
  type: 'abdm.health_record_shared';
  data: {
    patientId: string;
    mrn: string;
    abhaNumber: string;
    recordId: string;
    recordType: 'discharge_summary' | 'lab_report' | 'prescription' | 'imaging' | 'vital_signs';
    sharedWith: {
      hipId: string;
      hipName: string;
      purpose: string;
    };
    consentId: string;
    sharedAt: Date;
    sharedBy: string;
  };
}

export interface LabResultReceivedEvent extends BaseEvent {
  type: 'integration.lab_result_received';
  data: {
    resultId: string;
    patientId: string;
    mrn: string;
    investigationId: string;
    labId: string;
    labName: string;
    accessionNumber: string;
    tests: Array<{
      testCode: string;
      testName: string;
      result: string;
      normalRange?: string;
      unit?: string;
      status: string;
      referenceRange?: string;
      abnormalFlag?: boolean;
    }>;
    specimenInfo: {
      specimenType: string;
      collectionDate: Date;
      receivedDate: Date;
    };
    performedBy: string;
    reportedDate: Date;
    verifiedBy?: string;
    verifiedDate?: Date;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
    }>;
    receivedAt: Date;
  };
}

export interface InsuranceClaimSubmittedEvent extends BaseEvent {
  type: 'integration.insurance_claim_submitted';
  data: {
    claimId: string;
    patientId: string;
    mrn: string;
    insurerId: string;
    insurerName: string;
    policyNumber: string;
    claimType: 'cashless' | 'reimbursement';
    invoiceIds: string[];
    totalClaimAmount: number;
    preAuthRequired: boolean;
    preAuthNumber?: string;
    submittedAt: Date;
    submittedBy: string;
    supportingDocuments: Array<{
      documentType: string;
      fileName: string;
      fileUrl: string;
    }>;
  };
}

export interface InsuranceClaimUpdatedEvent extends BaseEvent {
  type: 'integration.insurance_claim_updated';
  data: {
    claimId: string;
    patientId: string;
    mrn: string;
    insurerId: string;
    previousStatus: string;
    newStatus: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'partial_approved' | 'settled';
    approvedAmount?: number;
    rejectionReason?: string;
    remarks?: string;
    updatedAt: Date;
    updatedBy: string;
  };
}

// =============================================================================
// NOTIFICATION SERVICE EVENTS
// =============================================================================

export interface NotificationScheduledEvent extends BaseEvent {
  type: 'notification.scheduled';
  data: {
    notificationId: string;
    recipientId: string;
    recipientType: 'patient' | 'user' | 'doctor' | 'admin';
    notificationType: 'appointment_reminder' | 'payment_reminder' | 'test_result' | 'prescription_reminder' | 'health_tips' | 'promotional' | 'emergency';
    channel: 'sms' | 'email' | 'whatsapp' | 'push' | 'in_app';
    content: {
      subject?: string;
      body: string;
      template?: string;
      variables?: Record<string, unknown>;
    };
    scheduledAt: Date;
    scheduledBy: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    retryPolicy: {
      maxRetries: number;
      retryInterval: number;
    };
  };
}

export interface NotificationSentEvent extends BaseEvent {
  type: 'notification.sent';
  data: {
    notificationId: string;
    recipientId: string;
    recipientType: string;
    channel: string;
    notificationType: string;
    sentAt: Date;
    deliveryStatus: 'sent' | 'delivered' | 'failed' | 'bounced';
    responseCode?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface NotificationReadEvent extends BaseEvent {
  type: 'notification.read';
  data: {
    notificationId: string;
    recipientId: string;
    recipientType: string;
    readAt: Date;
    readChannel: string;
  };
}

// =============================================================================
// SYSTEM AND INFRASTRUCTURE EVENTS
// =============================================================================

export interface SystemBackupCompletedEvent extends BaseEvent {
  type: 'system.backup_completed';
  data: {
    backupId: string;
    backupType: 'full' | 'incremental' | 'differential';
    source: 'database' | 'files' | 'configuration';
    size: number;
    duration: number;
    backupLocation: string;
    compressionRatio?: number;
    verificationStatus: 'verified' | 'failed' | 'pending';
    completedAt: Date;
  };
}

export interface SystemErrorEvent extends BaseEvent {
  type: 'system.error';
  data: {
    errorId: string;
    service: string;
    environment: string;
    errorType: 'system' | 'business' | 'integration' | 'security';
    severity: 'low' | 'medium' | 'high' | 'critical';
    errorCode: string;
    errorMessage: string;
    stackTrace?: string;
    requestId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
    occurredAt: Date;
    resolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
  };
}

export interface SystemMaintenanceEvent extends BaseEvent {
  type: 'system.maintenance';
  data: {
    maintenanceId: string;
    maintenanceType: 'scheduled' | 'emergency' | 'patch' | 'upgrade';
    services: string[];
    startTime: Date;
    endTime?: Date;
    duration?: number;
    impact: 'no_impact' | 'partial_impact' | 'full_outage';
    description: string;
    notificationSent: boolean;
    startedBy: string;
    completedBy?: string;
  };
}

// =============================================================================
// UNION TYPE FOR ALL EVENTS
// =============================================================================

export type HMSEvent =
  // Patient Events
  | PatientCreatedEvent
  | PatientUpdatedEvent
  | PatientAbhaLinkedEvent
  | PatientDocumentUploadedEvent
  | PatientMergedEvent

  // Appointment Events
  | AppointmentScheduledEvent
  | AppointmentConfirmedEvent
  | AppointmentRescheduledEvent
  | AppointmentCancelledEvent
  | AppointmentStartedEvent
  | AppointmentCompletedEvent
  | AppointmentNoShowEvent

  // Clinical Events
  | VisitStartedEvent
  | VisitCompletedEvent
  | PrescriptionCreatedEvent
  | InvestigationOrderedEvent
  | InvestigationResultEvent

  // Billing Events
  | InvoiceGeneratedEvent
  | InvoiceUpdatedEvent
  | PaymentReceivedEvent
  | PaymentRefundedEvent
  | GstInvoiceGeneratedEvent

  // User Events
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserLoginEvent
  | UserLogoutEvent
  | UserPasswordChangedEvent
  | UserRoleChangedEvent

  // Accounting Events
  | JournalEntryCreatedEvent
  | JournalEntryPostedEvent
  | PaymentReceivedAccountingEvent
  | ExpenseRecordedEvent

  // Partner Events
  | PartnerCreatedEvent
  | PartnerServiceProvidedEvent
  | PartnerPaymentProcessedEvent

  // B2B Events
  | B2BClientCreatedEvent
  | B2BEmployeeRegisteredEvent
  | B2BAppointmentBookedEvent
  | B2BInvoiceGeneratedEvent

  // Camp Events
  | CampCreatedEvent
  | CampRegistrationEvent
  | CampExpenseRecordedEvent

  // Integration Events
  | ABHADataSyncedEvent
  | ABHILinkedEvent
  | HealthRecordSharedEvent
  | LabResultReceivedEvent
  | InsuranceClaimSubmittedEvent
  | InsuranceClaimUpdatedEvent

  // Notification Events
  | NotificationScheduledEvent
  | NotificationSentEvent
  | NotificationReadEvent

  // System Events
  | SystemBackupCompletedEvent
  | SystemErrorEvent
  | SystemMaintenanceEvent;

// =============================================================================
// EVENT BUS CHANNEL DEFINITIONS
// =============================================================================

export interface EventBusChannels {
  // Patient channels
  'patient.created': PatientCreatedEvent;
  'patient.updated': PatientUpdatedEvent;
  'patient.abha_linked': PatientAbhaLinkedEvent;
  'patient.document_uploaded': PatientDocumentUploadedEvent;
  'patient.merged': PatientMergedEvent;

  // Appointment channels
  'appointment.scheduled': AppointmentScheduledEvent;
  'appointment.confirmed': AppointmentConfirmedEvent;
  'appointment.rescheduled': AppointmentRescheduledEvent;
  'appointment.cancelled': AppointmentCancelledEvent;
  'appointment.started': AppointmentStartedEvent;
  'appointment.completed': AppointmentCompletedEvent;
  'appointment.no_show': AppointmentNoShowEvent;

  // Clinical channels
  'visit.started': VisitStartedEvent;
  'visit.completed': VisitCompletedEvent;
  'prescription.created': PrescriptionCreatedEvent;
  'investigation.ordered': InvestigationOrderedEvent;
  'investigation.result_received': InvestigationResultEvent;

  // Billing channels
  'invoice.generated': InvoiceGeneratedEvent;
  'invoice.updated': InvoiceUpdatedEvent;
  'payment.received': PaymentReceivedEvent;
  'payment.refunded': PaymentRefundedEvent;
  'gst_invoice.generated': GstInvoiceGeneratedEvent;

  // User channels
  'user.created': UserCreatedEvent;
  'user.updated': UserUpdatedEvent;
  'user.login': UserLoginEvent;
  'user.logout': UserLogoutEvent;
  'user.password_changed': UserPasswordChangedEvent;
  'user.role_changed': UserRoleChangedEvent;

  // Accounting channels
  'journal_entry.created': JournalEntryCreatedEvent;
  'journal_entry.posted': JournalEntryPostedEvent;
  'accounting.payment_received': PaymentReceivedAccountingEvent;
  'accounting.expense_recorded': ExpenseRecordedEvent;

  // Partner channels
  'partner.created': PartnerCreatedEvent;
  'partner.service_provided': PartnerServiceProvidedEvent;
  'partner.payment_processed': PartnerPaymentProcessedEvent;

  // B2B channels
  'b2b.client.created': B2BClientCreatedEvent;
  'b2b.employee.registered': B2BEmployeeRegisteredEvent;
  'b2b.appointment.booked': B2BAppointmentBookedEvent;
  'b2b.invoice.generated': B2BInvoiceGeneratedEvent;

  // Camp channels
  'camp.created': CampCreatedEvent;
  'camp.registration.completed': CampRegistrationEvent;
  'camp.expense.recorded': CampExpenseRecordedEvent;

  // Integration channels
  'abdm.abha_data_synced': ABHADataSyncedEvent;
  'abdm.abhi_linked': ABHILinkedEvent;
  'abdm.health_record_shared': HealthRecordSharedEvent;
  'integration.lab_result_received': LabResultReceivedEvent;
  'integration.insurance_claim_submitted': InsuranceClaimSubmittedEvent;
  'integration.insurance_claim_updated': InsuranceClaimUpdatedEvent;

  // Notification channels
  'notification.scheduled': NotificationScheduledEvent;
  'notification.sent': NotificationSentEvent;
  'notification.read': NotificationReadEvent;

  // System channels
  'system.backup_completed': SystemBackupCompletedEvent;
  'system.error': SystemErrorEvent;
  'system.maintenance': SystemMaintenanceEvent;

  // Wildcard pattern for all events
  '*': HMSEvent;
}

// =============================================================================
// EVENT SUBSCRIPTION HANDLERS
// =============================================================================

export interface EventHandler<T = HMSEvent> {
  (event: T): Promise<void> | void;
}

export interface EventSubscriptionConfig {
  pattern: string;
  handler: EventHandler;
  options?: {
    maxRetries?: number;
    timeout?: number;
    deadLetterQueue?: boolean;
    concurrency?: number;
  };
}

export interface EventBusStats {
  published: number;
  received: number;
  failed: number;
  retried: number;
  deadLettered: number;
  uptime: number;
  lastError?: string;
}

export interface DeadLetterEvent {
  originalEvent: HMSEvent;
  error: Error;
  retryCount: number;
  firstFailure: Date;
  lastFailure: Date;
  nextRetry?: Date;
  metadata: {
    originalChannel: string;
    errorStack: string;
    retryHistory: Array<{
      attempt: number;
      timestamp: Date;
      error: string;
    }>;
  };
}

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

export type { BaseEvent, EventMetadata, HMSEvent, EventBusChannels };