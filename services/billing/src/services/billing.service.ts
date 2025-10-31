import { BillingRepository } from '../repositories/billing.repository';
import { EventBus } from '@hms-helpers/shared';
import { 
  Invoice, 
  PaymentTransaction, 
  BillableItem, 
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  CreateInvoiceRequest,
  CreatePaymentRequest,
  BillingAnalytics,
  InvoiceResponse,
  PaymentResponse
} from '../models/billing.model';
import { logger } from '@hms-helpers/shared';
import { v4 as uuidv4 } from 'uuid';

export class BillingService {
  constructor(
    private billingRepository: BillingRepository,
    private eventBus: EventBus
  ) {}

  // Invoice Operations
  
  async createInvoice(invoiceData: CreateInvoiceRequest, userId: string): Promise<InvoiceResponse> {
    try {
      logger.info('Creating invoice', { patientId: invoiceData.patientId, type: invoiceData.invoiceType });

      // Validate invoice data
      const validation = await this.validateInvoiceData(invoiceData);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          errors: validation.errors
        };
      }

      // Create invoice
      const invoice = await this.billingRepository.createInvoice(invoiceData, userId);

      // Publish events
      await this.eventBus.publish('invoice.created', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        patientId: invoice.patientId,
        totalAmount: invoice.totalAmount,
        invoiceType: invoice.invoiceType,
        status: invoice.status
      });

      logger.info('Invoice created successfully', { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber });

      return {
        success: true,
        invoice
      };
    } catch (error) {
      logger.error('Failed to create invoice', { error: error.message, invoiceData });
      return {
        success: false,
        message: 'Failed to create invoice',
        errors: [error.message]
      };
    }
  }

  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    try {
      return await this.billingRepository.getInvoiceById(invoiceId);
    } catch (error) {
      logger.error('Failed to get invoice', { error: error.message, invoiceId });
      return null;
    }
  }

  async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus, userId: string): Promise<Invoice | null> {
    try {
      const invoice = await this.billingRepository.getInvoiceById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const updatedInvoice = await this.billingRepository.updateInvoiceStatus(invoiceId, status, userId);

      // Publish status change event
      await this.eventBus.publish('invoice.status_updated', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        oldStatus: invoice.status,
        newStatus: status,
        updatedBy: userId
      });

      logger.info('Invoice status updated', { invoiceId, oldStatus: invoice.status, newStatus: status });

      return updatedInvoice;
    } catch (error) {
      logger.error('Failed to update invoice status', { error: error.message, invoiceId, status });
      return null;
    }
  }

  async getInvoicesByPatientId(patientId: string, page = 1, limit = 20): Promise<{ invoices: Invoice[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      const invoices = await this.billingRepository.getInvoicesByPatientId(patientId, limit, offset);
      
      // Get total count
      const total = await this.getInvoicesCountByPatientId(patientId);

      return { invoices, total };
    } catch (error) {
      logger.error('Failed to get patient invoices', { error: error.message, patientId });
      return { invoices: [], total: 0 };
    }
  }

  async getOutstandingInvoices(): Promise<Invoice[]> {
    try {
      return await this.billingRepository.getOutstandingInvoices();
    } catch (error) {
      logger.error('Failed to get outstanding invoices', { error: error.message });
      return [];
    }
  }

  // Payment Operations
  
  async processPayment(paymentData: CreatePaymentRequest, userId: string): Promise<PaymentResponse> {
    try {
      logger.info('Processing payment', { invoiceId: paymentData.invoiceId, amount: paymentData.amount, method: paymentData.paymentMethod });

      // Validate payment data
      const validation = await this.validatePaymentData(paymentData);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          errors: validation.errors
        };
      }

      // Get invoice details
      const invoice = await this.billingRepository.getInvoiceById(paymentData.invoiceId);
      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found',
          errors: ['Invoice not found']
        };
      }

      // Check if payment amount exceeds balance
      if (paymentData.amount > invoice.balanceAmount) {
        return {
          success: false,
          message: 'Payment amount exceeds outstanding balance',
          errors: [`Maximum payable amount: ${invoice.balanceAmount}`]
        };
      }

      // Create payment transaction
      const payment = await this.billingRepository.createPayment(paymentData, userId);

      // Process payment based on method
      let paymentResult: PaymentTransaction;
      
      switch (paymentData.paymentMethod) {
        case PaymentMethod.CARD:
          paymentResult = await this.processCardPayment(payment, paymentData);
          break;
        case PaymentMethod.UPI:
          paymentResult = await this.processUpiPayment(payment, paymentData);
          break;
        case PaymentMethod.NET_BANKING:
          paymentResult = await this.processNetBankingPayment(payment, paymentData);
          break;
        case PaymentMethod.CASH:
          paymentResult = await this.processCashPayment(payment, paymentData);
          break;
        default:
          paymentResult = payment;
      }

      // Publish payment event
      await this.eventBus.publish('payment.processed', {
        paymentId: paymentResult.paymentId,
        invoiceId: paymentData.invoiceId,
        patientId: paymentData.patientId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        status: paymentResult.status
      });

      logger.info('Payment processed successfully', { 
        paymentId: paymentResult.paymentId, 
        status: paymentResult.status 
      });

      return {
        success: true,
        transaction: paymentResult
      };
    } catch (error) {
      logger.error('Failed to process payment', { error: error.message, paymentData });
      return {
        success: false,
        message: 'Failed to process payment',
        errors: [error.message]
      };
    }
  }

  async refundPayment(paymentId: string, amount: number, reason: string, userId: string): Promise<PaymentResponse> {
    try {
      logger.info('Processing refund', { paymentId, amount, reason });

      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          errors: ['Payment not found']
        };
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        return {
          success: false,
          message: 'Only completed payments can be refunded',
          errors: ['Payment must be completed before refunding']
        };
      }

      if (amount > payment.amount) {
        return {
          success: false,
          message: 'Refund amount cannot exceed payment amount',
          errors: [`Maximum refundable amount: ${payment.amount}`]
        };
      }

      // Process refund through payment gateway
      const refundResult = await this.processRefundThroughGateway(payment, amount, reason);

      // Update payment status
      await this.billingRepository.updatePaymentStatus(paymentId, PaymentStatus.REFUNDED, refundResult);

      // Update invoice balance
      await this.adjustInvoiceBalance(payment.invoiceId, -amount);

      // Publish refund event
      await this.eventBus.publish('payment.refunded', {
        originalPaymentId: paymentId,
        refundAmount: amount,
        reason,
        refundedBy: userId
      });

      logger.info('Payment refunded successfully', { paymentId, amount });

      return {
        success: true,
        transaction: { ...payment, status: PaymentStatus.REFUNDED }
      };
    } catch (error) {
      logger.error('Failed to refund payment', { error: error.message, paymentId, amount });
      return {
        success: false,
        message: 'Failed to refund payment',
        errors: [error.message]
      };
    }
  }

  // Billable Items Operations
  
  async createBillableItem(itemData: Partial<BillableItem>, userId: string): Promise<BillableItem> {
    try {
      logger.info('Creating billable item', { name: itemData.name, category: itemData.category });

      const item = await this.billingRepository.createBillableItem(itemData, userId);

      // Publish event
      await this.eventBus.publish('billable_item.created', {
        itemId: item.itemId,
        name: item.name,
        category: item.category,
        standardRate: item.standardRate
      });

      logger.info('Billable item created successfully', { itemId: item.itemId });

      return item;
    } catch (error) {
      logger.error('Failed to create billable item', { error: error.message, itemData });
      throw error;
    }
  }

  async getBillableItems(filters?: { category?: string; departmentId?: string }): Promise<BillableItem[]> {
    try {
      return await this.billingRepository.getBillableItems(filters);
    } catch (error) {
      logger.error('Failed to get billable items', { error: error.message, filters });
      return [];
    }
  }

  // Analytics Operations
  
  async getBillingAnalytics(startDate: Date, endDate: Date): Promise<BillingAnalytics> {
    try {
      return await this.billingRepository.getBillingAnalytics(startDate, endDate);
    } catch (error) {
      logger.error('Failed to get billing analytics', { error: error.message, startDate, endDate });
      return {
        period: { startDate, endDate },
        totalRevenue: 0,
        totalInvoices: 0,
        averageInvoiceValue: 0,
        revenueByDepartment: [],
        revenueByService: [],
        paymentMethodBreakdown: [],
        agingAnalysis: {
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          days91plus: 0
        },
        topServices: [],
        insuranceMetrics: {
          totalClaims: 0,
          approvedAmount: 0,
          rejectedAmount: 0,
          averageProcessingTime: 0
        }
      };
    }
  }

  // GST and Compliance Operations
  
  async generateEInvoice(invoiceId: string): Promise<any> {
    try {
      logger.info('Generating e-invoice', { invoiceId });

      const invoice = await this.billingRepository.getInvoiceById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Prepare e-invoice data as per government format
      const eInvoiceData = {
        transtype: 1, // Regular
        supptyp: 'B2B',
        suppliertin: process.env.GSTIN,
        buyername: invoice.patientInfo.name,
        buyeraddr: invoice.patientInfo.address,
        buyerstate: 'XX', // Will be derived from patient address
        buyerpos: 'XX', // Place of supply
        docno: invoice.invoiceNumber,
        doctype: 'INV',
        docdt: invoice.invoiceDate.toISOString().split('T')[0],
        totalvalue: invoice.totalAmount,
        itemlist: invoice.items.map(item => ({
          slno: 1,
          hsnsc: item.hsnSacCode || '999999',
          itemdesc: item.itemName,
          qty: item.quantity,
          unit: 'NOS',
          txval: item.taxableAmount,
          iamt: item.tax.igst.amount,
          samt: item.tax.sgst.amount,
          csamt: item.tax.cgst.amount,
          rt: item.tax.cgst.rate
        }))
      };

      // Call e-invoice API
      const eInvoiceResponse = await this.callEInvoiceAPI(eInvoiceData);

      if (eInvoiceResponse.success) {
        // Update invoice with e-invoice details
        await this.billingRepository.updateInvoiceEInvoiceDetails(invoiceId, eInvoiceResponse.data);
        
        logger.info('E-invoice generated successfully', { invoiceId, irn: eInvoiceResponse.data.Irn });
        
        return eInvoiceResponse.data;
      } else {
        throw new Error(eInvoiceResponse.message || 'E-invoice generation failed');
      }
    } catch (error) {
      logger.error('Failed to generate e-invoice', { error: error.message, invoiceId });
      throw error;
    }
  }

  // Reports Operations
  
  async generateInvoiceReport(startDate: Date, endDate: Date, format: 'PDF' | 'EXCEL' = 'PDF'): Promise<Buffer> {
    try {
      logger.info('Generating invoice report', { startDate, endDate, format });

      const invoices = await this.getInvoicesByDateRange(startDate, endDate);
      
      if (format === 'PDF') {
        return await this.generatePDFReport(invoices, 'Invoice Register', startDate, endDate);
      } else {
        return await this.generateExcelReport(invoices, 'Invoice Register', startDate, endDate);
      }
    } catch (error) {
      logger.error('Failed to generate invoice report', { error: error.message, startDate, endDate });
      throw error;
    }
  }

  // Private Helper Methods
  
  private async validateInvoiceData(invoiceData: CreateInvoiceRequest): Promise<{ isValid: boolean; message?: string; errors?: string[] }> {
    const errors: string[] = [];

    if (!invoiceData.patientId) {
      errors.push('Patient ID is required');
    }

    if (!invoiceData.items || invoiceData.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (invoiceData.items) {
      for (const item of invoiceData.items) {
        if (!item.itemId) {
          errors.push('Item ID is required for all items');
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push('Valid quantity is required for all items');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? 'Validation failed' : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async validatePaymentData(paymentData: CreatePaymentRequest): Promise<{ isValid: boolean; message?: string; errors?: string[] }> {
    const errors: string[] = [];

    if (!paymentData.invoiceId) {
      errors.push('Invoice ID is required');
    }

    if (!paymentData.patientId) {
      errors.push('Patient ID is required');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Valid payment amount is required');
    }

    if (!paymentData.paymentMethod) {
      errors.push('Payment method is required');
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? 'Validation failed' : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async processCardPayment(payment: PaymentTransaction, paymentData: CreatePaymentRequest): Promise<PaymentTransaction> {
    try {
      // Integration with payment gateway (e.g., Razorpay, Stripe)
      const gatewayResponse = await this.callPaymentGateway({
        method: 'card',
        amount: paymentData.amount,
        cardInfo: paymentData.cardInfo,
        currency: 'INR'
      });

      if (gatewayResponse.success) {
        return await this.billingRepository.updatePaymentStatus(
          payment.paymentId, 
          PaymentStatus.COMPLETED, 
          gatewayResponse.data
        );
      } else {
        return await this.billingRepository.updatePaymentStatus(
          payment.paymentId, 
          PaymentStatus.FAILED, 
          { error: gatewayResponse.message }
        );
      }
    } catch (error) {
      logger.error('Card payment processing failed', { error: error.message, paymentId: payment.paymentId });
      return await this.billingRepository.updatePaymentStatus(
        payment.paymentId, 
        PaymentStatus.FAILED, 
        { error: error.message }
      );
    }
  }

  private async processUpiPayment(payment: PaymentTransaction, paymentData: CreatePaymentRequest): Promise<PaymentTransaction> {
    try {
      // Generate UPI QR code or initiate UPI flow
      const upiResponse = await this.initiateUpiPayment({
        amount: paymentData.amount,
        vpa: paymentData.upiInfo?.vpa,
        merchantCode: process.env.UPI_MERCHANT_CODE
      });

      if (upiResponse.success) {
        return await this.billingRepository.updatePaymentStatus(
          payment.paymentId, 
          PaymentStatus.PROCESSING, 
          upiResponse.data
        );
      } else {
        return await this.billingRepository.updatePaymentStatus(
          payment.paymentId, 
          PaymentStatus.FAILED, 
          { error: upiResponse.message }
        );
      }
    } catch (error) {
      logger.error('UPI payment processing failed', { error: error.message, paymentId: payment.paymentId });
      return await this.billingRepository.updatePaymentStatus(
        payment.paymentId, 
        PaymentStatus.FAILED, 
        { error: error.message }
      );
    }
  }

  private async processNetBankingPayment(payment: PaymentTransaction, paymentData: CreatePaymentRequest): Promise<PaymentTransaction> {
    try {
      const netBankingResponse = await this.initiateNetBankingPayment({
        amount: paymentData.amount,
        bankInfo: paymentData.bankInfo
      });

      if (netBankingResponse.success) {
        return await this.billingRepository.updatePaymentStatus(
          payment.paymentId, 
          PaymentStatus.PROCESSING, 
          netBankingResponse.data
        );
      } else {
        return await this.billingRepository.updatePaymentStatus(
          payment.paymentId, 
          PaymentStatus.FAILED, 
          { error: netBankingResponse.message }
        );
      }
    } catch (error) {
      logger.error('Net banking payment processing failed', { error: error.message, paymentId: payment.paymentId });
      return await this.billingRepository.updatePaymentStatus(
        payment.paymentId, 
        PaymentStatus.FAILED, 
        { error: error.message }
      );
    }
  }

  private async processCashPayment(payment: PaymentTransaction, paymentData: CreatePaymentRequest): Promise<PaymentTransaction> {
    try {
      // Cash payments are typically confirmed immediately
      return await this.billingRepository.updatePaymentStatus(
        payment.paymentId, 
        PaymentStatus.COMPLETED, 
        { paymentMode: 'CASH', collectedAt: new Date() }
      );
    } catch (error) {
      logger.error('Cash payment processing failed', { error: error.message, paymentId: payment.paymentId });
      return await this.billingRepository.updatePaymentStatus(
        payment.paymentId, 
        PaymentStatus.FAILED, 
        { error: error.message }
      );
    }
  }

  private async processRefundThroughGateway(payment: PaymentTransaction, amount: number, reason: string): Promise<any> {
    // Integration with payment gateway for refunds
    return {
      success: true,
      data: {
        refundId: uuidv4(),
        amount,
        reason,
        processedAt: new Date()
      }
    };
  }

  private async adjustInvoiceBalance(invoiceId: string, adjustmentAmount: number): Promise<void> {
    // This would be implemented in the repository
    // For now, it's a placeholder
    logger.info('Adjusting invoice balance', { invoiceId, adjustmentAmount });
  }

  private async callPaymentGateway(paymentData: any): Promise<any> {
    // Integration with actual payment gateway
    // This is a mock implementation
    return {
      success: true,
      data: {
        transactionId: uuidv4(),
        gatewayTransactionId: 'GATEWAY_' + Date.now(),
        authorizationCode: 'AUTH_' + Date.now()
      }
    };
  }

  private async initiateUpiPayment(upiData: any): Promise<any> {
    // UPI payment integration
    return {
      success: true,
      data: {
        upiUrl: `upi://pay?pa=${upiData.vpa}&pn=Hospital&am=${upiData.amount}&cu=INR`,
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
      }
    };
  }

  private async initiateNetBankingPayment(bankData: any): Promise<any> {
    // Net banking integration
    return {
      success: true,
      data: {
        redirectUrl: 'https://bank.example.com/payment',
        transactionId: uuidv4()
      }
    };
  }

  private async callEInvoiceAPI(eInvoiceData: any): Promise<any> {
    // GST e-invoice API integration
    return {
      success: true,
      data: {
        AckNo: '123456789',
        AckDt: new Date().toISOString(),
        Irn: 'IRN_' + uuidv4(),
        SignedInvoice: 'signed_invoice_data',
        SignedQRCode: 'qr_code_data',
        EwbNo: '1234567890123',
        EwbDt: new Date().toISOString(),
        EwbValidTill: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    };
  }

  private async getPaymentById(paymentId: string): Promise<PaymentTransaction | null> {
    // This would query the repository
    // For now, return null as placeholder
    return null;
  }

  private async getInvoicesCountByPatientId(patientId: string): Promise<number> {
    // This would query the repository for count
    // For now, return 0 as placeholder
    return 0;
  }

  private async getInvoicesByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]> {
    // This would query the repository
    // For now, return empty array as placeholder
    return [];
  }

  private async generatePDFReport(invoices: Invoice[], title: string, startDate: Date, endDate: Date): Promise<Buffer> {
    // PDF generation logic
    // For now, return empty buffer
    return Buffer.from('PDF report data');
  }

  private async generateExcelReport(invoices: Invoice[], title: string, startDate: Date, endDate: Date): Promise<Buffer> {
    // Excel generation logic
    // For now, return empty buffer
    return Buffer.from('Excel report data');
  }
}

export default BillingService;