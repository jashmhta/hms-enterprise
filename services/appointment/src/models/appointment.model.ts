// HMS Appointment Service Models
// Comprehensive appointment scheduling and calendar management data models

import { BaseModel } from '@hms/shared';

// =============================================================================
// APPOINTMENT CORE MODELS
// =============================================================================

export interface Appointment extends BaseModel {
  appointmentNumber: string; // Auto-generated unique appointment ID
  patientId: string;
  mrn: string; // Patient Medical Record Number
  doctorId: string;
  departmentId: string;
  facilityId: string;

  // Appointment Details
  appointmentType: AppointmentType;
  consultationType: ConsultationType;
  status: AppointmentStatus;
  priority: AppointmentPriority;

  // Scheduling Information
  scheduledDateTime: Date;
  estimatedDuration: number; // in minutes
  actualStartDateTime?: Date;
  actualEndDateTime?: Date;
  timezone: string;

  // Location Information
  location: AppointmentLocation;

  // Clinical Information
  chiefComplaint?: string;
  symptoms?: string[];
  notes?: string;
  previousAppointmentId?: string; // For follow-up appointments
  nextAppointmentId?: string;

  // Payment Information
  consultationFee: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentTransactionId?: string;
  insuranceClaimId?: string;

  // Scheduling Metadata
  isRecurring: boolean = false;
  recurringPattern?: RecurringPattern;
  parentAppointmentId?: string; // For recurring appointments
  childAppointmentIds?: string[]; // For recurring appointments

  // Patient Information (cached for performance)
  patientInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string;
    primaryContactNumber: string;
    email?: string;
  };

  // Doctor Information (cached for performance)
  doctorInfo?: {
    firstName: string;
    lastName: string;
    specialization: string;
    qualifications: string[];
    experience: number;
    consultationFee: number;
  };

  // Booking Information
  bookedBy: string; // User ID who booked the appointment
  bookedAt: Date;
  bookingChannel: BookingChannel;
  bookingSource?: string; // Source application/web

  // Confirmation Information
  isConfirmed: boolean = false;
  confirmedBy?: string; // User ID who confirmed
  confirmedAt?: Date;
  confirmationMethod?: ConfirmationMethod;

  // Check-in Information
  isCheckedIn: boolean = false;
  checkedInAt?: Date;
  checkedInBy?: string;
  checkInNotes?: string;

  // Cancellation Information
  cancellationReason?: string;
  cancellationReasonCategory?: CancellationReasonCategory;
  cancelledBy?: string;
  cancelledAt?: Date;
  cancellationPolicy?: CancellationPolicy;
  refundAmount?: number;
  refundStatus?: RefundStatus;

  // Rescheduling Information
  rescheduleCount: number = 0;
  originalScheduledDateTime?: Date;
  rescheduleReason?: string;
  rescheduledBy?: string;
  rescheduledAt?: Date;
  previousAppointmentId?: string;

  // Waitlist Information
  isFromWaitlist: boolean = false;
  waitlistPosition?: number;
  waitlistJoinedAt?: Date;

  // Communication Information
  remindersSent: ReminderStatus;
  communicationHistory?: CommunicationRecord[];

  // Integration Information
  externalCalendarIds?: {
    google?: string;
    outlook?: string;
    zoom?: string;
  };

  // Additional Information
  tags?: string[];
  metadata?: Record<string, any>;
  isUrgent: boolean = false;
  requiresSpecialEquipment?: boolean;
  specialRequirements?: string;

  // System Information
  lastReminderSent?: Date;
  nextReminderDue?: Date;
  autoRescheduleEnabled: boolean = false;
  maxRescheduleAttempts: number = 3;
}

export enum AppointmentType {
  NEW_CONSULTATION = 'new_consultation',
  FOLLOW_UP = 'follow_up',
  REVIEW = 'review',
  EMERGENCY = 'emergency',
  PROCEDURE = 'procedure',
  SURGERY = 'surgery',
  VACCINATION = 'vaccination',
  HEALTH_CHECKUP = 'health_checkup',
  SPECIALIST_REFERRAL = 'specialist_referral',
  TELECONSULTATION = 'teleconsultation',
  HOME_VISIT = 'home_visit',
  CORPORATE_CHECKUP = 'corporate_checkup'
}

export enum ConsultationType {
  IN_PERSON = 'in_person',
  VIDEO = 'video',
  PHONE = 'phone',
  CHAT = 'chat'
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
  WAITLISTED = 'waitlisted',
  PENDING_CONFIRMATION = 'pending_confirmation'
}

export enum AppointmentPriority {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  EMERGENCY = 'emergency',
  CRITICAL = 'critical'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  FAILED = 'failed',
  WAIVED = 'waived'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  NET_BANKING = 'net_banking',
  INSURANCE = 'insurance',
  CORPORATE = 'corporate',
  FREE = 'free'
}

export enum BookingChannel {
  WALK_IN = 'walk_in',
  PHONE = 'phone',
  WEBSITE = 'website',
  MOBILE_APP = 'mobile_app',
  RECEPTION = 'reception',
  REFERRAL = 'referral',
  CORPORATE = 'corporate',
  ONLINE_PORTAL = 'online_portal'
}

export enum ConfirmationMethod {
  SMS = 'sms',
  EMAIL = 'email',
  PHONE = 'phone',
  WHATSAPP = 'whatsapp',
  AUTO = 'auto',
  MANUAL = 'manual'
}

export enum CancellationReasonCategory {
  PATIENT_REQUEST = 'patient_request',
  DOCTOR_UNAVAILABLE = 'doctor_unavailable',
  EMERGENCY = 'emergency',
  DOUBLE_BOOKING = 'double_booking',
  SYSTEM_ERROR = 'system_error',
  WEATHER = 'weather',
  TRANSPORTATION = 'transportation',
  FINANCIAL = 'financial',
  MEDICAL = 'medical',
  OTHER = 'other'
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// =============================================================================
// SUPPORTING MODELS
// =============================================================================

export interface AppointmentLocation {
  type: LocationType;
  name?: string;
  roomNumber?: string;
  floor?: string;
  building?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  equipment?: string[];
  capacity?: number;
  specialFeatures?: string[];
}

export enum LocationType {
  CONSULTATION_ROOM = 'consultation_room',
  TREATMENT_ROOM = 'treatment_room',
  OPERATING_THEATER = 'operating_theater',
  EMERGENCY_ROOM = 'emergency_room',
  ICU = 'icu',
  WARD = 'ward',
  LAB = 'lab',
  RADIOLOGY = 'radiology',
  PHARMACY = 'pharmacy',
  VIDEO_CALL = 'video_call',
  PHONE_CALL = 'phone_call',
  HOME = 'home',
  OFFICE = 'office',
  OTHER = 'other'
}

export interface RecurringPattern {
  type: RecurrenceType;
  interval: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number; // For monthly recurrence
  endDate?: Date;
  endAfterOccurrences?: number;
  exceptions?: Date[]; // Dates to skip
  timezone: string;
}

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export interface CancellationPolicy {
  hoursBeforeAppointment: number;
  refundPercentage: number;
  penaltyAmount?: number;
  policyType: 'full_refund' | 'partial_refund' | 'penalty' | 'no_refund';
  description: string;
  isActive: boolean = true;
}

export interface ReminderStatus {
  email24h: boolean = false;
  email2h: boolean = false;
  sms24h: boolean = false;
  sms2h: boolean = false;
  whatsapp2h: boolean = false;
  phone1d: boolean = false;
  phone2h: boolean = false;
  push24h: boolean = false;
  push2h: boolean = false;
}

export interface CommunicationRecord {
  type: CommunicationType;
  method: CommunicationMethod;
  sentAt: Date;
  recipient: string;
  content: string;
  status: 'sent' | 'delivered' | 'failed' | 'read';
  messageId?: string;
  error?: string;
}

export enum CommunicationType {
  CONFIRMATION = 'confirmation',
  REMINDER = 'reminder',
  CANCELLATION = 'cancellation',
  RESCHEDULING = 'rescheduling',
  PAYMENT = 'payment',
  FOLLOW_UP = 'follow_up',
  GENERAL = 'general'
}

export enum CommunicationMethod {
  SMS = 'sms',
  EMAIL = 'email',
  PHONE = 'phone',
  WHATSAPP = 'whatsapp',
  PUSH = 'push'
}

// =============================================================================
// DOCTOR SCHEDULE MODELS
// =============================================================================

export interface DoctorSchedule extends BaseModel {
  doctorId: string;
  departmentId: string;
  facilityId: string;

  // Schedule Details
  scheduleType: ScheduleType;
  name: string;
  description?: string;
  isActive: boolean = true;

  // Time Period
  effectiveFrom: Date;
  effectiveTo?: Date;
  timezone: string;

  // Recurring Pattern
  recurringPattern: RecurringPattern;

  // Daily Schedule
  dailySlots: DailyScheduleSlot[];

  // Special Settings
  maxAppointmentsPerSlot: number;
  allowOverlappingAppointments: boolean = false;
  bufferTimeMinutes: number = 0;
  consultationTypesAllowed: ConsultationType[];
  appointmentTypesAllowed: AppointmentType[];

  // Availability Overrides
  unavailableDates: Date[];
  specialAvailabilityDates: SpecialAvailabilityDate[];

  // Settings
  autoAcceptAppointments: boolean = false;
  requireConfirmation: boolean = true;
  allowWaitlist: boolean = true;
  maxWaitlistSize: number = 5;

  // Integration Settings
  syncWithExternalCalendar: boolean = false;
  externalCalendarId?: string;
}

export enum ScheduleType {
  REGULAR = 'regular',
  TEMPORARY = 'temporary',
  VACATION = 'vacation',
  CONFERENCE = 'conference',
  TRAINING = 'training',
  ON_CALL = 'on_call',
  EMERGENCY_ONLY = 'emergency_only'
}

export interface DailyScheduleSlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  slotDurationMinutes: number;
  maxAppointmentsPerSlot: number;
  consultationTypes: ConsultationType[];
  isAvailable: boolean = true;
  notes?: string;
}

export interface SpecialAvailabilityDate {
  date: Date;
  isAvailable: boolean;
  slots?: DailyScheduleSlot[];
  reason?: string;
}

// =============================================================================
// AVAILABILITY MODELS
// =============================================================================

export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  departmentId: string;
  facilityId: string;
  startDateTime: Date;
  endDateTime: Date;
  durationMinutes: number;
  consultationType: ConsultationType;
  appointmentType: AppointmentType[];
  maxAppointments: number;
  currentAppointments: number;
  isAvailable: boolean;
  isBookable: boolean;
  price: number;
  currency: string = 'INR';
  location?: AppointmentLocation;
  specialRequirements?: string[];
  tags?: string[];
}

export interface WaitlistEntry extends BaseModel {
  appointmentId?: string; // If appointment was created from waitlist
  patientId: string;
  doctorId: string;
  departmentId: string;
  facilityId: string;

  // Waitlist Details
  preferredDateRange: {
    from: Date;
    to: Date;
  };
  preferredTimeSlots: TimeSlotPreference[];
  consultationType: ConsultationType;
  appointmentType: AppointmentType;
  urgencyLevel: 'low' | 'medium' | 'high' | 'urgent';

  // Contact Information
  contactNumber: string;
  email?: string;
  preferredContactMethod: 'sms' | 'email' | 'phone' | 'whatsapp';

  // Status and Tracking
  status: WaitlistStatus;
  position: number;
  joinedAt: Date;
  lastContactedAt?: Date;
  nextContactAt?: Date;

  // Reason and Notes
  reason: string;
  specialRequirements?: string;
  notes?: string;

  // Offer History
  offeredSlots: WaitlistSlotOffer[];
  declineReason?: string;
}

export enum WaitlistStatus {
  ACTIVE = 'active',
  CONTACTED = 'contacted',
  OFFERED = 'offered',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface TimeSlotPreference {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  priority: 'preferred' | 'acceptable' | 'avoid';
  daysOfWeek?: number[];
}

export interface WaitlistSlotOffer {
  slotDateTime: Date;
  consultationType: ConsultationType;
  offeredAt: Date;
  responseDeadline: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  respondedAt?: Date;
}

// =============================================================================
// CALENDAR MODELS
// =============================================================================

export interface CalendarEvent {
  id: string;
  externalId?: string;
  provider: 'google' | 'outlook' | 'apple' | 'internal';
  type: CalendarEventType;

  // Basic Information
  title: string;
  description?: string;
  location?: string;
  startDateTime: Date;
  endDateTime: Date;
  timezone: string;
  isAllDay: boolean = false;

  // Attendees
  organizer?: CalendarAttendee;
  attendees?: CalendarAttendee[];

  // Recurrence
  isRecurring: boolean = false;
  recurringRule?: string; // iCalendar RRULE format
  recurringExceptionDates?: Date[];

  // Status
  status: 'tentative' | 'confirmed' | 'cancelled';
  visibility: 'default' | 'public' | 'private';

  // Reminders
  reminders: CalendarReminder[];

  // Synchronization
  lastSyncedAt?: Date;
  syncDirection: 'import' | 'export' | 'bidirectional';
  isSynced: boolean = false;
  syncError?: string;

  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
}

export enum CalendarEventType {
  APPOINTMENT = 'appointment',
  PERSONAL = 'personal',
  MEETING = 'meeting',
  CONFERENCE = 'conference',
  VACATION = 'vacation',
  TRAINING = 'training',
  ON_CALL = 'on_call',
  UNAVAILABLE = 'unavailable',
  OTHER = 'other'
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  type: 'required' | 'optional' | 'resource';
  status: 'needsAction' | 'accepted' | 'tentative' | 'declined';
  responseAt?: Date;
}

export interface CalendarReminder {
  type: 'email' | 'popup' | 'sms';
  minutesBefore: number;
  isEnabled: boolean = true;
}

// =============================================================================
// VIEW MODELS
// =============================================================================

export interface AppointmentSummary {
  appointmentId: string;
  appointmentNumber: string;
  patientId: string;
  mrn: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  departmentId: string;
  departmentName: string;
  facilityId: string;
  facilityName: string;
  appointmentType: AppointmentType;
  consultationType: ConsultationType;
  status: AppointmentStatus;
  scheduledDateTime: Date;
  durationMinutes: number;
  location?: string;
  consultationFee: number;
  paymentStatus: PaymentStatus;
  bookingChannel: BookingChannel;
  isConfirmed: boolean;
  isCheckedIn: boolean;
}

export interface AppointmentCalendarView {
  date: Date;
  appointments: AppointmentSummary[];
  availableSlots: AvailabilitySlot[];
  blockedSlots: BlockedSlot[];
  doctorAvailability: DoctorAvailabilityInfo[];
}

export interface BlockedSlot {
  id: string;
  doctorId: string;
  startDateTime: Date;
  endDateTime: Date;
  reason: string;
  type: 'unavailable' | 'meeting' | 'personal' | 'emergency';
  isRecurring: boolean;
}

export interface DoctorAvailabilityInfo {
  doctorId: string;
  doctorName: string;
  specialization: string;
  departmentId: string;
  departmentName: string;
  isAvailable: boolean;
  availableSlots: AvailabilitySlot[];
  maxAppointmentsPerDay: number;
  currentAppointmentsCount: number;
  utilizationRate: number;
  nextAvailableSlot?: Date;
}

export interface AppointmentMetrics {
  totalAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  rescheduledAppointments: number;
  utilizationRate: number;
  averageConsultationDuration: number;
  averageWaitTime: number;
  showRate: number;
  cancellationRate: number;
  rescheduleRate: number;
  noShowRate: number;
  revenue: number;
  revenueByAppointmentType: Record<string, number>;
  revenueByConsultationType: Record<string, number>;
  doctorPerformance: DoctorPerformanceMetrics[];
  departmentPerformance: DepartmentPerformanceMetrics[];
}

export interface DoctorPerformanceMetrics {
  doctorId: string;
  doctorName: string;
  totalAppointments: number;
  completedAppointments: number;
  averageDuration: number;
  utilizationRate: number;
  patientSatisfactionScore?: number;
  noShowRate: number;
  cancellationRate: number;
  revenue: number;
  averageRevenuePerAppointment: number;
}

export interface DepartmentPerformanceMetrics {
  departmentId: string;
  departmentName: string;
  totalAppointments: number;
  completedAppointments: number;
  averageWaitTime: number;
  utilizationRate: number;
  revenue: number;
  doctorCount: number;
  averageAppointmentsPerDoctor: number;
}

// =============================================================================
// REQUEST/RESPONSE MODELS
// =============================================================================

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  departmentId: string;
  facilityId: string;
  appointmentType: AppointmentType;
  consultationType: ConsultationType;
  scheduledDateTime: Date;
  estimatedDuration?: number;
  location?: Partial<AppointmentLocation>;
  chiefComplaint?: string;
  symptoms?: string[];
  notes?: string;
  previousAppointmentId?: string;
  consultationFee?: number;
  bookingChannel?: BookingChannel;
  isUrgent?: boolean;
  requiresSpecialEquipment?: boolean;
  specialRequirements?: string;
  tags?: string[];
  paymentMethod?: PaymentMethod;
  insuranceClaimId?: string;
  autoConfirm?: boolean;
}

export interface UpdateAppointmentRequest {
  appointmentType?: AppointmentType;
  consultationType?: ConsultationType;
  scheduledDateTime?: Date;
  estimatedDuration?: number;
  location?: Partial<AppointmentLocation>;
  chiefComplaint?: string;
  symptoms?: string[];
  notes?: string;
  consultationFee?: number;
  priority?: AppointmentPriority;
  isUrgent?: boolean;
  requiresSpecialEquipment?: boolean;
  specialRequirements?: string;
  tags?: string[];
}

export interface SearchAppointmentsRequest {
  patientId?: string;
  doctorId?: string;
  departmentId?: string;
  facilityId?: string;
  appointmentType?: AppointmentType;
  consultationType?: ConsultationType;
  status?: AppointmentStatus;
  priority?: AppointmentPriority;
  paymentStatus?: PaymentStatus;
  bookingChannel?: BookingChannel;
  dateFrom?: Date;
  dateTo?: Date;
  isConfirmed?: boolean;
  isCheckedIn?: boolean;
  isRecurring?: boolean;
  tags?: string[];
  includePatientInfo?: boolean;
  includeDoctorInfo?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface GetAvailableSlotsRequest {
  doctorId?: string;
  departmentId?: string;
  facilityId?: string;
  consultationType?: ConsultationType;
  appointmentType?: AppointmentType;
  dateFrom: Date;
  dateTo: Date;
  includeWeekends?: boolean;
  maxResults?: number;
}

export interface BulkAppointmentRequest {
  appointments: CreateAppointmentRequest[];
  createRecurringSeries?: boolean;
  recurringPattern?: RecurringPattern;
}

export interface AppointmentResponse {
  success: boolean;
  message: string;
  data?: Appointment;
  errors?: string[];
  warnings?: string[];
}

export interface AppointmentListResponse {
  success: boolean;
  message: string;
  data?: {
    appointments: AppointmentSummary[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  errors?: string[];
}

export interface AvailableSlotsResponse {
  success: boolean;
  message: string;
  data?: {
    slots: AvailabilitySlot[];
    total: number;
    dateFrom: Date;
    dateTo: Date;
  };
  errors?: string[];
}

export interface CalendarResponse {
  success: boolean;
  message: string;
  data?: AppointmentCalendarView;
  errors?: string[];
}

export interface MetricsResponse {
  success: boolean;
  message: string;
  data?: AppointmentMetrics;
  errors?: string[];
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export interface AppointmentValidationSchema {
  required: string[];
  optional: string[];
  patterns: Record<string, RegExp>;
  customValidators: Record<string, (value: any) => boolean>;
}

export const appointmentValidationRules: AppointmentValidationSchema = {
  required: [
    'patientId',
    'doctorId',
    'departmentId',
    'facilityId',
    'appointmentType',
    'consultationType',
    'scheduledDateTime'
  ],
  optional: [
    'estimatedDuration',
    'location',
    'chiefComplaint',
    'symptoms',
    'notes',
    'previousAppointmentId',
    'consultationFee',
    'bookingChannel',
    'isUrgent',
    'requiresSpecialEquipment',
    'specialRequirements',
    'tags',
    'paymentMethod',
    'insuranceClaimId',
    'autoConfirm'
  ],
  patterns: {
    patientId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    doctorId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    departmentId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    facilityId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  },
  customValidators: {
    scheduledDateTime: (value: Date) => {
      const now = new Date();
      const appointmentTime = new Date(value);
      const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      const maxBookingTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

      return appointmentTime >= minBookingTime && appointmentTime <= maxBookingTime;
    },
    estimatedDuration: (value: number) => {
      return value >= 5 && value <= 480; // 5 minutes to 8 hours
    }
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  // Core Models
  Appointment,
  AppointmentLocation,
  RecurringPattern,
  CancellationPolicy,
  ReminderStatus,
  CommunicationRecord,

  // Schedule Models
  DoctorSchedule,
  DailyScheduleSlot,
  SpecialAvailabilityDate,

  // Availability Models
  AvailabilitySlot,
  WaitlistEntry,
  TimeSlotPreference,
  WaitlistSlotOffer,

  // Calendar Models
  CalendarEvent,
  CalendarAttendee,
  CalendarReminder,

  // View Models
  AppointmentSummary,
  AppointmentCalendarView,
  BlockedSlot,
  DoctorAvailabilityInfo,
  AppointmentMetrics,
  DoctorPerformanceMetrics,
  DepartmentPerformanceMetrics,

  // Request/Response Models
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  SearchAppointmentsRequest,
  GetAvailableSlotsRequest,
  BulkAppointmentRequest,
  AppointmentResponse,
  AppointmentListResponse,
  AvailableSlotsResponse,
  CalendarResponse,
  MetricsResponse,

  // Validation
  AppointmentValidationSchema
};

export {
  // Enums
  AppointmentType,
  ConsultationType,
  AppointmentStatus,
  AppointmentPriority,
  PaymentStatus,
  PaymentMethod,
  BookingChannel,
  ConfirmationMethod,
  CancellationReasonCategory,
  RefundStatus,
  LocationType,
  RecurrenceType,
  CommunicationType,
  CommunicationMethod,
  ScheduleType,
  WaitlistStatus,
  CalendarEventType,
  appointmentValidationRules
};