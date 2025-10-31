/**
 * Clinical Repository
 * HMS Enterprise
 * 
 * Comprehensive database operations for clinical data including visits,
 * prescriptions, lab results, imaging, and medical records.
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../../../shared/utils/logger';
import {
  ClinicalVisit,
  ClinicalDiagnosis,
  ClinicalProcedure,
  Prescription,
  LabOrder,
  LabResult,
  ImagingOrder,
  ImagingReport,
  MedicalRecord,
  ClinicalTask,
  QualityMetric,
  CriticalFinding,
  CreateVisitRequestType,
  UpdateVisitRequest,
  ClinicalSearchParamsType,
  CreatePrescriptionRequestType,
  CreateLabOrderRequestType,
  CreateImagingOrderRequestType,
  VisitType,
  VisitStatus,
  ClinicalPriority,
  PrescriptionStatus,
  LabTestStatus,
  ImagingStatus,
  TaskStatus,
  TaskPriority,
  DocumentType,
  DocumentCategory
} from '../models/clinical.model';

export class ClinicalRepository {
  constructor(private db: Pool) {}

  // Helper methods
  private async createVisitNumber(): Promise<string> {
    const query = `
      SELECT nextval('clinical_schema.visit_number_seq') as number;
    `;
    const result = await this.db.query(query);
    const number = result.rows[0].number;
    const year = new Date().getFullYear();
    return `VST-${year}-${number.toString().padStart(8, '0')}`;
  }

  private async createPrescriptionNumber(): Promise<string> {
    const query = `
      SELECT nextval('clinical_schema.prescription_number_seq') as number;
    `;
    const result = await this.db.query(query);
    const number = result.rows[0].number;
    const year = new Date().getFullYear();
    return `RX-${year}-${number.toString().padStart(8, '0')}`;
  }

  private async createLabOrderNumber(): Promise<string> {
    const query = `
      SELECT nextval('clinical_schema.lab_order_number_seq') as number;
    `;
    const result = await this.db.query(query);
    const number = result.rows[0].number;
    const year = new Date().getFullYear();
    return `LAB-${year}-${number.toString().padStart(8, '0')}`;
  }

  private async createImagingOrderNumber(): Promise<string> {
    const query = `
      SELECT nextval('clinical_schema.imaging_order_number_seq') as number;
    `;
    const result = await this.db.query(query);
    const number = result.rows[0].number;
    const year = new Date().getFullYear();
    return `IMG-${year}-${number.toString().padStart(8, '0')}`;
  }

  private async createTaskNumber(): Promise<string> {
    const query = `
      SELECT nextval('clinical_schema.task_number_seq') as number;
    `;
    const result = await this.db.query(query);
    const number = result.rows[0].number;
    const year = new Date().getFullYear();
    return `TSK-${year}-${number.toString().padStart(8, '0')}`;
  }

  // Clinical Visit Operations
  async createVisit(visitData: CreateVisitRequestType, createdBy: string, tenantId: string): Promise<ClinicalVisit> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const visitNumber = await this.createVisitNumber();

      const query = `
        INSERT INTO clinical_schema.visits (
          visit_number, patient_id, appointment_id, visit_type, status, priority,
          doctor_id, department_id, facility_id, scheduled_date_time,
          chief_complaint, history_of_present_illness, past_medical_history,
          family_history, social_history, surgical_history, allergy_history,
          medications, review_of_systems, created_by, updated_by, tenant_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) RETURNING *;
      `;

      const values = [
        visitNumber,
        visitData.patientId,
        visitData.appointmentId || null,
        visitData.visitType,
        VisitStatus.SCHEDULED,
        visitData.priority,
        visitData.doctorId,
        visitData.departmentId,
        visitData.facilityId,
        new Date(),
        visitData.chiefComplaint,
        visitData.historyOfPresentIllness,
        visitData.pastMedicalHistory || null,
        visitData.familyHistory || null,
        visitData.socialHistory || null,
        visitData.surgicalHistory || null,
        visitData.allergyHistory || null,
        visitData.medications || null,
        JSON.stringify(visitData.reviewOfSystems || {}),
        createdBy,
        createdBy,
        tenantId
      ];

      const result = await client.query(query, values);
      const visit = result.rows[0];

      await client.query('COMMIT');

      // Fetch complete visit data with relationships
      const completeVisit = await this.findVisitById(visit.id);
      if (!completeVisit) {
        throw new Error('Failed to retrieve created visit');
      }

      return completeVisit;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating clinical visit', { error: error.message, visitData });
      throw error;
    } finally {
      client.release();
    }
  }

  async findVisitById(visitId: string): Promise<ClinicalVisit | null> {
    const query = `
      SELECT 
        v.*,
        u.first_name || ' ' || u.last_name as doctor_name,
        d.name as department_name,
        f.name as facility_name
      FROM clinical_schema.visits v
      LEFT JOIN user_schema.users u ON v.doctor_id = u.id
      LEFT JOIN user_schema.departments d ON v.department_id = d.id
      LEFT JOIN user_schema.facilities f ON v.facility_id = f.id
      WHERE v.id = $1 AND v.deleted_at IS NULL;
    `;

    const result = await this.db.query(query, [visitId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const visit = result.rows[0];

    // Fetch related data
    const [diagnoses, procedures, prescriptions, labOrders, imagingOrders] = await Promise.all([
      this.getVisitDiagnoses(visitId),
      this.getVisitProcedures(visitId),
      this.getVisitPrescriptions(visitId),
      this.getVisitLabOrders(visitId),
      this.getVisitImagingOrders(visitId)
    ]);

    return {
      ...visit,
      review_of_systems: typeof visit.review_of_systems === 'string' 
        ? JSON.parse(visit.review_of_systems) 
        : visit.review_of_systems,
      vital_signs: visit.vital_signs ? JSON.parse(visit.vital_signs) : undefined,
      physical_examination: visit.physical_examination ? JSON.parse(visit.physical_examination) : undefined,
      diagnosis: diagnoses,
      procedures: procedures,
      prescriptions: prescriptions,
      lab_orders: labOrders,
      imaging_orders: imagingOrders,
      attachments: [], // TODO: Implement attachment fetching
      billing_codes: [], // TODO: Implement billing codes fetching
      quality_metrics: [] // TODO: Implement quality metrics fetching
    };
  }

  async updateVisit(visitId: string, updateData: UpdateVisitRequest, updatedBy: string): Promise<ClinicalVisit> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(updateData.status);
      }

      if (updateData.chiefComplaint !== undefined) {
        updateFields.push(`chief_complaint = $${paramCount++}`);
        values.push(updateData.chiefComplaint);
      }

      if (updateData.historyOfPresentIllness !== undefined) {
        updateFields.push(`history_of_present_illness = $${paramCount++}`);
        values.push(updateData.historyOfPresentIllness);
      }

      if (updateData.vitalSigns !== undefined) {
        updateFields.push(`vital_signs = $${paramCount++}`);
        values.push(JSON.stringify(updateData.vitalSigns));
      }

      if (updateData.physicalExamination !== undefined) {
        updateFields.push(`physical_examination = $${paramCount++}`);
        values.push(JSON.stringify(updateData.physicalExamination));
      }

      if (updateData.assessment !== undefined) {
        updateFields.push(`assessment = $${paramCount++}`);
        values.push(updateData.assessment);
      }

      if (updateData.plan !== undefined) {
        updateFields.push(`plan = $${paramCount++}`);
        values.push(updateData.plan);
      }

      if (updateData.followUpInstructions !== undefined) {
        updateFields.push(`follow_up_instructions = $${paramCount++}`);
        values.push(updateData.followUpInstructions);
      }

      if (updateData.nextVisitDate !== undefined) {
        updateFields.push(`next_visit_date = $${paramCount++}`);
        values.push(updateData.nextVisitDate);
      }

      if (updateData.dischargeNotes !== undefined) {
        updateFields.push(`discharge_notes = $${paramCount++}`);
        values.push(updateData.dischargeNotes);
      }

      updateFields.push(`updated_by = $${paramCount++}`);
      updateFields.push(`updated_at = $${paramCount++}`);
      values.push(updatedBy, new Date());

      values.push(visitId);

      const query = `
        UPDATE clinical_schema.visits 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *;
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Visit not found');
      }

      // Update diagnosis and procedures if provided
      if (updateData.diagnosis !== undefined) {
        await this.updateVisitDiagnoses(visitId, updateData.diagnosis, client);
      }

      if (updateData.procedures !== undefined) {
        await this.updateVisitProcedures(visitId, updateData.procedures, client);
      }

      await client.query('COMMIT');

      // Fetch complete updated visit
      const updatedVisit = await this.findVisitById(visitId);
      if (!updatedVisit) {
        throw new Error('Failed to retrieve updated visit');
      }

      return updatedVisit;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating clinical visit', { error: error.message, visitId, updateData });
      throw error;
    } finally {
      client.release();
    }
  }

  async searchVisits(searchParams: ClinicalSearchParamsType): Promise<{
    visits: ClinicalVisit[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      patientId,
      doctorId,
      departmentId,
      facilityId,
      visitType,
      status,
      dateRange,
      diagnosis,
      chiefComplaint,
      priority,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = searchParams;

    const offset = (page - 1) * limit;

    // Build WHERE clauses
    const whereConditions: string[] = ['v.deleted_at IS NULL'];
    const values: any[] = [];
    let paramCount = 1;

    if (patientId) {
      whereConditions.push(`v.patient_id = $${paramCount++}`);
      values.push(patientId);
    }

    if (doctorId) {
      whereConditions.push(`v.doctor_id = $${paramCount++}`);
      values.push(doctorId);
    }

    if (departmentId) {
      whereConditions.push(`v.department_id = $${paramCount++}`);
      values.push(departmentId);
    }

    if (facilityId) {
      whereConditions.push(`v.facility_id = $${paramCount++}`);
      values.push(facilityId);
    }

    if (visitType) {
      whereConditions.push(`v.visit_type = $${paramCount++}`);
      values.push(visitType);
    }

    if (status) {
      whereConditions.push(`v.status = $${paramCount++}`);
      values.push(status);
    }

    if (priority) {
      whereConditions.push(`v.priority = $${paramCount++}`);
      values.push(priority);
    }

    if (dateRange) {
      whereConditions.push(`v.created_at >= $${paramCount++}`);
      values.push(dateRange.startDate);
      whereConditions.push(`v.created_at <= $${paramCount++}`);
      values.push(dateRange.endDate);
    }

    if (chiefComplaint) {
      whereConditions.push(`v.chief_complaint ILIKE $${paramCount++}`);
      values.push(`%${chiefComplaint}%`);
    }

    // Validate sort field
    const allowedSortFields = ['created_at', 'scheduled_date_time', 'chief_complaint', 'status', 'priority'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clinical_schema.visits v
      WHERE ${whereConditions.join(' AND ')};
    `;

    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Data query
    const dataQuery = `
      SELECT 
        v.*,
        u.first_name || ' ' || u.last_name as doctor_name,
        d.name as department_name,
        f.name as facility_name
      FROM clinical_schema.visits v
      LEFT JOIN user_schema.users u ON v.doctor_id = u.id
      LEFT JOIN user_schema.departments d ON v.department_id = d.id
      LEFT JOIN user_schema.facilities f ON v.facility_id = f.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY v.${validSortBy} ${validSortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++};
    `;

    values.push(limit, offset);

    const dataResult = await this.db.query(dataQuery, values);
    const visits = dataResult.rows;

    // Fetch complete data for each visit
    const completeVisits = await Promise.all(
      visits.map(async (visit) => {
        const [diagnoses, procedures, prescriptions, labOrders, imagingOrders] = await Promise.all([
          this.getVisitDiagnoses(visit.id),
          this.getVisitProcedures(visit.id),
          this.getVisitPrescriptions(visit.id),
          this.getVisitLabOrders(visit.id),
          this.getVisitImagingOrders(visit.id)
        ]);

        return {
          ...visit,
          review_of_systems: typeof visit.review_of_systems === 'string' 
            ? JSON.parse(visit.review_of_systems) 
            : visit.review_of_systems,
          vital_signs: visit.vital_signs ? JSON.parse(visit.vital_signs) : undefined,
          physical_examination: visit.physical_examination ? JSON.parse(visit.physical_examination) : undefined,
          diagnosis: diagnoses,
          procedures: procedures,
          prescriptions: prescriptions,
          lab_orders: labOrders,
          imaging_orders: imagingOrders,
          attachments: [],
          billing_codes: [],
          quality_metrics: []
        };
      })
    );

    return {
      visits: completeVisits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Prescription Operations
  async createPrescription(prescriptionData: CreatePrescriptionRequestType, createdBy: string, tenantId: string): Promise<Prescription> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const prescriptionNumber = await this.createPrescriptionNumber();

      const query = `
        INSERT INTO clinical_schema.prescriptions (
          prescription_number, patient_id, visit_id, doctor_id, status,
          medication_id, medication_name, generic_name, brand_name,
          strength, dosage, route, frequency, duration, quantity,
          unit, instructions, indications, prn, prn_indications,
          controlled_substance, schedule, refills, refills_used,
          substitutions_allowed, notes, pharmacy_id, created_by, updated_by, tenant_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27, $28, $29, $30
        ) RETURNING *;
      `;

      const values = [
        prescriptionNumber,
        prescriptionData.patientId,
        prescriptionData.visitId,
        prescriptionData.doctorId,
        PrescriptionStatus.PRESCRIBED,
        prescriptionData.medicationId,
        prescriptionData.medicationName,
        prescriptionData.genericName,
        prescriptionData.brandName || null,
        prescriptionData.strength,
        prescriptionData.dosage,
        prescriptionData.route,
        prescriptionData.frequency,
        prescriptionData.duration,
        prescriptionData.quantity,
        prescriptionData.unit,
        prescriptionData.instructions,
        prescriptionData.indications,
        prescriptionData.prn,
        prescriptionData.prnIndications || null,
        prescriptionData.controlledSubstance,
        prescriptionData.schedule || null,
        prescriptionData.refills,
        0, // refills_used
        prescriptionData.substitutionsAllowed,
        prescriptionData.notes || null,
        prescriptionData.pharmacyId || null,
        createdBy,
        createdBy,
        tenantId
      ];

      const result = await client.query(query, values);
      const prescription = result.rows[0];

      await client.query('COMMIT');

      // Fetch complete prescription data
      const completePrescription = await this.findPrescriptionById(prescription.id);
      if (!completePrescription) {
        throw new Error('Failed to retrieve created prescription');
      }

      return completePrescription;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating prescription', { error: error.message, prescriptionData });
      throw error;
    } finally {
      client.release();
    }
  }

  async findPrescriptionById(prescriptionId: string): Promise<Prescription | null> {
    const query = `
      SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as doctor_name,
        pt.first_name || ' ' || pt.last_name as patient_name,
        pharm.name as pharmacy_name
      FROM clinical_schema.prescriptions p
      LEFT JOIN user_schema.users u ON p.doctor_id = u.id
      LEFT JOIN patient_schema.patients pt ON p.patient_id = pt.id
      LEFT JOIN pharmacy_schema.pharmacies pharm ON p.pharmacy_id = pharm.id
      WHERE p.id = $1 AND p.deleted_at IS NULL;
    `;

    const result = await this.db.query(query, [prescriptionId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const prescription = result.rows[0];

    // Fetch related data
    const [dispensedItems, adverseReactions, adherence] = await Promise.all([
      this.getPrescriptionDispensedItems(prescriptionId),
      this.getPrescriptionAdverseReactions(prescriptionId),
      this.getPrescriptionAdherence(prescriptionId)
    ]);

    return {
      ...prescription,
      dispensed_items: dispensedItems,
      adverse_reactions: adverseReactions,
      adherence
    };
  }

  async updatePrescriptionStatus(prescriptionId: string, status: PrescriptionStatus, updatedBy: string): Promise<Prescription> {
    const query = `
      UPDATE clinical_schema.prescriptions 
      SET status = $1, updated_by = $2, updated_at = $3
      WHERE id = $4 AND deleted_at IS NULL
      RETURNING *;
    `;

    const result = await this.db.query(query, [status, updatedBy, new Date(), prescriptionId]);

    if (result.rows.length === 0) {
      throw new Error('Prescription not found');
    }

    const updatedPrescription = await this.findPrescriptionById(prescriptionId);
    if (!updatedPrescription) {
      throw new Error('Failed to retrieve updated prescription');
    }

    return updatedPrescription;
  }

  // Laboratory Order Operations
  async createLabOrder(labOrderData: CreateLabOrderRequestType, createdBy: string, tenantId: string): Promise<LabOrder> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const orderNumber = await this.createLabOrderNumber();

      const orderQuery = `
        INSERT INTO clinical_schema.lab_orders (
          order_number, patient_id, visit_id, ordering_doctor_id, status,
          urgency, performing_lab, clinical_indications, created_by, updated_by, tenant_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING *;
      `;

      const orderValues = [
        orderNumber,
        labOrderData.patientId,
        labOrderData.visitId,
        labOrderData.orderingDoctorId,
        LabTestStatus.ORDERED,
        labOrderData.urgency,
        labOrderData.performingLab || null,
        labOrderData.tests.map(t => t.clinicalIndications).join('; '),
        createdBy,
        createdBy,
        tenantId
      ];

      const orderResult = await client.query(orderQuery, orderValues);
      const order = orderResult.rows[0];

      // Insert test items
      for (const test of labOrderData.tests) {
        const testQuery = `
          INSERT INTO clinical_schema.lab_order_items (
            order_id, test_code, test_name, test_category, specimen_type,
            specimen_details, clinical_indications, created_by, updated_by, tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `;

        await client.query(testQuery, [
          order.id,
          test.testCode,
          test.testName,
          test.testCategory,
          test.specimenType,
          test.specimenDetails || null,
          test.clinicalIndications,
          createdBy,
          createdBy,
          tenantId
        ]);
      }

      await client.query('COMMIT');

      // Fetch complete lab order
      const completeOrder = await this.findLabOrderById(order.id);
      if (!completeOrder) {
        throw new Error('Failed to retrieve created lab order');
      }

      return completeOrder;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating lab order', { error: error.message, labOrderData });
      throw error;
    } finally {
      client.release();
    }
  }

  async findLabOrderById(orderId: string): Promise<LabOrder | null> {
    const query = `
      SELECT 
        lo.*,
        u.first_name || ' ' || u.last_name as ordering_doctor_name,
        pt.first_name || ' ' || pt.last_name as patient_name,
        v.visit_number
      FROM clinical_schema.lab_orders lo
      LEFT JOIN user_schema.users u ON lo.ordering_doctor_id = u.id
      LEFT JOIN patient_schema.patients pt ON lo.patient_id = pt.id
      LEFT JOIN clinical_schema.visits v ON lo.visit_id = v.id
      WHERE lo.id = $1 AND lo.deleted_at IS NULL;
    `;

    const result = await this.db.query(query, [orderId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0];

    // Fetch related data
    const [results, normalRanges, interpretations] = await Promise.all([
      this.getLabOrderResults(orderId),
      this.getLabOrderNormalRanges(orderId),
      this.getLabOrderInterpretations(orderId)
    ]);

    return {
      ...order,
      results,
      normal_ranges: normalRanges,
      interpretations
    };
  }

  async updateLabOrderStatus(orderId: string, status: LabTestStatus, updatedBy: string): Promise<LabOrder> {
    const updateFields = ['status = $1', 'updated_by = $2', 'updated_at = $3'];
    const values = [status, updatedBy, new Date()];

    // Add status-specific fields
    if (status === LabTestStatus.SPECIMEN_COLLECTED) {
      updateFields.push('collection_date = $4');
      updateFields.push('collected_by = $5');
      values.push(new Date(), updatedBy);
    } else if (status === LabTestStatus.IN_PROGRESS) {
      updateFields.push('received_date = $4');
      values.push(new Date());
    } else if (status === LabTestStatus.COMPLETED) {
      updateFields.push('completion_date = $4');
      values.push(new Date());
    }

    values.push(orderId);

    const query = `
      UPDATE clinical_schema.lab_orders 
      SET ${updateFields.join(', ')}
      WHERE id = $${values.length} AND deleted_at IS NULL
      RETURNING *;
    `;

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Lab order not found');
    }

    const updatedOrder = await this.findLabOrderById(orderId);
    if (!updatedOrder) {
      throw new Error('Failed to retrieve updated lab order');
    }

    return updatedOrder;
  }

  // Imaging Order Operations
  async createImagingOrder(imagingOrderData: CreateImagingOrderRequestType, createdBy: string, tenantId: string): Promise<ImagingOrder> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const orderNumber = await this.createImagingOrderNumber();

      const query = `
        INSERT INTO clinical_schema.imaging_orders (
          order_number, patient_id, visit_id, ordering_doctor_id, status,
          urgency, modality, procedure_code, procedure_description, body_part,
          view_position, contrast, contrast_type, clinical_indications,
          special_instructions, performing_location, created_by, updated_by, tenant_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *;
      `;

      const values = [
        orderNumber,
        imagingOrderData.patientId,
        imagingOrderData.visitId,
        imagingOrderData.orderingDoctorId,
        ImagingStatus.ORDERED,
        imagingOrderData.urgency,
        imagingOrderData.modality,
        imagingOrderData.procedureCode,
        imagingOrderData.procedureDescription,
        imagingOrderData.bodyPart,
        imagingOrderData.viewPosition || null,
        imagingOrderData.contrast,
        imagingOrderData.contrastType || null,
        imagingOrderData.clinicalIndications,
        imagingOrderData.specialInstructions || null,
        'RADIOLOGY_DEPT', // Default location
        createdBy,
        createdBy,
        tenantId
      ];

      const result = await client.query(query, values);
      const order = result.rows[0];

      await client.query('COMMIT');

      // Fetch complete imaging order
      const completeOrder = await this.findImagingOrderById(order.id);
      if (!completeOrder) {
        throw new Error('Failed to retrieve created imaging order');
      }

      return completeOrder;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating imaging order', { error: error.message, imagingOrderData });
      throw error;
    } finally {
      client.release();
    }
  }

  async findImagingOrderById(orderId: string): Promise<ImagingOrder | null> {
    const query = `
      SELECT 
        io.*,
        u.first_name || ' ' || u.last_name as ordering_doctor_name,
        pt.first_name || ' ' || pt.last_name as patient_name,
        v.visit_number
      FROM clinical_schema.imaging_orders io
      LEFT JOIN user_schema.users u ON io.ordering_doctor_id = u.id
      LEFT JOIN patient_schema.patients pt ON io.patient_id = pt.id
      LEFT JOIN clinical_schema.visits v ON io.visit_id = v.id
      WHERE io.id = $1 AND io.deleted_at IS NULL;
    `;

    const result = await this.db.query(query, [orderId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0];

    // Fetch related data
    const [series, report, images] = await Promise.all([
      this.getImagingOrderSeries(orderId),
      this.getImagingOrderReport(orderId),
      this.getImagingOrderImages(orderId)
    ]);

    return {
      ...order,
      series,
      report,
      images
    };
  }

  // Medical Record Operations
  async createMedicalRecord(recordData: any, createdBy: string, tenantId: string): Promise<MedicalRecord> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Generate record number
      const recordNumber = `MR-${new Date().getFullYear()}-${Date.now()}`;

      const query = `
        INSERT INTO clinical_schema.medical_records (
          record_number, patient_id, visit_id, document_type, document_category,
          title, content, summary, keywords, clinical_date_time,
          author_id, author_type, status, confidentiality, retention_policy,
          expiration_date, created_by, updated_by, tenant_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *;
      `;

      const values = [
        recordNumber,
        recordData.patientId,
        recordData.visitId || null,
        recordData.documentType,
        recordData.documentCategory,
        recordData.title,
        recordData.content,
        recordData.summary || null,
        recordData.keywords ? JSON.stringify(recordData.keywords) : null,
        recordData.clinicalDateTime,
        createdBy,
        recordData.authorType,
        'DRAFT',
        recordData.confidentiality,
        recordData.retentionPolicy,
        recordData.expirationDate || null,
        createdBy,
        createdBy,
        tenantId
      ];

      const result = await client.query(query, values);
      const record = result.rows[0];

      // Add attachments if provided
      if (recordData.attachments && recordData.attachments.length > 0) {
        for (const attachment of recordData.attachments) {
          const attachmentQuery = `
            INSERT INTO clinical_schema.attachments (
              document_id, file_name, file_type, file_size, file_path,
              mime_type, checksum, uploaded_by, description, category, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
          `;

          await client.query(attachmentQuery, [
            record.id,
            attachment.fileName,
            attachment.fileType,
            attachment.fileSize,
            attachment.filePath,
            attachment.mimeType,
            attachment.checksum,
            createdBy,
            attachment.description || null,
            attachment.category || null,
            attachment.metadata ? JSON.stringify(attachment.metadata) : null
          ]);
        }
      }

      await client.query('COMMIT');

      // Fetch complete medical record
      const completeRecord = await this.findMedicalRecordById(record.id);
      if (!completeRecord) {
        throw new Error('Failed to retrieve created medical record');
      }

      return completeRecord;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating medical record', { error: error.message, recordData });
      throw error;
    } finally {
      client.release();
    }
  }

  async findMedicalRecordById(recordId: string): Promise<MedicalRecord | null> {
    const query = `
      SELECT 
        mr.*,
        u.first_name || ' ' || u.last_name as author_name,
        pt.first_name || ' ' || pt.last_name as patient_name,
        v.visit_number
      FROM clinical_schema.medical_records mr
      LEFT JOIN user_schema.users u ON mr.author_id = u.id
      LEFT JOIN patient_schema.patients pt ON mr.patient_id = pt.id
      LEFT JOIN clinical_schema.visits v ON mr.visit_id = v.id
      WHERE mr.id = $1 AND mr.deleted_at IS NULL;
    `;

    const result = await this.db.query(query, [recordId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const record = result.rows[0];

    // Fetch related data
    const [attachments, signatures, accessLogs] = await Promise.all([
      this.getMedicalRecordAttachments(recordId),
      this.getMedicalRecordSignatures(recordId),
      this.getMedicalRecordAccessLogs(recordId)
    ]);

    return {
      ...record,
      keywords: record.keywords ? JSON.parse(record.keywords) : [],
      attachments,
      signatures,
      access_logs: accessLogs
    };
  }

  // Helper methods for fetching related data
  private async getVisitDiagnoses(visitId: string): Promise<ClinicalDiagnosis[]> {
    const query = `
      SELECT * FROM clinical_schema.visit_diagnoses 
      WHERE visit_id = $1 AND deleted_at IS NULL
      ORDER BY created_at;
    `;
    const result = await this.db.query(query, [visitId]);
    return result.rows;
  }

  private async getVisitProcedures(visitId: string): Promise<ClinicalProcedure[]> {
    const query = `
      SELECT * FROM clinical_schema.visit_procedures 
      WHERE visit_id = $1 AND deleted_at IS NULL
      ORDER BY created_at;
    `;
    const result = await this.db.query(query, [visitId]);
    return result.rows;
  }

  private async getVisitPrescriptions(visitId: string): Promise<Prescription[]> {
    const query = `
      SELECT * FROM clinical_schema.prescriptions 
      WHERE visit_id = $1 AND deleted_at IS NULL
      ORDER BY created_at;
    `;
    const result = await this.db.query(query, [visitId]);
    return result.rows;
  }

  private async getVisitLabOrders(visitId: string): Promise<LabOrder[]> {
    const query = `
      SELECT * FROM clinical_schema.lab_orders 
      WHERE visit_id = $1 AND deleted_at IS NULL
      ORDER BY created_at;
    `;
    const result = await this.db.query(query, [visitId]);
    return result.rows;
  }

  private async getVisitImagingOrders(visitId: string): Promise<ImagingOrder[]> {
    const query = `
      SELECT * FROM clinical_schema.imaging_orders 
      WHERE visit_id = $1 AND deleted_at IS NULL
      ORDER BY created_at;
    `;
    const result = await this.db.query(query, [visitId]);
    return result.rows;
  }

  private async getPrescriptionDispensedItems(prescriptionId: string): Promise<any[]> {
    const query = `
      SELECT * FROM clinical_schema.dispensed_items 
      WHERE prescription_id = $1
      ORDER BY dispensed_date;
    `;
    const result = await this.db.query(query, [prescriptionId]);
    return result.rows;
  }

  private async getPrescriptionAdverseReactions(prescriptionId: string): Promise<any[]> {
    const query = `
      SELECT * FROM clinical_schema.adverse_reactions 
      WHERE prescription_id = $1
      ORDER BY reported_date;
    `;
    const result = await this.db.query(query, [prescriptionId]);
    return result.rows;
  }

  private async getPrescriptionAdherence(prescriptionId: string): Promise<any> {
    const query = `
      SELECT * FROM clinical_schema.medication_adherence 
      WHERE prescription_id = $1
      ORDER BY assessment_date DESC
      LIMIT 1;
    `;
    const result = await this.db.query(query, [prescriptionId]);
    return result.rows[0] || null;
  }

  private async getLabOrderResults(orderId: string): Promise<LabResult[]> {
    const query = `
      SELECT * FROM clinical_schema.lab_results 
      WHERE order_id = $1
      ORDER BY test_name, result_date;
    `;
    const result = await this.db.query(query, [orderId]);
    return result.rows;
  }

  private async getLabOrderNormalRanges(orderId: string): Promise<any[]> {
    const query = `
      SELECT * FROM clinical_schema.normal_ranges 
      WHERE order_id = $1
      ORDER BY test_name;
    `;
    const result = await this.db.query(query, [orderId]);
    return result.rows;
  }

  private async getLabOrderInterpretations(orderId: string): Promise<any[]> {
    const query = `
      SELECT * FROM clinical_schema.lab_interpretations 
      WHERE order_id = $1
      ORDER BY interpretation_date;
    `;
    const result = await this.db.query(query, [orderId]);
    return result.rows;
  }

  private async getImagingOrderSeries(orderId: string): Promise<any[]> {
    const query = `
      SELECT * FROM clinical_schema.imaging_series 
      WHERE order_id = $1
      ORDER BY series_number;
    `;
    const result = await this.db.query(query, [orderId]);
    return result.rows;
  }

  private async getImagingOrderReport(orderId: string): Promise<any> {
    const query = `
      SELECT * FROM clinical_schema.imaging_reports 
      WHERE order_id = $1
      ORDER BY report_date DESC
      LIMIT 1;
    `;
    const result = await this.db.query(query, [orderId]);
    return result.rows[0] || null;
  }

  private async getImagingOrderImages(orderId: string): Promise<any[]> {
    const query = `
      SELECT img.* FROM clinical_schema.imaging_images img
      JOIN clinical_schema.imaging_series s ON img.series_id = s.id
      WHERE s.order_id = $1
      ORDER BY s.series_number, img.image_number;
    `;
    const result = await this.db.query(query, [orderId]);
    return result.rows;
  }

  private async getMedicalRecordAttachments(recordId: string): Promise<any[]> {
    const query = `
      SELECT * FROM clinical_schema.attachments 
      WHERE document_id = $1
      ORDER BY upload_date;
    `;
    const result = await this.db.query(query, [recordId]);
    return result.rows;
  }

  private async getMedicalRecordSignatures(recordId: string): Promise<any[]> {
    const query = `
      SELECT * FROM clinical_schema.digital_signatures 
      WHERE document_id = $1
      ORDER BY timestamp;
    `;
    const result = await this.db.query(query, [recordId]);
    return result.rows;
  }

  private async getMedicalRecordAccessLogs(recordId: string): Promise<any[]> {
    const query = `
      SELECT * FROM clinical_schema.access_logs 
      WHERE document_id = $1
      ORDER BY access_datetime DESC;
    `;
    const result = await this.db.query(query, [recordId]);
    return result.rows;
  }

  private async updateVisitDiagnoses(visitId: string, diagnoses: ClinicalDiagnosis[], client: PoolClient): Promise<void> {
    // Delete existing diagnoses
    await client.query(
      'DELETE FROM clinical_schema.visit_diagnoses WHERE visit_id = $1',
      [visitId]
    );

    // Insert new diagnoses
    for (const diagnosis of diagnoses) {
      await client.query(`
        INSERT INTO clinical_schema.visit_diagnoses (
          visit_id, code, description, type, severity, status,
          onset_date, resolved_date, notes, created_by, updated_by, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
      `, [
        visitId,
        diagnosis.code,
        diagnosis.description,
        diagnosis.type,
        diagnosis.severity,
        diagnosis.status,
        diagnosis.onsetDate,
        diagnosis.resolvedDate || null,
        diagnosis.notes || null,
        'SYSTEM',
        'SYSTEM',
        'default'
      ]);
    }
  }

  private async updateVisitProcedures(visitId: string, procedures: ClinicalProcedure[], client: PoolClient): Promise<void> {
    // Delete existing procedures
    await client.query(
      'DELETE FROM clinical_schema.visit_procedures WHERE visit_id = $1',
      [visitId]
    );

    // Insert new procedures
    for (const procedure of procedures) {
      await client.query(`
        INSERT INTO clinical_schema.visit_procedures (
          visit_id, code, description, category, status, scheduled_date_time,
          start_date_time, end_date_time, performed_by, location,
          indications, technique, complications, notes, created_by, updated_by, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);
      `, [
        visitId,
        procedure.code,
        procedure.description,
        procedure.category,
        procedure.status,
        procedure.scheduledDateTime || null,
        procedure.startDateTime || null,
        procedure.endDateTime || null,
        procedure.performedBy,
        procedure.location,
        procedure.indications,
        procedure.technique,
        procedure.complications || null,
        procedure.notes || null,
        'SYSTEM',
        'SYSTEM',
        'default'
      ]);
    }
  }
}

export default ClinicalRepository;