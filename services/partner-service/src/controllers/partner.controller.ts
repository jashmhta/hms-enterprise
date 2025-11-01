import { Request, Response } from 'express';
import { PartnerService } from '../services/partner.service';
import { IntegrationsService } from '../services/integrations.service';
import { PartnerFilters, OrderFilters } from '../models/interfaces';

export class PartnerController {
  static async createPartner(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const partner = await PartnerService.createPartner(req.body, userId);
      
      res.status(201).json({
        success: true,
        data: partner,
        message: 'Partner created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getPartners(req: Request, res: Response): Promise<void> {
    try {
      const filters: PartnerFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: (req.query.sortOrder as string) || 'desc',
        type: req.query.type as string,
        category: req.query.category as string,
        status: req.query.status as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        isVerified: req.query.isVerified ? req.query.isVerified === 'true' : undefined,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await PartnerService.getPartners(filters);
      res.json({
        success: true,
        data: result.partners,
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

  static async getPartnerById(req: Request, res: Response): Promise<void> {
    try {
      const partner = await PartnerService.getPartnerById(req.params.id);
      if (!partner) {
        res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
        return;
      }

      res.json({
        success: true,
        data: partner
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updatePartner(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const partner = await PartnerService.updatePartner(req.params.id, req.body, userId);
      
      res.json({
        success: true,
        data: partner,
        message: 'Partner updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async deletePartner(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const success = await PartnerService.deletePartner(req.params.id, userId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Partner deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async activatePartner(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const partner = await PartnerService.activatePartner(req.params.id, userId);
      
      res.json({
        success: true,
        data: partner,
        message: 'Partner activated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async deactivatePartner(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const partner = await PartnerService.deactivatePartner(req.params.id, userId);
      
      res.json({
        success: true,
        data: partner,
        message: 'Partner deactivated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async verifyPartner(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const partner = await PartnerService.verifyPartner(req.params.id, userId);
      
      res.json({
        success: true,
        data: partner,
        message: 'Partner verified successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updatePartnerRating(req: Request, res: Response): Promise<void> {
    try {
      const { rating } = req.body;
      const partner = await PartnerService.updatePartnerRating(req.params.id, rating);
      
      res.json({
        success: true,
        data: partner,
        message: 'Partner rating updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getActivePartners(req: Request, res: Response): Promise<void> {
    try {
      const partners = await PartnerService.getActivePartners();
      res.json({
        success: true,
        data: partners
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getPartnersByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const partners = await PartnerService.getPartnersByType(type);
      res.json({
        success: true,
        data: partners
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getPartnerStats(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;
      const stats = await PartnerService.getPartnerStats(type as string);
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const order = await PartnerService.createOrder(req.body, userId);
      
      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const filters: OrderFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'orderedAt',
        sortOrder: (req.query.sortOrder as string) || 'desc',
        partnerId: req.query.partnerId as string,
        patientId: req.query.patientId as string,
        type: req.query.type as string,
        status: req.query.status as string,
        priority: req.query.priority as string,
        paymentStatus: req.query.paymentStatus as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await PartnerService.getOrders(filters);
      res.json({
        success: true,
        data: result.orders,
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

  static async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const order = await PartnerService.getOrderById(req.params.id);
      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const order = await PartnerService.updateOrder(req.params.id, req.body, userId);
      
      res.json({
        success: true,
        data: order,
        message: 'Order updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const { status, reason } = req.body;
      
      const order = await PartnerService.updateOrderStatus(req.params.id, status, userId, reason);
      
      res.json({
        success: true,
        data: order,
        message: 'Order status updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const { reason } = req.body;
      
      const order = await PartnerService.cancelOrder(req.params.id, reason, userId);
      
      res.json({
        success: true,
        data: order,
        message: 'Order cancelled successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getOrdersByPartner(req: Request, res: Response): Promise<void> {
    try {
      const filters: OrderFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'orderedAt',
        sortOrder: (req.query.sortOrder as string) || 'desc',
        status: req.query.status as string,
        priority: req.query.priority as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await PartnerService.getOrdersByPartner(req.params.partnerId, filters);
      res.json({
        success: true,
        data: result.orders,
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

  static async getOrdersByPatient(req: Request, res: Response): Promise<void> {
    try {
      const filters: OrderFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'orderedAt',
        sortOrder: (req.query.sortOrder as string) || 'desc',
        type: req.query.type as string,
        status: req.query.status as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await PartnerService.getOrdersByPatient(req.params.patientId, filters);
      res.json({
        success: true,
        data: result.orders,
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

  static async getPendingOrders(req: Request, res: Response): Promise<void> {
    try {
      const orders = await PartnerService.getPendingOrders();
      res.json({
        success: true,
        data: orders
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getOverdueOrders(req: Request, res: Response): Promise<void> {
    try {
      const orders = await PartnerService.getOverdueOrders();
      res.json({
        success: true,
        data: orders
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getOrderStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const stats = await PartnerService.getOrderStats(
        startDate as string,
        endDate as string
      );
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getPartnerOrderStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const stats = await PartnerService.getPartnerOrderStats(
        req.params.partnerId,
        startDate as string,
        endDate as string
      );
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async testPartnerIntegration(req: Request, res: Response): Promise<void> {
    try {
      const result = await PartnerService.testPartnerIntegration(req.params.id);
      res.json({
        success: true,
        data: result,
        message: 'Integration test completed'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async syncPartnerData(req: Request, res: Response): Promise<void> {
    try {
      const { syncType } = req.body;
      const result = await PartnerService.syncPartnerData(req.params.id, syncType);
      res.json({
        success: true,
        data: result,
        message: 'Data sync completed'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getPartnerIntegrations(req: Request, res: Response): Promise<void> {
    try {
      const integrations = await PartnerService.getPartnerIntegrations(req.params.id);
      res.json({
        success: true,
        data: integrations
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createPartnerIntegration(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system';
      const integration = await PartnerService.createPartnerIntegration(req.params.id, req.body, userId);
      
      res.status(201).json({
        success: true,
        data: integration,
        message: 'Integration created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}