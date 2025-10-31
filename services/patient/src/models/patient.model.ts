// HMS Patient Service Models
// Comprehensive patient data models with ABDM integration

import { BaseModel } from '@hms/shared';
import { PatientStatus, Gender, BloodGroup, MaritalStatus, ABDMVerificationStatus } from '@hms/shared';
import { ABHAPatient } from '@/services/abdm.service';

// =============================================================================
// PATIENT CORE MODELS
// =============================================================================

export interface Patient extends BaseModel {
  mrn: string; // Medical Record Number - Primary identifier

  // Basic Demographics
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName?: string; // Computed field
  preferredName?: string;
  gender: Gender;
  dateOfBirth: Date;
  age?: number; // Computed field
  placeOfBirth?: string;

  // Contact Information
  primaryContactNumber: string;
  secondaryContactNumber?: string;
  email?: string;
  address: PatientAddress;

  // Identification
  aadhaarNumber?: string; // Encrypted
  panNumber?: string; // Encrypted
  passportNumber?: string; // Encrypted
  drivingLicenseNumber?: string; // Encrypted
  voterIdNumber?: string; // Encrypted

  // ABDM Integration
  abhaNumber?: string;
  healthId?: string;
  abdmLinkStatus: ABDMVerificationStatus;
  abdmLinkedAt?: Date;
  abdmLastSyncAt?: Date;

  // Additional Information
  bloodGroup?: BloodGroup;
  maritalStatus?: MaritalStatus;
  occupation?: string;
  education?: string;
  religion?: string;
  nationality: string = 'Indian';
  languagePreferences: string[];

  // Emergency Contact
  emergencyContact: EmergencyContact;

  // Healthcare Information
  primaryCarePhysician?: string; // Staff ID
  referringDoctor?: string; // Staff ID
  allergies: PatientAllergy[];
  medicalHistory: MedicalHistoryItem[];
  currentMedications: CurrentMedication[];

  // Insurance Information
  insuranceDetails: InsuranceInfo[];

  // Status and Metadata
  status: PatientStatus;
  isDeceased: boolean = false;
  dateOfDeath?: Date;
  causeOfDeath?: string;
  placeOfDeath?: string;
  deathReportedBy?: string; // Staff ID

  // System Information
  registrationDate: Date;
  registrationSource: 'walk-in' | 'online' | 'referral' | 'abdm';
  registrationLocation?: string; // Facility ID
  referringOrganization?: string;

  // Privacy and Consent
  consentForResearch: boolean = false;
  consentForMarketing: boolean = false;
  privacyPreferences: PrivacyPreferences;

  // Audit Information
  lastVisitDate?: Date;
  totalVisits: number = 0;

  // Temporary/Fields for verification
  isVerified: boolean = false;
  verificationDocuments: VerificationDocument[];
}

export interface PatientAddress {
  type: 'permanent' | 'current' | 'temporary' | 'office';
  line1: string;
  line2?: string;
  line3?: string;
  city: string;
  district: string;
  state: string;
  country: string = 'India';
  pincode: string;
  landmark?: string;
  isSameAsPermanent?: boolean; // For current address
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  primaryContactNumber: string;
  secondaryContactNumber?: string;
  email?: string;
  address?: PatientAddress;
  isNextOfKin: boolean = false;
  consentForEmergencyTreatment: boolean = true;
}

export interface PatientAllergy {
  id: string;
  allergen: string; // e.g., 'Penicillin', 'Peanuts', 'Latex'
  type: 'drug' | 'food' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  reaction: string;
  onsetDate?: Date;
  reportedBy: 'patient' | 'doctor' | 'family';
  isActive: boolean = true;
  notes?: string;
}

export interface MedicalHistoryItem {
  id: string;
  condition: string;
  category: 'chronic' | 'acute' | 'surgical' | 'congenital' | 'other';
  diagnosisDate?: Date;
  resolvedDate?: Date;
  status: 'active' | 'resolved' | 'controlled' | 'recurrent';
  severity?: 'mild' | 'moderate' | 'severe';
  treatingPhysician?: string; // Staff ID
  treatmentDetails?: string;
  complications?: string;
  isChronic: boolean = false;
}

export interface CurrentMedication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string; // e.g., '500mg'
  frequency: string; // e.g., 'twice daily'
  route: string; // e.g., 'oral', 'injection'
  prescribedBy: string; // Staff ID
  prescribedDate: Date;
  startDate: Date;
  endDate?: Date;
  indication?: string; // Reason for medication
  isActive: boolean = true;
  notes?: string;
}

export interface InsuranceInfo {
  id: string;
  provider: string;
  policyNumber: string;
  policyHolderName?: string;
  relationshipToHolder: 'self' | 'spouse' | 'child' | 'parent' | 'other';
  planType: string;
  coverageAmount?: number;
  validityPeriod: {
    from: Date;
    to: Date;
  };
  isPrimary: boolean = false;
  isActive: boolean = true;
  documents?: VerificationDocument[];
  tpaId?: string; // Third Party Administrator
  preAuthRequired: boolean = false;
}

export interface PrivacyPreferences {
  allowEmailCommunication: boolean = true;
  allowSMSCommunication: boolean = true;
  allowWhatsAppCommunication: boolean = false;
  allowResearchParticipation: boolean = false;
  allowDataSharing: boolean = false;
  dataSharingPurposes?: string[];
  communicationLanguage: string = 'English';
  preferredContactMethod: 'email' | 'phone' | 'sms' | 'whatsapp';
  doNotContact: boolean = false;
}

export interface VerificationDocument {
  id: string;
  documentType: 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'voter_id' | 'abha_card' | 'other';
  documentNumber?: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType: string;
  uploadedDate: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  verifiedBy?: string; // Staff ID
  verifiedDate?: Date;
  expiryDate?: Date;
  isEncrypted: boolean = true;
  checksum?: string;
}

// =============================================================================
// PATIENT VISIT MODELS
// =============================================================================

export interface PatientVisit extends BaseModel {
  patientId: string;
  mrn: string;
  visitNumber: string; // Auto-generated sequential number per patient

  // Visit Details
  visitType: 'opd' | 'ipd' | 'emergency' | 'day_care' | 'follow_up' | 'consultation';
  departmentId: string;
  doctorId: string; // Primary consulting doctor
  facilityId: string;

  // Scheduling
  scheduledDateTime?: Date;
  actualArrivalDateTime: Date;
  actualStartDateTime?: Date;
  actualEndDateTime?: Date;

  // Visit Status
  status: 'scheduled' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  priority: 'routine' | 'urgent' | 'emergency' | 'critical';

  // Clinical Information
  chiefComplaint?: string;
  presentingSymptoms: VisitSymptom[];
  vitalSigns?: VitalSigns;
  physicalExamination?: PhysicalExamination;
  provisionalDiagnosis?: string[];
  finalDiagnosis?: string[];
  treatmentGiven?: string;
  procedures?: Procedure[];
  investigations?: Investigation[];

  // Financial Information
  paymentType: 'cash' | 'insurance' | 'corporate' | 'government_scheme' | 'free';
  estimatedCost?: number;
  actualCost?: number;
  insuranceClaimNumber?: string;

  // Referral Information
  referredBy?: string; // Doctor/Institution Name
  referredTo?: string[]; // Specialists
  referralType?: 'in' | 'out' | 'self';

  // Discharge Information
  dischargeType?: 'regular' | 'lama' | 'refer' | 'death';
  dischargeCondition?: string;
  dischargeAdvice?: string;
  followUpRequired?: boolean;
  followUpDate?: Date;
  followupInstructions?: string;

  // Outcome
  outcome?: 'cured' | 'improved' | 'stable' | 'deteriorated' | 'expired' | 'refer';

  // System Information
  createdVia: 'walk_in' | 'appointment' | 'emergency' | 'referral' | 'abdm';
  sourceReference?: string;
}

export interface VisitSymptom {
  symptom: string;
  onset: string;
  duration: string;
  severity: 'mild' | 'moderate' | 'severe';
  associatedSymptoms?: string[];
  aggravatingFactors?: string[];
  relievingFactors?: string[];
}

export interface VitalSigns {
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    position: 'sitting' | 'standing' | 'lying';
    arm: 'left' | 'right';
  };
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: {
    value: number;
    unit: 'C' | 'F';
    route: 'oral' | 'rectal' | 'axillary' | 'tympanic';
  };
  oxygenSaturation?: number;
  height?: number; // in cm
  weight?: number; // in kg
  bmi?: number; // Calculated
  painScale?: number; // 0-10
}

export interface PhysicalExamination {
  general: string;
  heent: string; // Head, Eyes, Ears, Nose, Throat
  cardiovascular: string;
  respiratory: string;
  abdomen: string;
  musculoskeletal: string;
  neurological: string;
  skin: string;
  other?: string;
}

export interface Procedure {
  id: string;
  name: string;
  category: string;
  scheduledDateTime?: Date;
  performedDateTime?: Date;
  performedBy?: string; // Staff ID
  anesthesia?: string;
  complications?: string;
  outcome?: string;
  notes?: string;
}

export interface Investigation {
  id: string;
  testType: string;
  testName: string;
  orderedDateTime: Date;
  sampleCollectedDateTime?: Date;
  resultDateTime?: Date;
  result?: string;
  normalRange?: string;
  status: 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  orderedBy: string; // Staff ID
  laboratoryId?: string;
  urgency: 'routine' | 'urgent' | 'stat';
}

// =============================================================================
// ABDM INTEGRATION MODELS
// =============================================================================

export interface ABDMConsent {
  id: string;
  patientId: string;
  consentId: string; // ABDM consent ID
  hipId: string; // Health Information Provider ID
  hiuId?: string; // Health Information User ID
  purpose: string;
  purposeCode?: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  expiryDate?: Date;
  permissions: string[];
  hiTypes: string[]; // Health Information Types
  status: 'requested' | 'granted' | 'denied' | 'expired' | 'revoked';
  requestedAt: Date;
  grantedAt?: Date;
  revokedAt?: Date;
  consentArtefact?: string; // Base64 encoded consent artefact
}

export interface ABDMHealthRecord {
  id: string;
  patientId: string;
  recordId: string;
  hiType: string; // Health Information Type
  careContextReference: string;
  hipId: string;
  visitId?: string;
  createdDate: Date;
  lastModified: Date;
  status: 'active' | 'archived' | 'deleted';
  recordContent?: any; // JSON structure of the health record
  metadata?: {
    version: string;
    format: string;
    compression?: string;
    encryption?: string;
  };
}

export interface ABDMCareContext {
  id: string;
  patientId: string;
  careContextReference: string;
  referenceNumber: string;
  display: string;
  encounterDate: Date;
  hipId: string;
  hipName: string;
  status: 'active' | 'inactive' | 'expired';
  linkedAt: Date;
  lastAccessedAt?: Date;
  patientReference?: string;
  encounterReference?: string;
}

// =============================================================================
// PATIENT DOCUMENT MODELS
// =============================================================================

export interface PatientDocument extends BaseModel {
  patientId: string;
  mrn: string;

  // Document Details
  documentType: 'medical_record' | 'lab_report' | 'imaging' | 'prescription' | 'discharge_summary' |
               'insurance_card' | 'identity_proof' | 'consent_form' | 'other';
  category: string;
  title: string;
  description?: string;

  // File Information
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileUrl?: string;
  fileSize: number;
  mimeType: string;
  checksum: string;

  // Clinical Context
  visitId?: string;
  departmentId?: string;
  doctorId?: string;
  documentDate?: Date;

  // Access Control
  accessLevel: 'public' | 'restricted' | 'confidential' | 'top_secret';
  allowedRoles?: string[];
  allowedUsers?: string[];

  // ABDM Integration
  isABDMLinked: boolean = false;
  abdmHealthRecordId?: string;

  // Document Status
  status: 'uploaded' | 'processing' | 'processed' | 'error' | 'archived';
  processedAt?: Date;
  errorMessage?: string;

  // Versioning
  version: number = 1;
  parentDocumentId?: string;
  isLatestVersion: boolean = true;

  // Metadata
  tags?: string[];
  metadata?: Record<string, any>;
}

// =============================================================================
// PATIENT NOTIFICATION MODELS
// =============================================================================

export interface PatientNotification extends BaseModel {
  patientId: string;

  // Notification Details
  type: 'appointment' | 'test_result' | 'payment' | 'reminder' | 'alert' | 'marketing' | 'other';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Content
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;

  // Channels
  channels: ('email' | 'sms' | 'whatsapp' | 'push' | 'in_app')[];

  // Delivery Status
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  deliveryAttempts: number = 0;
  maxRetries: number = 3;
  nextRetryAt?: Date;
  errorMessage?: string;

  // Scheduling
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;

  // Context
  context?: {
    appointmentId?: string;
    visitId?: string;
    testId?: string;
    invoiceId?: string;
    doctorId?: string;
    departmentId?: string;
  };

  // Preferences
  respectCommunicationPreferences: boolean = true;
}

// =============================================================================
// DATABASE ENTITY MODELS (for TypeORM)
// =============================================================================

export interface PatientEntity extends Patient {
  // Database-specific fields
  // All fields from Patient interface are inherited
}

export interface PatientVisitEntity extends PatientVisit {
  // Database-specific fields
  // All fields from PatientVisit interface are inherited
}

export interface ABDMConsentEntity extends ABDMConsent {
  // Database-specific fields
  // All fields from ABDMConsent interface are inherited
}

// =============================================================================
// VIEW MODELS
// =============================================================================

export interface PatientSummary {
  patientId: string;
  mrn: string;
  fullName: string;
  age: number;
  gender: Gender;
  primaryContactNumber: string;
  email?: string;
  bloodGroup?: BloodGroup;
  abhaNumber?: string;
  lastVisitDate?: Date;
  totalVisits: number;
  status: PatientStatus;
  registrationDate: Date;
  isABDMLinked: boolean;
  hasActiveInsurance: boolean;
  hasAllergies: boolean;
  hasChronicConditions: boolean;
}

export interface PatientSearchResult {
  patientId: string;
  mrn: string;
  fullName: string;
  age: number;
  gender: Gender;
  primaryContactNumber: string;
  email?: string;
  abhaNumber?: string;
  lastVisitDate?: Date;
  matchScore?: number; // For search relevance
  highlight?: {
    fullName?: string;
    mrn?: string;
    abhaNumber?: string;
  };
}

export interface PatientProfile {
  patient: Patient;
  recentVisits: PatientVisit[];
  activeMedications: CurrentMedication[];
  activeAllergies: PatientAllergy[];
  chronicConditions: MedicalHistoryItem[];
  insuranceInfo: InsuranceInfo[];
  abdmLinkStatus: ABDMVerificationStatus;
  abdmCareContexts: ABDMCareContext[];
  documents: PatientDocument[];
}

export interface PatientVisitSummary {
  visitId: string;
  patientId: string;
  mrn: string;
  patientName: string;
  visitNumber: string;
  visitType: string;
  department: string;
  doctor: string;
  visitDate: Date;
  status: string;
  chiefComplaint?: string;
  finalDiagnosis?: string[];
  treatmentGiven?: string;
  actualCost?: number;
  paymentType: string;
  followUpRequired: boolean;
  followUpDate?: Date;
}

// =============================================================================
// REQUEST/RESPONSE MODELS
// =============================================================================

export interface CreatePatientRequest {
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  gender: Gender;
  dateOfBirth: Date;
  placeOfBirth?: string;
  primaryContactNumber: string;
  secondaryContactNumber?: string;
  email?: string;
  address: PatientAddress;
  aadhaarNumber?: string;
  abhaNumber?: string;
  healthId?: string;
  bloodGroup?: BloodGroup;
  maritalStatus?: MaritalStatus;
  occupation?: string;
  education?: string;
  nationality?: string;
  languagePreferences?: string[];
  emergencyContact: EmergencyContact;
  primaryCarePhysician?: string;
  referringDoctor?: string;
  allergies?: Partial<PatientAllergy>[];
  medicalHistory?: Partial<MedicalHistoryItem>[];
  currentMedications?: Partial<CurrentMedication>[];
  insuranceDetails?: Partial<InsuranceInfo>[];
  registrationSource?: 'walk-in' | 'online' | 'referral' | 'abdm';
  registrationLocation?: string;
  referringOrganization?: string;
  consentForResearch?: boolean;
  consentForMarketing?: boolean;
  privacyPreferences?: Partial<PrivacyPreferences>;
}

export interface UpdatePatientRequest extends Partial<CreatePatientRequest> {
  // All fields from CreatePatientRequest are optional for updates
}

export interface SearchPatientRequest {
  query?: string;
  mrn?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  aadhaarNumber?: string;
  abhaNumber?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  status?: PatientStatus;
  registrationDateFrom?: Date;
  registrationDateTo?: Date;
  lastVisitDateFrom?: Date;
  lastVisitDateTo?: Date;
  departmentId?: string;
  doctorId?: string;
  facilityId?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateVisitRequest {
  patientId: string;
  visitType: string;
  departmentId: string;
  doctorId: string;
  facilityId?: string;
  scheduledDateTime?: Date;
  priority?: 'routine' | 'urgent' | 'emergency' | 'critical';
  chiefComplaint?: string;
  paymentType?: string;
  referredBy?: string;
  referredTo?: string[];
  referralType?: 'in' | 'out' | 'self';
}

export interface ABDMConsentRequest {
  patientId: string;
  hipId: string;
  hiuId?: string;
  purpose: string;
  purposeCode?: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  expiryDate?: Date;
  permissions: string[];
  hiTypes: string[];
}

export interface PatientResponse {
  success: boolean;
  message: string;
  data?: Patient;
  errors?: string[];
}

export interface PatientListResponse {
  success: boolean;
  message: string;
  data?: {
    patients: PatientSearchResult[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  errors?: string[];
}

export interface VisitResponse {
  success: boolean;
  message: string;
  data?: PatientVisit;
  errors?: string[];
}

export interface VisitListResponse {
  success: boolean;
  message: string;
  data?: {
    visits: PatientVisitSummary[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  errors?: string[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type PatientWithVisits = Patient & {
  visits: PatientVisit[];
  recentVisits: PatientVisit[];
  upcomingVisits: PatientVisit[];
  totalVisits: number;
  lastVisitDate?: Date;
  nextAppointmentDate?: Date;
};

export type PatientWithDocuments = Patient & {
  documents: PatientDocument[];
  documentCount: number;
  recentDocuments: PatientDocument[];
};

export type PatientWithABDM = Patient & {
  abdmConsents: ABDMConsent[];
  abdmCareContexts: ABDMCareContext[];
  abdmHealthRecords: ABDMHealthRecord[];
  isABDMActive: boolean;
  lastABDMSync?: Date;
};

export type PatientComplete = PatientWithVisits &
                           PatientWithDocuments &
                           PatientWithABDM;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export interface PatientValidationSchema {
  required: string[];
  optional: string[];
  patterns: Record<string, RegExp>;
  customValidators: Record<string, (value: any) => boolean>;
}

export const patientValidationRules: PatientValidationSchema = {
  required: [
    'firstName',
    'lastName',
    'gender',
    'dateOfBirth',
    'primaryContactNumber',
    'address.line1',
    'address.city',
    'address.state',
    'address.pincode',
    'emergencyContact.name',
    'emergencyContact.relationship',
    'emergencyContact.primaryContactNumber'
  ],
  optional: [
    'title',
    'middleName',
    'preferredName',
    'placeOfBirth',
    'secondaryContactNumber',
    'email',
    'address.line2',
    'address.line3',
    'address.landmark',
    'aadhaarNumber',
    'abhaNumber',
    'healthId',
    'bloodGroup',
    'maritalStatus',
    'occupation',
    'education',
    'languagePreferences',
    'emergencyContact.secondaryContactNumber',
    'emergencyContact.email',
    'emergencyContact.address',
    'primaryCarePhysician',
    'referringDoctor',
    'registrationSource',
    'registrationLocation',
    'referringOrganization'
  ],
  patterns: {
    primaryContactNumber: /^[6-9]\d{9}$/,
    secondaryContactNumber: /^[6-9]\d{9}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    aadhaarNumber: /^\d{12}$/,
    abhaNumber: /^[A-Z0-9]{12}$/,
    healthId: /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    pincode: /^\d{6}$
  },
  customValidators: {
    dateOfBirth: (value: Date) => {
      const age = new Date().getFullYear() - value.getFullYear();
      return age >= 0 && age <= 150;
    },
    primaryContactNumber: (value: string) => {
      return value.length === 10 && /^[6-9]/.test(value);
    }
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  // Core Models
  Patient,
  PatientAddress,
  EmergencyContact,
  PatientAllergy,
  MedicalHistoryItem,
  CurrentMedication,
  InsuranceInfo,
  PrivacyPreferences,
  VerificationDocument,

  // Visit Models
  PatientVisit,
  VisitSymptom,
  VitalSigns,
  PhysicalExamination,
  Procedure,
  Investigation,

  // ABDM Models
  ABDMConsent,
  ABDMHealthRecord,
  ABDMCareContext,

  // Document Models
  PatientDocument,

  // Notification Models
  PatientNotification,

  // Entity Models
  PatientEntity,
  PatientVisitEntity,
  ABDMConsentEntity,

  // View Models
  PatientSummary,
  PatientSearchResult,
  PatientProfile,
  PatientVisitSummary,

  // Request/Response Models
  CreatePatientRequest,
  UpdatePatientRequest,
  SearchPatientRequest,
  CreateVisitRequest,
  ABDMConsentRequest,
  PatientResponse,
  PatientListResponse,
  VisitResponse,
  VisitListResponse,

  // Utility Types
  PatientWithVisits,
  PatientWithDocuments,
  PatientWithABDM,
  PatientComplete,

  // Validation
  PatientValidationSchema
};

export {
  patientValidationRules
};