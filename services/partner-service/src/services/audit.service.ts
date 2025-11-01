import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool(config.database);

export class AuditService {
  static async log(auditData: {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    const auditLog = {
      id: uuidv4(),
      entityType: auditData.entityType,
      entityId: auditData.entityId,
      action: auditData.action,
      userId: auditData.userId,
      oldValues: auditData.oldValues ? JSON.stringify(auditData.oldValues) : null,
      newValues: auditData.newValues ? JSON.stringify(auditData.newValues) : null,
      ipAddress: auditData.ipAddress || '127.0.0.1',
      userAgent: auditData.userAgent || 'Unknown',
      timestamp: new Date(),
      metadata: auditData.metadata ? JSON.stringify(auditData.metadata) : null
    };

    const query = `
      INSERT INTO audit_logs (
        id, entity_type, entity_id, action, user_id, old_values, new_values,
        ip_address, user_agent, timestamp, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
    `;

    const values = [
      auditLog.id,
      auditLog.entityType,
      auditLog.entityId,
      auditLog.action,
      auditLog.userId,
      auditLog.oldValues,
      auditLog.newValues,
      auditLog.ipAddress,
      auditLog.userAgent,
      auditLog.timestamp,
      auditLog.metadata
    ];

    await pool.query(query, values);
  }

  static async getAuditLogs(filters: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: any[]; total: number }> {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.entityType) {
      query += ` AND entity_type = $${paramIndex++}`;
      values.push(filters.entityType);
    }

    if (filters.entityId) {
      query += ` AND entity_id = $${paramIndex++}`;
      values.push(filters.entityId);
    }

    if (filters.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      values.push(filters.userId);
    }

    if (filters.action) {
      query += ` AND action = $${paramIndex++}`;
      values.push(filters.action);
    }

    if (filters.startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY timestamp DESC';

    if (filters.page && filters.limit) {
      const offset = ((filters.page - 1) * filters.limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(filters.limit, offset);
    }

    const result = await pool.query(query, values);

    return {
      logs: result.rows.map(row => ({
        ...row,
        oldValues: row.old_values ? JSON.parse(row.old_values) : null,
        newValues: row.new_values ? JSON.parse(row.new_values) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      })),
      total
    };
  }

  static async getAuditTrail(entityId: string, entityType: string): Promise<any[]> {
    const query = `
      SELECT * FROM audit_logs 
      WHERE entity_id = $1 AND entity_type = $2
      ORDER BY timestamp ASC
    `;

    const result = await pool.query(query, [entityId, entityType]);
    
    return result.rows.map(row => ({
      ...row,
      oldValues: row.old_values ? JSON.parse(row.old_values) : null,
      newValues: row.new_values ? JSON.parse(row.new_values) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  }

  static async getSystemActivity(filters: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: any[]; total: number }> {
    let query = `
      SELECT 
        al.*,
        u.first_name,
        u.last_name,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      query += ` AND al.user_id = $${paramIndex++}`;
      values.push(filters.userId);
    }

    if (filters.startDate) {
      query += ` AND al.timestamp >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND al.timestamp <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    const countQuery = query.replace('SELECT al.*, u.first_name, u.last_name, u.email', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY al.timestamp DESC';

    if (filters.page && filters.limit) {
      const offset = ((filters.page - 1) * filters.limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(filters.limit, offset);
    }

    const result = await pool.query(query, values);

    return {
      logs: result.rows.map(row => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        userId: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        oldValues: row.old_values ? JSON.parse(row.old_values) : null,
        newValues: row.new_values ? JSON.parse(row.new_values) : null,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      })),
      total
    };
  }

  static async getActivityStats(startDate?: string, endDate?: string): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT entity_type) as unique_entities,
        COUNT(CASE WHEN action = 'create' THEN 1 END) as creates,
        COUNT(CASE WHEN action = 'update' THEN 1 END) as updates,
        COUNT(CASE WHEN action = 'delete' THEN 1 END) as deletes,
        COUNT(CASE WHEN action = 'view' THEN 1 END) as views
      FROM audit_logs
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      values.push(endDate);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getTopUsers(limit: number = 10, startDate?: string, endDate?: string): Promise<any[]> {
    let query = `
      SELECT 
        al.user_id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(*) as activity_count,
        COUNT(DISTINCT al.entity_type) as entity_types
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND al.timestamp >= $${paramIndex++}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND al.timestamp <= $${paramIndex++}`;
      values.push(endDate);
    }

    query += `
      GROUP BY al.user_id, u.first_name, u.last_name, u.email
      ORDER BY activity_count DESC
      LIMIT $${paramIndex++}
    `;

    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const query = 'DELETE FROM audit_logs WHERE timestamp < $1';
    const result = await pool.query(query, [cutoffDate]);

    return result.rowCount;
  }
}