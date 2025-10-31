export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Billing Enums
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  NET_BANKING = 'NET_BANKING',
  CHEQUE = 'CHEQUE',
  INSURANCE = 'INSURANCE',
  CORPORATE = 'CORPORATE',
  WALLET = 'WALLET'
}

export enum InvoiceType {
  OPD = 'OPD',
  IPD = 'IPD',
  PHARMACY = 'PHARMACY',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  PROCEDURE = 'PROCEDURE',
  PACKAGE = 'PACKAGE',
  CONSULTATION = 'CONSULTATION'
}

export enum TaxType {
  CGST = 'CGST',
  SGST = 'SGST',
  IGST = 'IGST',
  UGST = 'UTGST'
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED'
}

// Billable Item
export interface BillableItem extends BaseModel {
  itemId: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  hsnCode?: string; // HSN/SAC code for GST
  sacCode?: string; // Services Accounting Code
  unitOfMeasurement: string;
  standardRate: number;
  cost: number;
  taxRate: {
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
  };
  isActive: boolean;
  departmentId: string;
  tags?: string[];
  minQuantity?: number;
  maxQuantity?: number;
  requiresPrescription?: boolean;
  requiresAuthorization?: boolean;
  contractRates?: {
    insuranceProviderId: string;
    rate: number;
  }[];
  seasonalRates?: {
    startDate: Date;
    endDate: Date;
    rate: number;
  }[];
}

// Price Master
export interface PriceMaster extends BaseModel {
  itemId: string;
  patientCategory: 'GENERAL' | 'SENIOR_CITIZEN' | 'BPL' | 'STAFF' | 'INSURANCE';
  priceType: 'BASE' | 'DISCOUNTED' | 'CONTRACTED';
  unitPrice: number;
  validFrom: Date;
  validTo?: Date;
  organizationId?: string;
  insuranceProviderId?: string;
  corporateClientId?: string;
}

// Invoice/Invoice Main
export interface Invoice extends BaseModel {
  invoiceNumber: string;
  patientId: string;
  patientInfo: {
    name: string;
    age: number;
    gender: string;
    phone: string;
    address?: string;
  };
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  invoiceDate: Date;
  dueDate: Date;
  visitId?: string;
  appointmentId?: string;
  admissionId?: string;
  doctorId?: string;
  departmentId: string;
  departmentName: string;
  
  // Billing address
  billingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email?: string;
  };
  
  // Insurance details
  insuranceInfo?: {
    providerId: string;
    providerName: string;
    policyNumber: string;
    memberId: string;
    preAuthNumber?: string;
    tpaId?: string;
    tpaName?: string;
    isCashless: boolean;
    approvedAmount?: number;
    coPaymentAmount?: number;
    deductibleAmount?: number;
  };
  
  // Corporate billing
  corporateInfo?: {
    companyId: string;
    companyName: string;
    employeeId: string;
    department: string;
    billingContact: string;
    creditLimit?: number;
  };
  
  // Line items
  items: InvoiceItem[];
  
  // Financial calculations
  subtotal: number;
  discount: {
    amount: number;
    type: DiscountType;
    reason?: string;
    approvedBy?: string;
  };
  tax: {
    cgst: { amount: number; rate: number };
    sgst: { amount: number; rate: number };
    igst: { amount: number; rate: number };
    cess: { amount: number; rate: number };
    total: number;
  };
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  
  // Additional charges
  additionalCharges?: {
    convenienceFee?: number;
    serviceCharge?: number;
    lateFee?: number;
    processingFee?: number;
  };
  
  // GST compliance
  gstin?: string;
  placeOfSupply: string;
  reverseCharge: boolean;
  taxType: 'B2B' | 'B2C' | 'EXPORT';
  
  // E-invoice (for B2B)
  eInvoice?: {
    irn?: string; // Invoice Reference Number
    signedInvoice?: string;
    signedQrCode?: string;
    ackNo?: string;
    ackDate?: Date;
    eWayBill?: {
      number: string;
      validUntil: Date;
      vehicleNumber?: string;
      distance?: number;
    };
  };
  
  // Notes and terms
  notes?: string;
  termsAndConditions?: string;
  
  // Metadata
  tags?: string[];
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

// Invoice Line Item
export interface InvoiceItem extends BaseModel {
  invoiceId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  description?: string;
  hsnSacCode?: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discount: {
    amount: number;
    type: DiscountType;
    percentage?: number;
    reason?: string;
  };
  taxableAmount: number;
  tax: {
    cgst: { amount: number; rate: number };
    sgst: { amount: number; rate: number };
    igst: { amount: number; rate: number };
    cess: { amount: number; rate: number };
    total: number;
  };
  totalAmount: number;
  rateApplicable: 'STANDARD' | 'CONTRACTED' | 'DISCOUNTED';
  batchNumber?: string;
  expiryDate?: Date;
  serialNumber?: string;
  doctorId?: string;
  performedAt?: Date;
  isBillable: boolean;
  isTaxable: boolean;
}

// Payment Transaction
export interface PaymentTransaction extends BaseModel {
  paymentId: string;
  invoiceId: string;
  patientId: string;
  transactionNumber: string;
  paymentMethod: PaymentMethod;
  paymentMode: string; // Specific mode like VISA, Mastercard, GPay, etc.
  amount: number;
  status: PaymentStatus;
  currency: string;
  transactionDate: Date;
  
  // Card details (stored encrypted)
  cardInfo?: {
    lastFourDigits: string;
    cardType: string;
    cardBrand: string;
    expiryMonth: string;
    expiryYear: string;
    cardHolderName?: string;
  };
  
  // Bank details
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    transactionRef?: string;
    chequeNumber?: string;
    chequeDate?: Date;
  };
  
  // UPI details
  upiInfo?: {
    vpa?: string;
    transactionId?: string;
    customerMobile?: string;
  };
  
  // Gateway integration
  gatewayInfo?: {
    gatewayName: string;
    gatewayTransactionId: string;
    gatewayResponse?: string;
    gatewayStatus?: string;
    failureReason?: string;
    authorizationCode?: string;
    settlementDate?: Date;
  };
  
  // Installment details
  installmentInfo?: {
    totalInstallments: number;
    currentInstallment: number;
    installmentAmount: number;
    nextDueDate?: Date;
  };
  
  // Refund details
  refundInfo?: {
    originalTransactionId: string;
    refundAmount: number;
    refundReason: string;
    refundDate: Date;
    refundTransactionId: string;
    processingFee?: number;
  };
  
  // Metadata
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  deviceInfo?: string;
}

// Credit/Debit Note
export interface CreditDebitNote extends BaseModel {
  noteNumber: string;
  type: 'CREDIT' | 'DEBIT';
  invoiceId: string;
  patientId: string;
  reason: string;
  amount: number;
  taxAdjustment: number;
  totalAdjustment: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  noteDate: Date;
  approvedBy?: string;
  approvedAt?: Date;
  processedAt?: Date;
  notes?: string;
  supportingDocuments?: string[];
}

// Receipt
export interface Receipt extends BaseModel {
  receiptNumber: string;
  invoiceId: string;
  patientId: string;
  paymentTransactions: string[]; // Array of payment transaction IDs
  totalAmount: number;
  receiptDate: Date;
  receivedBy: string;
  paymentMethods: PaymentMethod[];
  notes?: string;
  isCancelled: boolean;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

// Bill Package
export interface BillPackage extends BaseModel {
  packageCode: string;
  name: string;
  description?: string;
  category: string;
  packageType: 'HEALTH_CHECKUP' | 'TREATMENT' | 'WELLNESS' | 'DIAGNOSTIC';
  items: {
    itemId: string;
    quantity: number;
    included: boolean;
  }[];
  packagePrice: number;
  individualItemsPrice: number;
  discountPercentage: number;
  validFrom: Date;
  validTo?: Date;
  maxUsageLimit?: number;
  usageCount: number;
  isActive: boolean;
  applicableFor: string[]; // Patient categories
  termsAndConditions?: string;
  inclusions: string[];
  exclusions: string[];
}

// Tariff Plan
export interface TariffPlan extends BaseModel {
  planCode: string;
  name: string;
  description?: string;
  planType: 'ROOM' | 'ICU' | 'SURGERY' | 'PROCEDURE' | 'CONSULTATION' | 'DIAGNOSTIC';
  items: {
    itemId: string;
    rate: number;
    effectiveDate: Date;
  }[];
  applicableFor: {
    patientCategories: string[];
    insuranceProviders: string[];
    corporateClients: string[];
  };
  isActive: boolean;
  validFrom: Date;
  validTo?: Date;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

// Insurance Claim
export interface InsuranceClaim extends BaseModel {
  claimNumber: string;
  invoiceId: string;
  patientId: string;
  insuranceProviderId: string;
  policyNumber: string;
  memberId: string;
  preAuthNumber?: string;
  claimType: 'CASHLESS' | 'REIMBURSEMENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_APPROVED' | 'PROCESSED';
  submittedDate: Date;
  approvalDate?: Date;
  approvedAmount?: number;
  approvedItems?: string[]; // Array of item IDs
  rejectionReason?: string;
  documents: {
    documentType: string;
    documentPath: string;
    uploadedAt: Date;
  }[];
  tpaId?: string;
  networkHospital: boolean;
  claimSettlementDate?: Date;
  settlementAmount?: number;
  deductions: {
    type: string;
    amount: number;
    description: string;
  }[];
  notes?: string;
}

// Billing Configuration
export interface BillingConfiguration extends BaseModel {
  organizationId: string;
  hospitalName: string;
  hospitalAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    website?: string;
  };
  gstin: string;
  panNumber: string;
  cinNumber?: string;
  drugLicenseNumber?: string;
  taxConfiguration: {
    defaultGstRate: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    cessRate: number;
    reverseChargeApplicable: boolean;
    compositionScheme: boolean;
  };
  invoiceConfiguration: {
    prefix: string;
    startingNumber: number;
    numberLength: number;
    resetFrequency: 'DAILY' | 'MONTHLY' | 'YEARLY';
    includeBarcode: boolean;
    includeQrCode: boolean;
    defaultPaymentTerms: number; // days
    lateFeeConfiguration: {
      enabled: boolean;
      feeType: 'PERCENTAGE' | 'FIXED';
      feeAmount: number;
      applicableAfter: number; // days
    };
  };
  paymentConfiguration: {
    acceptedMethods: PaymentMethod[];
    gatewaySettings: {
      gatewayName: string;
      isEnabled: boolean;
      merchantId?: string;
      apiKey?: string;
      secretKey?: string;
      environment: 'TEST' | 'PRODUCTION';
    }[];
    refundPolicy: {
      allowed: boolean;
      timeLimit: number; // hours
      approvalRequired: boolean;
      refundCharges: {
        percentage: number;
        maxAmount: number;
      };
    };
  };
  notificationSettings: {
    paymentReminders: {
      enabled: boolean;
      frequency: number; // days
      sendBeforeDue: number; // days
    };
    receiptNotifications: {
      enabled: boolean;
      email: boolean;
      sms: boolean;
      whatsapp: boolean;
    };
    overdueNotifications: {
      enabled: boolean;
      frequency: number; // days
      escalationLevels: {
        level: number;
        recipient: string;
        delay: number; // days
      }[];
    };
  };
}

// Billing Analytics
export interface BillingAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalRevenue: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  revenueByDepartment: {
    departmentId: string;
    departmentName: string;
    revenue: number;
    invoiceCount: number;
  }[];
  revenueByService: {
    serviceType: string;
    revenue: number;
    count: number;
    averageValue: number;
  }[];
  paymentMethodBreakdown: {
    method: PaymentMethod;
    amount: number;
    percentage: number;
    count: number;
  }[];
  agingAnalysis: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days91plus: number;
  };
  topServices: {
    serviceName: string;
    revenue: number;
    count: number;
  }[];
  insuranceMetrics: {
    totalClaims: number;
    approvedAmount: number;
    rejectedAmount: number;
    averageProcessingTime: number;
  };
}

// Request/Response Types
export interface CreateInvoiceRequest {
  patientId: string;
  invoiceType: InvoiceType;
  visitId?: string;
  appointmentId?: string;
  items: {
    itemId: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
    discountType?: DiscountType;
  }[];
  insuranceInfo?: Invoice['insuranceInfo'];
  corporateInfo?: Invoice['corporateInfo'];
  notes?: string;
  dueDate?: Date;
}

export interface UpdateInvoiceRequest {
  status?: InvoiceStatus;
  items?: InvoiceItem[];
  discount?: Invoice['discount'];
  notes?: string;
  dueDate?: Date;
  tags?: string[];
}

export interface CreatePaymentRequest {
  invoiceId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paymentMode: string;
  cardInfo?: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cardHolderName: string;
    cvv: string;
  };
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    chequeNumber?: string;
    chequeDate?: Date;
  };
  upiInfo?: {
    vpa?: string;
    customerMobile?: string;
  };
  gatewayInfo?: {
    gatewayName: string;
    gatewayTransactionId?: string;
  };
  notes?: string;
}

export interface InvoiceResponse {
  success: boolean;
  invoice?: Invoice;
  message?: string;
  errors?: string[];
}

export interface PaymentResponse {
  success: boolean;
  transaction?: PaymentTransaction;
  paymentUrl?: string; // For redirect-based payments
  qrCode?: string; // For UPI payments
  message?: string;
  errors?: string[];
}

export interface BillingReports {
  invoiceRegister: Invoice[];
  paymentRegister: PaymentTransaction[];
  outstandingReport: {
    invoiceId: string;
    invoiceNumber: string;
    patientName: string;
    dueDate: Date;
    outstandingAmount: number;
    daysOverdue: number;
  }[];
  taxReport: {
    period: { startDate: Date; endDate: Date };
    totalTax: {
      cgst: number;
      sgst: number;
      igst: number;
      cess: number;
    };
    taxDetails: {
      invoiceNumber: string;
      invoiceDate: Date;
      taxableAmount: number;
      cgst: number;
      sgst: number;
      igst: number;
      cess: number;
    }[];
  };
}