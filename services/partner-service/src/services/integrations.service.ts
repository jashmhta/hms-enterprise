import axios from 'axios';
import { Integration, IntegrationConfig } from '../models/interfaces';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { Pool } from 'pg';
import { WebhookService } from './webhook.service';
import { AuditService } from './audit.service';

const pool = new Pool(config.database);

export class IntegrationsService {
  static async createIntegration(partnerId: string, integrationData: any, userId: string): Promise<any> {
    const integration = {
      id: uuidv4(),
      partnerId,
      integrationType: integrationData.integrationType,
      status: 'testing',
      config: integrationData.config,
      lastSyncAt: null,
      lastSyncStatus: 'pending',
      errorCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const query = `
      INSERT INTO integrations (
        id, partner_id, partner_service_id, integration_type, status, config,
        last_sync_at, last_sync_status, error_count, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `;

    const values = [
      integration.id,
      integration.partnerId,
      integrationData.partnerServiceId,
      integration.integrationType,
      integration.status,
      JSON.stringify(integration.config),
      integration.lastSyncAt,
      integration.lastSyncStatus,
      integration.errorCount,
      integration.createdAt,
      integration.updatedAt
    ];

    const result = await pool.query(query, values);
    
    await AuditService.log({
      entityType: 'integration',
      entityId: result.rows[0].id,
      action: 'create',
      userId: userId,
      newValues: result.rows[0]
    });

    return result.rows[0];
  }

  static async getPartnerIntegration(partnerId: string): Promise<any> {
    const query = 'SELECT * FROM integrations WHERE partner_id = $1 AND status = \'active\'';
    const result = await pool.query(query, [partnerId]);
    return result.rows[0];
  }

  static async getPartnerIntegrations(partnerId: string): Promise<any[]> {
    const query = 'SELECT * FROM integrations WHERE partner_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [partnerId]);
    return result.rows;
  }

  static async updateIntegration(id: string, updates: any, userId: string): Promise<any> {
    const setClause = [];
    const values: any[] = [id];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'config') {
        setClause.push(`${key} = $${paramIndex++}`);
        values.push(JSON.stringify(value));
      } else if (key !== 'id' && key !== 'created_at') {
        setClause.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return this.getIntegrationById(id);
    }

    setClause.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    const query = `
      UPDATE integrations
      SET ${setClause.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    await AuditService.log({
      entityType: 'integration',
      entityId: id,
      action: 'update',
      userId: userId,
      newValues: result.rows[0]
    });

    return result.rows[0];
  }

  static async getIntegrationById(id: string): Promise<any> {
    const query = 'SELECT * FROM integrations WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async testIntegration(integration: any): Promise<any> {
    try {
      const { config } = integration;
      
      switch (integration.integrationType) {
        case 'abdm':
          return await this.testABDMIntegration(config);
        case 'lab':
          return await this.testLabIntegration(config);
        case 'pharmacy':
          return await this.testPharmacyIntegration(config);
        case 'insurance':
          return await this.testInsuranceIntegration(config);
        case 'payment':
          return await this.testPaymentIntegration(config);
        default:
          return await this.testGenericIntegration(config);
      }
    } catch (error) {
      await this.updateIntegration(integration.id, {
        status: 'error',
        errorCount: integration.errorCount + 1,
        lastError: error.message
      }, 'system');
      
      throw error;
    }
  }

  static async sendOrderToPartner(order: any, integration: any): Promise<any> {
    const { config } = integration;
    
    switch (integration.integrationType) {
      case 'lab':
        return await this.sendLabOrder(order, config);
      case 'pharmacy':
        return await this.sendPharmacyOrder(order, config);
      case 'insurance':
        return await this.sendInsuranceClaim(order, config);
      default:
        return await this.sendGenericOrder(order, config);
    }
  }

  static async notifyOrderCompletion(order: any, integration: any): Promise<any> {
    const { config } = integration;
    
    if (config.webhook?.url) {
      await axios.post(config.webhook.url, {
        event: 'order.completed',
        order: order,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': config.webhook.secret
        },
        timeout: 30000
      });
    }
  }

  static async syncData(partnerId: string, syncType: string = 'incremental'): Promise<any> {
    const integration = await this.getPartnerIntegration(partnerId);
    
    if (!integration) {
      throw new Error('No active integration found for partner');
    }

    const syncId = uuidv4();
    await this.createSyncLog({
      id: syncId,
      partnerId,
      integrationId: integration.id,
      type: syncType,
      status: 'in_progress',
      startedAt: new Date(),
      recordsProcessed: 0,
      recordsTotal: 0
    });

    try {
      const { config } = integration;
      
      switch (integration.integrationType) {
        case 'abdm':
          await this.syncABDMData(partnerId, config, syncType, syncId);
          break;
        case 'lab':
          await this.syncLabData(partnerId, config, syncType, syncId);
          break;
        case 'pharmacy':
          await this.syncPharmacyData(partnerId, config, syncType, syncId);
          break;
        default:
          await this.syncGenericData(partnerId, config, syncType, syncId);
      }

      await this.updateSyncLog(syncId, {
        status: 'success',
        completedAt: new Date()
      });

      await this.updateIntegration(integration.id, {
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
        errorCount: 0
      }, 'system');

    } catch (error) {
      await this.updateSyncLog(syncId, {
        status: 'error',
        errorMessage: error.message,
        completedAt: new Date()
      });

      await this.updateIntegration(integration.id, {
        lastSyncStatus: 'error',
        errorCount: integration.errorCount + 1,
        lastError: error.message
      }, 'system');

      throw error;
    }
  }

  private static async testABDMIntegration(config: IntegrationConfig): Promise<any> {
    const abdmConfig = config.integrations.abdm;
    
    if (!abdmConfig.enabled || !abdmConfig.apiUrl) {
      throw new Error('ABDM integration not properly configured');
    }

    try {
      const response = await axios.get(`${abdmConfig.apiUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${abdmConfig.clientId}:${abdmConfig.clientSecret}`
        },
        timeout: 10000
      });

      return {
        status: 'success',
        message: 'ABDM integration test successful',
        response: response.data
      };
    } catch (error) {
      throw new Error(`ABDM integration test failed: ${error.message}`);
    }
  }

  private static async testLabIntegration(config: IntegrationConfig): Promise<any> {
    const labConfig = config.settings;
    
    try {
      const response = await axios.get(`${labConfig.endpoint}/test`, {
        headers: {
          'Authorization': `Bearer ${labConfig.credentials?.apiKey}`
        },
        timeout: 10000
      });

      return {
        status: 'success',
        message: 'Lab integration test successful',
        response: response.data
      };
    } catch (error) {
      throw new Error(`Lab integration test failed: ${error.message}`);
    }
  }

  private static async testPharmacyIntegration(config: IntegrationConfig): Promise<any> {
    const pharmacyConfig = config.settings;
    
    try {
      const response = await axios.get(`${pharmacyConfig.endpoint}/test`, {
        headers: {
          'Authorization': `Bearer ${pharmacyConfig.credentials?.apiKey}`
        },
        timeout: 10000
      });

      return {
        status: 'success',
        message: 'Pharmacy integration test successful',
        response: response.data
      };
    } catch (error) {
      throw new Error(`Pharmacy integration test failed: ${error.message}`);
    }
  }

  private static async testInsuranceIntegration(config: IntegrationConfig): Promise<any> {
    const insuranceConfig = config.settings;
    
    try {
      const response = await axios.get(`${insuranceConfig.endpoint}/test`, {
        headers: {
          'Authorization': `Bearer ${insuranceConfig.credentials?.apiKey}`
        },
        timeout: 10000
      });

      return {
        status: 'success',
        message: 'Insurance integration test successful',
        response: response.data
      };
    } catch (error) {
      throw new Error(`Insurance integration test failed: ${error.message}`);
    }
  }

  private static async testPaymentIntegration(config: IntegrationConfig): Promise<any> {
    const paymentConfig = config.settings;
    
    try {
      const response = await axios.get(`${paymentConfig.endpoint}/test`, {
        headers: {
          'Authorization': `Bearer ${paymentConfig.credentials?.apiKey}`
        },
        timeout: 10000
      });

      return {
        status: 'success',
        message: 'Payment integration test successful',
        response: response.data
      };
    } catch (error) {
      throw new Error(`Payment integration test failed: ${error.message}`);
    }
  }

  private static async testGenericIntegration(config: IntegrationConfig): Promise<any> {
    const genericConfig = config.settings;
    
    try {
      const response = await axios.get(`${genericConfig.endpoint}/test`, {
        headers: {
          'Authorization': `Bearer ${genericConfig.credentials?.apiKey}`
        },
        timeout: 10000
      });

      return {
        status: 'success',
        message: 'Generic integration test successful',
        response: response.data
      };
    } catch (error) {
      throw new Error(`Generic integration test failed: ${error.message}`);
    }
  }

  private static async sendLabOrder(order: any, config: IntegrationConfig): Promise<any> {
    const labConfig = config.settings;
    const mappedOrder = this.mapOrderToIntegrationFormat(order, config.mapping || []);
    
    const response = await axios.post(`${labConfig.endpoint}/orders`, mappedOrder, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${labConfig.credentials?.apiKey}`
      },
      timeout: 30000
    });

    return response.data;
  }

  private static async sendPharmacyOrder(order: any, config: IntegrationConfig): Promise<any> {
    const pharmacyConfig = config.settings;
    const mappedOrder = this.mapOrderToIntegrationFormat(order, config.mapping || []);
    
    const response = await axios.post(`${pharmacyConfig.endpoint}/orders`, mappedOrder, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pharmacyConfig.credentials?.apiKey}`
      },
      timeout: 30000
    });

    return response.data;
  }

  private static async sendInsuranceClaim(order: any, config: IntegrationConfig): Promise<any> {
    const insuranceConfig = config.settings;
    const mappedOrder = this.mapOrderToIntegrationFormat(order, config.mapping || []);
    
    const response = await axios.post(`${insuranceConfig.endpoint}/claims`, mappedOrder, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${insuranceConfig.credentials?.apiKey}`
      },
      timeout: 30000
    });

    return response.data;
  }

  private static async sendGenericOrder(order: any, config: IntegrationConfig): Promise<any> {
    const genericConfig = config.settings;
    const mappedOrder = this.mapOrderToIntegrationFormat(order, config.mapping || []);
    
    const response = await axios.post(`${genericConfig.endpoint}/orders`, mappedOrder, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${genericConfig.credentials?.apiKey}`
      },
      timeout: 30000
    });

    return response.data;
  }

  private static mapOrderToIntegrationFormat(order: any, mapping: any[]): any {
    const mapped: any = {};
    
    if (!mapping || mapping.length === 0) {
      return order;
    }

    mapping.forEach(field => {
      const sourceValue = this.getNestedValue(order, field.sourceField);
      
      if (field.transformation) {
        mapped[field.targetField] = this.applyTransformation(sourceValue, field.transformation);
      } else {
        mapped[field.targetField] = sourceValue;
      }

      if (mapped[field.targetField] === undefined && field.defaultValue !== undefined) {
        mapped[field.targetField] = field.defaultValue;
      }
    });

    return mapped;
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static applyTransformation(value: any, transformation: string): any {
    switch (transformation) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'date':
        return new Date(value).toISOString();
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      default:
        return value;
    }
  }

  private static async syncABDMData(partnerId: string, config: any, syncType: string, syncId: string): Promise<void> {
    console.log(`Syncing ABDM data for partner ${partnerId}, type: ${syncType}`);
  }

  private static async syncLabData(partnerId: string, config: any, syncType: string, syncId: string): Promise<void> {
    console.log(`Syncing lab data for partner ${partnerId}, type: ${syncType}`);
  }

  private static async syncPharmacyData(partnerId: string, config: any, syncType: string, syncId: string): Promise<void> {
    console.log(`Syncing pharmacy data for partner ${partnerId}, type: ${syncType}`);
  }

  private static async syncGenericData(partnerId: string, config: any, syncType: string, syncId: string): Promise<void> {
    console.log(`Syncing generic data for partner ${partnerId}, type: ${syncType}`);
  }

  private static async createSyncLog(syncLog: any): Promise<void> {
    const query = `
      INSERT INTO sync_logs (
        id, partner_id, integration_id, type, status, started_at,
        records_processed, records_total, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const values = [
      syncLog.id,
      syncLog.partnerId,
      syncLog.integrationId,
      syncLog.type,
      syncLog.status,
      syncLog.startedAt,
      syncLog.recordsProcessed,
      syncLog.recordsTotal,
      syncLog.errorMessage,
      JSON.stringify(syncLog.metadata || {})
    ];

    await pool.query(query, values);
  }

  private static async updateSyncLog(syncId: string, updates: any): Promise<void> {
    const setClause = [];
    const values: any[] = [syncId];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      setClause.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }

    const query = `
      UPDATE sync_logs
      SET ${setClause.join(', ')}
      WHERE id = $1
    `;

    await pool.query(query, values);
  }
}