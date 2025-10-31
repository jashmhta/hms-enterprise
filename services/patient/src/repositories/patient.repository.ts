// HMS Patient Service Repository
// Data access layer for patient operations with ABDM integration

import { Pool, PoolClient } from 'pg';
import { Logger } from '@hms/shared';
import {
  Patient,
  PatientVisit,
  PatientSummary,
  PatientSearchResult,
  CreatePatientRequest,
  UpdatePatientRequest,
  SearchPatientRequest,
  PatientStatus,
  Gender,
  BloodGroup,
  MaritalStatus,
  ABDMVerificationStatus,
  PatientWithVisits,
  PatientProfile,
  PaginationResult,
  SortOrder
} from '@/models/patient.model';
import {
  DatabaseConnectionManager,
  Repository,
 QueryBuilder,
  TransactionManager
} from '@hms/shared';

// =============================================================================
// PATIENT REPOSITORY CLASS
// =============================================================================

export class PatientRepository extends Repository<Patient> {
  private tableName = 'patient_schema.patients';
  private visitTableName = 'patient_schema.patient_visits';
  private allergyTableName = 'patient_schema.patient_allergies';
  private medicalHistoryTableName = 'patient_schema.patient_medical_history';
  private medicationsTableName = 'patient_schema.patient_medications';
  private insuranceTableName = 'patient_schema.patient_insurance';
  private emergencyContactTableName = 'patient_schema.emergency_contacts';
  private documentsTableName = 'patient_schema.patient_documents';
  private abdmConsentsTableName = 'patient_schema.abdm_consents';
  private abdmCareContextsTableName = 'patient_schema.abdm_care_contexts';
  private notificationsTableName = 'patient_schema.patient_notifications';

  constructor(
    pool: Pool,
    logger: Logger,
    transactionManager?: TransactionManager
  ) {
    super(pool, logger, transactionManager);
  }

  // =============================================================================
  // CORE PATIENT OPERATIONS
  // =============================================================================

  async createPatient(patientData: CreatePatientRequest): Promise<Patient> {
    try {
      const client = this.transactionManager?.getClient() || this.pool;

      // Generate MRN
      const mrn = await this.generateMRN(client);

      // Insert patient record
      const query = `
        INSERT INTO ${this.tableName} (
          mrn, title, first_name, middle_name, last_name, full_name, preferred_name,
          gender, date_of_birth, place_of_birth, age,
          primary_contact_number, secondary_contact_number, email,
          address_line1, address_line2, address_line3, address_city, address_district,
          address_state, address_country, address_pincode, address_landmark,
          aadhaar_number, pan_number, passport_number, driving_license_number, voter_id_number,
          abha_number, health_id, abdm_link_status, abdm_linked_at, abdm_last_sync_at,
          blood_group, marital_status, occupation, education, religion, nationality, language_preferences,
          emergency_contact_name, emergency_contact_relationship, emergency_contact_primary_contact_number,
          emergency_contact_secondary_contact_number, emergency_contact_email, emergency_contact_address,
          emergency_contact_is_next_of_kin, emergency_contact_consent_for_emergency_treatment,
          primary_care_physician, referring_doctor, status, is_deceased, date_of_death, cause_of_death,
          place_of_death, death_reported_by, registration_date, registration_source, registration_location,
          referring_organization, consent_for_research, consent_for_marketing, privacy_preferences,
          last_visit_date, total_visits, is_verified, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56,
          $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72
        )
        RETURNING *
      `;

      const values = [
        mrn,
        patientData.title,
        patientData.firstName,
        patientData.middleName,
        patientData.lastName,
        `${patientData.firstName} ${patientData.middleName || ''} ${patientData.lastName}`.trim(),
        patientData.preferredName,
        patientData.gender,
        patientData.dateOfBirth,
        patientData.placeOfBirth,
        this.calculateAge(patientData.dateOfBirth),
        patientData.primaryContactNumber,
        patientData.secondaryContactNumber,
        patientData.email,
        patientData.address.line1,
        patientData.address.line2,
        patientData.address.line3,
        patientData.address.city,
        patientData.address.district,
        patientData.address.state,
        patientData.address.country || 'India',
        patientData.address.pincode,
        patientData.address.landmark,
        patientData.aadhaarNumber ? this.encryptData(patientData.aadhaarNumber) : null,
        null, // pan_number - will be added if needed
        null, // passport_number - will be added if needed
        null, // driving_license_number - will be added if needed
        null, // voter_id_number - will be added if needed
        patientData.abhaNumber,
        patientData.healthId,
        patientData.abhaNumber || patientData.healthId ? ABDMVerificationStatus.LINKED : ABDMVerificationStatus.NOT_LINKED,
        patientData.abhaNumber || patientData.healthId ? new Date() : null,
        patientData.abhaNumber || patientData.healthId ? new Date() : null,
        patientData.bloodGroup,
        patientData.maritalStatus,
        patientData.occupation,
        patientData.education,
        null, // religion - will be added if needed
        patientData.nationality || 'Indian',
        JSON.stringify(patientData.languagePreferences || []),
        patientData.emergencyContact.name,
        patientData.emergencyContact.relationship,
        patientData.emergencyContact.primaryContactNumber,
        patientData.emergencyContact.secondaryContactNumber,
        patientData.emergencyContact.email,
        JSON.stringify(patientData.emergencyContact.address),
        patientData.emergencyContact.isNextOfKin || false,
        patientData.emergencyContact.consentForEmergencyTreatment !== false,
        patientData.primaryCarePhysician,
        patientData.referringDoctor,
        PatientStatus.ACTIVE,
        false, // is_deceased
        null, // date_of_death
        null, // cause_of_death
        null, // place_of_death
        null, // death_reported_by
        new Date(), // registration_date
        patientData.registrationSource || 'walk-in',
        patientData.registrationLocation,
        patientData.referringOrganization,
        patientData.consentForResearch || false,
        patientData.consentForMarketing || false,
        JSON.stringify(patientData.privacyPreferences || {}),
        null, // last_visit_date
        0, // total_visits
        patientData.aadhaarNumber ? true : false, // is_verified
        'system', // created_by - should come from context
        'system' // updated_by - should come from context
      ];

      const result = await client.query(query, values);
      const patient = this.mapRowToPatient(result.rows[0]);

      // Insert allergies if provided
      if (patientData.allergies && patientData.allergies.length > 0) {
        await this.insertPatientAllergies(client, patient.id, patientData.allergies);
      }

      // Insert medical history if provided
      if (patientData.medicalHistory && patientData.medicalHistory.length > 0) {
        await this.insertMedicalHistory(client, patient.id, patientData.medicalHistory);
      }

      // Insert current medications if provided
      if (patientData.currentMedications && patientData.currentMedications.length > 0) {
        await this.insertCurrentMedications(client, patient.id, patientData.currentMedications);
      }

      // Insert insurance details if provided
      if (patientData.insuranceDetails && patientData.insuranceDetails.length > 0) {
        await this.insertInsuranceDetails(client, patient.id, patientData.insuranceDetails);
      }

      this.logger.info('Patient created successfully', {
        patientId: patient.id,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName
      });

      return patient;

    } catch (error) {
      this.logger.error('Failed to create patient', {
        error: error.message,
        patientData: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          primaryContactNumber: patientData.primaryContactNumber
        }
      });
      throw new Error(`Failed to create patient: ${error.message}`);
    }
  }

  async getPatientById(patientId: string): Promise<Patient | null> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [patientId]);

      if (result.rows.length === 0) {
        return null;
      }

      const patient = this.mapRowToPatient(result.rows[0]);

      // Load related data
      patient.allergies = await this.getPatientAllergies(patientId);
      patient.medicalHistory = await this.getPatientMedicalHistory(patientId);
      patient.currentMedications = await this.getPatientCurrentMedications(patientId);
      patient.insuranceDetails = await this.getPatientInsuranceDetails(patientId);

      return patient;

    } catch (error) {
      this.logger.error('Failed to get patient by ID', {
        patientId,
        error: error.message
      });
      throw new Error(`Failed to get patient: ${error.message}`);
    }
  }

  async getPatientByMRN(mrn: string): Promise<Patient | null> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE mrn = $1 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [mrn]);

      if (result.rows.length === 0) {
        return null;
      }

      const patient = this.mapRowToPatient(result.rows[0]);

      // Load related data
      patient.allergies = await this.getPatientAllergies(patient.id);
      patient.medicalHistory = await this.getPatientMedicalHistory(patient.id);
      patient.currentMedications = await this.getPatientCurrentMedications(patient.id);
      patient.insuranceDetails = await this.getPatientInsuranceDetails(patient.id);

      return patient;

    } catch (error) {
      this.logger.error('Failed to get patient by MRN', {
        mrn,
        error: error.message
      });
      throw new Error(`Failed to get patient by MRN: ${error.message}`);
    }
  }

  async updatePatient(patientId: string, updateData: UpdatePatientRequest): Promise<Patient> {
    try {
      const existingPatient = await this.getPatientById(patientId);
      if (!existingPatient) {
        throw new Error('Patient not found');
      }

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updateData.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(updateData.title);
      }
      if (updateData.firstName !== undefined) {
        updateFields.push(`first_name = $${paramIndex++}`);
        values.push(updateData.firstName);
      }
      if (updateData.middleName !== undefined) {
        updateFields.push(`middle_name = $${paramIndex++}`);
        values.push(updateData.middleName);
      }
      if (updateData.lastName !== undefined) {
        updateFields.push(`last_name = $${paramIndex++}`);
        values.push(updateData.lastName);
      }
      if (updateData.preferredName !== undefined) {
        updateFields.push(`preferred_name = $${paramIndex++}`);
        values.push(updateData.preferredName);
      }
      if (updateData.gender !== undefined) {
        updateFields.push(`gender = $${paramIndex++}`);
        values.push(updateData.gender);
      }
      if (updateData.dateOfBirth !== undefined) {
        updateFields.push(`date_of_birth = $${paramIndex++}`);
        values.push(updateData.dateOfBirth);
        updateFields.push(`age = $${paramIndex++}`);
        values.push(this.calculateAge(updateData.dateOfBirth));
      }
      if (updateData.placeOfBirth !== undefined) {
        updateFields.push(`place_of_birth = $${paramIndex++}`);
        values.push(updateData.placeOfBirth);
      }
      if (updateData.primaryContactNumber !== undefined) {
        updateFields.push(`primary_contact_number = $${paramIndex++}`);
        values.push(updateData.primaryContactNumber);
      }
      if (updateData.secondaryContactNumber !== undefined) {
        updateFields.push(`secondary_contact_number = $${paramIndex++}`);
        values.push(updateData.secondaryContactNumber);
      }
      if (updateData.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        values.push(updateData.email);
      }
      if (updateData.address !== undefined) {
        updateFields.push(`address_line1 = $${paramIndex++}`);
        values.push(updateData.address.line1);
        updateFields.push(`address_line2 = $${paramIndex++}`);
        values.push(updateData.address.line2 || null);
        updateFields.push(`address_line3 = $${paramIndex++}`);
        values.push(updateData.address.line3 || null);
        updateFields.push(`address_city = $${paramIndex++}`);
        values.push(updateData.address.city);
        updateFields.push(`address_district = $${paramIndex++}`);
        values.push(updateData.address.district);
        updateFields.push(`address_state = $${paramIndex++}`);
        values.push(updateData.address.state);
        updateFields.push(`address_country = $${paramIndex++}`);
        values.push(updateData.address.country || 'India');
        updateFields.push(`address_pincode = $${paramIndex++}`);
        values.push(updateData.address.pincode);
        updateFields.push(`address_landmark = $${paramIndex++}`);
        values.push(updateData.address.landmark || null);
      }
      if (updateData.aadhaarNumber !== undefined) {
        updateFields.push(`aadhaar_number = $${paramIndex++}`);
        values.push(updateData.aadhaarNumber ? this.encryptData(updateData.aadhaarNumber) : null);
        updateFields.push(`is_verified = $${paramIndex++}`);
        values.push(updateData.aadhaarNumber ? true : false);
      }
      if (updateData.abhaNumber !== undefined) {
        updateFields.push(`abha_number = $${paramIndex++}`);
        values.push(updateData.abhaNumber);
        updateFields.push(`abdm_link_status = $${paramIndex++}`);
        values.push(updateData.abhaNumber ? ABDMVerificationStatus.LINKED : ABDMVerificationStatus.NOT_LINKED);
      }
      if (updateData.healthId !== undefined) {
        updateFields.push(`health_id = $${paramIndex++}`);
        values.push(updateData.healthId);
      }
      if (updateData.bloodGroup !== undefined) {
        updateFields.push(`blood_group = $${paramIndex++}`);
        values.push(updateData.bloodGroup);
      }
      if (updateData.maritalStatus !== undefined) {
        updateFields.push(`marital_status = $${paramIndex++}`);
        values.push(updateData.maritalStatus);
      }
      if (updateData.occupation !== undefined) {
        updateFields.push(`occupation = $${paramIndex++}`);
        values.push(updateData.occupation);
      }
      if (updateData.education !== undefined) {
        updateFields.push(`education = $${paramIndex++}`);
        values.push(updateData.education);
      }
      if (updateData.languagePreferences !== undefined) {
        updateFields.push(`language_preferences = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.languagePreferences));
      }
      if (updateData.emergencyContact !== undefined) {
        updateFields.push(`emergency_contact_name = $${paramIndex++}`);
        values.push(updateData.emergencyContact.name);
        updateFields.push(`emergency_contact_relationship = $${paramIndex++}`);
        values.push(updateData.emergencyContact.relationship);
        updateFields.push(`emergency_contact_primary_contact_number = $${paramIndex++}`);
        values.push(updateData.emergencyContact.primaryContactNumber);
        updateFields.push(`emergency_contact_secondary_contact_number = $${paramIndex++}`);
        values.push(updateData.emergencyContact.secondaryContactNumber || null);
        updateFields.push(`emergency_contact_email = $${paramIndex++}`);
        values.push(updateData.emergencyContact.email || null);
        updateFields.push(`emergency_contact_address = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.emergencyContact.address || {}));
        updateFields.push(`emergency_contact_is_next_of_kin = $${paramIndex++}`);
        values.push(updateData.emergencyContact.isNextOfKin || false);
        updateFields.push(`emergency_contact_consent_for_emergency_treatment = $${paramIndex++}`);
        values.push(updateData.emergencyContact.consentForEmergencyTreatment !== false);
      }
      if (updateData.primaryCarePhysician !== undefined) {
        updateFields.push(`primary_care_physician = $${paramIndex++}`);
        values.push(updateData.primaryCarePhysician);
      }
      if (updateData.referringDoctor !== undefined) {
        updateFields.push(`referring_doctor = $${paramIndex++}`);
        values.push(updateData.referringDoctor);
      }
      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
      }
      if (updateData.privacyPreferences !== undefined) {
        updateFields.push(`privacy_preferences = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.privacyPreferences));
      }

      // Always update updated_at and updated_by
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      updateFields.push(`updated_by = $${paramIndex++}`);
      values.push('system'); // Should come from context

      // Update full_name if name fields changed
      if (updateData.firstName !== undefined || updateData.middleName !== undefined || updateData.lastName !== undefined) {
        updateFields.push(`full_name = $${paramIndex++}`);
        const firstName = updateData.firstName || existingPatient.firstName;
        const middleName = updateData.middleName || existingPatient.middleName;
        const lastName = updateData.lastName || existingPatient.lastName;
        values.push(`${firstName} ${middleName || ''} ${lastName}`.trim());
      }

      if (updateFields.length === 0) {
        return existingPatient; // No changes to make
      }

      // Add WHERE clause parameter
      values.push(patientId);

      const query = `
        UPDATE ${this.tableName}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Patient not found or update failed');
      }

      const updatedPatient = this.mapRowToPatient(result.rows[0]);

      // Update related data if provided
      if (updateData.allergies !== undefined) {
        if (updateData.allergies.length > 0) {
          await this.updatePatientAllergies(patientId, updateData.allergies);
        } else {
          await this.deletePatientAllergies(patientId);
        }
      }

      if (updateData.medicalHistory !== undefined) {
        if (updateData.medicalHistory.length > 0) {
          await this.updateMedicalHistory(patientId, updateData.medicalHistory);
        } else {
          await this.deleteMedicalHistory(patientId);
        }
      }

      if (updateData.currentMedications !== undefined) {
        if (updateData.currentMedications.length > 0) {
          await this.updateCurrentMedications(patientId, updateData.currentMedications);
        } else {
          await this.deleteCurrentMedications(patientId);
        }
      }

      if (updateData.insuranceDetails !== undefined) {
        if (updateData.insuranceDetails.length > 0) {
          await this.updateInsuranceDetails(patientId, updateData.insuranceDetails);
        } else {
          await this.deleteInsuranceDetails(patientId);
        }
      }

      this.logger.info('Patient updated successfully', {
        patientId,
        mrn: updatedPatient.mrn,
        updatedFields: updateFields.length
      });

      return updatedPatient;

    } catch (error) {
      this.logger.error('Failed to update patient', {
        patientId,
        error: error.message
      });
      throw new Error(`Failed to update patient: ${error.message}`);
    }
  }

  async deletePatient(patientId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [patientId]);

      if (result.rowCount === 0) {
        return false;
      }

      this.logger.info('Patient deleted successfully', { patientId });
      return true;

    } catch (error) {
      this.logger.error('Failed to delete patient', {
        patientId,
        error: error.message
      });
      throw new Error(`Failed to delete patient: ${error.message}`);
    }
  }

  // =============================================================================
  // PATIENT SEARCH OPERATIONS
  // =============================================================================

  async searchPatients(searchRequest: SearchPatientRequest): Promise<PaginationResult<PatientSearchResult>> {
    try {
      const {
        query,
        mrn,
        firstName,
        lastName,
        phone,
        email,
        aadhaarNumber,
        abhaNumber,
        dateOfBirth,
        gender,
        bloodGroup,
        status,
        registrationDateFrom,
        registrationDateTo,
        lastVisitDateFrom,
        lastVisitDateTo,
        departmentId,
        doctorId,
        facilityId,
        includeInactive = false,
        page = 1,
        limit = 20,
        sortBy = 'registration_date',
        sortOrder = 'DESC'
      } = searchRequest;

      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // Base condition - exclude deleted records
      conditions.push(`p.deleted_at IS NULL`);

      // Add search conditions
      if (mrn) {
        conditions.push(`p.mrn ILIKE $${paramIndex++}`);
        values.push(`%${mrn}%`);
      }

      if (query) {
        conditions.push(`(
          p.full_name ILIKE $${paramIndex++} OR
          p.mrn ILIKE $${paramIndex++} OR
          p.primary_contact_number ILIKE $${paramIndex++} OR
          p.email ILIKE $${paramIndex++}
        )`);
        values.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
      }

      if (firstName) {
        conditions.push(`p.first_name ILIKE $${paramIndex++}`);
        values.push(`%${firstName}%`);
      }

      if (lastName) {
        conditions.push(`p.last_name ILIKE $${paramIndex++}`);
        values.push(`%${lastName}%`);
      }

      if (phone) {
        conditions.push(`p.primary_contact_number ILIKE $${paramIndex++}`);
        values.push(`%${phone}%`);
      }

      if (email) {
        conditions.push(`p.email ILIKE $${paramIndex++}`);
        values.push(`%${email}%`);
      }

      if (aadhaarNumber) {
        conditions.push(`p.aadhaar_number = $${paramIndex++}`);
        values.push(this.encryptData(aadhaarNumber));
      }

      if (abhaNumber) {
        conditions.push(`p.abha_number ILIKE $${paramIndex++}`);
        values.push(`%${abhaNumber}%`);
      }

      if (dateOfBirth) {
        conditions.push(`p.date_of_birth = $${paramIndex++}`);
        values.push(dateOfBirth);
      }

      if (gender) {
        conditions.push(`p.gender = $${paramIndex++}`);
        values.push(gender);
      }

      if (bloodGroup) {
        conditions.push(`p.blood_group = $${paramIndex++}`);
        values.push(bloodGroup);
      }

      if (status) {
        conditions.push(`p.status = $${paramIndex++}`);
        values.push(status);
      }

      if (registrationDateFrom) {
        conditions.push(`p.registration_date >= $${paramIndex++}`);
        values.push(registrationDateFrom);
      }

      if (registrationDateTo) {
        conditions.push(`p.registration_date <= $${paramIndex++}`);
        values.push(registrationDateTo);
      }

      if (lastVisitDateFrom) {
        conditions.push(`p.last_visit_date >= $${paramIndex++}`);
        values.push(lastVisitDateFrom);
      }

      if (lastVisitDateTo) {
        conditions.push(`p.last_visit_date <= $${paramIndex++}`);
        values.push(lastVisitDateTo);
      }

      if (!includeInactive) {
        conditions.push(`p.status != $${paramIndex++}`);
        values.push(PatientStatus.INACTIVE);
      }

      // Join with visits if doctor or department filter is needed
      let joinClause = '';
      if (doctorId || departmentId || facilityId) {
        joinClause = `
          LEFT JOIN ${this.visitTableName} v ON p.id = v.patient_id AND v.deleted_at IS NULL
        `;

        if (doctorId) {
          conditions.push(`v.doctor_id = $${paramIndex++}`);
          values.push(doctorId);
        }

        if (departmentId) {
          conditions.push(`v.department_id = $${paramIndex++}`);
          values.push(departmentId);
        }

        if (facilityId) {
          conditions.push(`v.facility_id = $${paramIndex++}`);
          values.push(facilityId);
        }
      }

      // Validate sort field
      const validSortFields = [
        'p.mrn', 'p.full_name', 'p.primary_contact_number', 'p.email',
        'p.date_of_birth', 'p.registration_date', 'p.last_visit_date', 'p.created_at'
      ];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'p.registration_date';
      const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} p
        ${joinClause}
        WHERE ${conditions.join(' AND ')}
      `;

      const countResult = await this.pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Calculate pagination
      const offset = (page - 1) * limit;
      const hasMore = offset + limit < total;

      // Data query
      const dataQuery = `
        SELECT
          p.id as patient_id,
          p.mrn,
          p.full_name,
          p.date_of_birth,
          p.age,
          p.gender,
          p.primary_contact_number,
          p.email,
          p.blood_group,
          p.abha_number,
          p.last_visit_date,
          p.total_visits,
          p.status,
          p.registration_date,
          p.abdm_link_status
        FROM ${this.tableName} p
        ${joinClause}
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, values);

      const patients = dataResult.rows.map(row => this.mapRowToPatientSearchResult(row, query));

      return {
        items: patients,
        total,
        page,
        limit,
        hasMore,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      this.logger.error('Failed to search patients', {
        error: error.message,
        searchRequest
      });
      throw new Error(`Failed to search patients: ${error.message}`);
    }
  }

  async getPatientSummaries(filter: {
    status?: PatientStatus;
    registrationDateFrom?: Date;
    registrationDateTo?: Date;
    limit?: number;
  } = {}): Promise<PatientSummary[]> {
    try {
      const conditions = ['p.deleted_at IS NULL'];
      const values = [];
      let paramIndex = 1;

      if (filter.status) {
        conditions.push(`p.status = $${paramIndex++}`);
        values.push(filter.status);
      }

      if (filter.registrationDateFrom) {
        conditions.push(`p.registration_date >= $${paramIndex++}`);
        values.push(filter.registrationDateFrom);
      }

      if (filter.registrationDateTo) {
        conditions.push(`p.registration_date <= $${paramIndex++}`);
        values.push(filter.registrationDateTo);
      }

      const limitClause = filter.limit ? `LIMIT $${paramIndex++}` : '';
      if (filter.limit) {
        values.push(filter.limit);
      }

      const query = `
        SELECT
          p.id as patient_id,
          p.mrn,
          p.full_name,
          p.date_of_birth,
          p.age,
          p.gender,
          p.primary_contact_number,
          p.email,
          p.blood_group,
          p.abha_number,
          p.last_visit_date,
          p.total_visits,
          p.status,
          p.registration_date,
          p.abdm_link_status,
          EXISTS(SELECT 1 FROM ${this.allergyTableName} a WHERE a.patient_id = p.id AND a.deleted_at IS NULL) as has_allergies,
          EXISTS(SELECT 1 FROM ${this.medicalHistoryTableName} mh WHERE mh.patient_id = p.id AND mh.deleted_at IS NULL AND mh.is_chronic = true) as has_chronic_conditions,
          EXISTS(SELECT 1 FROM ${this.insuranceTableName} i WHERE i.patient_id = p.id AND i.deleted_at IS NULL AND i.is_active = true) as has_active_insurance
        FROM ${this.tableName} p
        WHERE ${conditions.join(' AND ')}
        ORDER BY p.registration_date DESC
        ${limitClause}
      `;

      const result = await this.pool.query(query, values);

      return result.rows.map(row => this.mapRowToPatientSummary(row));

    } catch (error) {
      this.logger.error('Failed to get patient summaries', {
        error: error.message,
        filter
      });
      throw new Error(`Failed to get patient summaries: ${error.message}`);
    }
  }

  // =============================================================================
  // PATIENT VISIT OPERATIONS
  // =============================================================================

  async createPatientVisit(visitData: any): Promise<PatientVisit> {
    try {
      const client = this.transactionManager?.getClient() || this.pool;

      // Generate visit number
      const visitNumber = await this.generateVisitNumber(client, visitData.patientId);

      const query = `
        INSERT INTO ${this.visitTableName} (
          patient_id, mrn, visit_number, visit_type, department_id, doctor_id, facility_id,
          scheduled_date_time, actual_arrival_date_time, actual_start_date_time, actual_end_date_time,
          status, priority, chief_complaint, payment_type, referred_by, referred_to, referral_type,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING *
      `;

      const values = [
        visitData.patientId,
        visitData.mrn,
        visitNumber,
        visitData.visitType,
        visitData.departmentId,
        visitData.doctorId,
        visitData.facilityId,
        visitData.scheduledDateTime,
        new Date(), // actual_arrival_date_time
        visitData.actualStartDateTime,
        visitData.actualEndDateTime,
        'arrived', // status
        visitData.priority || 'routine',
        visitData.chiefComplaint,
        visitData.paymentType,
        visitData.referredBy,
        JSON.stringify(visitData.referredTo || []),
        visitData.referralType,
        'system', // created_by
        'system' // updated_by
      ];

      const result = await client.query(query, values);
      const visit = this.mapRowToPatientVisit(result.rows[0]);

      // Update patient's last visit date and total visits
      await this.updatePatientVisitStats(client, visitData.patientId);

      this.logger.info('Patient visit created successfully', {
        visitId: visit.id,
        patientId: visitData.patientId,
        visitNumber,
        visitType: visitData.visitType
      });

      return visit;

    } catch (error) {
      this.logger.error('Failed to create patient visit', {
        error: error.message,
        visitData
      });
      throw new Error(`Failed to create patient visit: ${error.message}`);
    }
  }

  async getPatientVisits(patientId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    visitType?: string;
    departmentId?: string;
    doctorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<PaginationResult<PatientVisit>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        visitType,
        departmentId,
        doctorId,
        dateFrom,
        dateTo
      } = options;

      const conditions = ['patient_id = $1', 'deleted_at IS NULL'];
      const values = [patientId];
      let paramIndex = 2;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      if (visitType) {
        conditions.push(`visit_type = $${paramIndex++}`);
        values.push(visitType);
      }

      if (departmentId) {
        conditions.push(`department_id = $${paramIndex++}`);
        values.push(departmentId);
      }

      if (doctorId) {
        conditions.push(`doctor_id = $${paramIndex++}`);
        values.push(doctorId);
      }

      if (dateFrom) {
        conditions.push(`actual_arrival_date_time >= $${paramIndex++}`);
        values.push(dateFrom);
      }

      if (dateTo) {
        conditions.push(`actual_arrival_date_time <= $${paramIndex++}`);
        values.push(dateTo);
      }

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${this.visitTableName}
        WHERE ${conditions.join(' AND ')}
      `;

      const countResult = await this.pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Calculate pagination
      const offset = (page - 1) * limit;
      const hasMore = offset + limit < total;

      // Data query
      const dataQuery = `
        SELECT * FROM ${this.visitTableName}
        WHERE ${conditions.join(' AND ')}
        ORDER BY actual_arrival_date_time DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, values);

      const visits = dataResult.rows.map(row => this.mapRowToPatientVisit(row));

      return {
        items: visits,
        total,
        page,
        limit,
        hasMore,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      this.logger.error('Failed to get patient visits', {
        patientId,
        error: error.message
      });
      throw new Error(`Failed to get patient visits: ${error.message}`);
    }
  }

  // =============================================================================
  // ABDM INTEGRATION OPERATIONS
  // =============================================================================

  async updateABDMStatus(patientId: string, abdmData: {
    abhaNumber?: string;
    healthId?: string;
    linkStatus: ABDMVerificationStatus;
    syncedAt?: Date;
  }): Promise<boolean> {
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (abdmData.abhaNumber !== undefined) {
        updateFields.push(`abha_number = $${paramIndex++}`);
        values.push(abdmData.abhaNumber);
      }

      if (abdmData.healthId !== undefined) {
        updateFields.push(`health_id = $${paramIndex++}`);
        values.push(abdmData.healthId);
      }

      if (abdmData.linkStatus !== undefined) {
        updateFields.push(`abdm_link_status = $${paramIndex++}`);
        values.push(abdmData.linkStatus);
      }

      if (updateFields.length === 0) {
        return true; // No changes needed
      }

      updateFields.push(`abdm_last_sync_at = $${paramIndex++}`);
      values.push(abdmData.syncedAt || new Date());

      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(patientId);

      const query = `
        UPDATE ${this.tableName}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, values);

      if (result.rowCount === 0) {
        return false;
      }

      this.logger.info('ABDM status updated successfully', {
        patientId,
        abdmData
      });

      return true;

    } catch (error) {
      this.logger.error('Failed to update ABDM status', {
        patientId,
        abdmData,
        error: error.message
      });
      throw new Error(`Failed to update ABDM status: ${error.message}`);
    }
  }

  async getPatientsByABDMStatus(linkStatus: ABDMVerificationStatus): Promise<Patient[]> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE abdm_link_status = $1 AND deleted_at IS NULL
        ORDER BY updated_at DESC
      `;

      const result = await this.pool.query(query, [linkStatus]);

      return result.rows.map(row => this.mapRowToPatient(row));

    } catch (error) {
      this.logger.error('Failed to get patients by ABDM status', {
        linkStatus,
        error: error.message
      });
      throw new Error(`Failed to get patients by ABDM status: ${error.message}`);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private async generateMRN(client: PoolClient | Pool): Promise<string> {
    try {
      const result = await client.query(
        "SELECT nextval('patient_schema.patient_mrn_seq') as seq"
      );
      const sequence = result.rows[0].seq;
      const year = new Date().getFullYear();
      return `MRN-${year}-${sequence.toString().padStart(7, '0')}`;
    } catch (error) {
      throw new Error(`Failed to generate MRN: ${error.message}`);
    }
  }

  private async generateVisitNumber(client: PoolClient | Pool, patientId: string): Promise<string> {
    try {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM patient_schema.patient_visits WHERE patient_id = $1 AND deleted_at IS NULL',
        [patientId]
      );
      const count = parseInt(result.rows[0].count) + 1;
      return `V-${count.toString().padStart(4, '0')}`;
    } catch (error) {
      throw new Error(`Failed to generate visit number: ${error.message}`);
    }
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    return age;
  }

  private encryptData(data: string): string {
    // This should use proper encryption - for now just return base64
    return Buffer.from(data).toString('base64');
  }

  private decryptData(encryptedData: string): string {
    // This should use proper decryption - for now just return from base64
    return Buffer.from(encryptedData, 'base64').toString('utf-8');
  }

  private async updatePatientVisitStats(client: PoolClient | Pool, patientId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET
        last_visit_date = CURRENT_TIMESTAMP,
        total_visits = total_visits + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await client.query(query, [patientId]);
  }

  // =============================================================================
  // RELATED DATA OPERATIONS
  // =============================================================================

  private async insertPatientAllergies(client: PoolClient | Pool, patientId: string, allergies: any[]): Promise<void> {
    for (const allergy of allergies) {
      const query = `
        INSERT INTO ${this.allergyTableName} (
          patient_id, allergen, type, severity, reaction, onset_date, reported_by, is_active, notes, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      await client.query(query, [
        patientId,
        allergy.allergen,
        allergy.type,
        allergy.severity,
        allergy.reaction,
        allergy.onsetDate,
        allergy.reportedBy || 'patient',
        allergy.isActive !== false,
        allergy.notes,
        'system',
        'system'
      ]);
    }
  }

  private async insertMedicalHistory(client: PoolClient | Pool, patientId: string, history: any[]): Promise<void> {
    for (const item of history) {
      const query = `
        INSERT INTO ${this.medicalHistoryTableName} (
          patient_id, condition, category, diagnosis_date, resolved_date, status, severity,
          treating_physician, treatment_details, complications, is_chronic, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;

      await client.query(query, [
        patientId,
        item.condition,
        item.category,
        item.diagnosisDate,
        item.resolvedDate,
        item.status,
        item.severity,
        item.treatingPhysician,
        item.treatmentDetails,
        item.complications,
        item.isChronic || false,
        'system',
        'system'
      ]);
    }
  }

  private async insertCurrentMedications(client: PoolClient | Pool, patientId: string, medications: any[]): Promise<void> {
    for (const medication of medications) {
      const query = `
        INSERT INTO ${this.medicationsTableName} (
          patient_id, name, generic_name, dosage, frequency, route, prescribed_by,
          prescribed_date, start_date, end_date, indication, is_active, notes, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;

      await client.query(query, [
        patientId,
        medication.name,
        medication.genericName,
        medication.dosage,
        medication.frequency,
        medication.route,
        medication.prescribedBy,
        medication.prescribedDate || new Date(),
        medication.startDate,
        medication.endDate,
        medication.indication,
        medication.isActive !== false,
        medication.notes,
        'system',
        'system'
      ]);
    }
  }

  private async insertInsuranceDetails(client: PoolClient | Pool, patientId: string, insurance: any[]): Promise<void> {
    for (const info of insurance) {
      const query = `
        INSERT INTO ${this.insuranceTableName} (
          patient_id, provider, policy_number, policy_holder_name, relationship_to_holder,
          plan_type, coverage_amount, validity_from, validity_to, is_primary, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;

      await client.query(query, [
        patientId,
        info.provider,
        info.policyNumber,
        info.policyHolderName,
        info.relationshipToHolder,
        info.planType,
        info.coverageAmount,
        info.validityPeriod?.from,
        info.validityPeriod?.to,
        info.isPrimary || false,
        info.isActive !== false,
        'system',
        'system'
      ]);
    }
  }

  // =============================================================================
  // DATA MAPPING METHODS
  // =============================================================================

  private mapRowToPatient(row: any): Patient {
    return {
      id: row.id,
      mrn: row.mrn,
      title: row.title,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      fullName: row.full_name,
      preferredName: row.preferred_name,
      gender: row.gender,
      dateOfBirth: row.date_of_birth,
      age: row.age,
      placeOfBirth: row.place_of_birth,
      primaryContactNumber: row.primary_contact_number,
      secondaryContactNumber: row.secondary_contact_number,
      email: row.email,
      address: {
        type: 'permanent',
        line1: row.address_line1,
        line2: row.address_line2,
        line3: row.address_line3,
        city: row.address_city,
        district: row.address_district,
        state: row.address_state,
        country: row.address_country,
        pincode: row.address_pincode,
        landmark: row.address_landmark
      },
      aadhaarNumber: row.aadhaar_number ? this.decryptData(row.aadhaar_number) : undefined,
      abhaNumber: row.abha_number,
      healthId: row.health_id,
      abdmLinkStatus: row.abdm_link_status,
      abdmLinkedAt: row.abdm_linked_at,
      abdmLastSyncAt: row.abdm_last_sync_at,
      bloodGroup: row.blood_group,
      maritalStatus: row.marital_status,
      occupation: row.occupation,
      education: row.education,
      nationality: row.nationality,
      languagePreferences: row.language_preferences ? JSON.parse(row.language_preferences) : [],
      emergencyContact: {
        name: row.emergency_contact_name,
        relationship: row.emergency_contact_relationship,
        primaryContactNumber: row.emergency_contact_primary_contact_number,
        secondaryContactNumber: row.emergency_contact_secondary_contact_number,
        email: row.emergency_contact_email,
        address: row.emergency_contact_address ? JSON.parse(row.emergency_contact_address) : undefined,
        isNextOfKin: row.emergency_contact_is_next_of_kin,
        consentForEmergencyTreatment: row.emergency_contact_consent_for_emergency_treatment
      },
      primaryCarePhysician: row.primary_care_physician,
      referringDoctor: row.referring_doctor,
      allergies: [], // Will be loaded separately
      medicalHistory: [], // Will be loaded separately
      currentMedications: [], // Will be loaded separately
      insuranceDetails: [], // Will be loaded separately
      status: row.status,
      isDeceased: row.is_deceased,
      dateOfDeath: row.date_of_death,
      causeOfDeath: row.cause_of_death,
      placeOfDeath: row.place_of_death,
      deathReportedBy: row.death_reported_by,
      registrationDate: row.registration_date,
      registrationSource: row.registration_source,
      registrationLocation: row.registration_location,
      referringOrganization: row.referring_organization,
      consentForResearch: row.consent_for_research,
      consentForMarketing: row.consent_for_marketing,
      privacyPreferences: row.privacy_preferences ? JSON.parse(row.privacy_preferences) : {},
      lastVisitDate: row.last_visit_date,
      totalVisits: row.total_visits,
      isVerified: row.is_verified,
      verificationDocuments: [], // Will be loaded separately
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at
    };
  }

  private mapRowToPatientSearchResult(row: any, query?: string): PatientSearchResult {
    const fullName = row.full_name;
    const mrn = row.mrn;
    const abhaNumber = row.abha_number;

    let highlight;
    if (query) {
      const highlightQuery = query.toLowerCase();
      highlight = {};

      if (fullName && fullName.toLowerCase().includes(highlightQuery)) {
        highlight.fullName = fullName;
      }
      if (mrn && mrn.toLowerCase().includes(highlightQuery)) {
        highlight.mrn = mrn;
      }
      if (abhaNumber && abhaNumber.toLowerCase().includes(highlightQuery)) {
        highlight.abhaNumber = abhaNumber;
      }
    }

    return {
      patientId: row.patient_id,
      mrn: row.mrn,
      fullName: row.full_name,
      age: row.age,
      gender: row.gender,
      primaryContactNumber: row.primary_contact_number,
      email: row.email,
      abhaNumber: row.abha_number,
      lastVisitDate: row.last_visit_date,
      matchScore: 0, // Could implement search relevance scoring
      highlight
    };
  }

  private mapRowToPatientSummary(row: any): PatientSummary {
    return {
      patientId: row.patient_id,
      mrn: row.mrn,
      fullName: row.full_name,
      age: row.age,
      gender: row.gender,
      primaryContactNumber: row.primary_contact_number,
      email: row.email,
      bloodGroup: row.blood_group,
      abhaNumber: row.abha_number,
      lastVisitDate: row.last_visit_date,
      totalVisits: row.total_visits,
      status: row.status,
      registrationDate: row.registration_date,
      isABDMLinked: row.abdm_link_status === ABDMVerificationStatus.LINKED,
      hasActiveInsurance: row.has_active_insurance,
      hasAllergies: row.has_allergies,
      hasChronicConditions: row.has_chronic_conditions
    };
  }

  private mapRowToPatientVisit(row: any): PatientVisit {
    return {
      id: row.id,
      patientId: row.patient_id,
      mrn: row.mrn,
      visitNumber: row.visit_number,
      visitType: row.visit_type,
      departmentId: row.department_id,
      doctorId: row.doctor_id,
      facilityId: row.facility_id,
      scheduledDateTime: row.scheduled_date_time,
      actualArrivalDateTime: row.actual_arrival_date_time,
      actualStartDateTime: row.actual_start_date_time,
      actualEndDateTime: row.actual_end_date_time,
      status: row.status,
      priority: row.priority,
      chiefComplaint: row.chief_complaint,
      presentingSymptoms: row.presenting_symptoms ? JSON.parse(row.presenting_symptoms) : [],
      vitalSigns: row.vital_signs ? JSON.parse(row.vital_signs) : undefined,
      physicalExamination: row.physical_examination ? JSON.parse(row.physical_examination) : undefined,
      provisionalDiagnosis: row.provisional_diagnosis ? JSON.parse(row.provisional_diagnosis) : [],
      finalDiagnosis: row.final_diagnosis ? JSON.parse(row.final_diagnosis) : [],
      treatmentGiven: row.treatment_given,
      procedures: row.procedures ? JSON.parse(row.procedures) : [],
      investigations: row.investigations ? JSON.parse(row.investigations) : [],
      paymentType: row.payment_type,
      estimatedCost: row.estimated_cost,
      actualCost: row.actual_cost,
      insuranceClaimNumber: row.insurance_claim_number,
      referredBy: row.referred_by,
      referredTo: row.referred_to ? JSON.parse(row.referred_to) : [],
      referralType: row.referral_type,
      dischargeType: row.discharge_type,
      dischargeCondition: row.discharge_condition,
      dischargeAdvice: row.discharge_advice,
      followUpRequired: row.follow_up_required,
      followUpDate: row.follow_up_date,
      followupInstructions: row.followup_instructions,
      outcome: row.outcome,
      createdVia: row.created_via,
      sourceReference: row.source_reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at
    };
  }

  // Placeholder methods for related data loading
  private async getPatientAllergies(patientId: string): Promise<any[]> { return []; }
  private async getPatientMedicalHistory(patientId: string): Promise<any[]> { return []; }
  private async getPatientCurrentMedications(patientId: string): Promise<any[]> { return []; }
  private async getPatientInsuranceDetails(patientId: string): Promise<any[]> { return []; }
  private async updatePatientAllergies(patientId: string, allergies: any[]): Promise<void> {}
  private async deletePatientAllergies(patientId: string): Promise<void> {}
  private async updateMedicalHistory(patientId: string, history: any[]): Promise<void> {}
  private async deleteMedicalHistory(patientId: string): Promise<void> {}
  private async updateCurrentMedications(patientId: string, medications: any[]): Promise<void> {}
  private async deleteCurrentMedications(patientId: string): Promise<void> {}
  private async updateInsuranceDetails(patientId: string, insurance: any[]): Promise<void> {}
  private async deleteInsuranceDetails(patientId: string): Promise<void> {}
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PatientRepository;