import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool(config.database);

export class Order {
  static async create(order: any): Promise<any> {
    const query = `
      INSERT INTO orders (
        id, order_number, partner_id, patient_id, type, items, status, priority,
        ordered_at, requested_for, completed_at, cancelled_at, cancel_reason,
        total_amount, currency, payment_status, payment_method, delivery_info,
        tracking_info, notes, internal_notes, attachments, metadata,
        created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING *
    `;

    const values = [
      order.id,
      order.orderNumber,
      order.partnerId,
      order.patientId,
      order.type,
      JSON.stringify(order.items),
      order.status,
      order.priority,
      order.orderedAt,
      order.requestedFor,
      order.completedAt,
      order.cancelledAt,
      order.cancelReason,
      order.totalAmount,
      order.currency,
      order.paymentStatus,
      order.paymentMethod,
      JSON.stringify(order.deliveryInfo || {}),
      JSON.stringify(order.trackingInfo || {}),
      order.notes,
      order.internalNotes,
      JSON.stringify(order.attachments || []),
      JSON.stringify(order.metadata || {}),
      new Date(),
      new Date(),
      order.createdBy
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<any> {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByOrderNumber(orderNumber: string): Promise<any> {
    const query = 'SELECT * FROM orders WHERE order_number = $1';
    const result = await pool.query(query, [orderNumber]);
    return result.rows[0];
  }

  static async findAll(filters: any = {}): Promise<{ orders: any[]; total: number }> {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.partnerId) {
      query += ` AND partner_id = $${paramIndex++}`;
      values.push(filters.partnerId);
    }

    if (filters.patientId) {
      query += ` AND patient_id = $${paramIndex++}`;
      values.push(filters.patientId);
    }

    if (filters.type) {
      query += ` AND type = $${paramIndex++}`;
      values.push(filters.type);
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters.priority) {
      query += ` AND priority = $${paramIndex++}`;
      values.push(filters.priority);
    }

    if (filters.paymentStatus) {
      query += ` AND payment_status = $${paramIndex++}`;
      values.push(filters.paymentStatus);
    }

    if (filters.startDate) {
      query += ` AND ordered_at >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND ordered_at <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    if (filters.search) {
      query += ` AND (order_number ILIKE $${paramIndex++} OR notes ILIKE $${paramIndex++})`;
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY ordered_at DESC';

    if (filters.page && filters.limit) {
      const offset = ((filters.page - 1) * filters.limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(filters.limit, offset);
    }

    const result = await pool.query(query, values);

    return {
      orders: result.rows,
      total
    };
  }

  static async update(id: string, updates: any): Promise<any> {
    const setClause = [];
    const values: any[] = [id];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (['items', 'deliveryInfo', 'trackingInfo', 'attachments', 'metadata'].includes(key)) {
        setClause.push(`${key} = $${paramIndex++}`);
        values.push(JSON.stringify(value));
      } else if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
        setClause.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    const query = `
      UPDATE orders
      SET ${setClause.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateStatus(id: string, status: string, updatedBy?: string, reason?: string): Promise<any> {
    const updates: any = { status };
    
    if (status === 'completed') {
      updates.completedAt = new Date();
    } else if (status === 'cancelled') {
      updates.cancelledAt = new Date();
      updates.cancelReason = reason;
    }

    if (updatedBy) {
      updates.updatedBy = updatedBy;
    }

    return await this.update(id, updates);
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM orders WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  static async getOrdersByPartner(partnerId: string, filters: any = {}): Promise<any> {
    filters.partnerId = partnerId;
    return await this.findAll(filters);
  }

  static async getOrdersByPatient(patientId: string, filters: any = {}): Promise<any> {
    filters.patientId = patientId;
    return await this.findAll(filters);
  }

  static async getPendingOrders(): Promise<any[]> {
    const query = `
      SELECT * FROM orders 
      WHERE status IN ('pending', 'confirmed')
      ORDER BY priority DESC, ordered_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getOverdueOrders(): Promise<any[]> {
    const query = `
      SELECT o.*, p.name as partner_name
      FROM orders o
      JOIN partners p ON o.partner_id = p.id
      WHERE o.status IN ('pending', 'confirmed', 'processing')
      AND o.requested_for < CURRENT_DATE
      ORDER BY o.requested_for ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getOrderStats(startDate?: string, endDate?: string): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND ordered_at >= $${paramIndex++}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND ordered_at <= $${paramIndex++}`;
      values.push(endDate);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getPartnerOrderStats(partnerId: string, startDate?: string, endDate?: string): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE partner_id = $1
    `;

    const values: any[] = [partnerId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND ordered_at >= $${paramIndex++}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND ordered_at <= $${paramIndex++}`;
      values.push(endDate);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}