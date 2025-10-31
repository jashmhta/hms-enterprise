import { Request, Response } from 'express';
import { BillingService } from '../services/billing.service';
import { 
  CreateInvoiceRequest, 
  CreatePaymentRequest,
  InvoiceStatus,
  PaymentMethod,
  InvoiceResponse,
  PaymentResponse
} from '../models/billing.model';
import { logger } from '@hms-helpers/shared';
import { validateRequest } from '../middleware/validation';
import { 
  createInvoiceSchema, 
  createPaymentSchema,
  updateInvoiceStatusSchema,
  createBillableItemSchema
} from '../validation/billing.validation';

export class BillingController {
  constructor(private billingService: BillingService) {}

  // Invoice Endpoints

  createInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const invoiceData: CreateInvoiceRequest = req.body;

      const result: InvoiceResponse = await this.billingService.createInvoice(invoiceData, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            invoice: result.invoice,
            message: 'Invoice created successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }
    } catch (error) {
      logger.error('Create invoice controller error', { error: error.message, userId: req.user?.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  getInvoiceById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { invoiceId } = req.params;
      const invoice = await this.billingService.getInvoiceById(invoiceId);

      if (invoice) {
        res.status(200).json({
          success: true,
          data: { invoice }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }
    } catch (error) {
      logger.error('Get invoice controller error', { error: error.message, invoiceId: req.params.invoiceId });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  updateInvoiceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { invoiceId } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      const invoice = await this.billingService.updateInvoiceStatus(invoiceId, status, userId);

      if (invoice) {
        res.status(200).json({
          success: true,
          data: {
            invoice,
            message: 'Invoice status updated successfully'
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }
    } catch (error) {
      logger.error('Update invoice status controller error', { 
        error: error.message, 
        invoiceId: req.params.invoiceId,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  getPatientInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.billingService.getInvoicesByPatientId(patientId, page, limit);

      res.status(200).json({
        success: true,
        data: {
          invoices: result.invoices,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Get patient invoices controller error', { 
        error: error.message, 
        patientId: req.params.patientId 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  getOutstandingInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
      const invoices = await this.billingService.getOutstandingInvoices();

      res.status(200).json({
        success: true,
        data: { invoices }
      });
    } catch (error) {
      logger.error('Get outstanding invoices controller error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  // Payment Endpoints

  processPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const paymentData: CreatePaymentRequest = req.body;

      const result: PaymentResponse = await this.billingService.processPayment(paymentData, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            transaction: result.transaction,
            paymentUrl: result.paymentUrl,
            qrCode: result.qrCode,
            message: 'Payment processed successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }
    } catch (error) {
      logger.error('Process payment controller error', { 
        error: error.message, 
        userId: req.user?.id,
        paymentData: req.body 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  refundPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;
      const userId = req.user?.id;

      const result: PaymentResponse = await this.billingService.refundPayment(
        paymentId, 
        amount, 
        reason, 
        userId
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            transaction: result.transaction,
            message: 'Payment refunded successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }
    } catch (error) {
      logger.error('Refund payment controller error', { 
        error: error.message, 
        paymentId: req.params.paymentId,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  getInvoicePayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { invoiceId } = req.params;
      const payments = await this.billingService.getPaymentsByInvoiceId(invoiceId);

      res.status(200).json({
        success: true,
        data: { payments }
      });
    } catch (error) {
      logger.error('Get invoice payments controller error', { 
        error: error.message, 
        invoiceId: req.params.invoiceId 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  // Billable Items Endpoints

  createBillableItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const itemData = req.body;

      const item = await this.billingService.createBillableItem(itemData, userId);

      res.status(201).json({
        success: true,
        data: {
          item,
          message: 'Billable item created successfully'
        }
      });
    } catch (error) {
      logger.error('Create billable item controller error', { 
        error: error.message, 
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  getBillableItems = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        category: req.query.category as string,
        departmentId: req.query.departmentId as string,
        isActive: req.query.isActive !== 'false'
      };

      const items = await this.billingService.getBillableItems(filters);

      res.status(200).json({
        success: true,
        data: { items }
      });
    } catch (error) {
      logger.error('Get billable items controller error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  // Analytics Endpoints

  getBillingAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const analytics = await this.billingService.getBillingAnalytics(startDate, endDate);

      res.status(200).json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      logger.error('Get billing analytics controller error', { 
        error: error.message,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  // GST Compliance Endpoints

  generateEInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { invoiceId } = req.params;

      const eInvoiceData = await this.billingService.generateEInvoice(invoiceId);

      res.status(200).json({
        success: true,
        data: {
          eInvoice: eInvoiceData,
          message: 'E-invoice generated successfully'
        }
      });
    } catch (error) {
      logger.error('Generate e-invoice controller error', { 
        error: error.message, 
        invoiceId: req.params.invoiceId 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to generate e-invoice',
        errors: [error.message]
      });
    }
  };

  // Reports Endpoints

  generateInvoiceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      const format = req.query.format as 'PDF' | 'EXCEL' || 'PDF';

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const reportBuffer = await this.billingService.generateInvoiceReport(start, end, format);

      const filename = `invoice-report-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.${format.toLowerCase()}`;
      
      res.setHeader('Content-Type', format === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', reportBuffer.length);

      res.send(reportBuffer);
    } catch (error) {
      logger.error('Generate invoice report controller error', { 
        error: error.message,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        format: req.query.format
      });
      res.status(500).json({
        success: false,
        message: 'Failed to generate report',
        errors: [error.message]
      });
    }
  };

  // Dashboard Endpoints

  getDashboardData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);
      
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const [analytics, outstandingInvoices] = await Promise.all([
        this.billingService.getBillingAnalytics(startDate, endDate),
        this.billingService.getOutstandingInvoices()
      ]);

      const dashboardData = {
        period: { startDate, endDate },
        summary: {
          totalRevenue: analytics.totalRevenue,
          totalInvoices: analytics.totalInvoices,
          averageInvoiceValue: analytics.averageInvoiceValue,
          outstandingAmount: outstandingInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0)
        },
        recentInvoices: outstandingInvoices.slice(0, 10),
        paymentMethods: analytics.paymentMethodBreakdown,
        topDepartments: analytics.revenueByDepartment.slice(0, 5),
        agingAnalysis: analytics.agingAnalysis
      };

      res.status(200).json({
        success: true,
        data: { dashboard: dashboardData }
      });
    } catch (error) {
      logger.error('Get dashboard data controller error', { 
        error: error.message,
        period: req.query.period
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  // Search and Filter Endpoints

  searchInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        query,
        patientId,
        status,
        invoiceType,
        startDate,
        endDate,
        page = '1',
        limit = '20'
      } = req.query;

      // This would be implemented in the service layer
      // For now, return empty results
      const searchResults = {
        invoices: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          totalPages: 0
        }
      };

      res.status(200).json({
        success: true,
        data: searchResults
      });
    } catch (error) {
      logger.error('Search invoices controller error', { 
        error: error.message,
        query: req.query
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message]
      });
    }
  };

  // Health Check Endpoint
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      // Basic health check - can be enhanced to check database connectivity
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'billing-service',
        version: process.env.SERVICE_VERSION || '1.0.0'
      };

      res.status(200).json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Health check controller error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Service unhealthy',
        errors: [error.message]
      });
    }
  };
}

export default BillingController;