import { Request, Response } from 'express';
import { AccountingService } from '../services/accounting.service';
import { AccountingFilters } from '../models/interfaces';

export class AccountingController {
  static async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const transaction = await AccountingService.createTransaction(req.body, userId);
      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaction created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const filters: AccountingFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'date',
        sortOrder: (req.query.sortOrder as string) || 'desc',
        patientId: req.query.patientId as string,
        status: req.query.status as string,
        type: req.query.type as string,
        category: req.query.category as string,
        accountId: req.query.accountId as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await AccountingService.getTransactions(filters);
      res.json({
        success: true,
        data: result.transactions,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const transaction = await AccountingService.getTransactionById(req.params.id);
      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
        return;
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const transaction = await AccountingService.updateTransaction(req.params.id, req.body, userId);
      
      res.json({
        success: true,
        data: transaction,
        message: 'Transaction updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async deleteTransaction(req: Request, res: Response): Promise<void> {
    try {
      const success = await AccountingService.deleteTransaction(req.params.id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async postTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const transaction = await AccountingService.postTransaction(req.params.id, userId);
      
      res.json({
        success: true,
        data: transaction,
        message: 'Transaction posted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const invoice = await AccountingService.createInvoice(req.body, userId);
      
      res.status(201).json({
        success: true,
        data: invoice,
        message: 'Invoice created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getInvoices(req: Request, res: Response): Promise<void> {
    try {
      const filters: AccountingFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'issueDate',
        sortOrder: (req.query.sortOrder as string) || 'desc',
        patientId: req.query.patientId as string,
        status: req.query.status as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await AccountingService.getInvoices(filters);
      res.json({
        success: true,
        data: result.invoices,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getInvoiceById(req: Request, res: Response): Promise<void> {
    try {
      const invoice = await AccountingService.getInvoiceById(req.params.id);
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const invoice = await AccountingService.updateInvoice(req.params.id, req.body, userId);
      
      res.json({
        success: true,
        data: invoice,
        message: 'Invoice updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateInvoiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const { status } = req.body;
      
      const invoice = await AccountingService.updateInvoiceStatus(req.params.id, status, userId);
      
      res.json({
        success: true,
        data: invoice,
        message: 'Invoice status updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async addPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const payment = await AccountingService.addPayment(req.body, userId);
      
      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment added successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createExpense(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const expense = await AccountingService.createExpense(req.body, userId);
      
      res.status(201).json({
        success: true,
        data: expense,
        message: 'Expense created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getExpenses(req: Request, res: Response): Promise<void> {
    try {
      const filters: AccountingFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'date',
        sortOrder: (req.query.sortOrder as string) || 'desc',
        category: req.query.category as string,
        status: req.query.status as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await AccountingService.getExpenses(filters);
      res.json({
        success: true,
        data: result,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.length,
          pages: Math.ceil(result.length / filters.limit)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async approveExpense(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const expense = await AccountingService.approveExpense(req.params.id, userId);
      
      res.json({
        success: true,
        data: expense,
        message: 'Expense approved successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getPatientBalance(req: Request, res: Response): Promise<void> {
    try {
      const balance = await AccountingService.getPatientBalance(req.params.patientId);
      
      res.json({
        success: true,
        data: {
          patientId: req.params.patientId,
          balance: balance,
          currency: 'USD'
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getFinancialSummary(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const summary = await AccountingService.getFinancialSummary(
        startDate as string,
        endDate as string
      );
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getReceivablesReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const report = await AccountingService.getReceivablesReport(
        startDate as string,
        endDate as string
      );
      
      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getAgingReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await AccountingService.getAgingReport();
      
      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getOverdueInvoices(req: Request, res: Response): Promise<void> {
    try {
      const invoices = await AccountingService.getOverdueInvoices();
      
      res.json({
        success: true,
        data: invoices
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async downloadInvoicePDF(req: Request, res: Response): Promise<void> {
    try {
      const pdfBuffer = await AccountingService.generateInvoicePDF(req.params.id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const { gatewayConfig } = req.body;
      
      const payment = await AccountingService.addPayment(req.body, userId);
      
      if (gatewayConfig) {
        const gatewayResult = await AccountingService.processPaymentGateway(req.body, gatewayConfig);
        
        await AccountingService.updateTransaction(
          (payment as any).transaction_id,
          {
            status: gatewayResult.status === 'completed' ? 'posted' : 'pending',
            metadata: { ...gatewayResult }
          },
          userId
        );
      }
      
      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment processed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createChartOfAccount(req: Request, res: Response): Promise<void> {
    try {
      const account = await AccountingService.createChartOfAccount(req.body);
      
      res.status(201).json({
        success: true,
        data: account,
        message: 'Chart of account created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getChartOfAccounts(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        type: req.query.type as string,
        subtype: req.query.subtype as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        parentId: req.query.parentId as string
      };

      const accounts = await AccountingService.getChartOfAccounts(filters);
      
      res.json({
        success: true,
        data: accounts
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}