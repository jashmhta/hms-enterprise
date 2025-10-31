/**
 * Type Definitions for HMS Enterprise Frontend
 * 
 * Comprehensive type definitions for the entire frontend application
 * including user types, patient types, appointment types, and API responses.
 */

// Base Types
export interface BaseModel {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}

// User & Authentication Types
export interface User extends BaseModel {
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumber?: string;
  roles: Role[];
  permissions: Permission[];
  profile?: UserProfile;
  facilityId?: string;
  departmentId?: string;
  isActive: boolean;
  lastLoginAt?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface UserProfile {
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: Address;
  emergencyContact?: EmergencyContact;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  appointments: boolean;
  labResults: boolean;
  prescriptions: boolean;
  systemUpdates: boolean;
}

export interface PrivacyPreferences {
  shareWithProviders: boolean;
  shareWithInsurance: boolean;
  dataAnalytics: boolean;
  marketingEmails: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface Facility {
  id: string;
  name: string;
  code: string;
  type: 'HOSPITAL' | 'CLINIC' | 'DAY_CARE_CENTER' | 'LAB' | 'PHARMACY';
  address: Address;
  contact: ContactInfo;
  operatingHours: OperatingHours;
  services: string[];
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  facilityId: string;
  headOfDepartment?: string;
  description?: string;
  isActive: boolean;
}

// Patient Types
export interface Patient extends BaseModel {
  mrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  email?: string;
  phoneNumber?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  bloodGroup?: string;
  allergies?: Allergy[];
  medicalConditions?: MedicalCondition[];
  medications?: Medication[];
  insuranceInfo?: InsuranceInfo;
  abhaInfo?: AbhaInfo;
  preferences?: PatientPreferences;
  registrationDate: string;
  lastVisitDate?: string;
  isActive: boolean;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ContactInfo {
  email?: string;
  phoneNumber?: string;
  fax?: string;
  website?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  address?: Address;
}

export interface Allergy {
  id: string;
  allergen: string;
  type: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  reaction: string;
  notes?: string;
}

export interface MedicalCondition {
  id: string;
  name: string;
  code?: string;
  type: 'CHRONIC' | 'ACUTE' | 'PAST';
  diagnosedDate: string;
  resolvedDate?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'MANAGED';
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  isActive: boolean;
  notes?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  planType: string;
  coverageDetails?: string;
  validFrom: string;
  validUntil: string;
  isPrimary: boolean;
}

export interface AbhaInfo {
  abhaNumber: string;
  healthId: string;
  profile: {
    name: string;
    dateOfBirth: string;
    gender: string;
    address?: Address;
  };
  verified: boolean;
  linkedAccounts: string[];
}

export interface PatientPreferences {
  language: string;
  communicationMethod: 'EMAIL' | 'SMS' | 'PHONE' | 'MAIL';
  appointmentReminders: boolean;
  prescriptionReminders: boolean;
  billingReminders: boolean;
  privacy: PatientPrivacySettings;
}

export interface PatientPrivacySettings {
  shareWithFamily: boolean;
  shareWithInsurance: boolean;
  allowResearch: boolean;
  marketingConsent: boolean;
}

// Appointment Types
export interface Appointment extends BaseModel {
  appointmentNumber: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  facilityId: string;
  appointmentType: AppointmentType;
  consultationType: ConsultationType;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  scheduledDateTime: string;
  estimatedDuration: number;
  actualStartTime?: string;
  actualEndTime?: string;
  reason: string;
  notes?: string;
  cancellationReason?: string;
  rescheduleCount: number;
  waitingListPosition?: number;
  virtualConsultation?: VirtualConsultationInfo;
  patient?: Patient;
  doctor?: User;
  department?: Department;
  facility?: Facility;
}

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  PROCEDURE = 'PROCEDURE',
  TEST = 'TEST',
  VACCINATION = 'VACCINATION',
  HEALTH_CHECKUP = 'HEALTH_CHECKUP'
}

export enum ConsultationType {
  IN_PERSON = 'IN_PERSON',
  VIDEO = 'VIDEO',
  PHONE = 'PHONE',
  CHAT = 'CHAT'
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED'
}

export enum AppointmentPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY'
}

export interface VirtualConsultationInfo {
  meetingLink: string;
  meetingId: string;
  password?: string;
  instructions: string;
  platform: 'ZOOM' | 'MEET' | 'TEAMS' | 'SKYPE' | 'CUSTOM';
}

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  departmentId: string;
  facilityId: string;
  appointmentType: AppointmentType;
  consultationType: ConsultationType;
  priority: AppointmentPriority;
  scheduledDateTime: string;
  estimatedDuration: number;
  reason: string;
  notes?: string;
  virtualConsultation?: {
    enabled: boolean;
    platform: VirtualConsultationInfo['platform'];
  };
}

export interface UpdateAppointmentRequest {
  status?: AppointmentStatus;
  scheduledDateTime?: string;
  estimatedDuration?: number;
  reason?: string;
  notes?: string;
  cancellationReason?: string;
  virtualConsultation?: VirtualConsultationInfo;
}

export interface AppointmentSearchParams {
  patientId?: string;
  doctorId?: string;
  departmentId?: string;
  facilityId?: string;
  status?: AppointmentStatus;
  appointmentType?: AppointmentType;
  consultationType?: ConsultationType;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  priority?: AppointmentPriority;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Clinical Visit Types
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
  scheduledDateTime: string;
  checkInDateTime?: string;
  startDateTime?: string;
  endDateTime?: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  assessment?: string;
  plan?: string;
  vitalSigns?: VitalSigns;
  physicalExamination?: PhysicalExamination;
  diagnosis?: ClinicalDiagnosis[];
  procedures?: ClinicalProcedure[];
  prescriptions?: Prescription[];
  labOrders?: LabOrder[];
  imagingOrders?: ImagingOrder[];
  followUpInstructions?: string;
  nextVisitDate?: string;
  dischargeNotes?: string;
}

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
  NO_SHOW = 'NO_SHOW'
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
  general: string;
  heent: string;
  cardiovascular: string;
  respiratory: string;
  gastrointestinal: string;
  neurological: string;
  musculoskeletal: string;
  skin: string;
  notes?: string;
}

export interface ClinicalDiagnosis {
  id: string;
  code: string; // ICD-10 code
  description: string;
  type: 'PRIMARY' | 'SECONDARY' | 'ADMISSION' | 'DISCHARGE';
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  onsetDate: string;
  resolvedDate?: string;
  notes?: string;
}

export interface ClinicalProcedure {
  id: string;
  code: string; // CPT code
  description: string;
  category: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDateTime?: string;
  startDateTime?: string;
  endDateTime?: string;
  performedBy: string;
  location: string;
  indications: string;
  technique: string;
  complications?: string;
  notes?: string;
}

// Prescription Types
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
  expiryDate?: string;
  substitutionsAllowed: boolean;
  notes?: string;
  pharmacyId?: string;
}

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

// Laboratory Types
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
  collectionDate?: string;
  collectedBy?: string;
  receivedDate?: string;
  completionDate?: string;
  results: LabResult[];
  normalRanges: NormalRange[];
  interpretations: LabInterpretation[];
  notes?: string;
  performingLab?: string;
  accessionNumber?: string;
  clinicalIndications: string;
}

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
  resultDate: string;
  reportingTechnician?: string;
  approvingPathologist?: string;
  comments?: string;
}

export interface NormalRange {
  id: string;
  testItemId: string;
  minimum?: number;
  maximum?: number;
  text?: string;
  ageRange?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
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
  interpretationDate: string;
  suggestions?: string[];
  followUpRequired: boolean;
}

// Imaging Types
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
  scheduledDateTime?: string;
  completionDate?: string;
  performingLocation: string;
  performingRadiologistId?: string;
  reportingRadiologistId?: string;
  accessionNumber?: string;
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

// Medical Record Types
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
  clinicalDateTime: string;
  authorId: string;
  authorType: 'DOCTOR' | 'NURSE' | 'TECHNICIAN' | 'SYSTEM' | 'PATIENT';
  status: 'DRAFT' | 'FINAL' | 'AMENDED' | 'CORRECTED' | 'ARCHIVED';
  version: number;
  attachments: Attachment[];
  confidentiality: 'NORMAL' | 'SENSITIVE' | 'RESTRICTED';
  retentionPolicy: string;
  expirationDate?: string;
}

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

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  mimeType: string;
  checksum: string;
  uploadDate: string;
  uploadedBy: string;
  description?: string;
  category?: string;
  metadata?: Record<string, any>;
  thumbnailPath?: string;
  previewPath?: string;
}

// System & UI Types
export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[];
}

export enum NotificationType {
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
  LAB_RESULT_READY = 'LAB_RESULT_READY',
  PRESCRIPTION_READY = 'PRESCRIPTION_READY',
  CRITICAL_LAB_RESULT = 'CRITICAL_LAB_RESULT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  BILLING_PAYMENT_DUE = 'BILLING_PAYMENT_DUE',
  WELCOME = 'WELCOME',
  SECURITY_ALERT = 'SECURITY_ALERT'
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  services: {
    user: ServiceStatus;
    patient: ServiceStatus;
    appointment: ServiceStatus;
    clinical: ServiceStatus;
    billing: ServiceStatus;
    notification: ServiceStatus;
  };
  lastChecked: string;
}

export interface ServiceStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

// Dashboard Types
export interface DashboardData {
  summary: {
    totalPatients: number;
    totalAppointments: number;
    todayAppointments: number;
    pendingTasks: number;
    criticalAlerts: number;
  };
  appointments: {
    upcoming: Appointment[];
    today: Appointment[];
    recentlyCompleted: Appointment[];
  };
  patients: {
    newPatients: Patient[];
    recentlySeen: Patient[];
  };
  alerts: Alert[];
  charts: ChartData;
}

export interface Alert {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  title: string;
  message: string;
  timestamp: string;
  dismissible: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

export interface ChartData {
  patientRegistrations: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  appointmentTrends: {
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  revenue: {
    daily: number[];
    monthly: number[];
  };
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'time' | 'datetime-local' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'radio' | 'file';
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (value: any) => string | undefined;
  };
  disabled?: boolean;
  helperText?: string;
  gridProps?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export interface FormConfig {
  fields: FormField[];
  submitButton: {
    text: string;
    variant?: 'contained' | 'outlined' | 'text';
    color?: string;
  };
  cancelButton?: {
    text: string;
    variant?: 'contained' | 'outlined' | 'text';
    color?: string;
  };
  validationSchema?: any;
  onSubmit: (values: any) => Promise<void>;
  initialValues?: any;
}

// Navigation & Menu Types
export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
  permission?: string;
  badge?: {
    count: number;
    color: string;
  };
  divider?: boolean;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Utility Types
export type SortOrder = 'ASC' | 'DESC';
export type SortField = string;

export interface FilterOptions {
  search?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  status?: string[];
  type?: string[];
  facility?: string[];
  department?: string[];
}

export interface TableConfig {
  columns: {
    field: string;
    header: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: number;
    render?: (value: any, row: any) => React.ReactNode;
  }[];
  actions?: {
    label: string;
    icon?: string;
    color?: string;
    handler: (row: any) => void;
    condition?: (row: any) => boolean;
  }[];
  pageSize?: number;
  pageSizeOptions?: number[];
}

// Export all types
export * from './auth.types';
export * from './patient.types';
export * from './appointment.types';
export * from './clinical.types';
export * from './dashboard.types';