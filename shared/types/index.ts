// ==========================================
// HMS Enterprise - Shared TypeScript Types
// ==========================================

// ============= Common Types =============

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: ErrorDetails | null;
  meta?: ResponseMeta;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ============= User & Auth Types =============

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  profilePhotoUrl?: string;
  userType: UserType;
  isDoctor: boolean;
  specialization?: string;
  qualification?: string;
  medicalRegistrationNumber?: string;
  hprId?: string;
  consultationFee?: number;
  revenueSharePercentage?: number;
  isActive: boolean;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserType = 'admin' | 'doctor' | 'receptionist' | 'accountant' | 'pharmacist' | 'lab_technician' | 'b2b_manager';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  sub: string;
  username: string;
  email: string;
  userType: UserType;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

export interface Role {
  id: string;
  roleName: string;
  roleDisplayName: string;
  description?: string;
  isSystemRole: boolean;
  permissions: Permission[];
  createdAt: Date;
}

export interface Permission {
  id: string;
  permissionKey: string;
  permissionName: string;
  module: string;
  description?: string;
}

// ============= Patient Types =============

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  mobile: string;
  email?: string;
  address?: Address;
  abhaNumber?: string;
  abhaAddress?: string;
  healthIdVerified: boolean;
  aadhaarNumber?: string;
  panNumber?: string;
  allergies?: string[];
  chronicConditions?: string[];
  photoUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export type Gender = 'male' | 'female' | 'other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ABHADetails {
  abhaNumber: string;
  abhaAddress: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  mobile: string;
}

// ============= Appointment Types =============

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  appointmentTime: string;
  durationMinutes: number;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  tokenNumber?: number;
  consultationFee?: number;
  chiefComplaint?: string;
  checkedInAt?: Date;
  consultationStartedAt?: Date;
  consultationEndedAt?: Date;
  notes?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentType = 'consultation' | 'follow-up' | 'procedure';
export type AppointmentStatus = 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxAppointments?: number;
  isActive: boolean;
}

export interface QueueStatus {
  currentToken: number;
  totalTokens: number;
  estimatedWaitTime: number; // minutes
  doctorId: string;
  doctorName: string;
}

// ============= Clinical Types =============

export interface Visit {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  visitDate: Date;
  visitType: VisitType;
  vitals?: Vitals;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  examinationFindings?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  advice?: string;
  followUpDate?: Date;
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type VisitType = 'opd' | 'emergency' | 'follow-up';

export interface Vitals {
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulseRate?: number;
  temperatureF?: number;
  spo2?: number;
}

export interface Prescription {
  id: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  prescriptionDate: Date;
  prescriptionNumber: string;
  items: PrescriptionItem[];
  isDigitalSignature: boolean;
  signatureUrl?: string;
  createdAt: Date;
}

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
  sequenceNumber: number;
}

export interface Investigation {
  id: string;
  visitId?: string;
  patientId: string;
  doctorId: string;
  investigationType: InvestigationType;
  investigationName: string;
  serviceId?: string;
  status: InvestigationStatus;
  orderedAt: Date;
  completedAt?: Date;
  reportUrl?: string;
  reportFindings?: string;
  isOutsourced: boolean;
  partnerId?: string;
}

export type InvestigationType = 'lab' | 'imaging' | 'other';
export type InvestigationStatus = 'ordered' | 'sample-collected' | 'in-progress' | 'completed' | 'cancelled';

// ============= Billing Types =============

export interface Service {
  id: string;
  serviceCode: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  basePrice: number;
  discountAllowed: boolean;
  hsnSacCode?: string;
  gstRate: number;
  isGstExempt: boolean;
  isOutsourced: boolean;
  partnerId?: string;
  partnerCost?: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceCategory = 'consultation' | 'lab' | 'imaging' | 'procedure' | 'pharmacy';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  patientId: string;
  patientName: string;
  patientMobile?: string;
  visitId?: string;
  doctorId?: string;
  isB2B: boolean;
  b2bClientId?: string;
  campId?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  irn?: string;
  ackNumber?: string;
  ackDate?: Date;
  qrCodeUrl?: string;
  notes?: string;
  isCancelled: boolean;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  serviceId: string;
  serviceName: string;
  serviceCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  isOutsourced: boolean;
  partnerId?: string;
  partnerCost?: number;
  sequenceNumber: number;
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  paymentDate: Date;
  paymentAmount: number;
  paymentMode: PaymentMode;
  transactionId?: string;
  chequeNumber?: string;
  chequeDate?: Date;
  bankName?: string;
  gatewayName?: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  remarks?: string;
  createdAt: Date;
  createdBy?: string;
}

export type PaymentMode = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque';

// ============= Accounting Types =============

export interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountSubtype?: string;
  parentAccountId?: string;
  normalBalance: 'debit' | 'credit';
  currentBalance: number;
  description?: string;
  isSystemAccount: boolean;
  isActive: boolean;
  createdAt: Date;
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  entryType: JournalEntryType;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  description?: string;
  isPosted: boolean;
  postedAt?: Date;
  isReversed: boolean;
  reversedByEntryId?: string;
  createdAt: Date;
  createdBy?: string;
}

export type JournalEntryType = 'standard' | 'invoice' | 'payment' | 'adjustment';

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  doctorId?: string;
  partnerId?: string;
  b2bClientId?: string;
  campId?: string;
  description?: string;
  lineNumber: number;
}

export interface LedgerEntry {
  date: Date;
  entryNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

// ============= Partner Types =============

export interface Partner {
  id: string;
  partnerCode: string;
  partnerName: string;
  partnerType: PartnerType;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  paymentTerms?: string;
  paymentFrequency: PaymentFrequency;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfsc?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PartnerType = 'lab' | 'imaging' | 'pharmacy' | 'consultant';
export type PaymentFrequency = 'monthly' | 'weekly' | 'per_transaction';

export interface PartnerService {
  id: string;
  partnerId: string;
  serviceId: string;
  costToPartner: number;
  payoutType: 'fixed' | 'percentage';
  payoutValue: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive: boolean;
}

export interface PartnerBill {
  id: string;
  billNumber: string;
  partnerId: string;
  billDate: Date;
  billPeriodStart?: Date;
  billPeriodEnd?: Date;
  billAmount: number;
  gstAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  paymentDate?: Date;
  isReconciled: boolean;
  reconciledAt?: Date;
  reconciliationNotes?: string;
  billDocumentUrl?: string;
  notes?: string;
  createdAt: Date;
  createdBy?: string;
}

// ============= B2B Types =============

export interface B2BClient {
  id: string;
  clientCode: string;
  clientName: string;
  clientType: ClientType;
  contactPerson?: string;
  designation?: string;
  mobile?: string;
  email?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  paymentTerms?: string;
  creditLimit?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ClientType = 'corporate' | 'insurance' | 'government';

export interface ClientContract {
  id: string;
  clientId: string;
  contractNumber: string;
  contractName?: string;
  contractType: string;
  startDate: Date;
  endDate?: Date;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  applicableServices?: string[];
  applicableAllServices: boolean;
  maxAmountPerEmployee?: number;
  maxVisitsPerEmployee?: number;
  contractDocumentUrl?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface B2BInvoice {
  id: string;
  b2bInvoiceNumber: string;
  clientId: string;
  invoicePeriod: string;
  periodStart: Date;
  periodEnd: Date;
  invoiceDate: Date;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  dueDate?: Date;
  irn?: string;
  ackNumber?: string;
  invoicePdfUrl?: string;
  notes?: string;
  createdAt: Date;
  createdBy?: string;
}

// ============= Camp Types =============

export interface Camp {
  id: string;
  campCode: string;
  campName: string;
  campType: string;
  campDate: Date;
  startTime?: string;
  endTime?: string;
  locationName?: string;
  locationAddress?: string;
  targetParticipants?: number;
  registeredParticipants: number;
  attendedParticipants: number;
  organizedBy?: string;
  organizerContact?: string;
  budget?: number;
  packagePrice?: number;
  status: CampStatus;
  description?: string;
  notes?: string;
  createdAt: Date;
  createdBy?: string;
}

export type CampStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled';

// ============= Event Types =============

export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  source: string;
  data: any;
}

export type EventType =
  | 'PatientRegistered'
  | 'AppointmentBooked'
  | 'AppointmentCancelled'
  | 'VisitCreated'
  | 'InvoiceCreated'
  | 'PaymentReceived'
  | 'OutsourcedServiceCompleted'
  | 'B2BInvoiceGenerated';
