// HMS User Service User Models
// TypeScript interfaces and entities for user management

import { User as SharedUser, UserRole, Permission, Role } from '@hms/shared/types';

// =============================================================================
// USER INTERFACES
// =============================================================================

export interface User extends SharedUser {
  // Authentication fields
  lastLoginAt?: Date;
  lastLoginIp?: string;
  passwordChangedAt: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  isMobileVerified: boolean;

  // Profile fields
  profileImage?: string;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'auto';

  // Security fields
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];

  // Audit fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreationData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  mobile?: string;
  userType: string;
  specialization?: string;
  department?: string;
  hprId?: string;
  roles?: string[];
  isActive?: boolean;
  createdBy: string;
}

export interface UserUpdateData {
  email?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  specialization?: string;
  department?: string;
  hprId?: string;
  isActive?: boolean;
  profileImage?: string;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  updatedBy: string;
}

export interface UserSecurityUpdate {
  currentPassword?: string;
  newPassword?: string;
  enableTwoFactor?: boolean;
  twoFactorSecret?: string;
  updatedBy: string;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================================================
// USER SESSION INTERFACES
// =============================================================================

export interface UserSession {
  id: string;
  userId: string;
  deviceId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    platform?: string;
    browser?: string;
    os?: string;
    location?: {
      country?: string;
      city?: string;
    };
  };
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  isActive: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
  loginAt: Date;
  logoutAt?: Date;
  logoutReason?: 'manual' | 'timeout' | 'force' | 'password_change';
}

export interface DeviceInfo {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  platform: string;
  browser: string;
  os: string;
  lastUsedAt: Date;
  isActive: boolean;
  trusted: boolean;
  createdAt: Date;
}

export interface LoginAttempt {
  id: string;
  username?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  attemptedAt: Date;
  userId?: string;
}

// =============================================================================
// PASSWORD RESET INTERFACES
// =============================================================================

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenId: string;
  email: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  usedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface PasswordHistory {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: Date;
  createdBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================================================
// USER ROLES AND PERMISSIONS
// =============================================================================

export interface ExtendedUserRole extends UserRole {
  userCount?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface ExtendedPermission extends Permission {
  roleCount?: number;
  category: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermission {
  userId: string;
  permissionId: string;
  permissionName: string;
  permissionCode: string;
  category: string;
  grantedAt: Date;
  grantedBy: string;
}

// =============================================================================
// USER ACTIVITY AND AUDIT
// =============================================================================

export interface UserActivity {
  id: string;
  userId: string;
  activityType: string;
  activityTypeCode: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
}

export interface UserAuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  performedBy: string;
  performedAt: Date;
  ipAddress: string;
  userAgent: string;
}

// =============================================================================
// API REQUEST/RESPONSE INTERFACES
// =============================================================================

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    deviceName?: string;
    platform?: string;
    browser?: string;
  };
}

export interface LoginResponse {
  user: UserProfile;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
  session: {
    sessionId: string;
    expiresAt: Date;
  };
  permissions: string[];
  roles: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName?: string;
  mobile?: string;
  userType: string;
  specialization?: string;
  department?: string;
  hprId?: string;
  isDoctor: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  twoFactorEnabled: boolean;
  profileImage?: string;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName?: string;
  mobile?: string;
  userType: string;
  specialization?: string;
  department?: string;
  hprId?: string;
  acceptTerms: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  mobile?: string;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface UpdateSecurityRequest {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  enableTwoFactor?: boolean;
  twoFactorCode?: string;
}

// =============================================================================
// USER MANAGEMENT REQUESTS
// =============================================================================

export interface CreateUserRequest {
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName?: string;
  mobile?: string;
  userType: string;
  specialization?: string;
  department?: string;
  hprId?: string;
  roles?: string[];
  isActive?: boolean;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  specialization?: string;
  department?: string;
  hprId?: string;
  isActive?: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface BulkUserUpdateRequest {
  userIds: string[];
  updateData: Partial<UpdateUserRequest>;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  userType?: string;
  department?: string;
  isActive?: boolean;
  isDoctor?: boolean;
  role?: string;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export interface UserListResponse {
  users: UserProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    search?: string;
    userType?: string;
    department?: string;
    isActive?: boolean;
    isDoctor?: boolean;
    role?: string;
  };
}

// =============================================================================
// STATISTICS AND REPORTING
// =============================================================================

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  doctors: number;
  nonDoctors: number;
  usersByType: Record<string, number>;
  usersByDepartment: Record<string, number>;
  recentRegistrations: number;
  passwordExpiringSoon: number;
  accountsNeedingVerification: number;
  lockedAccounts: number;
}

export interface LoginStatistics {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
  loginsByDay: Array<{
    date: string;
    count: number;
  }>;
  loginsByHour: Array<{
    hour: number;
    count: number;
  }>;
  topUserTypes: Array<{
    userType: string;
    count: number;
  }>;
  failureReasons: Array<{
    reason: string;
    count: number;
  }>;
}

export interface ActivityStatistics {
  totalActivities: number;
  activitiesByType: Record<string, number>;
  activitiesByUserType: Record<string, number>;
  recentActivities: Array<{
    id: string;
    userId: string;
    username: string;
    activityType: string;
    description: string;
    timestamp: Date;
  }>;
}

// =============================================================================
// VALIDATION INTERFACES
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  forbiddenPatterns: string[];
  historyCount: number;
  expiryDays: number;
}

// =============================================================================
// ENUMS AND CONSTANTS
// =============================================================================

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  LOCKED = 'locked',
  PENDING_VERIFICATION = 'pending_verification'
}

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PROFILE_UPDATE = 'profile_update',
  ROLE_CHANGE = 'role_change',
  PERMISSION_CHANGE = 'permission_change',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  EMAIL_VERIFIED = 'email_verified',
  MOBILE_VERIFIED = 'mobile_verified'
}

export enum LoginFailureReason {
  INVALID_CREDENTIALS = 'invalid_credentials',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_INACTIVE = 'account_inactive',
  TWO_FACTOR_REQUIRED = 'two_factor_required',
  INVALID_TWO_FACTOR = 'invalid_two_factor',
  RATE_LIMITED = 'rate_limited',
  SYSTEM_ERROR = 'system_error'
}

export const DEFAULT_USER_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  ACCOUNTANT: 'accountant',
  PHARMACIST: 'pharmacist',
  LAB_TECHNICIAN: 'lab_technician',
  B2B_MANAGER: 'b2b_manager'
} as const;

export const USER_TYPES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  ACCOUNTANT: 'accountant',
  PHARMACIST: 'pharmacist',
  LAB_TECHNICIAN: 'lab_technician',
  B2B_MANAGER: 'b2b_manager'
} as const;

export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: 'user_management',
  PATIENT_MANAGEMENT: 'patient_management',
  APPOINTMENT_MANAGEMENT: 'appointment_management',
  CLINICAL_MANAGEMENT: 'clinical_management',
  BILLING_MANAGEMENT: 'billing_management',
  ACCOUNTING_MANAGEMENT: 'accounting_management',
  REPORTING: 'reporting',
  SYSTEM_ADMINISTRATION: 'system_administration'
} as const;