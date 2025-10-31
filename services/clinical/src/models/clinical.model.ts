/**
 * Clinical Models and Types
 * HMS Enterprise
 * 
 * Comprehensive data models for clinical operations including visits,
 * prescriptions, lab results, clinical documentation, and medical records.
 */

import { z } from 'zod';

// Base Model Interface
export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  tenantId: string;
}

// Clinical Visit Models
export enum VisitType {
  OUTPATIENT = 'OUTPATIENT',
  INPATIENT = 'INPATIENT',
  EMERGENCY = 'EMERGENCY',
  DAY_CARE = 'DAY_CARE',
  HOME_CARE = 'HOME_CARE',
  TELECONSULTATION = 'TELECONSULTATION'
}

export enum VisitStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED'
}

export enum ClinicalPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
  CRITICAL = 'CRITICAL'
}

export interface VitalSigns {
  bloodPressure: {
    systolic: number;
    diastolic: number;
    position: 'SITTING' | 'STANDING' | 'LYING';
  };
  heartRate: number;
  respiratoryRate: number;
  temperature: {
    value: number;
    unit: 'CELSIUS' | 'FAHRENHEIT';
    method: 'ORAL' | 'RECTAL' | 'AXILLARY' | 'TEMPORAL' | 'TYMPANIC';
  };
  oxygenSaturation: number;
  height?: number; // in cm
  weight?: number; // in kg
  bmi?: number;
  painScale?: {
    score: number;
    scale: 'NUMERIC' | 'WONG_BAKER' | 'FACES';
  };
}

export interface PhysicalExamination {
  general: {
    appearance: string;
    alertness: 'ALERT' | 'LETHARGIC' | 'STUPOR' | 'COMA';
    distress: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';
  };
  heent: {
    head: string;
    eyes: string;
    ears: string;
    nose: string;
    throat: string;
  };
  cardiovascular: {
    heartSounds: string;
    murmurs?: string;
    pulses: string;
    edema: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';
    location?: string;
  };
  respiratory: {
    breathSounds: string;
    wheezes?: string;
    crackles?: string;
    workOfBreathing: string;
  };
  gastrointestinal: {
    abdomen: string;
    bowelSounds: string;
    tenderness: string;
    organomegaly?: string;
  };
  neurological: {
    mentalStatus: string;
    cranialNerves: string;
    motor: string;
    sensation: string;
    reflexes: string;
  };
  musculoskeletal: {
    range: string;
    strength: string;
    abnormalities?: string;
  };
  skin: {
    color: string;
    lesions?: string;
    turgor: string;
    temperature: string;
  };
  notes?: string;
}

export interface ClinicalVisit extends BaseModel {
  visitNumber: string;
  patientId: string;
  appointmentId?: string;
  visitType: VisitType;
  status: VisitStatus;
  priority: ClinicalPriority;
  doctorId: string;
  departmentId: string;
  facilityId: string;
  scheduledDateTime: Date;
  checkInDateTime?: Date;
  startDateTime?: Date;
  endDateTime?: Date;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  familyHistory: string;
  socialHistory: string;
  surgicalHistory: string;
  allergyHistory: string;
  medications: string;
  reviewOfSystems: Record<string, string>;
  vitalSigns?: VitalSigns;
  physicalExamination?: PhysicalExamination;
  assessment: string;
  plan: string;
  diagnosis: ClinicalDiagnosis[];
  procedures: ClinicalProcedure[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  imagingOrders: ImagingOrder[];
  followUpInstructions?: string;
  nextVisitDate?: Date;
  dischargeNotes?: string;
  referredTo?: string[];
  referredFrom?: string;
  attachments: Attachment[];
  billingCodes: BillingCode[];
  qualityMetrics: QualityMetric[];
}

export interface ClinicalDiagnosis {
  id: string;
  code: string; // ICD-10 code
  description: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ADMISSION' | 'DISCHARGE' | 'PROVISIONAL' | 'FINAL';
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  onsetDate: Date;
  resolvedDate?: Date;
  notes?: string;
}

export interface ClinicalProcedure {
  id: string;
  code: string; // CPT/ICD-10-PCS code
  description: string;
  category: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDateTime?: Date;
  startDateTime?: Date;
  endDateTime?: Date;
  performedBy: string;
  location: string;
  indications: string;
  technique: string;
  complications?: string;
  notes?: string;
}

// Prescription Models
export enum PrescriptionStatus {
  PRESCRIBED = 'PRESCRIBED',
  PHARMACY_PENDING = 'PHARMACY_PENDING',
  PHARMACY_APPROVED = 'PHARMACY_APPROVED',
  DISPENSED = 'DISPENSED',
  PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD'
}

export enum MedicationRoute {
  ORAL = 'ORAL',
  INTRAVENOUS = 'INTRAVENOUS',
  INTRAMUSCULAR = 'INTRAMUSCULAR',
  SUBCUTANEOUS = 'SUBCUTANEOUS',
  TOPICAL = 'TOPICAL',
  INHALATION = 'INHALATION',
  NASAL = 'NASAL',
  OPHTHALMIC = 'OPHTHALMIC',
  OTIC = 'OTIC',
  RECTAL = 'RECTAL',
  VAGINAL = 'VAGINAL'
}

export enum MedicationFrequency {
  ONCE = 'ONCE',
  TWICE_DAILY = 'TWICE_DAILY',
  THRICE_DAILY = 'THRICE_DAILY',
  FOUR_TIMES_DAILY = 'FOUR_TIMES_DAILY',
  EVERY_HOUR = 'EVERY_HOUR',
  EVERY_2_HOURS = 'EVERY_2_HOURS',
  EVERY_4_HOURS = 'EVERY_4_HOURS',
  EVERY_6_HOURS = 'EVERY_6_HOURS',
  EVERY_8_HOURS = 'EVERY_8_HOURS',
  EVERY_12_HOURS = 'EVERY_12_HOURS',
  EVERY_24_HOURS = 'EVERY_24_HOURS',
  AS_NEEDED = 'AS_NEEDED',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export interface Prescription extends BaseModel {
  prescriptionNumber: string;
  patientId: string;
  visitId: string;
  doctorId: string;
  status: PrescriptionStatus;
  medicationId: string;
  medicationName: string;
  genericName: string;
  brandName?: string;
  strength: string;
  dosage: string;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  duration: number; // in days
  quantity: number;
  unit: string;
  instructions: string;
  indications: string;
  prn: boolean;
  prnIndications?: string;
  controlledSubstance: boolean;
  schedule?: string; // Schedule II, III, IV, V
  refills: number;
  refillsUsed: number;
  expiryDate?: Date;
  substitutionsAllowed: boolean;
  notes?: string;
  pharmacyId?: string;
  dispensedItems: DispensedItem[];
  adverseReactions?: AdverseReaction[];
  adherence?: MedicationAdherence;
}

export interface DispensedItem {
  id: string;
  prescriptionId: string;
  dispensedDate: Date;
  quantity: number;
  daysSupply: number;
  lotNumber: string;
  expiryDate: Date;
  dispenserId: string;
  pharmacyId: string;
  counselingProvided: boolean;
  counselingNotes?: string;
  copayAmount?: number;
  insuranceAmount?: number;
  totalAmount?: number;
}

export interface AdverseReaction {
  id: string;
  prescriptionId: string;
  reactionType: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  onsetDate: Date;
  description: string;
  actionTaken: string;
  reportedBy: string;
  reportedDate: Date;
  resolved: boolean;
  resolutionDate?: Date;
}

export interface MedicationAdherence {
  id: string;
  prescriptionId: string;
  adherenceScore: number; // percentage
  missedDoses: number;
  totalDoses: number;
  lastDoseTaken?: Date;
  assessmentDate: Date;
  assessmentMethod: 'PATIENT_REPORT' | 'PHARMACY_RECORD' | 'SMART_BOTTLE' | 'APP_TRACKING';
  notes?: string;
}

// Laboratory Models
export enum LabTestStatus {
  ORDERED = 'ORDERED',
  SPECIMEN_PENDING = 'SPECIMEN_PENDING',
  SPECIMEN_COLLECTED = 'SPECIMEN_COLLECTED',
  SPECIMEN_REJECTED = 'SPECIMEN_REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED'
}

export enum SpecimenType {
  BLOOD = 'BLOOD',
  SERUM = 'SERUM',
  PLASMA = 'PLASMA',
  URINE = 'URINE',
  CEREBROSPINAL_FLUID = 'CEREBROSPINAL_FLUID',
  SWAB = 'SWAB',
  SPUTUM = 'SPUTUM',
  STOOL = 'STOOL',
  TISSUE = 'TISSUE',
  FLUID = 'FLUID',
  OTHER = 'OTHER'
}

export interface LabOrder extends BaseModel {
  orderNumber: string;
  patientId: string;
  visitId: string;
  orderingDoctorId: string;
  status: LabTestStatus;
  urgency: 'ROUTINE' | 'STAT' | 'URGENT';
  testCode: string;
  testName: string;
  testCategory: string;
  specimenType: SpecimenType;
  specimenDetails?: string;
  collectionDate?: Date;
  collectedBy?: string;
  receivedDate?: Date;
  completionDate?: Date;
  results: LabResult[];
  normalRanges: NormalRange[];
  interpretations: LabInterpretation[];
  notes?: string;
  performingLab?: string;
  accessionNumber?: string;
  clinicalIndications: string;
}

export interface LabResult {
  id: string;
  orderItemId: string;
  testName: string;
  value: string;
  unit?: string;
  normalRange?: string;
  abnormalFlag?: 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW';
  referenceRange?: {
    minimum?: number;
    maximum?: number;
    text?: string;
    ageRange?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
  };
  resultDate: Date;
  reportingTechnician?: string;
  approvingPathologist?: string;
  comments?: string;
  specimenType?: SpecimenType;
  collectionDate?: Date;
  analysisDate?: Date;
}

export interface NormalRange {
  id: string;
  testItemId: string;
  minimum?: number;
  maximum?: number;
  text?: string;
  ageRange?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
    pregnancyStatus?: 'PREGNANT' | 'NOT_PREGNANT';
  units?: string;
  source?: string;
}

export interface LabInterpretation {
  id: string;
  orderItemId: string;
  interpretativeComment: string;
  interpretationType: 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | 'PANIC';
  interpretativeStatus: 'PRELIMINARY' | 'FINAL' | 'AMENDED' | 'CORRECTED';
  interpreterId: string;
  interpretationDate: Date;
  suggestions?: string[];
  followUpRequired: boolean;
}

// Imaging Models
export enum ImagingModality {
  X_RAY = 'X_RAY',
  CT_SCAN = 'CT_SCAN',
  MRI = 'MRI',
  ULTRASOUND = 'ULTRASOUND',
  FLUOROSCOPY = 'FLUOROSCOPY',
  MAMMOGRAPHY = 'MAMMOGRAPHY',
  NUCLEAR_MEDICINE = 'NUCLEAR_MEDICINE',
  PET_SCAN = 'PET_SCAN',
  ANGIOGRAPHY = 'ANGIOGRAPHY'
}

export enum ImagingStatus {
  ORDERED = 'ORDERED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REPORT_PENDING = 'REPORT_PENDING',
  REPORTED = 'REPORTED',
  CANCELLED = 'CANCELLED'
}

export interface ImagingOrder extends BaseModel {
  orderNumber: string;
  patientId: string;
  visitId: string;
  orderingDoctorId: string;
  status: ImagingStatus;
  urgency: 'ROUTINE' | 'STAT' | 'URGENT';
  modality: ImagingModality;
  procedureCode: string;
  procedureDescription: string;
  bodyPart: string;
  viewPosition?: string;
  contrast: boolean;
  contrastType?: 'IV' | 'ORAL' | 'RECTAL';
  clinicalIndications: string;
  specialInstructions?: string;
  scheduledDateTime?: Date;
  completionDate?: Date;
  performingLocation: string;
  performingRadiologistId?: string;
  reportingRadiologistId?: string;
  accessionNumber?: string;
  studyInstanceUid?: string;
  series: ImagingSeries[];
  report: ImagingReport?;
  images: ImagingImage[];
}

export interface ImagingSeries {
  id: string;
  orderItemId: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: ImagingModality;
  bodyPartExamined: string;
  viewPosition?: string;
  sliceThickness?: number;
  kvp?: number;
  mas?: number;
  imagesCount: number;
  acquisitionDate?: Date;
  seriesInstanceUid?: string;
}

export interface ImagingImage {
  id: string;
  seriesId: string;
  imageNumber: number;
  sopInstanceUid?: string;
  imageType?: string[];
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  pixelRepresentation?: number;
  pixelSpacing?: number[];
  sliceLocation?: number;
  imagePosition?: number[];
  imageOrientation?: number[];
  windowCenter?: number[];
  windowWidth?: number[];
  acquisitionDateTime?: Date;
  contentDate?: string;
  filePath: string;
  fileSize: number;
  format: 'DICOM' | 'JPEG' | 'PNG' | 'TIFF';
  thumbnailPath?: string;
}

export interface ImagingReport {
  id: string;
  orderItemId: string;
  reportType: 'PRELIMINARY' | 'FINAL' | 'AMENDED' | 'ADDENDUM';
  findings: string;
  impression: string;
  recommendation?: string;
  comparison?: string;
  technique?: string;
  reportDate: Date;
  radiologistId: string;
  verifiedBy?: string;
  verificationDate?: Date;
  attachments: Attachment[];
  criticalFindings?: CriticalFinding[];
}

// Medical Record Models
export enum DocumentType {
  CLINICAL_NOTE = 'CLINICAL_NOTE',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  OPERATIVE_REPORT = 'OPERATIVE_REPORT',
  CONSULTATION_REPORT = 'CONSULTATION_REPORT',
  PATHOLOGY_REPORT = 'PATHOLOGY_REPORT',
  RADIOLOGY_REPORT = 'RADIOLOGY_REPORT',
  LAB_REPORT = 'LAB_REPORT',
  IMAGING = 'IMAGING',
  CONSENT_FORM = 'CONSENT_FORM',
  ADVANCE_DIRECTIVE = 'ADVANCE_DIRECTIVE',
  OTHER = 'OTHER'
}

export enum DocumentCategory {
  CLINICAL_DOCUMENTATION = 'CLINICAL_DOCUMENTATION',
  DIAGNOSTIC_RESULTS = 'DIAGNOSTIC_RESULTS',
  IMAGING = 'IMAGING',
  CONSENTS_AND_FORMS = 'CONSENTS_AND_FORMS',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  PATIENT_PROVIDED = 'PATIENT_PROVIDED',
  EXTERNAL = 'EXTERNAL'
}

export interface MedicalRecord extends BaseModel {
  recordNumber: string;
  patientId: string;
  visitId?: string;
  documentType: DocumentType;
  documentCategory: DocumentCategory;
  title: string;
  content: string;
  summary?: string;
  keywords?: string[];
  clinicalDateTime: Date;
  authorId: string;
  authorType: 'DOCTOR' | 'NURSE' | 'TECHNICIAN' | 'SYSTEM' | 'PATIENT';
  status: 'DRAFT' | 'FINAL' | 'AMENDED' | 'CORRECTED' | 'ARCHIVED';
  version: number;
  parentDocumentId?: string;
  attachments: Attachment[];
  signatures: DigitalSignature[];
  accessLogs: AccessLog[];
  confidentiality: 'NORMAL' | 'SENSITIVE' | 'RESTRICTED';
  retentionPolicy: string;
  expirationDate?: Date;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  mimeType: string;
  checksum: string;
  uploadDate: Date;
  uploadedBy: string;
  description?: string;
  category?: string;
  metadata?: Record<string, any>;
  thumbnailPath?: string;
  previewPath?: string;
}

export interface DigitalSignature {
  id: string;
  documentId: string;
  signerId: string;
  signerName: string;
  signatureData: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  location?: string;
  signatureType: 'ELECTRONIC' | 'DIGITAL' | 'BIOMETRIC';
  certificateId?: string;
  verified: boolean;
}

export interface AccessLog {
  id: string;
  documentId: string;
  userId: string;
  accessType: 'VIEW' | 'EDIT' | 'DELETE' | 'PRINT' | 'DOWNLOAD' | 'SHARE';
  accessDateTime: Date;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  duration?: number; // in seconds
  reason?: string;
}

// Clinical Workflow Models
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE'
}

export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL'
}

export interface ClinicalTask extends BaseModel {
  taskNumber: string;
  title: string;
  description: string;
  taskType: string;
  status: TaskStatus;
  priority: TaskPriority;
  patientId: string;
  visitId?: string;
  assignedTo: string;
  assignedBy: string;
  departmentId: string;
  facilityId: string;
  dueDate: Date;
  completedDate?: Date;
  category: string;
  tags?: string[];
  dependencies?: string[]; // Task IDs
  checklist?: ChecklistItem[];
  attachments: Attachment[];
  comments: TaskComment[];
  recurrence?: TaskRecurrence;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  cost?: number;
  billable: boolean;
  autoAssign?: boolean;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  description: string;
  completed: boolean;
  completedBy?: string;
  completedDate?: Date;
  order: number;
  mandatory: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  comment: string;
  createdAt: Date;
  attachments?: Attachment[];
  mentions?: string[]; // User IDs
}

export interface TaskRecurrence {
  pattern: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  interval: number;
  endDate?: Date;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number;
  monthsOfYear?: number[];
  customPattern?: string;
}

// Quality and Compliance Models
export interface QualityMetric extends BaseModel {
  metricId: string;
  name: string;
  category: string;
  value: number;
  targetValue?: number;
  unit?: string;
  measurementDate: Date;
  patientId?: string;
  visitId?: string;
  providerId?: string;
  departmentId?: string;
  facilityId: string;
  thresholdMin?: number;
  thresholdMax?: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
  notes?: string;
}

export interface CriticalFinding {
  id: string;
  testResultId: string;
  description: string;
  severity: 'MILD' | 'MODERATE' 'SEVERE' | 'CRITICAL';
  reportedBy: string;
  reportedDate: Date;
  acknowledgedBy?: string;
  acknowledgedDate?: Date;
  resolvedBy?: string;
  resolvedDate?: Date;
  resolutionNotes?: string;
  communicationLog: CommunicationLog[];
}

export interface CommunicationLog {
  id: string;
  criticalFindingId: string;
  communicatedTo: string;
  communicationMethod: 'PHONE' | 'EMAIL' | 'SMS' | 'IN_PERSON' | 'FAX';
  communicationDate: Date;
  communicatedBy: string;
  notes?: string;
  acknowledged: boolean;
  acknowledgedDate?: Date;
}

// Billing and Coding Models
export interface BillingCode extends BaseModel {
  code: string;
  codeType: 'ICD_10_CM' | 'ICD_10_PCS' | 'CPT' | 'HCPCS' | 'LOINC' | 'SNOMED_CT';
  description: string;
  category: string;
  billable: boolean;
  price?: number;
  requiresAuthorization: boolean;
  diagnosisRelated: boolean;
  procedureRelated: boolean;
}

// Request/Response DTOs
export interface CreateVisitRequest {
  patientId: string;
  appointmentId?: string;
  visitType: VisitType;
  priority: ClinicalPriority;
  doctorId: string;
  departmentId: string;
  facilityId: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  surgicalHistory?: string;
  allergyHistory?: string;
  medications?: string;
  reviewOfSystems?: Record<string, string>;
}

export interface UpdateVisitRequest {
  status?: VisitStatus;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  vitalSigns?: VitalSigns;
  physicalExamination?: PhysicalExamination;
  assessment?: string;
  plan?: string;
  diagnosis?: ClinicalDiagnosis[];
  procedures?: ClinicalProcedure[];
  followUpInstructions?: string;
  nextVisitDate?: Date;
  dischargeNotes?: string;
}

export interface CreatePrescriptionRequest {
  patientId: string;
  visitId: string;
  doctorId: string;
  medicationId: string;
  medicationName: string;
  genericName: string;
  brandName?: string;
  strength: string;
  dosage: string;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  duration: number;
  quantity: number;
  unit: string;
  instructions: string;
  indications: string;
  prn: boolean;
  prnIndications?: string;
  controlledSubstance: boolean;
  schedule?: string;
  refills: number;
  substitutionsAllowed: boolean;
  notes?: string;
  pharmacyId?: string;
}

export interface CreateLabOrderRequest {
  patientId: string;
  visitId: string;
  orderingDoctorId: string;
  urgency: 'ROUTINE' | 'STAT' | 'URGENT';
  tests: Array<{
    testCode: string;
    testName: string;
    testCategory: string;
    specimenType: SpecimenType;
    specimenDetails?: string;
    clinicalIndications: string;
  }>;
  performingLab?: string;
}

export interface CreateImagingOrderRequest {
  patientId: string;
  visitId: string;
  orderingDoctorId: string;
  urgency: 'ROUTINE' | 'STAT' | 'URGENT';
  modality: ImagingModality;
  procedureCode: string;
  procedureDescription: string;
  bodyPart: string;
  viewPosition?: string;
  contrast: boolean;
  contrastType?: 'IV' | 'ORAL' | 'RECTAL';
  clinicalIndications: string;
  specialInstructions?: string;
}

export interface CreateMedicalRecordRequest {
  patientId: string;
  visitId?: string;
  documentType: DocumentType;
  documentCategory: DocumentCategory;
  title: string;
  content: string;
  summary?: string;
  keywords?: string[];
  clinicalDateTime: Date;
  authorType: 'DOCTOR' | 'NURSE' | 'TECHNICIAN' | 'SYSTEM' | 'PATIENT';
  confidentiality: 'NORMAL' | 'SENSITIVE' | 'RESTRICTED';
  retentionPolicy: string;
  expirationDate?: Date;
  attachments?: Omit<Attachment, 'id' | 'uploadDate' | 'uploadedBy'>[];
}

export interface ClinicalSearchParams {
  patientId?: string;
  doctorId?: string;
  departmentId?: string;
  facilityId?: string;
  visitType?: VisitType;
  status?: VisitStatus;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  diagnosis?: string;
  chiefComplaint?: string;
  priority?: ClinicalPriority;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Response DTOs
export interface ClinicalVisitResponse {
  success: boolean;
  message: string;
  data?: ClinicalVisit;
  timestamp: string;
}

export interface ClinicalVisitsResponse {
  success: boolean;
  message: string;
  data?: {
    visits: ClinicalVisit[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}

export interface PrescriptionResponse {
  success: boolean;
  message: string;
  data?: Prescription;
  timestamp: string;
}

export interface LabOrderResponse {
  success: boolean;
  message: string;
  data?: LabOrder;
  timestamp: string;
}

export interface ImagingOrderResponse {
  success: boolean;
  message: string;
  data?: ImagingOrder;
  timestamp: string;
}

export interface MedicalRecordResponse {
  success: boolean;
  message: string;
  data?: MedicalRecord;
  timestamp: string;
}

// Zod Schemas for validation
export const createVisitSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  visitType: z.nativeEnum(VisitType),
  priority: z.nativeEnum(ClinicalPriority),
  doctorId: z.string().uuid(),
  departmentId: z.string().uuid(),
  facilityId: z.string().uuid(),
  chiefComplaint: z.string().min(1).max(1000),
  historyOfPresentIllness: z.string().min(1).max(5000),
  pastMedicalHistory: z.string().max(2000).optional(),
  familyHistory: z.string().max(2000).optional(),
  socialHistory: z.string().max(2000).optional(),
  surgicalHistory: z.string().max(2000).optional(),
  allergyHistory: z.string().max(2000).optional(),
  medications: z.string().max(2000).optional(),
  reviewOfSystems: z.record(z.string().max(500)).optional()
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid(),
  doctorId: z.string().uuid(),
  medicationId: z.string().uuid(),
  medicationName: z.string().min(1).max(200),
  genericName: z.string().min(1).max(200),
  brandName: z.string().max(200).optional(),
  strength: z.string().min(1).max(100),
  dosage: z.string().min(1).max(100),
  route: z.nativeEnum(MedicationRoute),
  frequency: z.nativeEnum(MedicationFrequency),
  duration: z.number().min(1).max(365),
  quantity: z.number().min(1).max(1000),
  unit: z.string().min(1).max(50),
  instructions: z.string().min(1).max(1000),
  indications: z.string().min(1).max(500),
  prn: z.boolean(),
  prnIndications: z.string().max(500).optional(),
  controlledSubstance: z.boolean(),
  schedule: z.string().max(50).optional(),
  refills: z.number().min(0).max(12),
  substitutionsAllowed: z.boolean(),
  notes: z.string().max(1000).optional(),
  pharmacyId: z.string().uuid().optional()
});

export const createLabOrderSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid(),
  orderingDoctorId: z.string().uuid(),
  urgency: z.enum(['ROUTINE', 'STAT', 'URGENT']),
  tests: z.array(z.object({
    testCode: z.string().min(1),
    testName: z.string().min(1).max(200),
    testCategory: z.string().min(1).max(100),
    specimenType: z.nativeEnum(SpecimenType),
    specimenDetails: z.string().max(500).optional(),
    clinicalIndications: z.string().min(1).max(1000)
  })).min(1).max(50),
  performingLab: z.string().max(200).optional()
});

export const createImagingOrderSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid(),
  orderingDoctorId: z.string().uuid(),
  urgency: z.enum(['ROUTINE', 'STAT', 'URGENT']),
  modality: z.nativeEnum(ImagingModality),
  procedureCode: z.string().min(1),
  procedureDescription: z.string().min(1).max(500),
  bodyPart: z.string().min(1).max(200),
  viewPosition: z.string().max(100).optional(),
  contrast: z.boolean(),
  contrastType: z.enum(['IV', 'ORAL', 'RECTAL']).optional(),
  clinicalIndications: z.string().min(1).max(1000),
  specialInstructions: z.string().max(1000).optional()
});

export const searchParamsSchema = z.object({
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  visitType: z.nativeEnum(VisitType).optional(),
  status: z.nativeEnum(VisitStatus).optional(),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).optional(),
  diagnosis: z.string().max(200).optional(),
  chiefComplaint: z.string().max(500).optional(),
  priority: z.nativeEnum(ClinicalPriority).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().max(50).default('createdAt'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC')
});

// Export types
export type CreateVisitRequestType = z.infer<typeof createVisitSchema>;
export type CreatePrescriptionRequestType = z.infer<typeof createPrescriptionSchema>;
export type CreateLabOrderRequestType = z.infer<typeof createLabOrderSchema>;
export type CreateImagingOrderRequestType = z.infer<typeof createImagingOrderSchema>;
export type ClinicalSearchParamsType = z.infer<typeof searchParamsSchema>;