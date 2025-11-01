import { Partner } from '../models/partner.model';
import { Order } from '../models/order.model';
import { 
  Partner as IPartner, 
  Order as IOrder,
  PartnerFilters,
  OrderFilters,
  Integration,
  AuditLog
} from '../models/interfaces';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { config } from '../config';
import { IntegrationsService } from './integrations.service';
import { WebhookService } from './webhook.service';
import { AuditService } from './audit.service';

export class PartnerService {
  static async createPartner(partnerData: Partial<IPartner>, userId: string): Promise<any> {
    const partner = {
      id: uuidv4(),
      partnerNumber: this.generatePartnerNumber(),
      ...partnerData,
      status: 'pending',
      isActive: false,
      isVerified: false,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const result = await Partner.create(partner);

    await AuditService.log({
      entityType: 'partner',
      entityId: result.id,
      action: 'create',
      userId: userId,
      newValues: result
    });

    await WebhookService.sendWebhook(partner.type!, 'partner.created', result);

    return result;
  }

  static async getPartnerById(id: string): Promise<any> {
    return await Partner.findById(id);
  }

  static async getPartners(filters: PartnerFilters): Promise<any> {
    return await Partner.findAll(filters);
  }

  static async updatePartner(id: string, updates: Partial<IPartner>, userId: string): Promise<any> {
    const existing = await this.getPartnerById(id);
    if (!existing) {
      throw new Error('Partner not found');
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: userId
    };

    const result = await Partner.update(id, updatedData);

    await AuditService.log({
      entityType: 'partner',
      entityId: id,
      action: 'update',
      userId: userId,
      oldValues: existing,
      newValues: result
    });

    return result;
  }

  static async deletePartner(id: string, userId: string): Promise<boolean> {
    const existing = await this.getPartnerById(id);
    if (!existing) {
      throw new Error('Partner not found');
    }

    const success = await Partner.delete(id);

    if (success) {
      await AuditService.log({
        entityType: 'partner',
        entityId: id,
        action: 'delete',
        userId: userId,
        oldValues: existing
      });
    }

    return success;
  }

  static async activatePartner(id: string, userId: string): Promise<any> {
    return await this.updatePartner(id, {
      status: 'active',
      isActive: true,
      verificationDate: new Date()
    }, userId);
  }

  static async deactivatePartner(id: string, userId: string): Promise<any> {
    return await this.updatePartner(id, {
      status: 'suspended',
      isActive: false
    }, userId);
  }

  static async verifyPartner(id: string, userId: string): Promise<any> {
    return await this.updatePartner(id, {
      isVerified: true,
      verificationDate: new Date()
    }, userId);
  }

  static async updatePartnerRating(id: string, rating: number): Promise<any> {
    return await Partner.updateRating(id, rating);
  }

  static async getActivePartners(): Promise<any[]> {
    return await Partner.getActivePartners();
  }

  static async getPartnersByType(type: string): Promise<any[]> {
    return await Partner.getPartnersByType(type);
  }

  static async getPartnerStats(type?: string): Promise<any> {
    return await Partner.getPartnerStats(type);
  }

  static async createOrder(orderData: Partial<IOrder>, userId: string): Promise<any> {
    const partner = await Partner.findById(orderData.partnerId!);
    if (!partner || !partner.isActive) {
      throw new Error('Partner not found or not active');
    }

    const order = {
      id: uuidv4(),
      orderNumber: this.generateOrderNumber(),
      ...orderData,
      status: 'pending',
      orderedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const result = await Order.create(order);

    await AuditService.log({
      entityType: 'order',
      entityId: result.id,
      action: 'create',
      userId: userId,
      newValues: result
    });

    await WebhookService.sendWebhook('order', 'order.created', result);

    try {
      await this.processOrderWithPartner(result);
    } catch (error) {
      console.error('Failed to process order with partner:', error);
    }

    return result;
  }

  static async getOrderById(id: string): Promise<any> {
    return await Order.findById(id);
  }

  static async getOrders(filters: OrderFilters): Promise<any> {
    return await Order.findAll(filters);
  }

  static async updateOrder(id: string, updates: Partial<IOrder>, userId: string): Promise<any> {
    const existing = await this.getOrderById(id);
    if (!existing) {
      throw new Error('Order not found');
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: userId
    };

    const result = await Order.update(id, updatedData);

    await AuditService.log({
      entityType: 'order',
      entityId: id,
      action: 'update',
      userId: userId,
      oldValues: existing,
      newValues: result
    });

    if (updates.status && updates.status !== existing.status) {
      await WebhookService.sendWebhook('order', 'order.status_updated', result);
    }

    return result;
  }

  static async updateOrderStatus(id: string, status: string, userId: string, reason?: string): Promise<any> {
    const existing = await this.getOrderById(id);
    if (!existing) {
      throw new Error('Order not found');
    }

    const result = await Order.updateStatus(id, status, userId, reason);

    await AuditService.log({
      entityType: 'order',
      entityId: id,
      action: 'status_update',
      userId: userId,
      oldValues: { status: existing.status },
      newValues: { status: status, reason: reason }
    });

    await WebhookService.sendWebhook('order', 'order.status_updated', result);

    if (status === 'completed') {
      await this.completeOrderProcessing(result);
    }

    return result;
  }

  static async cancelOrder(id: string, reason: string, userId: string): Promise<any> {
    return await this.updateOrderStatus(id, 'cancelled', userId, reason);
  }

  static async deleteOrder(id: string, userId: string): Promise<boolean> {
    const existing = await this.getOrderById(id);
    if (!existing) {
      throw new Error('Order not found');
    }

    const success = await Order.delete(id);

    if (success) {
      await AuditService.log({
        entityType: 'order',
        entityId: id,
        action: 'delete',
        userId: userId,
        oldValues: existing
      });
    }

    return success;
  }

  static async getOrdersByPartner(partnerId: string, filters: OrderFilters): Promise<any> {
    return await Order.getOrdersByPartner(partnerId, filters);
  }

  static async getOrdersByPatient(patientId: string, filters: OrderFilters): Promise<any> {
    return await Order.getOrdersByPatient(patientId, filters);
  }

  static async getPendingOrders(): Promise<any[]> {
    return await Order.getPendingOrders();
  }

  static async getOverdueOrders(): Promise<any[]> {
    return await Order.getOverdueOrders();
  }

  static async getOrderStats(startDate?: string, endDate?: string): Promise<any> {
    return await Order.getOrderStats(startDate, endDate);
  }

  static async getPartnerOrderStats(partnerId: string, startDate?: string, endDate?: string): Promise<any> {
    return await Order.getPartnerOrderStats(partnerId, startDate, endDate);
  }

  private static async processOrderWithPartner(order: any): Promise<void> {
    const integration = await IntegrationsService.getPartnerIntegration(order.partnerId);
    
    if (integration && integration.status === 'active') {
      try {
        await IntegrationsService.sendOrderToPartner(order, integration);
        await this.updateOrder(order.id, { status: 'confirmed' }, 'system');
      } catch (error) {
        await this.updateOrder(order.id, { 
          status: 'pending',
          internalNotes: `Failed to process with partner: ${error.message}`
        }, 'system');
        throw error;
      }
    }
  }

  private static async completeOrderProcessing(order: any): Promise<void> {
    await WebhookService.sendWebhook('order', 'order.completed', order);

    const integration = await IntegrationsService.getPartnerIntegration(order.partnerId);
    if (integration) {
      try {
        await IntegrationsService.notifyOrderCompletion(order, integration);
      } catch (error) {
        console.error('Failed to notify partner of order completion:', error);
      }
    }
  }

  private static generatePartnerNumber(): string {
    const prefix = 'PRN';
    const timestamp = moment().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  private static generateOrderNumber(): string {
    const prefix = 'ORD';
    const timestamp = moment().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  static async testPartnerIntegration(partnerId: string): Promise<any> {
    const integration = await IntegrationsService.getPartnerIntegration(partnerId);
    
    if (!integration) {
      throw new Error('No integration found for partner');
    }

    return await IntegrationsService.testIntegration(integration);
  }

  static async syncPartnerData(partnerId: string, syncType: string = 'incremental'): Promise<any> {
    const integration = await IntegrationsService.getPartnerIntegration(partnerId);
    
    if (!integration) {
      throw new Error('No integration found for partner');
    }

    return await IntegrationsService.syncData(partnerId, syncType);
  }

  static async getPartnerIntegrations(partnerId: string): Promise<any[]> {
    return await IntegrationsService.getPartnerIntegrations(partnerId);
  }

  static async createPartnerIntegration(partnerId: string, integrationData: any, userId: string): Promise<any> {
    return await IntegrationsService.createIntegration(partnerId, integrationData, userId);
  }
}