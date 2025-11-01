import { AccountingTransaction } from '../models/transaction.model';
import { Invoice } from '../models/invoice.model';
import { ChartOfAccount, Account, Expense, Vendor, Revenue, FinancialReport, AccountingFilters, Payment } from '../models/interfaces';
import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool(config.database);

export class AccountingRepository {
  static async createTransaction(transactionData: any): Promise<any> {
    return await AccountingTransaction.create(transactionData);
  }

  static async getTransactionById(id: string): Promise<any> {
    return await AccountingTransaction.findById(id);
  }

  static async getTransactions(filters: AccountingFilters): Promise<any> {
    return await AccountingTransaction.findAll(filters);
  }

  static async updateTransaction(id: string, updates: any): Promise<any> {
    return await AccountingTransaction.update(id, updates);
  }

  static async deleteTransaction(id: string): Promise<boolean> {
    return await AccountingTransaction.delete(id);
  }

  static async getPatientBalance(patientId: string): Promise<number> {
    return await AccountingTransaction.getPatientBalance(patientId);
  }

  static async createInvoice(invoiceData: any): Promise<any> {
    return await Invoice.create(invoiceData);
  }

  static async getInvoiceById(id: string): Promise<any> {
    return await Invoice.findById(id);
  }

  static async getInvoices(filters: AccountingFilters): Promise<any> {
    return await Invoice.findAll(filters);
  }

  static async updateInvoice(id: string, updates: any): Promise<any> {
    return await Invoice.update(id, updates);
  }

  static async updateInvoiceStatus(id: string, status: string, updatedBy?: string): Promise<any> {
    return await Invoice.updateStatus(id, status, updatedBy);
  }

  static async addPaymentToInvoice(invoiceId: string, payment: Payment): Promise<any> {
    return await Invoice.addPayment(invoiceId, payment);
  }

  static async deleteInvoice(id: string): Promise<boolean> {
    return await Invoice.delete(id);
  }

  static async getOverdueInvoices(): Promise<any[]> {
    return await Invoice.getOverdueInvoices();
  }

  static async getReceivablesReport(filters: any): Promise<any> {
    return await Invoice.getReceivablesReport(filters);
  }

  static async getAgingReport(): Promise<any[]> {
    return await AccountingTransaction.getAgingReport();
  }

  static async createChartOfAccount(accountData: ChartOfAccount): Promise<any> {
    const query = `
      INSERT INTO chart_of_accounts (
        id, code, name, type, subtype, description, is_active, parent_id,
        normal_balance, opening_balance, current_balance, currency,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;

    const values = [
      accountData.id,
      accountData.code,
      accountData.name,
      accountData.type,
      accountData.subtype,
      accountData.description,
      accountData.isActive,
      accountData.parentId,
      accountData.normalBalance,
      accountData.openingBalance,
      accountData.currentBalance,
      accountData.currency,
      new Date(),
      new Date()
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getChartOfAccounts(filters: any = {}): Promise<any[]> {
    let query = 'SELECT * FROM chart_of_accounts WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.type) {
      query += ` AND type = $${paramIndex++}`;
      values.push(filters.type);
    }

    if (filters.subtype) {
      query += ` AND subtype = $${paramIndex++}`;
      values.push(filters.subtype);
    }

    if (filters.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      values.push(filters.isActive);
    }

    if (filters.parentId) {
      query += ` AND parent_id = $${paramIndex++}`;
      values.push(filters.parentId);
    }

    query += ' ORDER BY code';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async createPayment(paymentData: Payment): Promise<any> {
    const query = `
      INSERT INTO payments (
        id, payment_number, patient_id, invoice_id, amount, currency, method,
        status, reference, transaction_id, gateway_response, notes,
        payment_date, processed_date, metadata, created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `;

    const values = [
      paymentData.id,
      paymentData.paymentNumber,
      paymentData.patientId,
      paymentData.invoiceId,
      paymentData.amount,
      paymentData.currency,
      paymentData.method,
      paymentData.status,
      paymentData.reference,
      paymentData.transactionId,
      JSON.stringify(paymentData.gatewayResponse || {}),
      paymentData.notes,
      paymentData.paymentDate,
      paymentData.processedDate,
      JSON.stringify(paymentData.metadata || {}),
      new Date(),
      new Date(),
      paymentData.createdBy
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getPayments(filters: AccountingFilters): Promise<any> {
    let query = 'SELECT * FROM payments WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.patientId) {
      query += ` AND patient_id = $${paramIndex++}`;
      values.push(filters.patientId);
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters.method) {
      query += ` AND method = $${paramIndex++}`;
      values.push(filters.method);
    }

    if (filters.startDate) {
      query += ` AND payment_date >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND payment_date <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    query += ' ORDER BY payment_date DESC';

    if (filters.page && filters.limit) {
      const offset = ((filters.page - 1) * filters.limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(filters.limit, offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async createExpense(expenseData: Expense): Promise<any> {
    const query = `
      INSERT INTO expenses (
        id, expense_number, vendor_id, description, amount, currency, date,
        category, subcategory, status, approved_by, approved_date,
        paid_date, receipt_url, notes, chart_of_account_id, tags, metadata,
        created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const values = [
      expenseData.id,
      expenseData.expenseNumber,
      expenseData.vendorId,
      expenseData.description,
      expenseData.amount,
      expenseData.currency,
      expenseData.date,
      expenseData.category,
      expenseData.subcategory,
      expenseData.status,
      expenseData.approvedBy,
      expenseData.approvedDate,
      expenseData.paidDate,
      expenseData.receiptUrl,
      expenseData.notes,
      expenseData.chartOfAccountId,
      JSON.stringify(expenseData.tags || []),
      JSON.stringify(expenseData.metadata || {}),
      new Date(),
      new Date(),
      expenseData.createdBy
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getExpenses(filters: AccountingFilters): Promise<any> {
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.category) {
      query += ` AND category = $${paramIndex++}`;
      values.push(filters.category);
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters.startDate) {
      query += ` AND date >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND date <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    if (filters.search) {
      query += ` AND (description ILIKE $${paramIndex++} OR expense_number ILIKE $${paramIndex++})`;
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY date DESC';

    if (filters.page && filters.limit) {
      const offset = ((filters.page - 1) * filters.limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(filters.limit, offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getFinancialSummary(filters: any): Promise<any> {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'asset' THEN amount ELSE 0 END), 0) as total_assets,
        COALESCE(SUM(CASE WHEN type = 'liability' THEN amount ELSE 0 END), 0) as total_liabilities,
        COALESCE(SUM(CASE WHEN type = 'equity' THEN amount ELSE 0 END), 0) as total_equity
      FROM chart_of_accounts
      WHERE is_active = true
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}