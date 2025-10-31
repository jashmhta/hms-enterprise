export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Accounting Enums
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export enum AccountCategory {
  CURRENT_ASSET = 'CURRENT_ASSET',
  FIXED_ASSET = 'FIXED_ASSET',
  INTANGIBLE_ASSET = 'INTANGIBLE_ASSET',
  CURRENT_LIABILITY = 'CURRENT_LIABILITY',
  LONG_TERM_LIABILITY = 'LONG_TERM_LIABILITY',
  OWNERS_EQUITY = 'OWNERS_EQUITY',
  OPERATING_REVENUE = 'OPERATING_REVENUE',
  NON_OPERATING_REVENUE = 'NON_OPERATING_REVENUE',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  NON_OPERATING_EXPENSE = 'NON_OPERATING_EXPENSE'
}

export enum TransactionType {
  JOURNAL_ENTRY = 'JOURNAL_ENTRY',
  INVOICE_PAYMENT = 'INVOICE_PAYMENT',
  EXPENSE_PAYMENT = 'EXPENSE_PAYMENT',
  SALARY_PAYMENT = 'SALARY_PAYMENT',
  PURCHASE_PAYMENT = 'PURCHASE_PAYMENT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  CLOSING_ENTRY = 'CLOSING_ENTRY'
}

export enum TransactionStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
  CANCELLED = 'CANCELLED'
}

export enum DebitCredit {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export enum ReportType {
  TRIAL_BALANCE = 'TRIAL_BALANCE',
  INCOME_STATEMENT = 'INCOME_STATEMENT',
  BALANCE_SHEET = 'BALANCE_SHEET',
  CASH_FLOW = 'CASH_FLOW',
  EQUITY_STATEMENT = 'EQUITY_STATEMENT',
  GENERAL_LEDGER = 'GENERAL_LEDGER',
  SUBSIDIARY_LEDGER = 'SUBSIDIARY_LEDGER',
  AGING_REPORT = 'AGING_REPORT',
  BUDGET_VARIANCE = 'BUDGET_VARIANCE'
}

export enum PeriodType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM'
}

// Chart of Accounts
export interface ChartOfAccounts extends BaseModel {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentId?: string;
  description?: string;
  isActive: boolean;
  level: number; // Hierarchy level
  isCashAccount: boolean;
  isContraAccount: boolean;
  isControlAccount: boolean;
  taxApplicable: boolean;
  gstRate?: number;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  departmentId?: string;
  locationId?: string;
  customFields?: Record<string, any>;
}

// Account Category
export interface AccountCategory extends BaseModel {
  categoryCode: string;
  categoryName: string;
  parentCategory?: string;
  accountType: AccountType;
  description?: string;
  normalBalance: DebitCredit;
  isActive: boolean;
  level: number;
  colorCode?: string;
  icon?: string;
}

// Journal Entry
export interface JournalEntry extends BaseModel {
  entryNumber: string;
  entryDate: Date;
  transactionType: TransactionType;
  transactionStatus: TransactionStatus;
  referenceNumber?: string;
  referenceType?: string;
  description: string;
  currency: string;
  exchangeRate: number;
  totalDebit: number;
  totalCredit: number;
  postedDate?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  reversedBy?: string;
  reversedAt?: Date;
  reversalReason?: string;
  attachments?: string[];
  tags?: string[];
  departmentId?: string;
  locationId?: string;
  isRecurring: boolean;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  recurringEndDate?: Date;
  nextRecurringDate?: Date;
}

// Journal Entry Line
export interface JournalEntryLine extends BaseModel {
  entryId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  exchangeRate: number;
  referenceId?: string;
  referenceType?: string;
  departmentId?: string;
  locationId?: string;
  projectId?: string;
  costCenterId?: string;
  tags?: string[];
}

// Ledger Account
export interface LedgerAccount extends BaseModel {
  accountId: string;
  accountCode: string;
  accountName: string;
  openingBalance: number;
  currentBalance: number;
  totalDebits: number;
  totalCredits: number;
  periodStartDate: Date;
  periodEndDate: Date;
  currency: string;
  departmentId?: string;
  locationId?: string;
}

// Ledger Transaction
export interface LedgerTransaction extends BaseModel {
  transactionId: string;
  entryId: string;
  accountId: string;
  transactionDate: Date;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  balanceType: DebitCredit;
  referenceId?: string;
  referenceType?: string;
  currency: string;
  exchangeRate: number;
  departmentId?: string;
  locationId?: string;
  createdBy?: string;
  approvedBy?: string;
  postedBy?: string;
}

// Budget
export interface Budget extends BaseModel {
  budgetCode: string;
  budgetName: string;
  description?: string;
  budgetType: 'OPERATING' | 'CAPITAL' | 'CASH_FLOW';
  fiscalYear: string;
  startDate: Date;
  endDate: Date;
  currency: string;
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'CLOSED';
  totalBudgetedAmount: number;
  totalActualAmount: number;
  variance: number;
  variancePercentage: number;
  approvedBy?: string;
  approvedAt?: Date;
  departmentId?: string;
  locationId?: string;
  tags?: string[];
}

// Budget Line
export interface BudgetLine extends BaseModel {
  budgetId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  periodType: PeriodType;
  budgetPeriods: {
    period: string;
    budgetedAmount: number;
    actualAmount: number;
    variance: number;
    variancePercentage: number;
  }[];
  departmentId?: string;
  locationId?: string;
}

// Financial Transaction
export interface FinancialTransaction extends BaseModel {
  transactionId: string;
  transactionNumber: string;
  transactionDate: Date;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  description: string;
  category: string;
  subcategory?: string;
  vendorId?: string;
  customerId?: string;
  employeeId?: string;
  referenceNumber?: string;
  referenceType?: string;
  attachments?: string[];
  tags?: string[];
  departmentId?: string;
  locationId?: string;
  projectId?: string;
  costCenterId?: string;
  taxAmount?: number;
  taxIncluded: boolean;
  splitTransactions?: {
    accountId: string;
    amount: number;
    percentage: number;
    description?: string;
  }[];
}

// Asset Management
export interface Asset extends BaseModel {
  assetCode: string;
  assetName: string;
  description?: string;
  assetType: 'FIXED' | 'INTANGIBLE' | 'CURRENT';
  category: string;
  subcategory?: string;
  purchaseDate: Date;
  purchaseCost: number;
  currency: string;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_PRODUCTION';
  usefulLifeYears: number;
  salvageValue: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  depreciationStartDate: Date;
  nextDepreciationDate: Date;
  status: 'ACTIVE' | 'DISPOSED' | 'SOLD' | 'WRITTEN_OFF';
  location?: string;
  departmentId?: string;
  assignedTo?: string;
  serialNumber?: string;
  barcode?: string;
  warrantyExpiry?: Date;
  maintenanceSchedule?: string[];
  attachments?: string[];
  disposalDate?: Date;
  disposalValue?: number;
  disposalReason?: string;
}

// Depreciation Entry
export interface DepreciationEntry extends BaseModel {
  assetId: string;
  depreciationDate: Date;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  bookValueAfterDepreciation: number;
  method: string;
  fiscalYear: string;
  fiscalPeriod: string;
  entryId?: string; // Related journal entry
  notes?: string;
}

// Expense
export interface Expense extends BaseModel {
  expenseCode: string;
  expenseDate: Date;
  amount: number;
  currency: string;
  description: string;
  category: string;
  subcategory?: string;
  vendorId?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIALLY_PAID' | 'OVERDUE';
  paidAmount: number;
  balanceAmount: number;
  employeeId?: string;
  projectId?: string;
  departmentId?: string;
  costCenterId?: string;
  locationId?: string;
  reimbursable: boolean;
  reimbursedBy?: string;
  reimbursedDate?: Date;
  reimbursedAmount?: number;
  attachments?: string[];
  tags?: string[];
  approvals?: {
    approverId: string;
    approverName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approvedAt?: Date;
    comments?: string;
  }[];
}

// Revenue Recognition
export interface RevenueRecognition extends BaseModel {
  revenueId: string;
  invoiceId?: string;
  contractId?: string;
  customerId?: string;
  revenueDate: Date;
  amount: number;
  currency: string;
  description: string;
  revenueCategory: string;
  recognitionCriteria: string;
  recognitionPeriod: {
    startDate: Date;
    endDate: Date;
    totalMonths: number;
  };
  recognizedAmount: number;
  pendingAmount: number;
  status: 'PENDING' | 'RECOGNIZED' | 'PARTIALLY_RECOGNIZED' | 'DEFERRED';
  projectId?: string;
  departmentId?: string;
  tags?: string[];
}

// Financial Period
export interface FinancialPeriod extends BaseModel {
  periodCode: string;
  periodName: string;
  fiscalYear: string;
  startDate: Date;
  endDate: Date;
  periodType: PeriodType;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  isActive: boolean;
  closingDate?: Date;
  lockedBy?: string;
  notes?: string;
}

// Tax Configuration
export interface TaxConfiguration extends BaseModel {
  taxCode: string;
  taxName: string;
  description?: string;
  taxType: 'GST' | 'VAT' | 'SERVICE_TAX' | 'INCOME_TAX' | 'OTHER';
  taxRate: number;
  applicableOn: 'SALES' | 'PURCHASES' | 'BOTH';
  isActive: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
  inputTaxCredit: boolean;
  reverseChargeApplicable: boolean;
  glAccountId?: string;
  reportingRequirements?: {
    frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    dueDate: number; // day of month
    forms: string[];
  };
}

// Financial Reports
export interface FinancialReport extends BaseModel {
  reportId: string;
  reportName: string;
  reportType: ReportType;
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  fiscalYear: string;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  generatedAt?: Date;
  generatedBy?: string;
  filePath?: string;
  fileSize?: number;
  format: 'PDF' | 'EXCEL' | 'CSV';
  parameters: Record<string, any>;
  filters?: {
    accountTypes?: AccountType[];
    accountCategories?: AccountCategory[];
    departments?: string[];
    locations?: string[];
  };
  schedule?: {
    enabled: boolean;
    frequency: PeriodType;
    recipients: string[];
    nextRunDate?: Date;
  };
}

// Trial Balance
export interface TrialBalance {
  reportId: string;
  period: {
    startDate: Date;
    endDate: Date;
    fiscalYear: string;
  };
  accounts: {
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    openingBalance: number;
    debitAmount: number;
    creditAmount: number;
    closingBalance: number;
    balanceType: DebitCredit;
  }[];
  summary: {
    totalDebits: number;
    totalCredits: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalRevenue: number;
    totalExpenses: number;
  };
  generatedAt: Date;
  isBalanced: boolean;
}

// Income Statement
export interface IncomeStatement {
  reportId: string;
  period: {
    startDate: Date;
    endDate: Date;
    fiscalYear: string;
  };
  revenue: {
    operatingRevenue: number;
    nonOperatingRevenue: number;
    totalRevenue: number;
    items: {
      accountCode: string;
      accountName: string;
      amount: number;
      percentage: number;
    }[];
  };
  expenses: {
    operatingExpenses: number;
    nonOperatingExpenses: number;
    totalExpenses: number;
    items: {
      accountCode: string;
      accountName: string;
      amount: number;
      percentage: number;
    }[];
  };
  profit: {
    grossProfit: number;
    operatingProfit: number;
    netProfit: number;
    profitMargin: number;
    operatingMargin: number;
    grossMargin: number;
  };
  generatedAt: Date;
}

// Balance Sheet
export interface BalanceSheet {
  reportId: string;
  reportDate: Date;
  fiscalYear: string;
  assets: {
    currentAssets: {
      cash: number;
      accountsReceivable: number;
      inventory: number;
      prepaidExpenses: number;
      other: number;
      total: number;
    };
    fixedAssets: {
      propertyPlantEquipment: number;
      accumulatedDepreciation: number;
      netFixedAssets: number;
      investments: number;
      intangibleAssets: number;
      total: number;
    };
    totalAssets: number;
    details: {
      accountCode: string;
      accountName: string;
      amount: number;
    }[];
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;
      shortTermDebt: number;
      accruedExpenses: number;
      other: number;
      total: number;
    };
    longTermLiabilities: {
      longTermDebt: number;
      deferredTaxLiabilities: number;
      other: number;
      total: number;
    };
    totalLiabilities: number;
    details: {
      accountCode: string;
      accountName: string;
      amount: number;
    }[];
  };
  equity: {
    shareCapital: number;
    retainedEarnings: number;
    additionalPaidInCapital: number;
    treasuryStock: number;
    totalEquity: number;
    details: {
      accountCode: string;
      accountName: string;
      amount: number;
    }[];
  };
  generatedAt: Date;
  isBalanced: boolean;
}

// Cash Flow Statement
export interface CashFlowStatement {
  reportId: string;
  period: {
    startDate: Date;
    endDate: Date;
    fiscalYear: string;
  };
  operatingActivities: {
    netIncome: number;
    depreciation: number;
    changesInWorkingCapital: {
      accountsReceivable: number;
      inventory: number;
      accountsPayable: number;
      other: number;
    };
    netCashFromOperating: number;
  };
  investingActivities: {
    capitalExpenditures: number;
    assetSales: number;
    investments: number;
    netCashFromInvesting: number;
  };
  financingActivities: {
    debtIssuance: number;
    debtRepayment: number;
    equityIssuance: number;
    dividendsPaid: number;
    netCashFromFinancing: number;
  };
  summary: {
    netCashFlow: number;
    beginningCash: number;
    endingCash: number;
    cashChange: number;
  };
  generatedAt: Date;
}

// Request/Response Types
export interface CreateJournalEntryRequest {
  entryDate: Date;
  transactionType: TransactionType;
  description: string;
  currency: string;
  exchangeRate?: number;
  referenceNumber?: string;
  referenceType?: string;
  lines: {
    accountId: string;
    description?: string;
    debitAmount?: number;
    creditAmount?: number;
    departmentId?: string;
    locationId?: string;
    projectId?: string;
    costCenterId?: string;
  }[];
  departmentId?: string;
  locationId?: string;
  tags?: string[];
}

export interface CreateBudgetRequest {
  budgetName: string;
  description?: string;
  budgetType: 'OPERATING' | 'CAPITAL' | 'CASH_FLOW';
  fiscalYear: string;
  startDate: Date;
  endDate: Date;
  currency: string;
  lines: {
    accountId: string;
    budgetedAmount: number;
    periodType: PeriodType;
  }[];
  departmentId?: string;
  locationId?: string;
}

export interface CreateAssetRequest {
  assetName: string;
  description?: string;
  assetType: 'FIXED' | 'INTANGIBLE' | 'CURRENT';
  category: string;
  subcategory?: string;
  purchaseDate: Date;
  purchaseCost: number;
  currency: string;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_PRODUCTION';
  usefulLifeYears: number;
  salvageValue?: number;
  location?: string;
  departmentId?: string;
  assignedTo?: string;
  serialNumber?: string;
  barcode?: string;
  warrantyExpiry?: Date;
}

export interface CreateExpenseRequest {
  expenseDate: Date;
  amount: number;
  currency: string;
  description: string;
  category: string;
  subcategory?: string;
  vendorId?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  employeeId?: string;
  projectId?: string;
  departmentId?: string;
  costCenterId?: string;
  locationId?: string;
  reimbursable?: boolean;
  attachments?: string[];
  tags?: string[];
}

export interface GenerateReportRequest {
  reportType: ReportType;
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  fiscalYear?: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
  parameters?: Record<string, any>;
  filters?: {
    accountTypes?: AccountType[];
    accountCategories?: AccountCategory[];
    departments?: string[];
    locations?: string[];
  };
}

export interface AccountingResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface JournalEntryResponse {
  success: boolean;
  entry?: JournalEntry;
  message?: string;
  errors?: string[];
}

export interface ReportResponse {
  success: boolean;
  reportId?: string;
  filePath?: string;
  downloadUrl?: string;
  message?: string;
  errors?: string[];
}

export interface AnalyticsDashboard {
  period: {
    startDate: Date;
    endDate: Date;
    fiscalYear: string;
  };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    totalAssets: number;
    totalLiabilities: number;
    cashBalance: number;
    accountsReceivable: number;
    accountsPayable: number;
  };
  trends: {
    revenue: {
      current: number;
      previous: number;
      percentage: number;
    };
    expenses: {
      current: number;
      previous: number;
      percentage: number;
    };
    cashFlow: {
      current: number;
      previous: number;
      percentage: number;
    };
  };
  topExpenseCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  budgetVariance: {
    budgeted: number;
    actual: number;
    variance: number;
    variancePercentage: number;
  };
  agedReceivables: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
  profitMargins: {
    gross: number;
    operating: number;
    net: number;
  };
}