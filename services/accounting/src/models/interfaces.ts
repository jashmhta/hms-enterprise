export interface AccountingTransaction {
  id: string;
  transactionNumber: string;
  type: 'invoice' | 'payment' | 'refund' | 'adjustment' | 'write_off' | 'prepayment';
  patientId: string;
  invoiceId?: string;
  paymentId?: string;
  description: string;
  amount: number;
  currency: string;
  status: 'draft' | 'posted' | 'cancelled';
  date: Date;
  dueDate?: Date;
  accountId: string;
  category: string;
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  appointmentId?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  currency: string;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
  paymentTerms: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  amount: number;
  serviceCode?: string;
  chartOfAccountId: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  patientId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'insurance' | 'online' | 'mobile';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  reference?: string;
  transactionId?: string;
  gatewayResponse?: Record<string, any>;
  notes?: string;
  paymentDate: Date;
  processedDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subtype: string;
  description?: string;
  isActive: boolean;
  parentId?: string;
  normalBalance: 'debit' | 'credit';
  openingBalance: number;
  currentBalance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';
  bankName?: string;
  bankAccountNumber?: string;
  routingNumber?: string;
  currency: string;
  balance: number;
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  vendorId?: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  category: string;
  subcategory?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedDate?: string;
  paidDate?: Date;
  receiptUrl?: string;
  notes?: string;
  chartOfAccountId: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface Vendor {
  id: string;
  vendorNumber: string;
  name: string;
  type: 'supplier' | 'service_provider' | 'insurance' | 'other';
  email?: string;
  phone?: string;
  address?: Address;
  taxId?: string;
  paymentTerms: number;
  currency: string;
  isActive: boolean;
  creditLimit?: number;
  balance: number;
  notes?: string;
  contacts?: VendorContact[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorContact {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
}

export interface Revenue {
  id: string;
  period: string;
  category: string;
  amount: number;
  currency: string;
  patientCount: number;
  transactionCount: number;
  breakdown: RevenueBreakdown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueBreakdown {
  service: string;
  amount: number;
  count: number;
}

export interface FinancialReport {
  id: string;
  type: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'trial_balance' | 'aged_receivables' | 'aged_payables';
  period: string;
  startDate: Date;
  endDate: Date;
  data: Record<string, any>;
  status: 'generating' | 'completed' | 'failed';
  generatedAt?: Date;
  generatedBy?: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
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

export interface AccountingFilters extends PaginationQuery, DateRangeQuery {
  patientId?: string;
  status?: string;
  type?: string;
  category?: string;
  accountId?: string;
  search?: string;
}

export interface PaymentGatewayConfig {
  gateway: 'stripe' | 'paypal' | 'square' | 'razorpay' | 'other';
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  environment: 'sandbox' | 'production';
  isEnabled: boolean;
}