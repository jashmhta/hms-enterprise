export interface Notification {
  id: string;
  recipientId: string;
  recipientType: 'patient' | 'doctor' | 'staff' | 'admin' | 'system';
  type: 'appointment' | 'billing' | 'test_result' | 'prescription' | 'reminder' | 'alert' | 'marketing' | 'system';
  category: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: NotificationAttachment[];
  readReceipt?: ReadReceipt[];
  response?: NotificationResponse;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'whatsapp' | 'in_app';
  enabled: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  address?: string;
  deviceId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface NotificationAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  contentType: string;
}

export interface ReadReceipt {
  channel: string;
  readAt: Date;
  device?: string;
  ip?: string;
}

export interface NotificationResponse {
  action?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'whatsapp';
  category: string;
  language: string;
  subject?: string;
  content: string;
  variables: TemplateVariable[];
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  userType: 'patient' | 'doctor' | 'staff' | 'admin';
  category: string;
  enabled: boolean;
  channels: PreferenceChannel[];
  schedule?: PreferenceSchedule;
  quietHours?: QuietHours;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreferenceChannel {
  type: 'email' | 'sms' | 'push' | 'whatsapp' | 'in_app';
  enabled: boolean;
  conditions?: ChannelCondition[];
}

export interface ChannelCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface PreferenceSchedule {
  timezone: string;
  days: string[];
  startTime: string;
  endTime: string;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
  allowUrgent: boolean;
}

export interface NotificationQueue {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'whatsapp';
  priority: number;
  concurrency: number;
  isActive: boolean;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryReport {
  id: string;
  notificationId: string;
  channel: string;
  provider: string;
  externalId?: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  timestamp: Date;
  metadata?: Record<string, any>;
  error?: string;
}

export interface NotificationStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  byChannel: {
    email: number;
    sms: number;
    push: number;
    whatsapp: number;
    in_app: number;
  };
  byType: {
    appointment: number;
    billing: number;
    test_result: number;
    prescription: number;
    reminder: number;
    alert: number;
    marketing: number;
    system: number;
  };
  byStatus: {
    pending: number;
    processing: number;
    sent: number;
    delivered: number;
    failed: number;
    cancelled: number;
  };
  deliveryRate: number;
  openRate: number;
  clickRate: number;
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

export interface NotificationFilters extends PaginationQuery, DateRangeQuery {
  recipientId?: string;
  recipientType?: string;
  type?: string;
  category?: string;
  status?: string;
  priority?: string;
  channel?: string;
  search?: string;
}

export interface TemplateFilters extends PaginationQuery {
  type?: string;
  category?: string;
  language?: string;
  search?: string;
  isActive?: boolean;
}

export interface PreferenceFilters extends PaginationQuery {
  userId?: string;
  userType?: string;
  category?: string;
  search?: string;
}