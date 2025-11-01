import { AccountingRepository } from '../repositories/accounting.repository';
import { AccountingTransaction, Invoice } from '../models';
import { 
  AccountingFilters, 
  AccountingTransaction as IAccountingTransaction,
  Invoice as IInvoice,
  Payment,
  Expense,
  ChartOfAccount 
} from '../models/interfaces';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { config } from '../config';

export class AccountingService {
  static async createTransaction(transactionData: Partial<IAccountingTransaction>, userId: string): Promise<any> {
    const transaction = {
      id: uuidv4(),
      transactionNumber: this.generateTransactionNumber(transactionData.type!),
      ...transactionData,
      status: transactionData.status || 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    return await AccountingRepository.createTransaction(transaction);
  }

  static async getTransactionById(id: string): Promise<any> {
    return await AccountingRepository.getTransactionById(id);
  }

  static async getTransactions(filters: AccountingFilters): Promise<any> {
    return await AccountingRepository.getTransactions(filters);
  }

  static async updateTransaction(id: string, updates: Partial<IAccountingTransaction>, userId: string): Promise<any> {
    const updatedData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: userId
    };

    return await AccountingRepository.updateTransaction(id, updatedData);
  }

  static async deleteTransaction(id: string): Promise<boolean> {
    return await AccountingRepository.deleteTransaction(id);
  }

  static async postTransaction(id: string, userId: string): Promise<any> {
    const transaction = await this.getTransactionById(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'draft') {
      throw new Error('Only draft transactions can be posted');
    }

    return await this.updateTransaction(id, { status: 'posted' }, userId);
  }

  static async createInvoice(invoiceData: Partial<IInvoice>, userId: string): Promise<any> {
    const invoice = {
      id: uuidv4(),
      invoiceNumber: this.generateInvoiceNumber(),
      ...invoiceData,
      status: 'draft',
      amountPaid: 0,
      balance: invoiceData.totalAmount || 0,
      issueDate: new Date(),
      dueDate: moment().add(config.accounting.paymentTerms, 'days').toDate(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const result = await AccountingRepository.createInvoice(invoice);

    await this.createTransaction({
      type: 'invoice',
      patientId: invoice.patientId,
      invoiceId: invoice.id,
      description: `Invoice ${invoice.invoiceNumber}`,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      date: invoice.issueDate,
      dueDate: invoice.dueDate,
      accountId: 'accounts-receivable',
      category: 'patient-billing',
      status: 'posted',
      reference: invoice.invoiceNumber
    }, userId);

    return result;
  }

  static async getInvoiceById(id: string): Promise<any> {
    return await AccountingRepository.getInvoiceById(id);
  }

  static async getInvoices(filters: AccountingFilters): Promise<any> {
    return await AccountingRepository.getInvoices(filters);
  }

  static async updateInvoice(id: string, updates: Partial<IInvoice>, userId: string): Promise<any> {
    const updatedData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: userId
    };

    return await AccountingRepository.updateInvoice(id, updatedData);
  }

  static async updateInvoiceStatus(id: string, status: string, userId: string): Promise<any> {
    const invoice = await this.getInvoiceById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (status === 'sent' && invoice.status === 'draft') {
      await this.updateTransaction(
        (invoice as any).transaction_id,
        { status: 'posted' },
        userId
      );
    }

    return await AccountingRepository.updateInvoiceStatus(id, status, userId);
  }

  static async addPayment(paymentData: Partial<Payment>, userId: string): Promise<any> {
    const payment = {
      id: uuidv4(),
      paymentNumber: this.generatePaymentNumber(),
      ...paymentData,
      status: 'completed',
      paymentDate: new Date(),
      processedDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const savedPayment = await AccountingRepository.createPayment(payment);

    if (payment.invoiceId) {
      await AccountingRepository.addPaymentToInvoice(payment.invoiceId, payment);

      await this.createTransaction({
        type: 'payment',
        patientId: payment.patientId,
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        description: `Payment ${payment.paymentNumber}`,
        amount: payment.amount,
        currency: payment.currency,
        date: payment.paymentDate,
        accountId: 'cash',
        category: 'patient-payments',
        status: 'posted',
        reference: payment.paymentNumber
      }, userId);
    }

    return savedPayment;
  }

  static async createExpense(expenseData: Partial<Expense>, userId: string): Promise<any> {
    const expense = {
      id: uuidv4(),
      expenseNumber: this.generateExpenseNumber(),
      ...expenseData,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const result = await AccountingRepository.createExpense(expense);

    await this.createTransaction({
      type: 'expense',
      description: `Expense ${expense.expenseNumber}`,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      accountId: expense.chartOfAccountId,
      category: expense.category,
      status: 'posted',
      reference: expense.expenseNumber
    }, userId);

    return result;
  }

  static async getExpenses(filters: AccountingFilters): Promise<any> {
    return await AccountingRepository.getExpenses(filters);
  }

  static async approveExpense(id: string, userId: string): Promise<any> {
    const expense = await AccountingRepository.getExpenses({ search: id });
    if (!expense || expense.length === 0) {
      throw new Error('Expense not found');
    }

    const expenseData = expense[0];
    if (expenseData.status !== 'submitted') {
      throw new Error('Only submitted expenses can be approved');
    }

    return await AccountingRepository.updateExpense(id, {
      status: 'approved',
      approvedBy: userId,
      approvedDate: new Date()
    });
  }

  static async getPatientBalance(patientId: string): Promise<number> {
    return await AccountingRepository.getPatientBalance(patientId);
  }

  static async getFinancialSummary(startDate?: string, endDate?: string): Promise<any> {
    return await AccountingRepository.getFinancialSummary({
      startDate: startDate || moment().startOf('month').format('YYYY-MM-DD'),
      endDate: endDate || moment().endOf('month').format('YYYY-MM-DD')
    });
  }

  static async getReceivablesReport(startDate: string, endDate: string): Promise<any> {
    return await AccountingRepository.getReceivablesReport({ startDate, endDate });
  }

  static async getAgingReport(): Promise<any[]> {
    return await AccountingRepository.getAgingReport();
  }

  static async getOverdueInvoices(): Promise<any[]> {
    return await AccountingRepository.getOverdueInvoices();
  }

  static async generateInvoicePDF(invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Invoice', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Invoice Number: ${invoice.invoice_number}`);
      doc.text(`Date: ${moment(invoice.issue_date).format('YYYY-MM-DD')}`);
      doc.text(`Due Date: ${moment(invoice.due_date).format('YYYY-MM-DD')}`);
      doc.text(`Status: ${invoice.status}`);
      doc.moveDown();

      doc.fontSize(14).text('Bill To:');
      doc.fontSize(12).text(`Patient ID: ${invoice.patient_id}`);
      doc.moveDown();

      doc.fontSize(14).text('Items:');
      doc.fontSize(12);
      
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item: any) => {
          doc.text(`${item.description} - Qty: ${item.quantity} x $${item.unitPrice} = $${item.amount}`);
        });
      }

      doc.moveDown();
      doc.fontSize(14).text(`Total Amount: $${invoice.total_amount}`);
      doc.text(`Amount Paid: $${invoice.amount_paid}`);
      doc.text(`Balance: $${invoice.balance}`);

      doc.end();
    });
  }

  static async createChartOfAccount(accountData: ChartOfAccount): Promise<any> {
    const account = {
      id: uuidv4(),
      ...accountData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await AccountingRepository.createChartOfAccount(account);
  }

  static async getChartOfAccounts(filters: any = {}): Promise<any[]> {
    return await AccountingRepository.getChartOfAccounts(filters);
  }

  private static generateTransactionNumber(type: string): string {
    const prefix = type === 'invoice' ? 'INV' : 
                   type === 'payment' ? 'PAY' : 
                   type === 'expense' ? 'EXP' : 'TRX';
    const timestamp = moment().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  private static generateInvoiceNumber(): string {
    return this.generateTransactionNumber('invoice');
  }

  private static generatePaymentNumber(): string {
    return this.generateTransactionNumber('payment');
  }

  private static generateExpenseNumber(): string {
    return this.generateTransactionNumber('expense');
  }

  static async processPaymentGateway(paymentData: any, gatewayConfig: any): Promise<any> {
    switch (gatewayConfig.gateway) {
      case 'stripe':
        return this.processStripePayment(paymentData, gatewayConfig);
      case 'paypal':
        return this.processPayPalPayment(paymentData, gatewayConfig);
      default:
        throw new Error('Unsupported payment gateway');
    }
  }

  private static async processStripePayment(paymentData: any, config: any): Promise<any> {
    const stripe = require('stripe')(config.secretKey);
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100),
        currency: paymentData.currency.toLowerCase(),
        payment_method: paymentData.paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          invoiceId: paymentData.invoiceId,
          patientId: paymentData.patientId
        }
      });

      return {
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
        transactionId: paymentIntent.id,
        gatewayResponse: paymentIntent
      };
    } catch (error) {
      throw new Error(`Stripe payment failed: ${error.message}`);
    }
  }

  private static async processPayPalPayment(paymentData: any, config: any): Promise<any> {
    return {
      status: 'completed',
      transactionId: `paypal_${uuidv4()}`,
      gatewayResponse: { message: 'PayPal payment processed' }
    };
  }
}