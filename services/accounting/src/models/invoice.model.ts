import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool(config.database);

export class Invoice {
  static async create(invoice: any): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const invoiceQuery = `
        INSERT INTO invoices (
          id, invoice_number, patient_id, appointment_id, subtotal, tax_amount,
          discount_amount, total_amount, amount_paid, balance, status, currency,
          issue_date, due_date, paid_date, notes, payment_terms, metadata,
          created_at, updated_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) RETURNING *
      `;

      const invoiceValues = [
        invoice.id,
        invoice.invoiceNumber,
        invoice.patientId,
        invoice.appointmentId,
        invoice.subtotal,
        invoice.taxAmount,
        invoice.discountAmount,
        invoice.totalAmount,
        invoice.amountPaid,
        invoice.balance,
        invoice.status,
        invoice.currency,
        invoice.issueDate,
        invoice.dueDate,
        invoice.paidDate,
        invoice.notes,
        invoice.paymentTerms,
        JSON.stringify(invoice.metadata || {}),
        new Date(),
        new Date(),
        invoice.createdBy
      ];

      const invoiceResult = await client.query(invoiceQuery, invoiceValues);

      for (const item of invoice.items) {
        const itemQuery = `
          INSERT INTO invoice_items (
            id, invoice_id, description, quantity, unit_price, discount,
            tax_rate, amount, service_code, chart_of_account_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;

        await client.query(itemQuery, [
          item.id,
          invoice.id,
          item.description,
          item.quantity,
          item.unitPrice,
          item.discount,
          item.taxRate,
          item.amount,
          item.serviceCode,
          item.chartOfAccountId
        ]);
      }

      await client.query('COMMIT');
      return invoiceResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id: string): Promise<any> {
    const query = `
      SELECT i.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ii.id,
              'description', ii.description,
              'quantity', ii.quantity,
              'unitPrice', ii.unit_price,
              'discount', ii.discount,
              'taxRate', ii.tax_rate,
              'amount', ii.amount,
              'serviceCode', ii.service_code,
              'chartOfAccountId', ii.chart_of_account_id
            )
          ) FILTER (WHERE ii.id IS NOT NULL),
          '[]'
        ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.id = $1
      GROUP BY i.id
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByInvoiceNumber(invoiceNumber: string): Promise<any> {
    const query = `
      SELECT i.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ii.id,
              'description', ii.description,
              'quantity', ii.quantity,
              'unitPrice', ii.unit_price,
              'discount', ii.discount,
              'taxRate', ii.tax_rate,
              'amount', ii.amount,
              'serviceCode', ii.service_code,
              'chartOfAccountId', ii.chart_of_account_id
            )
          ) FILTER (WHERE ii.id IS NOT NULL),
          '[]'
        ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.invoice_number = $1
      GROUP BY i.id
    `;

    const result = await pool.query(query, [invoiceNumber]);
    return result.rows[0];
  }

  static async findAll(filters: any = {}): Promise<{ invoices: any[]; total: number }> {
    let query = 'SELECT i.* FROM invoices i WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.patientId) {
      query += ` AND i.patient_id = $${paramIndex++}`;
      values.push(filters.patientId);
    }

    if (filters.status) {
      query += ` AND i.status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters.startDate) {
      query += ` AND i.issue_date >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND i.issue_date <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    if (filters.search) {
      query += ` AND (i.invoice_number ILIKE $${paramIndex++} OR i.notes ILIKE $${paramIndex++})`;
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const countQuery = query.replace('SELECT i.*', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY i.issue_date DESC';

    if (filters.page && filters.limit) {
      const offset = ((filters.page - 1) * filters.limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(filters.limit, offset);
    }

    const result = await pool.query(query, values);
    return {
      invoices: result.rows,
      total
    };
  }

  static async update(id: string, updates: any): Promise<any> {
    const setClause = [];
    const values: any[] = [id];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'metadata') {
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
      UPDATE invoices
      SET ${setClause.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateStatus(id: string, status: string, updatedBy?: string): Promise<any> {
    const query = `
      UPDATE invoices
      SET status = $2, updated_at = $3, updated_by = $4
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, status, new Date(), updatedBy]);
    return result.rows[0];
  }

  static async addPayment(invoiceId: string, payment: any): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const currentInvoice = await this.findById(invoiceId);
      if (!currentInvoice) {
        throw new Error('Invoice not found');
      }

      const newAmountPaid = parseFloat(currentInvoice.amount_paid) + payment.amount;
      const newBalance = parseFloat(currentInvoice.total_amount) - newAmountPaid;

      let newStatus = currentInvoice.status;
      if (newBalance <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'sent';
      }

      const updateQuery = `
        UPDATE invoices
        SET amount_paid = $2, balance = $3, status = $4, paid_date = $5, updated_at = $6
        WHERE id = $1
        RETURNING *
      `;

      const updateValues = [
        invoiceId,
        newAmountPaid,
        newBalance,
        newStatus,
        newBalance <= 0 ? new Date() : currentInvoice.paid_date,
        new Date()
      ];

      const result = await client.query(updateQuery, updateValues);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
      const result = await client.query('DELETE FROM invoices WHERE id = $1', [id]);

      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getOverdueInvoices(): Promise<any[]> {
    const query = `
      SELECT * FROM invoices
      WHERE status IN ('sent', 'overdue')
      AND due_date < CURRENT_DATE
      AND balance > 0
      ORDER BY due_date ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async getReceivablesReport(filters: any = {}): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN balance ELSE 0 END), 0) as outstanding_amount,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN balance ELSE 0 END), 0) as overdue_amount,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status = 'paid'
          THEN EXTRACT(days FROM (paid_date - issue_date))
        END), 0) as avg_collection_days
      FROM invoices
      WHERE issue_date >= $1 AND issue_date <= $2
    `;

    const result = await pool.query(query, [filters.startDate, filters.endDate]);
    return result.rows[0];
  }
}