import { query, transaction, PoolClient } from '../database/connection';
import { 
  Invoice, 
  PaymentTransaction, 
  BillableItem, 
  InvoiceStatus,
  PaymentStatus,
  CreateInvoiceRequest,
  CreatePaymentRequest,
  BillingAnalytics,
  InvoiceResponse,
  PaymentResponse
} from '../models/billing.model';
import { logger } from '@hms-helpers/shared';
import { v4 as uuidv4 } from 'uuid';

export class BillingRepository {
  // Invoice Operations
  
  async createInvoice(invoiceData: CreateInvoiceRequest, createdBy: string): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();
    const invoiceId = uuidv4();
    
    return await transaction(async (client: PoolClient) => {
      // Get patient information
      const patientQuery = `
        SELECT p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, 
               p.address_line1, p.address_line2, p.city, p.state, p.pincode
        FROM patient_schema.patients p
        WHERE p.id = $1
      `;
      const patientResult = await client.query(patientQuery, [invoiceData.patientId]);
      
      if (patientResult.rows.length === 0) {
        throw new Error('Patient not found');
      }
      
      const patient = patientResult.rows[0];
      const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
      
      // Create invoice header
      const invoiceQuery = `
        INSERT INTO billing_schema.invoices (
          id, invoice_number, patient_id, invoice_type, status, invoice_date, due_date,
          visit_id, appointment_id, doctor_id, department_id, department_name,
          patient_name, patient_age, patient_gender, patient_phone, patient_address,
          subtotal, balance_amount, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `;
      
      const patientAddress = `${patient.address_line1 || ''}, ${patient.address_line2 || ''}, ${patient.city || ''}, ${patient.state || ''} - ${patient.pincode || ''}`.trim();
      const dueDate = invoiceData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      const invoiceValues = [
        invoiceId, invoiceNumber, invoiceData.patientId, invoiceData.invoiceType,
        InvoiceStatus.DRAFT, new Date(), dueDate,
        invoiceData.visitId, invoiceData.appointmentId,
        invoiceData.doctorId || null, null, null, // Will be updated later
        `${patient.first_name} ${patient.last_name}`, age, patient.gender,
        patient.phone, patientAddress,
        0, 0, createdBy
      ];
      
      const invoiceResult = await client.query(invoiceQuery, invoiceValues);
      const invoice = invoiceResult.rows[0];
      
      // Add invoice items
      let subtotal = 0;
      const items = [];
      
      for (const item of invoiceData.items) {
        // Get billable item details
        const itemQuery = `
          SELECT item_name, description, hsn_code, sac_code, unit_price,
                 cgst_rate, sgst_rate, igst_rate, cess_rate
          FROM billing_schema.billable_items
          WHERE item_id = $1 AND is_active = true
        `;
        const itemResult = await client.query(itemQuery, [item.itemId]);
        
        if (itemResult.rows.length === 0) {
          throw new Error(`Billable item ${item.itemId} not found`);
        }
        
        const billableItem = itemResult.rows[0];
        const unitPrice = item.unitPrice || billableItem.unit_price;
        const grossAmount = item.quantity * unitPrice;
        
        // Calculate discount
        let discountAmount = 0;
        if (item.discount) {
          if (invoiceData.items.find(i => i.itemId === item.itemId)?.discountType === 'PERCENTAGE') {
            discountAmount = (grossAmount * item.discount) / 100;
          } else {
            discountAmount = item.discount;
          }
        }
        
        const taxableAmount = grossAmount - discountAmount;
        
        // Calculate tax
        const cgstAmount = (taxableAmount * billableItem.cgst_rate) / 100;
        const sgstAmount = (taxableAmount * billableItem.sgst_rate) / 100;
        const igstAmount = (taxableAmount * billableItem.igst_rate) / 100;
        const cessAmount = (taxableAmount * billableItem.cess_rate) / 100;
        const totalTax = cgstAmount + sgstAmount + igstAmount + cessAmount;
        
        const totalAmount = taxableAmount + totalTax;
        subtotal += totalAmount;
        
        // Insert invoice item
        const invoiceItemQuery = `
          INSERT INTO billing_schema.invoice_items (
            id, invoice_id, item_id, item_code, item_name, description,
            hsn_sac_code, quantity, unit_price, gross_amount, discount_amount,
            taxable_amount, cgst_amount, sgst_amount, igst_amount, cess_amount,
            total_amount, is_billable, is_taxable, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *
        `;
        
        const invoiceItemValues = [
          uuidv4(), invoiceId, item.itemId, billableItem.item_code || item.itemId,
          billableItem.item_name, billableItem.description,
          billableItem.hsn_code || billableItem.sac_code,
          item.quantity, unitPrice, grossAmount, discountAmount, taxableAmount,
          cgstAmount, sgstAmount, igstAmount, cessAmount, totalAmount,
          true, true, createdBy
        ];
        
        const itemResult2 = await client.query(invoiceItemQuery, invoiceItemValues);
        items.push(itemResult2.rows[0]);
      }
      
      // Update invoice totals
      const totalTax = items.reduce((sum, item) => 
        sum + parseFloat(item.cgst_amount) + parseFloat(item.sgst_amount) + 
        parseFloat(item.igst_amount) + parseFloat(item.cess_amount), 0
      );
      
      const totalAmount = subtotal;
      const taxBreakdown = {
        cgst: { amount: items.reduce((sum, item) => sum + parseFloat(item.cgst_amount), 0) },
        sgst: { amount: items.reduce((sum, item) => sum + parseFloat(item.sgst_amount), 0) },
        igst: { amount: items.reduce((sum, item) => sum + parseFloat(item.igst_amount), 0) },
        cess: { amount: items.reduce((sum, item) => sum + parseFloat(item.cess_amount), 0) },
        total: totalTax
      };
      
      const updateQuery = `
        UPDATE billing_schema.invoices 
        SET subtotal = $1, total_amount = $2, tax_amount = $3, balance_amount = $2,
            tax_details = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `;
      
      const updatedResult = await client.query(updateQuery, [
        subtotal - totalTax, totalAmount, totalTax,
        JSON.stringify(taxBreakdown), invoiceId
      ]);
      
      return {
        ...updatedResult.rows[0],
        items: items.map(item => ({
          id: item.id,
          itemId: item.item_id,
          itemCode: item.item_code,
          itemName: item.item_name,
          description: item.description,
          hsnSacCode: item.hsn_sac_code,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          grossAmount: parseFloat(item.gross_amount),
          discount: {
            amount: parseFloat(item.discount_amount),
            type: 'FIXED'
          },
          taxableAmount: parseFloat(item.taxable_amount),
          tax: {
            cgst: { amount: parseFloat(item.cgst_amount), rate: billableItem.cgst_rate },
            sgst: { amount: parseFloat(item.sgst_amount), rate: billableItem.sgst_rate },
            igst: { amount: parseFloat(item.igst_amount), rate: billableItem.igst_rate },
            cess: { amount: parseFloat(item.cess_amount), rate: billableItem.cess_rate },
            total: parseFloat(item.cgst_amount) + parseFloat(item.sgst_amount) + 
                   parseFloat(item.igst_amount) + parseFloat(item.cess_amount)
          },
          totalAmount: parseFloat(item.total_amount),
          isBillable: item.is_billable,
          isTaxable: item.is_taxable
        }))
      };
    });
  }
  
  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    const invoiceQuery = `
      SELECT i.*, 
             JSON_AGG(
               json_build_object(
                 'id', ii.id,
                 'itemId', ii.item_id,
                 'itemCode', ii.item_code,
                 'itemName', ii.item_name,
                 'description', ii.description,
                 'hsnSacCode', ii.hsn_sac_code,
                 'quantity', ii.quantity,
                 'unitPrice', ii.unit_price,
                 'grossAmount', ii.gross_amount,
                 'discountAmount', ii.discount_amount,
                 'taxableAmount', ii.taxable_amount,
                 'taxAmount', ii.tax_amount,
                 'totalAmount', ii.total_amount,
                 'isBillable', ii.is_billable,
                 'isTaxable', ii.is_taxable
               )
             ) as items
      FROM billing_schema.invoices i
      LEFT JOIN billing_schema.invoice_items ii ON i.id = ii.invoice_id
      WHERE i.id = $1
      GROUP BY i.id
    `;
    
    const result = await query(invoiceQuery, [invoiceId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const invoice = result.rows[0];
    return this.mapInvoiceFromDb(invoice);
  }
  
  async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus, updatedBy: string): Promise<Invoice | null> {
    const updateQuery = `
      UPDATE billing_schema.invoices 
      SET status = $1, updated_at = NOW(), updated_by = $2
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await query(updateQuery, [status, updatedBy, invoiceId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.getInvoiceById(invoiceId);
  }
  
  async getInvoicesByPatientId(patientId: string, limit = 50, offset = 0): Promise<Invoice[]> {
    const queryStr = `
      SELECT i.*, 
             JSON_AGG(
               json_build_object(
                 'id', ii.id,
                 'itemId', ii.item_id,
                 'itemName', ii.item_name,
                 'quantity', ii.quantity,
                 'totalAmount', ii.total_amount
               )
             ) as items
      FROM billing_schema.invoices i
      LEFT JOIN billing_schema.invoice_items ii ON i.id = ii.invoice_id
      WHERE i.patient_id = $1
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await query(queryStr, [patientId, limit, offset]);
    return result.rows.map(invoice => this.mapInvoiceFromDb(invoice));
  }
  
  async getOutstandingInvoices(): Promise<Invoice[]> {
    const queryStr = `
      SELECT i.*, 
             JSON_AGG(
               json_build_object(
                 'id', ii.id,
                 'itemId', ii.item_id,
                 'itemName', ii.item_name,
                 'quantity', ii.quantity,
                 'totalAmount', ii.total_amount
               )
             ) as items
      FROM billing_schema.invoices i
      LEFT JOIN billing_schema.invoice_items ii ON i.id = ii.invoice_id
      WHERE i.status IN ('PENDING', 'PARTIALLY_PAID') 
        AND i.due_date < NOW()
      GROUP BY i.id
      ORDER BY i.due_date ASC
    `;
    
    const result = await query(queryStr);
    return result.rows.map(invoice => this.mapInvoiceFromDb(invoice));
  }
  
  // Payment Operations
  
  async createPayment(paymentData: CreatePaymentRequest, createdBy: string): Promise<PaymentTransaction> {
    const paymentId = uuidv4();
    const transactionNumber = await this.generateTransactionNumber();
    
    return await transaction(async (client: PoolClient) => {
      // Create payment transaction
      const paymentQuery = `
        INSERT INTO billing_schema.payment_transactions (
          id, payment_id, invoice_id, patient_id, transaction_number,
          payment_method, payment_mode, amount, status, transaction_date,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const paymentValues = [
        uuidv4(), paymentId, paymentData.invoiceId, paymentData.patientId,
        transactionNumber, paymentData.paymentMethod, paymentData.paymentMode,
        paymentData.amount, PaymentStatus.PENDING, new Date(), createdBy
      ];
      
      const result = await client.query(paymentQuery, paymentValues);
      
      // Store additional payment details based on payment method
      if (paymentData.cardInfo) {
        await this.storeCardDetails(client, paymentId, paymentData.cardInfo);
      } else if (paymentData.bankInfo) {
        await this.storeBankDetails(client, paymentId, paymentData.bankInfo);
      } else if (paymentData.upiInfo) {
        await this.storeUpiDetails(client, paymentId, paymentData.upiInfo);
      }
      
      return result.rows[0];
    });
  }
  
  async updatePaymentStatus(paymentId: string, status: PaymentStatus, gatewayInfo?: any): Promise<PaymentTransaction | null> {
    const updateQuery = `
      UPDATE billing_schema.payment_transactions 
      SET status = $1, updated_at = NOW(), gateway_info = $2
      WHERE payment_id = $1
      RETURNING *
    `;
    
    const result = await query(updateQuery, [status, gatewayInfo ? JSON.stringify(gatewayInfo) : null]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // If payment is completed, update invoice balance
    if (status === PaymentStatus.COMPLETED) {
      await this.updateInvoiceBalance(result.rows[0].invoice_id);
    }
    
    return this.mapPaymentFromDb(result.rows[0]);
  }
  
  async getPaymentsByInvoiceId(invoiceId: string): Promise<PaymentTransaction[]> {
    const queryStr = `
      SELECT * FROM billing_schema.payment_transactions
      WHERE invoice_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await query(queryStr, [invoiceId]);
    return result.rows.map(payment => this.mapPaymentFromDb(payment));
  }
  
  // Billable Items Operations
  
  async createBillableItem(itemData: Partial<BillableItem>, createdBy: string): Promise<BillableItem> {
    const itemId = uuidv4();
    const itemCode = itemData.itemId || await this.generateItemCode();
    
    const queryStr = `
      INSERT INTO billing_schema.billable_items (
        id, item_id, item_code, item_name, description, category, subcategory,
        hsn_code, sac_code, unit_of_measurement, standard_rate, cost,
        cgst_rate, sgst_rate, igst_rate, cess_rate, is_active,
        department_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;
    
    const values = [
      uuidv4(), itemId, itemCode, itemData.name, itemData.description,
      itemData.category, itemData.subcategory, itemData.hsnCode, itemData.sacCode,
      itemData.unitOfMeasurement, itemData.standardRate, itemData.cost,
      itemData.taxRate?.cgst || 9, itemData.taxRate?.sgst || 9,
      itemData.taxRate?.igst || 18, itemData.taxRate?.cess || 0,
      true, itemData.departmentId, createdBy
    ];
    
    const result = await query(queryStr, values);
    return this.mapBillableItemFromDb(result.rows[0]);
  }
  
  async getBillableItems(filters?: { category?: string; departmentId?: string; isActive?: boolean }): Promise<BillableItem[]> {
    let queryStr = `
      SELECT * FROM billing_schema.billable_items
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;
    
    if (filters?.category) {
      queryStr += ` AND category = $${++paramCount}`;
      params.push(filters.category);
    }
    
    if (filters?.departmentId) {
      queryStr += ` AND department_id = $${++paramCount}`;
      params.push(filters.departmentId);
    }
    
    if (filters?.isActive !== undefined) {
      queryStr += ` AND is_active = $${++paramCount}`;
      params.push(filters.isActive);
    }
    
    queryStr += ' ORDER BY item_name';
    
    const result = await query(queryStr, params);
    return result.rows.map(item => this.mapBillableItemFromDb(item));
  }
  
  // Analytics Operations
  
  async getBillingAnalytics(startDate: Date, endDate: Date): Promise<BillingAnalytics> {
    const analyticsQuery = `
      WITH invoice_stats AS (
        SELECT 
          COUNT(*) as total_invoices,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_invoice_value,
          department_id,
          department_name
        FROM billing_schema.invoices
        WHERE invoice_date BETWEEN $1 AND $2
          AND status != 'CANCELLED'
        GROUP BY department_id, department_name
      ),
      payment_stats AS (
        SELECT 
          payment_method,
          COUNT(*) as count,
          SUM(amount) as amount
        FROM billing_schema.payment_transactions
        WHERE transaction_date BETWEEN $1 AND $2
          AND status = 'COMPLETED'
        GROUP BY payment_method
      ),
      aging_stats AS (
        SELECT 
          SUM(CASE WHEN balance_amount > 0 AND due_date >= NOW() THEN balance_amount ELSE 0 END) as current,
          SUM(CASE WHEN balance_amount > 0 AND due_date < NOW() 
                   AND due_date >= NOW() - INTERVAL '30 days' THEN balance_amount ELSE 0 END) as days1to30,
          SUM(CASE WHEN balance_amount > 0 AND due_date < NOW() - INTERVAL '30 days'
                   AND due_date >= NOW() - INTERVAL '60 days' THEN balance_amount ELSE 0 END) as days31to60,
          SUM(CASE WHEN balance_amount > 0 AND due_date < NOW() - INTERVAL '60 days'
                   AND due_date >= NOW() - INTERVAL '90 days' THEN balance_amount ELSE 0 END) as days61to90,
          SUM(CASE WHEN balance_amount > 0 AND due_date < NOW() - INTERVAL '90 days' THEN balance_amount ELSE 0 END) as days91plus
        FROM billing_schema.invoices
        WHERE created_at BETWEEN $1 AND $2
      )
      SELECT 
        (SELECT SUM(total_amount) FROM invoice_stats) as total_revenue,
        (SELECT COUNT(*) FROM billing_schema.invoices WHERE invoice_date BETWEEN $1 AND $2 AND status != 'CANCELLED') as total_invoices,
        (SELECT AVG(total_amount) FROM billing_schema.invoices WHERE invoice_date BETWEEN $1 AND $2 AND status != 'CANCELLED') as average_invoice_value,
        JSON_AGG(json_build_object(
          'departmentId', department_id,
          'departmentName', department_name,
          'revenue', SUM(total_amount),
          'invoiceCount', COUNT(*)
        )) as revenue_by_department,
        (SELECT * FROM payment_stats) as payment_method_breakdown,
        (SELECT * FROM aging_stats) as aging_analysis
      FROM invoice_stats
      GROUP BY 1
    `;
    
    const result = await query(analyticsQuery, [startDate, endDate]);
    const row = result.rows[0];
    
    return {
      period: { startDate, endDate },
      totalRevenue: parseFloat(row.total_revenue) || 0,
      totalInvoices: parseInt(row.total_invoices) || 0,
      averageInvoiceValue: parseFloat(row.average_invoice_value) || 0,
      revenueByDepartment: row.revenue_by_department || [],
      paymentMethodBreakdown: row.payment_method_breakdown?.map((pm: any) => ({
        method: pm.payment_method,
        amount: parseFloat(pm.amount),
        percentage: 0, // Will be calculated
        count: parseInt(pm.count)
      })) || [],
      agingAnalysis: {
        current: parseFloat(row.aging_analysis?.current) || 0,
        days1to30: parseFloat(row.aging_analysis?.days1to30) || 0,
        days31to60: parseFloat(row.aging_analysis?.days31to60) || 0,
        days61to90: parseFloat(row.aging_analysis?.days61to90) || 0,
        days91plus: parseFloat(row.aging_analysis?.days91plus) || 0
      },
      topServices: [],
      insuranceMetrics: {
        totalClaims: 0,
        approvedAmount: 0,
        rejectedAmount: 0,
        averageProcessingTime: 0
      },
      revenueByService: []
    };
  }
  
  // Helper Methods
  
  private async generateInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const queryStr = `
      SELECT COUNT(*) as count 
      FROM billing_schema.invoices 
      WHERE EXTRACT(YEAR FROM created_at) = $1
    `;
    
    const result = await query(queryStr, [currentYear]);
    const count = parseInt(result.rows[0].count) + 1;
    
    return `INV-${currentYear}${month}-${String(count).padStart(6, '0')}`;
  }
  
  private async generateTransactionNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const timestamp = Date.now();
    
    return `TXN-${currentYear}-${timestamp}`;
  }
  
  private async generateItemCode(): Promise<string> {
    const queryStr = `
      SELECT MAX(CAST(SUBSTRING(item_code FROM 5) AS INTEGER)) as max_code
      FROM billing_schema.billable_items
      WHERE item_code LIKE 'ITEM-%'
    `;
    
    const result = await query(queryStr);
    const maxCode = parseInt(result.rows[0].max_code) || 0;
    
    return `ITEM-${String(maxCode + 1).padStart(6, '0')}`;
  }
  
  private async storeCardDetails(client: PoolClient, paymentId: string, cardInfo: any): Promise<void> {
    const queryStr = `
      INSERT INTO billing_schema.payment_card_details (
        id, payment_id, last_four_digits, card_type, card_brand,
        expiry_month, expiry_year, card_holder_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    const values = [
      uuidv4(), paymentId,
      cardInfo.cardNumber.slice(-4),
      'CREDIT', // Default
      this.detectCardBrand(cardInfo.cardNumber),
      cardInfo.expiryMonth,
      cardInfo.expiryYear,
      cardInfo.cardHolderName
    ];
    
    await client.query(queryStr, values);
  }
  
  private async storeBankDetails(client: PoolClient, paymentId: string, bankInfo: any): Promise<void> {
    const queryStr = `
      INSERT INTO billing_schema.payment_bank_details (
        id, payment_id, bank_name, account_number, ifsc_code,
        transaction_ref, cheque_number, cheque_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    const values = [
      uuidv4(), paymentId, bankInfo.bankName, bankInfo.accountNumber,
      bankInfo.ifscCode, bankInfo.transactionRef, bankInfo.chequeNumber, bankInfo.chequeDate
    ];
    
    await client.query(queryStr, values);
  }
  
  private async storeUpiDetails(client: PoolClient, paymentId: string, upiInfo: any): Promise<void> {
    const queryStr = `
      INSERT INTO billing_schema.payment_upi_details (
        id, payment_id, vpa, transaction_id, customer_mobile
      ) VALUES ($1, $2, $3, $4, $5)
    `;
    
    const values = [uuidv4(), paymentId, upiInfo.vpa, upiInfo.transactionId, upiInfo.customerMobile];
    await client.query(queryStr, values);
  }
  
  private async updateInvoiceBalance(invoiceId: string): Promise<void> {
    const updateQuery = `
      UPDATE billing_schema.invoices 
      SET 
        paid_amount = (
          SELECT COALESCE(SUM(amount), 0) 
          FROM billing_schema.payment_transactions 
          WHERE invoice_id = $1 AND status = 'COMPLETED'
        ),
        balance_amount = total_amount - (
          SELECT COALESCE(SUM(amount), 0) 
          FROM billing_schema.payment_transactions 
          WHERE invoice_id = $1 AND status = 'COMPLETED'
        ),
        status = CASE 
          WHEN total_amount = (SELECT COALESCE(SUM(amount), 0) FROM billing_schema.payment_transactions WHERE invoice_id = $1 AND status = 'COMPLETED') 
          THEN 'PAID'
          WHEN (SELECT COALESCE(SUM(amount), 0) FROM billing_schema.payment_transactions WHERE invoice_id = $1 AND status = 'COMPLETED') > 0 
          THEN 'PARTIALLY_PAID'
          ELSE 'PENDING'
        END,
        updated_at = NOW()
      WHERE id = $1
    `;
    
    await query(updateQuery, [invoiceId]);
  }
  
  private detectCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\D/g, '');
    
    if (number.startsWith('4')) return 'VISA';
    if (number.startsWith('5')) return 'MASTERCARD';
    if (number.startsWith('3')) return 'AMEX';
    if (number.startsWith('6')) return 'DISCOVER';
    
    return 'OTHER';
  }
  
  private mapInvoiceFromDb(row: any): Invoice {
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      patientId: row.patient_id,
      patientInfo: {
        name: row.patient_name,
        age: row.patient_age,
        gender: row.patient_gender,
        phone: row.patient_phone,
        address: row.patient_address
      },
      invoiceType: row.invoice_type,
      status: row.status,
      invoiceDate: row.invoice_date,
      dueDate: row.due_date,
      visitId: row.visit_id,
      appointmentId: row.appointment_id,
      doctorId: row.doctor_id,
      departmentId: row.department_id,
      departmentName: row.department_name,
      items: row.items || [],
      subtotal: parseFloat(row.subtotal) || 0,
      discount: {
        amount: parseFloat(row.discount_amount) || 0,
        type: 'FIXED'
      },
      tax: row.tax_details ? JSON.parse(row.tax_details) : {
        cgst: { amount: 0, rate: 0 },
        sgst: { amount: 0, rate: 0 },
        igst: { amount: 0, rate: 0 },
        cess: { amount: 0, rate: 0 },
        total: 0
      },
      totalAmount: parseFloat(row.total_amount) || 0,
      paidAmount: parseFloat(row.paid_amount) || 0,
      balanceAmount: parseFloat(row.balance_amount) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }
  
  private mapPaymentFromDb(row: any): PaymentTransaction {
    return {
      id: row.id,
      paymentId: row.payment_id,
      invoiceId: row.invoice_id,
      patientId: row.patient_id,
      transactionNumber: row.transaction_number,
      paymentMethod: row.payment_method,
      paymentMode: row.payment_mode,
      amount: parseFloat(row.amount),
      status: row.status,
      currency: row.currency || 'INR',
      transactionDate: row.transaction_date,
      gatewayInfo: row.gateway_info ? JSON.parse(row.gateway_info) : undefined,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }
  
  private mapBillableItemFromDb(row: any): BillableItem {
    return {
      id: row.id,
      itemId: row.item_id,
      name: row.item_name,
      description: row.description,
      category: row.category,
      subcategory: row.subcategory,
      hsnCode: row.hsn_code,
      sacCode: row.sac_code,
      unitOfMeasurement: row.unit_of_measurement,
      standardRate: parseFloat(row.standard_rate),
      cost: parseFloat(row.cost),
      taxRate: {
        cgst: parseFloat(row.cgst_rate),
        sgst: parseFloat(row.sgst_rate),
        igst: parseFloat(row.igst_rate),
        cess: parseFloat(row.cess_rate)
      },
      isActive: row.is_active,
      departmentId: row.department_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }
}

export default BillingRepository;