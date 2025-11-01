import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool(config.database);

export class Partner {
  static async create(partner: any): Promise<any> {
    const query = `
      INSERT INTO partners (
        id, partner_number, name, type, category, description, contact_person,
        email, phone, address, website, logo, tax_id, license_number, accreditation,
        services, integration_type, status, contract_start, contract_end, payment_terms,
        currency, commission_rate, is_active, is_verified, verification_date,
        rating, review_count, api_credentials, webhook_config, sync_config,
        compliance_documents, metadata, created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34, $35
      ) RETURNING *
    `;

    const values = [
      partner.id,
      partner.partnerNumber,
      partner.name,
      partner.type,
      partner.category,
      partner.description,
      partner.contactPerson,
      partner.email,
      partner.phone,
      JSON.stringify(partner.address),
      partner.website,
      partner.logo,
      partner.taxId,
      partner.licenseNumber,
      partner.accreditation,
      JSON.stringify(partner.services || []),
      partner.integrationType,
      partner.status,
      partner.contractStart,
      partner.contractEnd,
      partner.paymentTerms,
      partner.currency,
      partner.commissionRate,
      partner.isActive,
      partner.isVerified,
      partner.verificationDate,
      partner.rating,
      partner.reviewCount,
      JSON.stringify(partner.apiCredentials || {}),
      JSON.stringify(partner.webhookConfig || {}),
      JSON.stringify(partner.syncConfig || {}),
      JSON.stringify(partner.complianceDocuments || []),
      JSON.stringify(partner.metadata || {}),
      new Date(),
      new Date(),
      partner.createdBy
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<any> {
    const query = 'SELECT * FROM partners WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByPartnerNumber(partnerNumber: string): Promise<any> {
    const query = 'SELECT * FROM partners WHERE partner_number = $1';
    const result = await pool.query(query, [partnerNumber]);
    return result.rows[0];
  }

  static async findAll(filters: any = {}): Promise<{ partners: any[]; total: number }> {
    let query = 'SELECT * FROM partners WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.type) {
      query += ` AND type = $${paramIndex++}`;
      values.push(filters.type);
    }

    if (filters.category) {
      query += ` AND category = $${paramIndex++}`;
      values.push(filters.category);
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      values.push(filters.isActive);
    }

    if (filters.isVerified !== undefined) {
      query += ` AND is_verified = $${paramIndex++}`;
      values.push(filters.isVerified);
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex++} OR email ILIKE $${paramIndex++} OR contact_person ILIKE $${paramIndex++})`;
      values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY created_at DESC';

    if (filters.page && filters.limit) {
      const offset = ((filters.page - 1) * filters.limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(filters.limit, offset);
    }

    const result = await pool.query(query, values);

    return {
      partners: result.rows,
      total
    };
  }

  static async update(id: string, updates: any): Promise<any> {
    const setClause = [];
    const values: any[] = [id];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (['address', 'services', 'apiCredentials', 'webhookConfig', 'syncConfig', 'complianceDocuments', 'metadata'].includes(key)) {
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
      UPDATE partners
      SET ${setClause.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM partners WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  static async getActivePartners(): Promise<any[]> {
    const query = `
      SELECT * FROM partners 
      WHERE is_active = true AND status = 'active'
      ORDER BY name
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getPartnersByType(type: string): Promise<any[]> {
    const query = `
      SELECT * FROM partners 
      WHERE type = $1 AND is_active = true 
      ORDER BY name
    `;
    const result = await pool.query(query, [type]);
    return result.rows;
  }

  static async updateRating(id: string, rating: number): Promise<any> {
    const query = `
      UPDATE partners 
      SET rating = (
        SELECT AVG(rating) 
        FROM (
          SELECT $2 as rating
          UNION ALL
          SELECT rating FROM partners WHERE id = $1
        ) as ratings
      ),
      review_count = review_count + 1,
      updated_at = $3
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, rating, new Date()]);
    return result.rows[0];
  }

  static async getPartnerStats(type?: string): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_partners,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_partners,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_partners,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_status_count
      FROM partners
      WHERE 1=1
    `;

    const values: any[] = [];
    if (type) {
      query += ` AND type = $1`;
      values.push(type);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}