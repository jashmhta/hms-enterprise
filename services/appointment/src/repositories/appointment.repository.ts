// HMS Appointment Service Repository
// Data access layer for appointment scheduling and management

import { Pool, PoolClient } from 'pg';
import { Logger } from '@hms/shared';
import {
  Appointment,
  AvailabilitySlot,
  DoctorSchedule,
  WaitlistEntry,
  AppointmentSummary,
  SearchAppointmentsRequest,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  GetAvailableSlotsRequest,
  PaginationResult,
  SortOrder,
  AppointmentStatus,
  ConsultationType,
  AppointmentType
} from '@/models/appointment.model';
import {
  DatabaseConnectionManager,
  Repository,
  QueryBuilder,
  TransactionManager
} from '@hms/shared';

// =============================================================================
// APPOINTMENT REPOSITORY CLASS
// =============================================================================

export class AppointmentRepository extends Repository<Appointment> {
  private tableName = 'appointment_schema.appointments';
  private scheduleTableName = 'appointment_schema.doctor_schedules';
  private availabilityTableName = 'appointment_schema.availability_slots';
  private waitlistTableName = 'appointment_schema.waitlist_entries';
  private calendarTableName = 'appointment_schema.calendar_events';

  constructor(
    pool: Pool,
    logger: Logger,
    transactionManager?: TransactionManager
  ) {
    super(pool, logger, transactionManager);
  }

  // =============================================================================
  // APPOINTMENT CORE OPERATIONS
  // =============================================================================

  async createAppointment(appointmentData: CreateAppointmentRequest): Promise<Appointment> {
    try {
      const client = this.transactionManager?.getClient() || this.pool;

      // Generate appointment number
      const appointmentNumber = await this.generateAppointmentNumber(client);

      // Get consultation fee if not provided
      const consultationFee = appointmentData.consultationFee || await this.getDoctorConsultationFee(client, appointmentData.doctorId);

      // Calculate estimated duration if not provided
      const estimatedDuration = appointmentData.estimatedDuration || await this.getDefaultAppointmentDuration(client, appointmentData.appointmentType, appointmentData.consultationType);

      // Insert appointment record
      const query = `
        INSERT INTO ${this.tableName} (
          appointment_number, patient_id, mrn, doctor_id, department_id, facility_id,
          appointment_type, consultation_type, status, priority,
          scheduled_date_time, estimated_duration, timezone,
          location_name, location_type, location_room_number, location_floor, location_building,
          chief_complaint, symptoms, notes, previous_appointment_id,
          consultation_fee, payment_status, payment_method, consultation_fee_paid,
          is_recurring, parent_appointment_id,
          patient_info_first_name, patient_info_last_name, patient_info_date_of_birth, patient_info_gender, patient_info_primary_contact_number, patient_info_email,
          doctor_info_first_name, doctor_info_last_name, doctor_info_specialization, doctor_info_qualifications, doctor_info_experience, doctor_info_consultation_fee,
          booked_by, booked_at, booking_channel, booking_source,
          is_confirmed, auto_confirm_appointment,
          is_urgent, requires_special_equipment, special_requirements,
          tags, metadata,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22,
          $23, $24, $25, $26,
          $27, $28,
          $29, $30, $31, $32, $33, $34,
          $35, $36, $37, $38, $39, $40,
          $41, $42, $43,
          $44, $45, $46,
          $47, $48,
          $49, $50
        )
        RETURNING *
      `;

      // Get patient and doctor info
      const patientInfo = await this.getPatientInfo(client, appointmentData.patientId);
      const doctorInfo = await this.getDoctorInfo(client, appointmentData.doctorId);

      const values = [
        appointmentNumber,
        appointmentData.patientId,
        patientInfo?.mrn,
        appointmentData.doctorId,
        appointmentData.departmentId,
        appointmentData.facilityId,
        appointmentData.appointmentType,
        appointmentData.consultationType,
        AppointmentStatus.SCHEDULED,
        'routine', // Default priority
        appointmentData.scheduledDateTime,
        estimatedDuration,
        'Asia/Kolkata', // Default timezone
        appointmentData.location?.name,
        appointmentData.location?.type,
        appointmentData.location?.roomNumber,
        appointmentData.location?.floor,
        appointmentData.location?.building,
        appointmentData.chiefComplaint,
        appointmentData.symptoms ? JSON.stringify(appointmentData.symptoms) : null,
        appointmentData.notes,
        appointmentData.previousAppointmentId,
        consultationFee,
        'pending', // Default payment status
        appointmentData.paymentMethod,
        false, // consultation_fee_paid
        false, // is_recurring
        null, // parent_appointment_id
        patientInfo?.firstName,
        patientInfo?.lastName,
        patientInfo?.dateOfBirth,
        patientInfo?.gender,
        patientInfo?.primaryContactNumber,
        patientInfo?.email,
        doctorInfo?.firstName,
        doctorInfo?.lastName,
        doctorInfo?.specialization,
        doctorInfo?.qualifications ? JSON.stringify(doctorInfo.qualifications) : null,
        doctorInfo?.experience,
        doctorInfo?.consultationFee,
        'system', // booked_by - should come from context
        new Date(), // booked_at
        appointmentData.bookingChannel || 'website',
        appointmentData.bookingSource,
        appointmentData.autoConfirm || false,
        appointmentData.autoConfirm || false,
        appointmentData.isUrgent || false,
        appointmentData.requiresSpecialEquipment || false,
        appointmentData.specialRequirements,
        appointmentData.tags ? JSON.stringify(appointmentData.tags) : null,
        appointmentData.metadata ? JSON.stringify(appointmentData.metadata) : null,
        'system', // created_by
        'system' // updated_by
      ];

      const result = await client.query(query, values);
      const appointment = this.mapRowToAppointment(result.rows[0]);

      this.logger.info('Appointment created successfully', {
        appointmentId: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        patientId: appointmentData.patientId,
        doctorId: appointmentData.doctorId,
        scheduledDateTime: appointmentData.scheduledDateTime
      });

      return appointment;

    } catch (error) {
      this.logger.error('Failed to create appointment', {
        error: error.message,
        appointmentData: {
          patientId: appointmentData.patientId,
          doctorId: appointmentData.doctorId,
          scheduledDateTime: appointmentData.scheduledDateTime
        }
      });
      throw new Error(`Failed to create appointment: ${error.message}`);
    }
  }

  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [appointmentId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAppointment(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to get appointment by ID', {
        appointmentId,
        error: error.message
      });
      throw new Error(`Failed to get appointment: ${error.message}`);
    }
  }

  async getAppointmentByNumber(appointmentNumber: string): Promise<Appointment | null> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE appointment_number = $1 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [appointmentNumber]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAppointment(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to get appointment by number', {
        appointmentNumber,
        error: error.message
      });
      throw new Error(`Failed to get appointment by number: ${error.message}`);
    }
  }

  async updateAppointment(appointmentId: string, updateData: UpdateAppointmentRequest): Promise<Appointment> {
    try {
      const existingAppointment = await this.getAppointmentById(appointmentId);
      if (!existingAppointment) {
        throw new Error('Appointment not found');
      }

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updateData.appointmentType !== undefined) {
        updateFields.push(`appointment_type = $${paramIndex++}`);
        values.push(updateData.appointmentType);
      }

      if (updateData.consultationType !== undefined) {
        updateFields.push(`consultation_type = $${paramIndex++}`);
        values.push(updateData.consultationType);
      }

      if (updateData.scheduledDateTime !== undefined) {
        updateFields.push(`scheduled_date_time = $${paramIndex++}`);
        values.push(updateData.scheduledDateTime);

        // Update reschedule information
        updateFields.push(`reschedule_count = reschedule_count + 1`);
        updateFields.push(`original_scheduled_date_time = $${paramIndex++}`);
        values.push(existingAppointment.scheduledDateTime);
        updateFields.push(`rescheduled_at = $${paramIndex++}`);
        values.push(new Date());
        updateFields.push(`rescheduled_by = $${paramIndex++}`);
        values.push('system'); // Should come from context
      }

      if (updateData.estimatedDuration !== undefined) {
        updateFields.push(`estimated_duration = $${paramIndex++}`);
        values.push(updateData.estimatedDuration);
      }

      if (updateData.location !== undefined) {
        updateFields.push(`location_name = $${paramIndex++}`);
        values.push(updateData.location.name || null);
        updateFields.push(`location_type = $${paramIndex++}`);
        values.push(updateData.location.type || null);
        updateFields.push(`location_room_number = $${paramIndex++}`);
        values.push(updateData.location.roomNumber || null);
        updateFields.push(`location_floor = $${paramIndex++}`);
        values.push(updateData.location.floor || null);
        updateFields.push(`location_building = $${paramIndex++}`);
        values.push(updateData.location.building || null);
      }

      if (updateData.chiefComplaint !== undefined) {
        updateFields.push(`chief_complaint = $${paramIndex++}`);
        values.push(updateData.chiefComplaint);
      }

      if (updateData.symptoms !== undefined) {
        updateFields.push(`symptoms = $${paramIndex++}`);
        values.push(updateData.symptoms ? JSON.stringify(updateData.symptoms) : null);
      }

      if (updateData.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        values.push(updateData.notes);
      }

      if (updateData.consultationFee !== undefined) {
        updateFields.push(`consultation_fee = $${paramIndex++}`);
        values.push(updateData.consultationFee);
      }

      if (updateData.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        values.push(updateData.priority);
      }

      if (updateData.isUrgent !== undefined) {
        updateFields.push(`is_urgent = $${paramIndex++}`);
        values.push(updateData.isUrgent);
      }

      if (updateData.requiresSpecialEquipment !== undefined) {
        updateFields.push(`requires_special_equipment = $${paramIndex++}`);
        values.push(updateData.requiresSpecialEquipment);
      }

      if (updateData.specialRequirements !== undefined) {
        updateFields.push(`special_requirements = $${paramIndex++}`);
        values.push(updateData.specialRequirements);
      }

      if (updateData.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        values.push(updateData.tags ? JSON.stringify(updateData.tags) : null);
      }

      // Always update updated_at and updated_by
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      updateFields.push(`updated_by = $${paramIndex++}`);
      values.push('system'); // Should come from context

      if (updateFields.length === 0) {
        return existingAppointment; // No changes to make
      }

      // Add WHERE clause parameter
      values.push(appointmentId);

      const query = `
        UPDATE ${this.tableName}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Appointment not found or update failed');
      }

      const updatedAppointment = this.mapRowToAppointment(result.rows[0]);

      this.logger.info('Appointment updated successfully', {
        appointmentId,
        appointmentNumber: updatedAppointment.appointmentNumber,
        updatedFields: updateFields.length
      });

      return updatedAppointment;

    } catch (error) {
      this.logger.error('Failed to update appointment', {
        appointmentId,
        error: error.message
      });
      throw new Error(`Failed to update appointment: ${error.message}`);
    }
  }

  async deleteAppointment(appointmentId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [appointmentId]);

      if (result.rowCount === 0) {
        return false;
      }

      this.logger.info('Appointment deleted successfully', { appointmentId });
      return true;

    } catch (error) {
      this.logger.error('Failed to delete appointment', {
        appointmentId,
        error: error.message
      });
      throw new Error(`Failed to delete appointment: ${error.message}`);
    }
  }

  // =============================================================================
  // APPOINTMENT SEARCH OPERATIONS
  // =============================================================================

  async searchAppointments(searchRequest: SearchAppointmentsRequest): Promise<PaginationResult<Appointment>> {
    try {
      const {
        patientId,
        doctorId,
        departmentId,
        facilityId,
        appointmentType,
        consultationType,
        status,
        priority,
        paymentStatus,
        bookingChannel,
        dateFrom,
        dateTo,
        isConfirmed,
        isCheckedIn,
        isRecurring,
        tags,
        includePatientInfo,
        includeDoctorInfo,
        page = 1,
        limit = 20,
        sortBy = 'scheduled_date_time',
        sortOrder = 'ASC'
      } = searchRequest;

      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // Base condition - exclude deleted records
      conditions.push(`a.deleted_at IS NULL`);

      // Add search conditions
      if (patientId) {
        conditions.push(`a.patient_id = $${paramIndex++}`);
        values.push(patientId);
      }

      if (doctorId) {
        conditions.push(`a.doctor_id = $${paramIndex++}`);
        values.push(doctorId);
      }

      if (departmentId) {
        conditions.push(`a.department_id = $${paramIndex++}`);
        values.push(departmentId);
      }

      if (facilityId) {
        conditions.push(`a.facility_id = $${paramIndex++}`);
        values.push(facilityId);
      }

      if (appointmentType) {
        conditions.push(`a.appointment_type = $${paramIndex++}`);
        values.push(appointmentType);
      }

      if (consultationType) {
        conditions.push(`a.consultation_type = $${paramIndex++}`);
        values.push(consultationType);
      }

      if (status) {
        conditions.push(`a.status = $${paramIndex++}`);
        values.push(status);
      }

      if (priority) {
        conditions.push(`a.priority = $${paramIndex++}`);
        values.push(priority);
      }

      if (paymentStatus) {
        conditions.push(`a.payment_status = $${paramIndex++}`);
        values.push(paymentStatus);
      }

      if (bookingChannel) {
        conditions.push(`a.booking_channel = $${paramIndex++}`);
        values.push(bookingChannel);
      }

      if (dateFrom) {
        conditions.push(`a.scheduled_date_time >= $${paramIndex++}`);
        values.push(dateFrom);
      }

      if (dateTo) {
        conditions.push(`a.scheduled_date_time <= $${paramIndex++}`);
        values.push(dateTo);
      }

      if (isConfirmed !== undefined) {
        conditions.push(`a.is_confirmed = $${paramIndex++}`);
        values.push(isConfirmed);
      }

      if (isCheckedIn !== undefined) {
        conditions.push(`a.is_checked_in = $${paramIndex++}`);
        values.push(isCheckedIn);
      }

      if (isRecurring !== undefined) {
        conditions.push(`a.is_recurring = $${paramIndex++}`);
        values.push(isRecurring);
      }

      if (tags && tags.length > 0) {
        const tagConditions = tags.map((_, index) => `a.tags::jsonb ? $${paramIndex + index}`).join(' OR ');
        conditions.push(`(${tagConditions})`);
        tags.forEach(tag => values.push(tag));
        paramIndex += tags.length - 1;
      }

      // Validate sort field
      const validSortFields = [
        'a.appointment_number', 'a.scheduled_date_time', 'a.created_at',
        'a.patient_info_first_name', 'a.doctor_info_first_name',
        'a.appointment_type', 'a.status', 'a.consultation_fee'
      ];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'a.scheduled_date_time';
      const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} a
        WHERE ${conditions.join(' AND ')}
      `;

      const countResult = await this.pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Calculate pagination
      const offset = (page - 1) * limit;
      const hasMore = offset + limit < total;

      // Data query
      const dataQuery = `
        SELECT * FROM ${this.tableName} a
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, values);

      const appointments = dataResult.rows.map(row => this.mapRowToAppointment(row));

      return {
        items: appointments,
        total,
        page,
        limit,
        hasMore,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      this.logger.error('Failed to search appointments', {
        error: error.message,
        searchRequest
      });
      throw new Error(`Failed to search appointments: ${error.message}`);
    }
  }

  // =============================================================================
  // AVAILABILITY OPERATIONS
  // =============================================================================

  async getAvailableSlots(request: GetAvailableSlotsRequest): Promise<AvailabilitySlot[]> {
    try {
      const {
        doctorId,
        departmentId,
        facilityId,
        consultationType,
        appointmentType,
        dateFrom,
        dateTo,
        includeWeekends = true,
        maxResults = 100
      } = request;

      // Get doctor schedules for the date range
      const schedules = await this.getDoctorSchedules(doctorId, departmentId, facilityId, dateFrom, dateTo);

      // Generate availability slots from schedules
      const allSlots = await this.generateAvailabilitySlots(schedules, consultationType, appointmentType);

      // Filter out already booked slots
      const availableSlots = await this.filterAvailableSlots(allSlots, doctorId, dateFrom, dateTo);

      // Filter by weekends if required
      const filteredSlots = includeWeekends
        ? availableSlots
        : availableSlots.filter(slot => {
            const dayOfWeek = slot.startDateTime.getDay();
            return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
          });

      // Sort by date time and limit results
      filteredSlots.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

      return filteredSlots.slice(0, maxResults);

    } catch (error) {
      this.logger.error('Failed to get available slots', {
        error: error.message,
        request
      });
      throw new Error(`Failed to get available slots: ${error.message}`);
    }
  }

  async createAvailabilitySlots(slots: Partial<AvailabilitySlot>[]): Promise<AvailabilitySlot[]> {
    try {
      const client = this.transactionManager?.getClient() || this.pool;
      const createdSlots: AvailabilitySlot[] = [];

      for (const slotData of slots) {
        const query = `
          INSERT INTO ${this.availabilityTableName} (
            id, doctor_id, department_id, facility_id,
            start_date_time, end_date_time, duration_minutes,
            consultation_type, appointment_types, max_appointments, current_appointments,
            is_available, is_bookable, price, currency, location,
            special_requirements, tags, metadata,
            created_by, updated_by
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15, $16,
            $17, $18, $19,
            $20, $21
          )
          RETURNING *
        `;

        const slotId = this.generateSlotId();
        const values = [
          slotId,
          slotData.doctorId,
          slotData.departmentId,
          slotData.facilityId,
          slotData.startDateTime,
          slotData.endDateTime,
          slotData.durationMinutes,
          slotData.consultationType,
          slotData.appointmentType ? JSON.stringify(slotData.appointmentType) : null,
          slotData.maxAppointments || 1,
          0, // current_appointments
          true, // is_available
          true, // is_bookable
          slotData.price || 0,
          slotData.currency || 'INR',
          slotData.location ? JSON.stringify(slotData.location) : null,
          slotData.specialRequirements,
          slotData.tags ? JSON.stringify(slotData.tags) : null,
          slotData.metadata ? JSON.stringify(slotData.metadata) : null,
          'system', // created_by
          'system' // updated_by
        ];

        const result = await client.query(query, values);
        createdSlots.push(this.mapRowToAvailabilitySlot(result.rows[0]));
      }

      this.logger.info('Availability slots created successfully', {
        count: createdSlots.length
      });

      return createdSlots;

    } catch (error) {
      this.logger.error('Failed to create availability slots', {
        error: error.message
      });
      throw new Error(`Failed to create availability slots: ${error.message}`);
    }
  }

  async bookSlot(slotId: string, appointmentId: string): Promise<boolean> {
    try {
      const client = this.transactionManager?.getClient() || this.pool;

      const query = `
        UPDATE ${this.availabilityTableName}
        SET current_appointments = current_appointments + 1,
            is_available = (current_appointments + 1) < max_appointments,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_available = true
        RETURNING *
      `;

      const result = await client.query(query, [slotId]);

      if (result.rowCount === 0) {
        return false;
      }

      // Link appointment to slot
      await this.linkAppointmentToSlot(appointmentId, slotId);

      return true;

    } catch (error) {
      this.logger.error('Failed to book slot', {
        slotId,
        appointmentId,
        error: error.message
      });
      throw new Error(`Failed to book slot: ${error.message}`);
    }
  }

  // =============================================================================
  // DOCTOR SCHEDULE OPERATIONS
  // =============================================================================

  async createDoctorSchedule(scheduleData: any): Promise<DoctorSchedule> {
    try {
      const client = this.transactionManager?.getClient() || this.pool;

      const query = `
        INSERT INTO ${this.scheduleTableName} (
          doctor_id, department_id, facility_id,
          schedule_type, name, description, is_active,
          effective_from, effective_to, timezone,
          recurring_pattern_type, recurring_pattern_interval, recurring_pattern_days_of_week,
          recurring_pattern_end_date, recurring_pattern_end_after_occurrences,
          daily_slots, max_appointments_per_slot, allow_overlapping_appointments,
          buffer_time_minutes, consultation_types_allowed, appointment_types_allowed,
          auto_accept_appointments, require_confirmation, allow_waitlist, max_waitlist_size,
          sync_with_external_calendar, external_calendar_id,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3,
          $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13,
          $14, $15,
          $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24, $25,
          $26, $27,
          $28, $29
        )
        RETURNING *
      `;

      const values = [
        scheduleData.doctorId,
        scheduleData.departmentId,
        scheduleData.facilityId,
        scheduleData.scheduleType,
        scheduleData.name,
        scheduleData.description,
        scheduleData.isActive !== false,
        scheduleData.effectiveFrom,
        scheduleData.effectiveTo,
        scheduleData.timezone,
        scheduleData.recurringPattern?.type,
        scheduleData.recurringPattern?.interval,
        scheduleData.recurringPattern?.daysOfWeek,
        scheduleData.recurringPattern?.endDate,
        scheduleData.recurringPattern?.endAfterOccurrences,
        scheduleData.dailySlots ? JSON.stringify(scheduleData.dailySlots) : null,
        scheduleData.maxAppointmentsPerSlot || 1,
        scheduleData.allowOverlappingAppointments || false,
        scheduleData.bufferTimeMinutes || 0,
        scheduleData.consultationTypesAllowed ? JSON.stringify(scheduleData.consultationTypesAllowed) : null,
        scheduleData.appointmentTypesAllowed ? JSON.stringify(scheduleData.appointmentTypesAllowed) : null,
        scheduleData.autoAcceptAppointments || false,
        scheduleData.requireConfirmation !== false,
        scheduleData.allowWaitlist !== false,
        scheduleData.maxWaitlistSize || 5,
        scheduleData.syncWithExternalCalendar || false,
        scheduleData.externalCalendarId,
        'system', // created_by
        'system' // updated_by
      ];

      const result = await client.query(query, values);
      const schedule = this.mapRowToDoctorSchedule(result.rows[0]);

      this.logger.info('Doctor schedule created successfully', {
        scheduleId: schedule.id,
        doctorId: scheduleData.doctorId
      });

      return schedule;

    } catch (error) {
      this.logger.error('Failed to create doctor schedule', {
        error: error.message,
        scheduleData
      });
      throw new Error(`Failed to create doctor schedule: ${error.message}`);
    }
  }

  async getDoctorSchedule(doctorId: string, date: Date): Promise<DoctorSchedule | null> {
    try {
      const query = `
        SELECT * FROM ${this.scheduleTableName}
        WHERE doctor_id = $1
          AND is_active = true
          AND effective_from <= $2
          AND (effective_to IS NULL OR effective_to >= $2)
          AND deleted_at IS NULL
        ORDER BY priority DESC, created_at DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [doctorId, date]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDoctorSchedule(result.rows[0]);

    } catch (error) {
      this.logger.error('Failed to get doctor schedule', {
        doctorId,
        date,
        error: error.message
      });
      throw new Error(`Failed to get doctor schedule: ${error.message}`);
    }
  }

  // =============================================================================
  // WAITLIST OPERATIONS
  // =============================================================================

  async addToWaitlist(waitlistData: any): Promise<WaitlistEntry> {
    try {
      const client = this.transactionManager?.getClient() || this.pool;

      // Get current position
      const position = await this.getNextWaitlistPosition(client, waitlistData.doctorId);

      const query = `
        INSERT INTO ${this.waitlistTableName} (
          patient_id, doctor_id, department_id, facility_id,
          preferred_date_from, preferred_date_to, preferred_time_slots,
          consultation_type, appointment_type, urgency_level,
          contact_number, email, preferred_contact_method,
          status, position, joined_at,
          reason, special_requirements, notes,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19,
          $20, $21
        )
        RETURNING *
      `;

      const values = [
        waitlistData.patientId,
        waitlistData.doctorId,
        waitlistData.departmentId,
        waitlistData.facilityId,
        waitlistData.preferredDateRange.from,
        waitlistData.preferredDateRange.to,
        waitlistData.preferredTimeSlots ? JSON.stringify(waitlistData.preferredTimeSlots) : null,
        waitlistData.consultationType,
        waitlistData.appointmentType,
        waitlistData.urgencyLevel,
        waitlistData.contactNumber,
        waitlistData.email,
        waitlistData.preferredContactMethod,
        'active', // status
        position,
        new Date(), // joined_at
        waitlistData.reason,
        waitlistData.specialRequirements,
        waitlistData.notes,
        'system', // created_by
        'system' // updated_by
      ];

      const result = await client.query(query, values);
      const waitlistEntry = this.mapRowToWaitlistEntry(result.rows[0]);

      this.logger.info('Patient added to waitlist successfully', {
        waitlistId: waitlistEntry.id,
        patientId: waitlistData.patientId,
        doctorId: waitlistData.doctorId,
        position
      });

      return waitlistEntry;

    } catch (error) {
      this.logger.error('Failed to add patient to waitlist', {
        error: error.message,
        waitlistData
      });
      throw new Error(`Failed to add patient to waitlist: ${error.message}`);
    }
  }

  async getWaitlistForDoctor(doctorId: string, limit: number = 50): Promise<WaitlistEntry[]> {
    try {
      const query = `
        SELECT * FROM ${this.waitlistTableName}
        WHERE doctor_id = $1
          AND status = 'active'
          AND deleted_at IS NULL
        ORDER BY position ASC, joined_at ASC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [doctorId, limit]);

      return result.rows.map(row => this.mapRowToWaitlistEntry(row));

    } catch (error) {
      this.logger.error('Failed to get waitlist for doctor', {
        doctorId,
        error: error.message
      });
      throw new Error(`Failed to get waitlist for doctor: ${error.message}`);
    }
  }

  // =============================================================================
  // UTILITY METHODS
// =============================================================================

  private async generateAppointmentNumber(client: PoolClient | Pool): Promise<string> {
    try {
      const result = await client.query(
        "SELECT nextval('appointment_schema.appointment_number_seq') as seq"
      );
      const sequence = result.rows[0].seq;
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `APT-${date}-${sequence.toString().padStart(6, '0')}`;
    } catch (error) {
      throw new Error(`Failed to generate appointment number: ${error.message}`);
    }
  }

  private generateSlotId(): string {
    return `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getDoctorConsultationFee(client: PoolClient | Pool, doctorId: string): Promise<number> {
    try {
      const result = await client.query(
        'SELECT consultation_fee FROM user_schema.doctors WHERE id = $1',
        [doctorId]
      );

      return result.rows[0]?.consultation_fee || 500; // Default fee
    } catch (error) {
      return 500; // Default fee on error
    }
  }

  private async getDefaultAppointmentDuration(client: PoolClient | Pool, appointmentType: AppointmentType, consultationType: ConsultationType): Promise<number> {
    try {
      const result = await client.query(
        'SELECT duration_minutes FROM appointment_schema.appointment_type_durations WHERE appointment_type = $1 AND consultation_type = $2',
        [appointmentType, consultationType]
      );

      return result.rows[0]?.duration_minutes || 30; // Default duration
    } catch (error) {
      return 30; // Default duration on error
    }
  }

  private async getPatientInfo(client: PoolClient | Pool, patientId: string): Promise<any> {
    try {
      const result = await client.query(
        'SELECT id, mrn, first_name, last_name, date_of_birth, gender, primary_contact_number, email FROM patient_schema.patients WHERE id = $1',
        [patientId]
      );

      return result.rows[0];
    } catch (error) {
      return null;
    }
  }

  private async getDoctorInfo(client: PoolClient | Pool, doctorId: string): Promise<any> {
    try {
      const result = await client.query(
        'SELECT id, first_name, last_name, specialization, qualifications, experience, consultation_fee FROM user_schema.doctors WHERE id = $1',
        [doctorId]
      );

      return result.rows[0];
    } catch (error) {
      return null;
    }
  }

  private async getDoctorSchedules(doctorId?: string, departmentId?: string, facilityId?: string, dateFrom: Date, dateTo: Date): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM ${this.scheduleTableName}
        WHERE is_active = true
          AND effective_from <= $2
          AND (effective_to IS NULL OR effective_to >= $1)
          AND deleted_at IS NULL
      `;

      const values = [dateTo, dateFrom];
      let paramIndex = 3;

      if (doctorId) {
        query += ` AND doctor_id = $${paramIndex++}`;
        values.push(doctorId);
      }

      if (departmentId) {
        query += ` AND department_id = $${paramIndex++}`;
        values.push(departmentId);
      }

      if (facilityId) {
        query += ` AND facility_id = $${paramIndex++}`;
        values.push(facilityId);
      }

      query += ' ORDER BY priority DESC, created_at DESC';

      const result = await this.pool.query(query, values);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get doctor schedules', {
        error: error.message
      });
      return [];
    }
  }

  private async generateAvailabilitySlots(schedules: any[], consultationType?: ConsultationType, appointmentType?: AppointmentType): Promise<AvailabilitySlot[]> {
    const slots: AvailabilitySlot[] = [];

    for (const schedule of schedules) {
      // Generate slots based on schedule and recurring pattern
      // This is a simplified implementation - in production, you'd use a proper
      // date calculation library like moment or date-fns
      const dailySlots = schedule.daily_slots || [];

      for (const dailySlot of dailySlots) {
        // Generate slots for each day in the schedule's effective period
        // This is complex logic that would handle recurring patterns, exceptions, etc.
        // For now, returning empty array as placeholder
      }
    }

    return slots;
  }

  private async filterAvailableSlots(slots: AvailabilitySlot[], doctorId: string, dateFrom: Date, dateTo: Date): Promise<AvailabilitySlot[]> {
    try {
      if (slots.length === 0) {
        return slots;
      }

      // Get existing appointments for the date range
      const appointmentsQuery = `
        SELECT start_date_time, end_date_time, duration_minutes
        FROM ${this.tableName}
        WHERE doctor_id = $1
          AND status NOT IN ('cancelled', 'no_show')
          AND scheduled_date_time >= $2
          AND scheduled_date_time <= $3
          AND deleted_at IS NULL
      `;

      const appointmentsResult = await this.pool.query(appointmentsQuery, [doctorId, dateFrom, dateTo]);
      const appointments = appointmentsResult.rows;

      // Filter out slots that overlap with existing appointments
      return slots.filter(slot => {
        return !appointments.some(appointment => {
          const appointmentStart = new Date(appointment.start_date_time);
          const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration_minutes * 60 * 1000);

          // Check for overlap
          return (slot.startDateTime < appointmentEnd && slot.endDateTime > appointmentStart);
        });
      });

    } catch (error) {
      this.logger.error('Failed to filter available slots', {
        error: error.message
      });
      return slots;
    }
  }

  private async linkAppointmentToSlot(appointmentId: string, slotId: string): Promise<void> {
    try {
      // This would create a relationship between appointment and slot
      // Implementation depends on your database schema
    } catch (error) {
      this.logger.error('Failed to link appointment to slot', {
        appointmentId,
        slotId,
        error: error.message
      });
    }
  }

  private async getNextWaitlistPosition(client: PoolClient | Pool, doctorId: string): Promise<number> {
    try {
      const result = await client.query(
        'SELECT COALESCE(MAX(position), 0) as max_position FROM waitlist_entries WHERE doctor_id = $1 AND status = \'active\'',
        [doctorId]
      );

      return (result.rows[0]?.max_position || 0) + 1;
    } catch (error) {
      return 1;
    }
  }

  // =============================================================================
  // DATA MAPPING METHODS
  // =============================================================================

  private mapRowToAppointment(row: any): Appointment {
    return {
      id: row.id,
      appointmentNumber: row.appointment_number,
      patientId: row.patient_id,
      mrn: row.mrn,
      doctorId: row.doctor_id,
      departmentId: row.department_id,
      facilityId: row.facility_id,
      appointmentType: row.appointment_type,
      consultationType: row.consultation_type,
      status: row.status,
      priority: row.priority,
      scheduledDateTime: row.scheduled_date_time,
      estimatedDuration: row.estimated_duration,
      actualStartDateTime: row.actual_start_date_time,
      actualEndDateTime: row.actual_end_date_time,
      timezone: row.timezone,
      location: {
        type: row.location_type,
        name: row.location_name,
        roomNumber: row.location_room_number,
        floor: row.location_floor,
        building: row.location_building
      },
      chiefComplaint: row.chief_complaint,
      symptoms: row.symptoms ? JSON.parse(row.symptoms) : [],
      notes: row.notes,
      previousAppointmentId: row.previous_appointment_id,
      consultationFee: row.consultation_fee,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      paymentTransactionId: row.payment_transaction_id,
      insuranceClaimId: row.insurance_claim_id,
      isRecurring: row.is_recurring,
      recurringPattern: row.recurring_pattern ? JSON.parse(row.recurring_pattern) : undefined,
      parentAppointmentId: row.parent_appointment_id,
      childAppointmentIds: row.child_appointment_ids ? JSON.parse(row.child_appointment_ids) : [],
      patientInfo: {
        firstName: row.patient_info_first_name,
        lastName: row.patient_info_last_name,
        dateOfBirth: row.patient_info_date_of_birth,
        gender: row.patient_info_gender,
        primaryContactNumber: row.patient_info_primary_contact_number,
        email: row.patient_info_email
      },
      doctorInfo: {
        firstName: row.doctor_info_first_name,
        lastName: row.doctor_info_last_name,
        specialization: row.doctor_info_specialization,
        qualifications: row.doctor_info_qualifications ? JSON.parse(row.doctor_info_qualifications) : [],
        experience: row.doctor_info_experience,
        consultationFee: row.doctor_info_consultation_fee
      },
      bookedBy: row.booked_by,
      bookedAt: row.booked_at,
      bookingChannel: row.booking_channel,
      bookingSource: row.booking_source,
      isConfirmed: row.is_confirmed,
      confirmedBy: row.confirmed_by,
      confirmedAt: row.confirmed_at,
      confirmationMethod: row.confirmation_method,
      isCheckedIn: row.is_checked_in,
      checkedInAt: row.checked_in_at,
      checkedInBy: row.checked_in_by,
      checkInNotes: row.check_in_notes,
      cancellationReason: row.cancellation_reason,
      cancellationReasonCategory: row.cancellation_reason_category,
      cancelledBy: row.cancelled_by,
      cancelledAt: row.cancelled_at,
      refundAmount: row.refund_amount,
      refundStatus: row.refund_status,
      rescheduleCount: row.reschedule_count,
      originalScheduledDateTime: row.original_scheduled_date_time,
      rescheduleReason: row.reschedule_reason,
      rescheduledBy: row.rescheduled_by,
      rescheduledAt: row.rescheduled_at,
      isFromWaitlist: row.is_from_waitlist,
      waitlistPosition: row.waitlist_position,
      waitlistJoinedAt: row.waitlist_joined_at,
      remindersSent: {
        email24h: row.reminders_sent_email_24h,
        email2h: row.reminders_sent_email_2h,
        sms24h: row.reminders_sent_sms_24h,
        sms2h: row.reminders_sent_sms_2h,
        whatsapp2h: row.reminders_sent_whatsapp_2h,
        phone1d: row.reminders_sent_phone_1d,
        phone2h: row.reminders_sent_phone_2h
      },
      communicationHistory: row.communication_history ? JSON.parse(row.communication_history) : [],
      externalCalendarIds: row.external_calendar_ids ? JSON.parse(row.external_calendar_ids) : {},
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      isUrgent: row.is_urgent,
      requiresSpecialEquipment: row.requires_special_equipment,
      specialRequirements: row.special_requirements,
      lastReminderSent: row.last_reminder_sent,
      nextReminderDue: row.next_reminder_due,
      autoRescheduleEnabled: row.auto_reschedule_enabled,
      maxRescheduleAttempts: row.max_reschedule_attempts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at
    };
  }

  private mapRowToAvailabilitySlot(row: any): AvailabilitySlot {
    return {
      id: row.id,
      doctorId: row.doctor_id,
      departmentId: row.department_id,
      facilityId: row.facility_id,
      startDateTime: row.start_date_time,
      endDateTime: row.end_date_time,
      durationMinutes: row.duration_minutes,
      consultationType: row.consultation_type,
      appointmentType: row.appointment_types ? JSON.parse(row.appointment_types) : [],
      maxAppointments: row.max_appointments,
      currentAppointments: row.current_appointments,
      isAvailable: row.is_available,
      isBookable: row.is_bookable,
      price: row.price,
      currency: row.currency,
      location: row.location ? JSON.parse(row.location) : undefined,
      specialRequirements: row.special_requirements,
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  }

  private mapRowToDoctorSchedule(row: any): DoctorSchedule {
    return {
      id: row.id,
      doctorId: row.doctor_id,
      departmentId: row.department_id,
      facilityId: row.facility_id,
      scheduleType: row.schedule_type,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      timezone: row.timezone,
      recurringPattern: {
        type: row.recurring_pattern_type,
        interval: row.recurring_pattern_interval,
        daysOfWeek: row.recurring_pattern_days_of_week,
        endDate: row.recurring_pattern_end_date,
        endAfterOccurrences: row.recurring_pattern_end_after_occurrences,
        timezone: row.timezone
      },
      dailySlots: row.daily_slots ? JSON.parse(row.daily_slots) : [],
      maxAppointmentsPerSlot: row.max_appointments_per_slot,
      allowOverlappingAppointments: row.allow_overlapping_appointments,
      bufferTimeMinutes: row.buffer_time_minutes,
      consultationTypesAllowed: row.consultation_types_allowed ? JSON.parse(row.consultation_types_allowed) : [],
      appointmentTypesAllowed: row.appointment_types_allowed ? JSON.parse(row.appointment_types_allowed) : [],
      autoAcceptAppointments: row.auto_accept_appointments,
      requireConfirmation: row.require_confirmation,
      allowWaitlist: row.allow_waitlist,
      maxWaitlistSize: row.max_waitlist_size,
      unavailableDates: row.unavailable_dates ? JSON.parse(row.unavailable_dates) : [],
      specialAvailabilityDates: row.special_availability_dates ? JSON.parse(row.special_availability_dates) : [],
      syncWithExternalCalendar: row.sync_with_external_calendar,
      externalCalendarId: row.external_calendar_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at
    };
  }

  private mapRowToWaitlistEntry(row: any): WaitlistEntry {
    return {
      id: row.id,
      appointmentId: row.appointment_id,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      departmentId: row.department_id,
      facilityId: row.facility_id,
      preferredDateRange: {
        from: row.preferred_date_from,
        to: row.preferred_date_to
      },
      preferredTimeSlots: row.preferred_time_slots ? JSON.parse(row.preferred_time_slots) : [],
      consultationType: row.consultation_type,
      appointmentType: row.appointment_type,
      urgencyLevel: row.urgency_level,
      contactNumber: row.contact_number,
      email: row.email,
      preferredContactMethod: row.preferred_contact_method,
      status: row.status,
      position: row.position,
      joinedAt: row.joined_at,
      lastContactedAt: row.last_contacted_at,
      nextContactAt: row.next_contact_at,
      reason: row.reason,
      specialRequirements: row.special_requirements,
      notes: row.notes,
      offeredSlots: row.offered_slots ? JSON.parse(row.offered_slots) : [],
      declineReason: row.decline_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      deletedAt: row.deleted_at
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default AppointmentRepository;