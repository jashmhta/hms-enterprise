import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool(config.database);

export class AccountingTransaction {
  static async create(transaction: any): Promise<any> {
    const query = `
      INSERT INTO accounting_transactions (
        id, transaction_number, type, patient_id, invoice_id, payment_id,
        description, amount, currency, status, date, due_date, account_id,
        category, reference, metadata, created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;

    const values = [
      transaction.id,
      transaction.transactionNumber,
      transaction.type,
      transaction.patientId,
      transaction.invoiceId,
      transaction.paymentId,
      transaction.description,
      transaction.amount,
      transaction.currency,
      transaction.status,
      transaction.date,
      transaction.dueDate,
      transaction.accountId,
      transaction.category,
      transaction.reference,
      JSON.stringify(transaction.metadata || {}),
      new Date(),
      new Date(),
      transaction.createdBy
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<any> {
    const query = 'SELECT * FROM accounting_transactions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByTransactionNumber(transactionNumber: string): Promise<any> {
    const query = 'SELECT * FROM accounting_transactions WHERE transaction_number = $1';
    const result = await pool.query(query, [transactionNumber]);
    return result.rows[0];
  }

  static async findAll(filters: any = {}): Promise<{ transactions: any[]; total: number }> {
    let query = 'SELECT * FROM accounting_transactions WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

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

    if (filters.startDate) {
      query += ` AND date >= $${paramIndex++}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND date <= $${paramIndex++}`;
      values.push(filters.endDate);
    }

    if (filters.accountId) {
      query += ` AND account_id = $${paramIndex++}`;
      values.push(filters.accountId);
    }

    if (filters.search) {
      query += ` AND (description ILIKE $${paramIndex++} OR reference ILIKE $${paramIndex++})`;
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY date DESC';

    if (filters.page && filters.limit) {
      const offset = ((filters.page - 1) * filters.limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(filters.limit, offset);
    }

    const result = await pool.query(query, values);

    return {
      transactions: result.rows,
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
      UPDATE accounting_transactions
      SET ${setClause.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM accounting_transactions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  static async getPatientBalance(patientId: string): Promise<number> {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN type IN ('invoice') THEN amount ELSE 0 END), 0) as total_charges,
        COALESCE(SUM(CASE WHEN type IN ('payment', 'refund') THEN amount ELSE 0 END), 0) as total_payments
      FROM accounting_transactions
      WHERE patient_id = $1 AND status = 'posted'
    `;

    const result = await pool.query(query, [patientId]);
    const row = result.rows[0];
    return parseFloat(row.total_charges) - parseFloat(row.total_payments);
  }

  static async getAgingReport(filters: any = {}): Promise<any[]> {
    const query = `
      SELECT
        p.id as patient_id,
        p.first_name,
        p.last_name,
        p.email,
        COALESCE(SUM(CASE
          WHEN at.type = 'invoice' AND at.status = 'posted'
          AND at.due_date < CURRENT_DATE - INTERVAL '30 days' THEN at.amount - COALESCE(pa.paid_amount, 0)
          ELSE 0
        END), 0) as over_30_days,
        COALESCE(SUM(CASE
          WHEN at.type = 'invoice' AND at.status = 'posted'
          AND at.due_date < CURRENT_DATE - INTERVAL '60 days' THEN at.amount - COALESCE(pa.paid_amount, 0)
          ELSE 0
        END), 0) as over_60_days,
        COALESCE(SUM(CASE
          WHEN at.type = 'invoice' AND at.status = 'posted'
          AND at.due_date < CURRENT_DATE - INTERVAL '90 days' THEN at.amount - COALESCE(pa.paid_amount, 0)
          ELSE 0
        END), 0) as over_90_days,
        COALESCE(SUM(at.amount - COALESCE(pa.paid_amount, 0)), 0) as total_outstanding
      FROM accounting_transactions at
      JOIN patients p ON at.patient_id = p.id
      LEFT JOIN LATERAL (
        SELECT
          invoice_id,
          SUM(amount) as paid_amount
        FROM accounting_transactions
        WHERE type IN ('payment', 'refund')
        AND status = 'posted'
        AND invoice_id = at.invoice_id
        GROUP BY invoice_id
      ) pa ON true
      WHERE at.type = 'invoice' AND at.status = 'posted'
      AND at.amount - COALESCE(pa.paid_amount, 0) > 0
      GROUP BY p.id, p.first_name, p.last_name, p.email
      HAVING COALESCE(SUM(at.amount - COALESCE(pa.paid_amount, 0)), 0) > 0
      ORDER BY total_outstanding DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }
}