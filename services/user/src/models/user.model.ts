import { BaseModel } from '@hms/shared';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  HOSPITAL_ADMIN = 'hospital_admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
  PHARMACIST = 'pharmacist',
  LAB_TECHNICIAN = 'lab_technician',
  RADIOLOGIST = 'radiologist',
  BILLING_STAFF = 'billing_staff',
  ACCOUNTANT = 'accountant',
  PATIENT = 'patient'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  LOCKED = 'locked'
}

export enum AuthProvider {
  LOCAL = 'local',
  ABDM = 'abdm',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft'
}

export enum TwoFactorStatus {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
  REQUIRED = 'required'
}

export interface User extends BaseModel {
  username: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  alternatePhoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  profilePicture?: string;
  department?: string;
  designation?: string;
  employeeId?: string;
  medicalRegistrationNumber?: string;
  specialization?: string;
  experience?: number;
  qualifications?: Qualification[];
  addresses?: Address[];
  lastLoginAt?: Date;
  lastLoginIp?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  emailVerificationToken?: string;
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;
  twoFactorStatus: TwoFactorStatus;
  twoFactorSecret?: string;
  backupCodes?: string[];
  loginAttempts: number;
  lockedUntil?: Date;
  authProvider: AuthProvider;
  abdmHealthId?: string;
  abdmVerifiedAt?: Date;
  preferences: UserPreferences;
  permissions: Permission[];
  sessions: UserSession[];
  auditLogs: UserAuditLog[];
}

export interface Qualification extends BaseModel {
  degree: string;
  specialization?: string;
  university: string;
  year: number;
  certificateUrl?: string;
  verified: boolean;
  verificationDocument?: string;
}

export interface Address extends BaseModel {
  type: 'permanent' | 'current' | 'work';
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export interface UserPreferences extends BaseModel {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  appointmentReminders: boolean;
  billingAlerts: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
}

export interface PrivacyPreferences {
  shareProfileWithPatients: boolean;
  shareContactInfo: boolean;
  showOnlineStatus: boolean;
  allowDirectMessaging: boolean;
}

export interface Permission extends BaseModel {
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface UserSession extends BaseModel {
  sessionId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  lastAccessAt: Date;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os: string;
  browser?: string;
  browserVersion?: string;
  trusted: boolean;
}

export interface UserAuditLog extends BaseModel {
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  success: boolean;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface LoginAttempt extends BaseModel {
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  timestamp: Date;
}

export interface PasswordResetRequest extends BaseModel {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  ipAddress: string;
  userAgent: string;
}

export interface EmailVerificationRequest extends BaseModel {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  verifiedAt?: Date;
  ipAddress: string;
  userAgent: string;
}

export interface TwoFactorSetup extends BaseModel {
  userId: string;
  secret: string;
  backupCodes: string[];
  qrCode: string;
  verifiedAt?: Date;
  enabledAt?: Date;
}

// ABDM (Ayushman Bharat Digital Mission) Integration Interfaces
export interface ABDMProfile {
  healthId: string;
  healthIdNumber: string;
  name: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'O';
  address: string;
  state: string;
  district: string;
  pincode: string;
  mobile: string;
  email?: string;
  profilePhoto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ABDMAuthRequest {
  healthId: string;
  authMethod: 'MOBILE_OTP' | 'AADHAAR_OTP' | 'DEMOGRAPHIC';
  transactionId?: string;
}

export interface ABDMAuthResponse {
  transactionId: string;
  otpSent: boolean;
  maskedMobileNumber?: string;
}

export interface ABDMVerifyOTPRequest {
  transactionId: string;
  otp: string;
}

export interface ABDMVerifyOTPResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  profile: ABDMProfile;
}

export interface ABDMLinkRequest {
  healthId: string;
  accessToken: string;
  userId: string;
}

// Authentication DTOs
export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
  rememberMe?: boolean;
  deviceInfo?: Partial<DeviceInfo>;
}

export interface LoginResponse {
  success: boolean;
  user?: Partial<User>;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  requiresTwoFactor?: boolean;
  twoFactorMethods?: ('totp' | 'sms' | 'email')[];
  message?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: UserRole;
  acceptTerms: boolean;
  recaptchaToken?: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: Partial<User>;
  message?: string;
  requiresVerification?: {
    email: boolean;
    phone: boolean;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  message?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
  recaptchaToken?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface EnableTwoFactorRequest {
  password: string;
}

export interface EnableTwoFactorResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface VerifyTwoFactorRequest {
  token: string;
  backupCode?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePicture?: string;
  department?: string;
  designation?: string;
  qualifications?: Qualification[];
  addresses?: Address[];
  preferences?: Partial<UserPreferences>;
}

export interface CreateMultipleUsersRequest {
  users: Omit<RegisterRequest, 'confirmPassword' | 'acceptTerms' | 'recaptchaToken'>[];
  defaultPassword?: string;
  sendWelcomeEmail?: boolean;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pendingVerification: number;
  locked: number;
  byRole: Record<UserRole, number>;
  byDepartment: Record<string, number>;
  recentLogins: number;
  newRegistrations: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
}

// Role-based Access Control (RBAC)
export interface Role {
  id: string;
  name: UserRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  level: number; // For hierarchy
}

export interface RolePermissionMatrix {
  [role: string]: {
    [resource: string]: string[]; // Actions
  };
}

// Security and Compliance
export interface SecurityConfig {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
    maxAge: number;
  };
  sessionPolicy: {
    maxDuration: number;
    inactivityTimeout: number;
    maxConcurrentSessions: number;
  };
  twoFactorPolicy: {
    requiredForRoles: UserRole[];
    gracePeriod: number;
    allowedMethods: ('totp' | 'sms' | 'email')[];
  };
  lockoutPolicy: {
    maxAttempts: number;
    lockoutDuration: number;
    resetTime: number;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}