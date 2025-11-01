export interface Partner {
  id: string;
  partnerNumber: string;
  name: string;
  type: 'lab' | 'pharmacy' | 'insurance' | 'equipment' | 'software' | 'consultant' | 'other';
  category: string;
  description?: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: Address;
  website?: string;
  logo?: string;
  taxId?: string;
  licenseNumber?: string;
  accreditation?: string;
  services: PartnerService[];
  integrationType: 'api' | 'file' | 'manual' | 'webhook';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  contractStart?: Date;
  contractEnd?: Date;
  paymentTerms: number;
  currency: string;
  commissionRate?: number;
  isActive: boolean;
  isVerified: boolean;
  verificationDate?: Date;
  rating: number;
  reviewCount: number;
  apiCredentials?: ApiCredentials;
  webhookConfig?: WebhookConfig;
  syncConfig?: SyncConfig;
  complianceDocuments: ComplianceDocument[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface PartnerService {
  id: string;
  name: string;
  description: string;
  code: string;
  category: string;
  pricing: ServicePricing;
  availability: ServiceAvailability;
  requirements: ServiceRequirement[];
  isActive: boolean;
}

export interface ServicePricing {
  type: 'fixed' | 'per_item' | 'percentage' | 'tiered';
  basePrice?: number;
  unitPrice?: number;
  percentage?: number;
  tiers?: PricingTier[];
  currency: string;
}

export interface PricingTier {
  from: number;
  to?: number;
  price: number;
  unit: string;
}

export interface ServiceAvailability {
  days: string[];
  startTime: string;
  endTime: string;
  timezone: string;
  leadTime: number;
}

export interface ServiceRequirement {
  name: string;
  type: 'file' | 'data' | 'equipment' | 'personnel';
  description: string;
  isRequired: boolean;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'min_length' | 'max_length' | 'custom';
  value?: any;
  message: string;
}

export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
  endpoint: string;
  version: string;
  authType: 'api_key' | 'oauth2' | 'bearer' | 'basic';
  additionalHeaders?: Record<string, string>;
  rateLimit?: {
    requests: number;
    window: string;
  };
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
  retryPolicy: {
    maxAttempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
}

export interface SyncConfig {
  type: 'pull' | 'push' | 'bidirectional';
  frequency: string;
  dataFormat: 'json' | 'xml' | 'csv' | 'hl7';
  mapping: FieldMapping[];
  filters?: SyncFilter[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  defaultValue?: any;
}

export interface SyncFilter {
  field: string;
  operator: string;
  value: any;
}

export interface ComplianceDocument {
  id: string;
  name: string;
  type: string;
  fileUrl: string;
  uploadDate: Date;
  expiryDate?: Date;
  status: 'valid' | 'expired' | 'pending';
  verificationStatus: 'verified' | 'pending' | 'rejected';
}

export interface Integration {
  id: string;
  partnerId: string;
  partnerServiceId: string;
  integrationType: 'abdm' | 'lab' | 'pharmacy' | 'insurance' | 'payment' | 'other';
  status: 'active' | 'inactive' | 'error' | 'testing';
  config: IntegrationConfig;
  lastSyncAt?: Date;
  lastSyncStatus: 'success' | 'error' | 'in_progress';
  errorCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConfig {
  endpoint?: string;
  credentials?: Record<string, string>;
  settings: Record<string, any>;
  mapping?: FieldMapping[];
  webhook?: WebhookConfig;
}

export interface Order {
  id: string;
  orderNumber: string;
  partnerId: string;
  patientId: string;
  type: 'lab_test' | 'medicine' | 'equipment' | 'consultation' | 'other';
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  orderedAt: Date;
  requestedFor?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  totalAmount: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  deliveryInfo?: DeliveryInfo;
  trackingInfo?: TrackingInfo;
  notes?: string;
  internalNotes?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface OrderItem {
  id: string;
  serviceId: string;
  serviceName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: Record<string, any>;
  requirements?: Record<string, any>;
}

export interface DeliveryInfo {
  type: 'pickup' | 'delivery' | 'digital';
  address?: Address;
  contactPerson?: string;
  contactPhone?: string;
  instructions?: string;
  estimatedDelivery?: Date;
}

export interface TrackingInfo {
  carrier?: string;
  trackingNumber?: string;
  status?: string;
  lastUpdate?: Date;
  events?: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  location?: string;
  description?: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SyncLog {
  id: string;
  partnerId: string;
  integrationId: string;
  type: 'full' | 'incremental' | 'realtime';
  status: 'success' | 'error' | 'in_progress';
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsTotal: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface WebhookLog {
  id: string;
  partnerId: string;
  event: string;
  url: string;
  payload: Record<string, any>;
  response: any;
  status: 'success' | 'error';
  statusCode?: number;
  attempts: number;
  lastAttemptAt?: Date;
  createdAt: Date;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface PartnerFilters extends PaginationQuery, DateRangeQuery {
  type?: string;
  category?: string;
  status?: string;
  isActive?: boolean;
  isVerified?: boolean;
  search?: string;
}

export interface OrderFilters extends PaginationQuery, DateRangeQuery {
  partnerId?: string;
  patientId?: string;
  type?: string;
  status?: string;
  priority?: string;
  paymentStatus?: string;
  search?: string;
}

export interface IntegrationFilters extends PaginationQuery {
  partnerId?: string;
  integrationType?: string;
  status?: string;
  search?: string;
}