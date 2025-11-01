import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { Pool } from 'pg';

const pool = new Pool(config.database);

export class WebhookService {
  static async sendWebhook(entityType: string, event: string, data: any): Promise<void> {
    const webhooks = await this.getActiveWebhooks(entityType, event);
    
    for (const webhook of webhooks) {
      await this.sendWebhookToUrl(webhook, event, data);
    }
  }

  static async createWebhook(webhookData: any, userId: string): Promise<any> {
    const webhook = {
      id: uuidv4(),
      partnerId: webhookData.partnerId,
      entityType: webhookData.entityType,
      events: webhookData.events,
      url: webhookData.url,
      secret: webhookData.secret || this.generateWebhookSecret(),
      isActive: true,
      retryPolicy: {
        maxAttempts: webhookData.retryPolicy?.maxAttempts || config.webhooks.retryAttempts,
        delay: webhookData.retryPolicy?.delay || 5000,
        backoff: webhookData.retryPolicy?.backoff || 'exponential'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const query = `
      INSERT INTO webhooks (
        id, partner_id, entity_type, events, url, secret, is_active,
        retry_policy, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `;

    const values = [
      webhook.id,
      webhook.partnerId,
      webhook.entityType,
      JSON.stringify(webhook.events),
      webhook.url,
      webhook.secret,
      webhook.isActive,
      JSON.stringify(webhook.retryPolicy),
      webhook.createdAt,
      webhook.updatedAt
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getActiveWebhooks(entityType: string, event: string): Promise<any[]> {
    const query = `
      SELECT * FROM webhooks 
      WHERE entity_type = $1 
      AND $2 = ANY(events)
      AND is_active = true
    `;

    const result = await pool.query(query, [entityType, event]);
    return result.rows;
  }

  static async sendWebhookToUrl(webhook: any, event: string, data: any): Promise<void> {
    const payload = {
      id: uuidv4(),
      event: event,
      data: data,
      timestamp: new Date().toISOString(),
      partnerId: webhook.partnerId
    };

    const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);

    const webhookLog = {
      id: uuidv4(),
      partnerId: webhook.partnerId,
      event: event,
      url: webhook.url,
      payload: payload,
      response: null,
      status: 'error',
      statusCode: null,
      attempts: 0,
      createdAt: new Date()
    };

    await this.createWebhookLog(webhookLog);

    await this.retryWebhookDelivery(webhook, payload, signature, webhookLog.id);
  }

  private static async retryWebhookDelivery(
    webhook: any, 
    payload: any, 
    signature: string, 
    logId: string
  ): Promise<void> {
    const maxAttempts = webhook.retryPolicy.maxAttempts;
    const baseDelay = webhook.retryPolicy.delay;
    const backoff = webhook.retryPolicy.backoff;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': payload.event,
            'User-Agent': 'HMS-Partner-Service/1.0'
          },
          timeout: config.webhooks.timeout
        });

        await this.updateWebhookLog(logId, {
          response: response.data,
          status: 'success',
          statusCode: response.status,
          attempts: attempt,
          lastAttemptAt: new Date()
        });

        return;

      } catch (error) {
        await this.updateWebhookLog(logId, {
          response: {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data
          },
          statusCode: error.response?.status,
          attempts: attempt,
          lastAttemptAt: new Date()
        });

        if (attempt === maxAttempts) {
          console.error(`Webhook delivery failed after ${maxAttempts} attempts:`, error);
          return;
        }

        const delay = this.calculateDelay(attempt, baseDelay, backoff);
        await this.sleep(delay);
      }
    }
  }

  private static calculateDelay(attempt: number, baseDelay: number, backoff: string): number {
    switch (backoff) {
      case 'linear':
        return baseDelay * attempt;
      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1);
      default:
        return baseDelay;
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static generateSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private static generateWebhookSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(config.security.apiKeyLength).toString('hex');
  }

  private static async createWebhookLog(log: any): Promise<void> {
    const query = `
      INSERT INTO webhook_logs (
        id, partner_id, event, url, payload, response, status, 
        status_code, attempts, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
    `;

    const values = [
      log.id,
      log.partnerId,
      log.event,
      log.url,
      JSON.stringify(log.payload),
      JSON.stringify(log.response),
      log.status,
      log.statusCode,
      log.attempts,
      log.createdAt
    ];

    await pool.query(query, values);
  }

  private static async updateWebhookLog(logId: string, updates: any): Promise<void> {
    const setClause = [];
    const values: any[] = [logId];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'response') {
        setClause.push(`${key} = $${paramIndex++}`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    const query = `
      UPDATE webhook_logs
      SET ${setClause.join(', ')}
      WHERE id = $1
    `;

    await pool.query(query, values);
  }

  static async getWebhookLogs(filters: any = {}): Promise<any[]> {
    let query = 'SELECT * FROM webhook_logs WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.partnerId) {
      query += ` AND partner_id = $${paramIndex++}`;
      values.push(filters.partnerId);
    }

    if (filters.event) {
      query += ` AND event = $${paramIndex++}`;
      values.push(filters.event);
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.page && filters.limit) {
      const offset = ((filters.page - 1) * filters.limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(filters.limit, offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async retryFailedWebhook(logId: string): Promise<void> {
    const logQuery = 'SELECT * FROM webhook_logs WHERE id = $1';
    const logResult = await pool.query(logQuery, [logId]);
    
    if (logResult.rows.length === 0) {
      throw new Error('Webhook log not found');
    }

    const log = logResult.rows[0];
    
    if (log.status === 'success') {
      throw new Error('Webhook already succeeded');
    }

    const webhookQuery = 'SELECT * FROM webhooks WHERE partner_id = $1 AND url = $2';
    const webhookResult = await pool.query(webhookQuery, [log.partner_id, log.url]);
    
    if (webhookResult.rows.length === 0) {
      throw new Error('Webhook configuration not found');
    }

    const webhook = webhookResult.rows[0];
    const payload = log.payload;
    const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);

    await this.retryWebhookDelivery(webhook, payload, signature, logId);
  }

  static async verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}