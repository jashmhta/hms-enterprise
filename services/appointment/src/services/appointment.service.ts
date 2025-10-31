// HMS Appointment Service
// Core business logic for appointment scheduling and management

import { Logger } from '@hms/shared';
import { EventBus } from '@hms/shared';
import { DatabaseConnectionManager } from '@hms/shared';
import { AppointmentRepository } from '@/repositories/appointment.repository';
import {
  Appointment,
  AvailabilitySlot,
  DoctorSchedule,
  WaitlistEntry,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  SearchAppointmentsRequest,
  GetAvailableSlotsRequest,
  AppointmentResponse,
  AppointmentListResponse,
  AvailableSlotsResponse,
  CalendarResponse,
  MetricsResponse,
  AppointmentStatus,
  ConsultationType,
  AppointmentType,
  BookingChannel,
  AppointmentSummary,
  AppointmentCalendarView,
  DoctorAvailabilityInfo
} from '@/models/appointment.model';
import {
  AppointmentCreatedEvent,
  AppointmentUpdatedEvent,
  AppointmentCancelledEvent,
  AppointmentRescheduledEvent,
  AppointmentConfirmedEvent,
  AppointmentCheckedInEvent,
  AppointmentCompletedEvent,
  AppointmentNoShowEvent,
  WaitlistEntryCreatedEvent,
  DoctorScheduleUpdatedEvent
} from '@hms/shared';

// =============================================================================
// APPOINTMENT SERVICE CLASS
// =============================================================================

export class AppointmentService {
  private appointmentRepository: AppointmentRepository;
  private eventBus: EventBus;
  private logger: Logger;

  constructor(
    appointmentRepository: AppointmentRepository,
    eventBus: EventBus,
    logger: Logger
  ) {
    this.appointmentRepository = appointmentRepository;
    this.eventBus = eventBus;
    this.logger = logger.withContext({ service: 'AppointmentService' });
  }

  // =============================================================================
  // APPOINTMENT CORE OPERATIONS
  // =============================================================================

  async createAppointment(appointmentData: CreateAppointmentRequest): Promise<AppointmentResponse> {
    try {
      this.logger.info('Creating new appointment', {
        patientId: appointmentData.patientId,
        doctorId: appointmentData.doctorId,
        scheduledDateTime: appointmentData.scheduledDateTime,
        appointmentType: appointmentData.appointmentType
      });

      // Validate appointment data
      const validationError = this.validateAppointmentData(appointmentData);
      if (validationError) {
        return {
          success: false,
          message: validationError,
          errors: [validationError]
        };
      }

      // Check for conflicts
      const conflictCheck = await this.checkAppointmentConflicts(appointmentData);
      if (conflictCheck.hasConflict) {
        return {
          success: false,
          message: 'Appointment time slot is not available',
          errors: conflictCheck.errors
        };
      }

      // Create appointment
      const appointment = await this.appointmentRepository.createAppointment(appointmentData);

      // Update availability slot if applicable
      if (conflictCheck.suggestedSlot) {
        await this.appointmentRepository.bookSlot(conflictCheck.suggestedSlot.id, appointment.id);
      }

      // Publish appointment created event
      await this.publishAppointmentCreatedEvent(appointment);

      // Schedule reminders
      await this.scheduleReminders(appointment);

      this.logger.info('Appointment created successfully', {
        appointmentId: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        patientId: appointmentData.patientId,
        doctorId: appointmentData.doctorId
      });

      return {
        success: true,
        message: 'Appointment created successfully',
        data: appointment
      };

    } catch (error) {
      this.logger.error('Failed to create appointment', {
        error: error.message,
        appointmentData
      });

      return {
        success: false,
        message: `Failed to create appointment: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async getAppointmentById(appointmentId: string): Promise<AppointmentResponse> {
    try {
      const appointment = await this.appointmentRepository.getAppointmentById(appointmentId);

      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
          errors: ['Appointment ID not found']
        };
      }

      return {
        success: true,
        message: 'Appointment retrieved successfully',
        data: appointment
      };

    } catch (error) {
      this.logger.error('Failed to get appointment', {
        appointmentId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to get appointment: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async getAppointmentByNumber(appointmentNumber: string): Promise<AppointmentResponse> {
    try {
      const appointment = await this.appointmentRepository.getAppointmentByNumber(appointmentNumber);

      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
          errors: ['Appointment number not found']
        };
      }

      return {
        success: true,
        message: 'Appointment retrieved successfully',
        data: appointment
      };

    } catch (error) {
      this.logger.error('Failed to get appointment by number', {
        appointmentNumber,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to get appointment by number: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async updateAppointment(appointmentId: string, updateData: UpdateAppointmentRequest): Promise<AppointmentResponse> {
    try {
      const existingAppointment = await this.appointmentRepository.getAppointmentById(appointmentId);
      if (!existingAppointment) {
        return {
          success: false,
          message: 'Appointment not found',
          errors: ['Appointment ID not found']
        };
      }

      // Validate update permissions
      const validationError = this.validateUpdatePermissions(existingAppointment, updateData);
      if (validationError) {
        return {
          success: false,
          message: validationError,
          errors: [validationError]
        };
      }

      // Check for conflicts if changing time
      if (updateData.scheduledDateTime && updateData.scheduledDateTime !== existingAppointment.scheduledDateTime) {
        const conflictCheck = await this.checkUpdateConflicts(appointmentId, updateData.scheduledDateTime, existingAppointment.doctorId);
        if (conflictCheck.hasConflict) {
          return {
            success: false,
            message: 'New appointment time slot is not available',
            errors: conflictCheck.errors
          };
        }
      }

      // Update appointment
      const updatedAppointment = await this.appointmentRepository.updateAppointment(appointmentId, updateData);

      // Publish appointment updated event
      await this.publishAppointmentUpdatedEvent(updatedAppointment, existingAppointment);

      // Reschedule reminders if time changed
      if (updateData.scheduledDateTime) {
        await this.rescheduleReminders(updatedAppointment);
      }

      this.logger.info('Appointment updated successfully', {
        appointmentId,
        appointmentNumber: updatedAppointment.appointmentNumber,
        updatedFields: Object.keys(updateData).length
      });

      return {
        success: true,
        message: 'Appointment updated successfully',
        data: updatedAppointment
      };

    } catch (error) {
      this.logger.error('Failed to update appointment', {
        appointmentId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to update appointment: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async cancelAppointment(appointmentId: string, reason: string, reasonCategory?: string): Promise<AppointmentResponse> {
    try {
      const appointment = await this.appointmentRepository.getAppointmentById(appointmentId);
      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
          errors: ['Appointment ID not found']
        };
      }

      // Check cancellation policy
      const policyCheck = await this.checkCancellationPolicy(appointment);
      if (!policyCheck.canCancel) {
        return {
          success: false,
          message: policyCheck.message,
          errors: [policyCheck.message]
        };
      }

      // Update appointment status
      await this.appointmentRepository.updateAppointment(appointmentId, {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason,
        cancellationReasonCategory: reasonCategory as any,
        cancelledBy: 'system', // Should come from context
        cancelledAt: new Date()
      });

      // Process refund if applicable
      if (policyCheck.refundAmount && policyCheck.refundAmount > 0) {
        await this.processRefund(appointment, policyCheck.refundAmount);
      }

      // Release the slot for other patients
      await this.releaseAppointmentSlot(appointmentId);

      // Publish appointment cancelled event
      await this.publishAppointmentCancelledEvent(appointment, reason, reasonCategory);

      // Offer slot to waitlist if applicable
      await this.offerSlotToWaitlist(appointment);

      this.logger.info('Appointment cancelled successfully', {
        appointmentId,
        appointmentNumber: appointment.appointmentNumber,
        reason,
        refundAmount: policyCheck.refundAmount
      });

      // Return updated appointment
      const cancelledAppointment = await this.appointmentRepository.getAppointmentById(appointmentId);

      return {
        success: true,
        message: 'Appointment cancelled successfully',
        data: cancelledAppointment!
      };

    } catch (error) {
      this.logger.error('Failed to cancel appointment', {
        appointmentId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to cancel appointment: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // APPOINTMENT SEARCH OPERATIONS
  // =============================================================================

  async searchAppointments(searchRequest: SearchAppointmentsRequest): Promise<AppointmentListResponse> {
    try {
      const result = await this.appointmentRepository.searchAppointments(searchRequest);

      // Convert to appointment summaries
      const appointmentSummaries = result.items.map(appointment => this.convertToSummary(appointment));

      return {
        success: true,
        message: 'Appointments retrieved successfully',
        data: {
          appointments: appointmentSummaries,
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        }
      };

    } catch (error) {
      this.logger.error('Failed to search appointments', {
        error: error.message,
        searchRequest
      });

      return {
        success: false,
        message: `Failed to search appointments: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // AVAILABILITY OPERATIONS
  // =============================================================================

  async getAvailableSlots(request: GetAvailableSlotsRequest): Promise<AvailableSlotsResponse> {
    try {
      const slots = await this.appointmentRepository.getAvailableSlots(request);

      return {
        success: true,
        message: 'Available slots retrieved successfully',
        data: {
          slots,
          total: slots.length,
          dateFrom: request.dateFrom,
          dateTo: request.dateTo
        }
      };

    } catch (error) {
      this.logger.error('Failed to get available slots', {
        error: error.message,
        request
      });

      return {
        success: false,
        message: `Failed to get available slots: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async getCalendarView(doctorId: string, date: Date): Promise<CalendarResponse> {
    try {
      // Get appointments for the day
      const appointmentsResult = await this.appointmentRepository.searchAppointments({
        doctorId,
        dateFrom: date,
        dateTo: date,
        includePatientInfo: true,
        includeDoctorInfo: true
      });

      // Get available slots for the day
      const slots = await this.appointmentRepository.getAvailableSlots({
        doctorId,
        dateFrom: date,
        dateTo: new Date(date.getTime() + 24 * 60 * 60 * 1000),
        maxResults: 100
      });

      // Get doctor schedule for the day
      const doctorSchedule = await this.appointmentRepository.getDoctorSchedule(doctorId, date);

      // Convert to calendar view
      const calendarView: AppointmentCalendarView = {
        date,
        appointments: appointmentsResult.items.map(appointment => this.convertToSummary(appointment)),
        availableSlots: slots,
        blockedSlots: [], // Would implement blocked slots logic
        doctorAvailability: doctorSchedule ? [{
          doctorId: doctorSchedule.doctorId,
          doctorName: '', // Would fetch from user service
          specialization: doctorSchedule.dailySlots[0]?.specialization || '',
          departmentId: doctorSchedule.departmentId,
          departmentName: '', // Would fetch from department service
          isAvailable: true,
          availableSlots: slots,
          maxAppointmentsPerDay: doctorSchedule.dailySlots.reduce((sum, slot) => sum + slot.maxAppointmentsPerSlot, 0),
          currentAppointmentsCount: appointmentsResult.total,
          utilizationRate: this.calculateUtilizationRate(appointmentsResult.total, doctorSchedule.dailySlots)
        }] : []
      };

      return {
        success: true,
        message: 'Calendar view retrieved successfully',
        data: calendarView
      };

    } catch (error) {
      this.logger.error('Failed to get calendar view', {
        doctorId,
        date,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to get calendar view: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // CHECK-IN OPERATIONS
  // =============================================================================

  async checkInAppointment(appointmentId: string, notes?: string): Promise<AppointmentResponse> {
    try {
      const appointment = await this.appointmentRepository.getAppointmentById(appointmentId);
      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
          errors: ['Appointment ID not found']
        };
      }

      // Validate check-in eligibility
      const validationError = this.validateCheckInEligibility(appointment);
      if (validationError) {
        return {
          success: false,
          message: validationError,
          errors: [validationError]
        };
      }

      // Update appointment check-in status
      const updatedAppointment = await this.appointmentRepository.updateAppointment(appointmentId, {
        status: AppointmentStatus.CHECKED_IN,
        isCheckedIn: true,
        checkedInAt: new Date(),
        checkedInBy: 'system', // Should come from context
        checkInNotes: notes
      });

      // Publish appointment checked-in event
      await this.publishAppointmentCheckedInEvent(updatedAppointment);

      this.logger.info('Appointment checked in successfully', {
        appointmentId,
        appointmentNumber: updatedAppointment.appointmentNumber,
        checkedInAt: new Date()
      });

      return {
        success: true,
        message: 'Appointment checked in successfully',
        data: updatedAppointment
      };

    } catch (error) {
      this.logger.error('Failed to check in appointment', {
        appointmentId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to check in appointment: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // APPOINTMENT COMPLETION OPERATIONS
  // =============================================================================

  async completeAppointment(appointmentId: string, actualStartDateTime?: Date, actualEndDateTime?: Date): Promise<AppointmentResponse> {
    try {
      const appointment = await this.appointmentRepository.getAppointmentById(appointmentId);
      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
          errors: ['Appointment ID not found']
        };
      }

      // Validate completion eligibility
      const validationError = this.validateCompletionEligibility(appointment);
      if (validationError) {
        return {
          success: false,
          message: validationError,
          errors: [validationError]
        };
      }

      // Update appointment completion status
      const updatedAppointment = await this.appointmentRepository.updateAppointment(appointmentId, {
        status: AppointmentStatus.COMPLETED,
        actualStartDateTime: actualStartDateTime || new Date(),
        actualEndDateTime: actualEndDateTime || new Date()
      });

      // Update doctor metrics
      await this.updateDoctorMetrics(appointment.doctorId, appointment);

      // Publish appointment completed event
      await this.publishAppointmentCompletedEvent(updatedAppointment);

      this.logger.info('Appointment completed successfully', {
        appointmentId,
        appointmentNumber: updatedAppointment.appointmentNumber,
        completedAt: new Date()
      });

      return {
        success: true,
        message: 'Appointment completed successfully',
        data: updatedAppointment
      };

    } catch (error) {
      this.logger.error('Failed to complete appointment', {
        appointmentId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to complete appointment: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // NO-SHOW OPERATIONS
  // =============================================================================

  async markNoShow(appointmentId: string): Promise<AppointmentResponse> {
    try {
      const appointment = await this.appointmentRepository.getAppointmentById(appointmentId);
      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
          errors: ['Appointment ID not found']
        };
      }

      // Validate no-show eligibility
      const validationError = this.validateNoShowEligibility(appointment);
      if (validationError) {
        return {
          success: false,
          message: validationError,
          errors: [validationError]
        };
      }

      // Update appointment status
      const updatedAppointment = await this.appointmentRepository.updateAppointment(appointmentId, {
        status: AppointmentStatus.NO_SHOW
      });

      // Handle payment (no-refund policy for no-shows)
      await this.handleNoShowPayment(appointment);

      // Update doctor metrics
      await this.updateNoShowMetrics(appointment.doctorId);

      // Publish appointment no-show event
      await this.publishAppointmentNoShowEvent(updatedAppointment);

      // Mark slot as available again
      await this.releaseAppointmentSlot(appointmentId);

      this.logger.info('Appointment marked as no-show', {
        appointmentId,
        appointmentNumber: updatedAppointment.appointmentNumber,
        noShowAt: new Date()
      });

      return {
        success: true,
        message: 'Appointment marked as no-show',
        data: updatedAppointment
      };

    } catch (error) {
      this.logger.error('Failed to mark appointment as no-show', {
        appointmentId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to mark appointment as no-show: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // WAITLIST OPERATIONS
  // =============================================================================

  async addToWaitlist(waitlistData: any): Promise<{ success: boolean; waitlistEntry?: WaitlistEntry; message: string }> {
    try {
      // Validate waitlist data
      const validationError = this.validateWaitlistData(waitlistData);
      if (validationError) {
        return {
          success: false,
          message: validationError
        };
      }

      // Add to waitlist
      const waitlistEntry = await this.appointmentRepository.addToWaitlist(waitlistData);

      // Publish waitlist entry created event
      await this.publishWaitlistEntryCreatedEvent(waitlistEntry);

      this.logger.info('Patient added to waitlist successfully', {
        waitlistId: waitlistEntry.id,
        patientId: waitlistData.patientId,
        doctorId: waitlistData.doctorId,
        position: waitlistEntry.position
      });

      return {
        success: true,
        waitlistEntry,
        message: 'Added to waitlist successfully'
      };

    } catch (error) {
      this.logger.error('Failed to add patient to waitlist', {
        error: error.message,
        waitlistData
      });

      return {
        success: false,
        message: `Failed to add to waitlist: ${error.message}`
      };
    }
  }

  async getWaitlistForDoctor(doctorId: string, limit: number = 50): Promise<WaitlistEntry[]> {
    try {
      return await this.appointmentRepository.getWaitlistForDoctor(doctorId, limit);
    } catch (error) {
      this.logger.error('Failed to get waitlist for doctor', {
        doctorId,
        error: error.message
      });
      return [];
    }
  }

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  async createBulkAppointments(request: any): Promise<AppointmentListResponse> {
    try {
      const appointments: Appointment[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const appointmentData of request.appointments) {
        try {
          const result = await this.createAppointment(appointmentData);
          if (result.success && result.data) {
            appointments.push(result.data);
          } else {
            errors.push(`Failed to create appointment for patient ${appointmentData.patientId}: ${result.message}`);
          }
        } catch (error) {
          errors.push(`Error creating appointment for patient ${appointmentData.patientId}: ${error.message}`);
        }
      }

      this.logger.info('Bulk appointments creation completed', {
        requested: request.appointments.length,
        successful: appointments.length,
        failed: errors.length
      });

      return {
        success: appointments.length > 0,
        message: `Created ${appointments.length} out of ${request.appointments.length} appointments`,
        data: {
          appointments: appointments.map(appointment => this.convertToSummary(appointment)),
          total: appointments.length,
          page: 1,
          limit: appointments.length,
          hasMore: false
        },
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      this.logger.error('Failed to create bulk appointments', {
        error: error.message
      });

      return {
        success: false,
        message: `Failed to create bulk appointments: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // METRICS AND ANALYTICS
  // =============================================================================

  async getMetrics(filters: any = {}): Promise<MetricsResponse> {
    try {
      // Get comprehensive appointment metrics
      const metrics = await this.calculateAppointmentMetrics(filters);

      return {
        success: true,
        message: 'Metrics retrieved successfully',
        data: metrics
      };

    } catch (error) {
      this.logger.error('Failed to get metrics', {
        error: error.message,
        filters
      });

      return {
        success: false,
        message: `Failed to get metrics: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // VALIDATION METHODS
  // =============================================================================

  private validateAppointmentData(data: CreateAppointmentRequest): string | null {
    // Basic validation
    if (!data.patientId) {
      return 'Patient ID is required';
    }

    if (!data.doctorId) {
      return 'Doctor ID is required';
    }

    if (!data.departmentId) {
      return 'Department ID is required';
    }

    if (!data.facilityId) {
      return 'Facility ID is required';
    }

    if (!data.appointmentType) {
      return 'Appointment type is required';
    }

    if (!data.consultationType) {
      return 'Consultation type is required';
    }

    if (!data.scheduledDateTime) {
      return 'Scheduled date time is required';
    }

    // Validate scheduled time
    const now = new Date();
    const scheduledTime = new Date(data.scheduledDateTime);
    const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const maxBookingTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    if (scheduledTime < minBookingTime) {
      return 'Appointment must be scheduled at least 2 hours in advance';
    }

    if (scheduledTime > maxBookingTime) {
      return 'Appointment cannot be scheduled more than 90 days in advance';
    }

    // Validate duration if provided
    if (data.estimatedDuration && (data.estimatedDuration < 5 || data.estimatedDuration > 480)) {
      return 'Appointment duration must be between 5 and 480 minutes';
    }

    return null;
  }

  private validateUpdatePermissions(appointment: Appointment, updateData: UpdateAppointmentRequest): string | null {
    // Check if appointment can be updated based on status
    const immutableStatuses = [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW];
    if (immutableStatuses.includes(appointment.status)) {
      return `Cannot update appointment with status: ${appointment.status}`;
    }

    // Check if time can be changed
    if (updateData.scheduledDateTime && appointment.status === AppointmentStatus.IN_PROGRESS) {
      return 'Cannot change time of appointment that is in progress';
    }

    return null;
  }

  private validateCheckInEligibility(appointment: Appointment): string | null {
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledDateTime);

    // Check if appointment is within check-in window (30 minutes before to 15 minutes after)
    const checkInWindowStart = new Date(appointmentTime.getTime() - 30 * 60 * 1000);
    const checkInWindowEnd = new Date(appointmentTime.getTime() + 15 * 60 * 1000);

    if (now < checkInWindowStart) {
      return 'Too early to check in for this appointment';
    }

    if (now > checkInWindowEnd) {
      return 'Too late to check in for this appointment';
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED && appointment.status !== AppointmentStatus.CONFIRMED) {
      return `Cannot check in appointment with status: ${appointment.status}`;
    }

    if (appointment.isCheckedIn) {
      return 'Appointment is already checked in';
    }

    return null;
  }

  private validateCompletionEligibility(appointment: Appointment): string | null {
    if (!appointment.isCheckedIn) {
      return 'Appointment must be checked in before completion';
    }

    if (appointment.status !== AppointmentStatus.CHECKED_IN && appointment.status !== AppointmentStatus.IN_PROGRESS) {
      return `Cannot complete appointment with status: ${appointment.status}`;
    }

    return null;
  }

  private validateNoShowEligibility(appointment: Appointment): string | null {
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledDateTime);

    // Check if enough time has passed since appointment time (30 minutes)
    const noShowWindow = new Date(appointmentTime.getTime() + 30 * 60 * 1000);

    if (now < noShowWindow) {
      return 'Too early to mark as no-show';
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED && appointment.status !== AppointmentStatus.CONFIRMED) {
      return `Cannot mark appointment as no-show with status: ${appointment.status}`;
    }

    if (appointment.isCheckedIn) {
      return 'Cannot mark checked-in appointment as no-show';
    }

    return null;
  }

  private validateWaitlistData(data: any): string | null {
    if (!data.patientId) {
      return 'Patient ID is required';
    }

    if (!data.doctorId) {
      return 'Doctor ID is required';
    }

    if (!data.departmentId) {
      return 'Department ID is required';
    }

    if (!data.facilityId) {
      return 'Facility ID is required';
    }

    if (!data.preferredDateRange || !data.preferredDateRange.from || !data.preferredDateRange.to) {
      return 'Preferred date range is required';
    }

    if (!data.consultationType) {
      return 'Consultation type is required';
    }

    if (!data.urgencyLevel) {
      return 'Urgency level is required';
    }

    if (!data.contactNumber) {
      return 'Contact number is required';
    }

    if (!data.reason) {
      return 'Reason for waitlist is required';
    }

    return null;
  }

  // =============================================================================
  // CONFLICT CHECKING METHODS
  // =============================================================================

  private async checkAppointmentConflicts(data: CreateAppointmentRequest): Promise<{ hasConflict: boolean; errors?: string[]; suggestedSlot?: AvailabilitySlot }> {
    try {
      // Check doctor availability
      const availableSlots = await this.appointmentRepository.getAvailableSlots({
        doctorId: data.doctorId,
        consultationType: data.consultationType,
        appointmentType: data.appointmentType,
        dateFrom: data.scheduledDateTime,
        dateTo: new Date(data.scheduledDateTime.getTime() + data.estimatedDuration! * 60 * 1000),
        maxResults: 1
      });

      if (availableSlots.length === 0) {
        // Try to find nearby slots
        const nearbySlots = await this.findNearbyAvailableSlots(data);
        if (nearbySlots.length > 0) {
          return {
            hasConflict: true,
            errors: ['Requested time slot is not available'],
            suggestedSlot: nearbySlots[0]
          };
        }

        return {
          hasConflict: true,
          errors: ['No available slots found for the requested time and nearby alternatives']
        };
      }

      // Check if the slot can accommodate the appointment duration
      const suitableSlot = availableSlots.find(slot => {
        const slotDuration = (new Date(slot.endDateTime).getTime() - new Date(slot.startDateTime).getTime()) / (1000 * 60);
        return slotDuration >= (data.estimatedDuration || 30);
      });

      if (!suitableSlot) {
        return {
          hasConflict: true,
          errors: ['Requested appointment duration exceeds available slot duration']
        };
      }

      return { hasConflict: false };

    } catch (error) {
      this.logger.error('Error checking appointment conflicts', {
        error: error.message
      });
      return {
        hasConflict: true,
        errors: ['Error checking availability']
      };
    }
  }

  private async checkUpdateConflicts(appointmentId: string, newDateTime: Date, doctorId: string): Promise<{ hasConflict: boolean; errors?: string[] }> {
    try {
      // Get existing appointments for the doctor at the new time
      const existingAppointments = await this.appointmentRepository.searchAppointments({
        doctorId,
        dateFrom: newDateTime,
        dateTo: new Date(newDateTime.getTime() + 60 * 60 * 1000), // 1 hour window
        status: AppointmentStatus.SCHEDULED
      });

      // Check if there's a conflict (excluding the current appointment)
      const hasConflict = existingAppointments.items.some(apt => apt.id !== appointmentId);

      if (hasConflict) {
        return {
          hasConflict: true,
          errors: ['New appointment time conflicts with existing appointments']
        };
      }

      return { hasConflict: false };

    } catch (error) {
      this.logger.error('Error checking update conflicts', {
        error: error.message
      });
      return {
        hasConflict: true,
        errors: ['Error checking update conflicts']
      };
    }
  }

  private async findNearbyAvailableSlots(data: CreateAppointmentRequest): Promise<AvailabilitySlot[]> {
    try {
      // Look for slots within +/- 2 hours of requested time
      const searchFrom = new Date(data.scheduledDateTime.getTime() - 2 * 60 * 60 * 1000);
      const searchTo = new Date(data.scheduledDateTime.getTime() + 2 * 60 * 60 * 1000);

      const slots = await this.appointmentRepository.getAvailableSlots({
        doctorId: data.doctorId,
        consultationType: data.consultationType,
        appointmentType: data.appointmentType,
        dateFrom: searchFrom,
        dateTo: searchTo,
        maxResults: 5
      });

      return slots;

    } catch (error) {
      this.logger.error('Error finding nearby available slots', {
        error: error.message
      });
      return [];
    }
  }

  // =============================================================================
  // CANCELLATION POLICY METHODS
  // =============================================================================

  private async checkCancellationPolicy(appointment: Appointment): Promise<{ canCancel: boolean; message: string; refundAmount?: number }> {
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledDateTime);
    const hoursBeforeAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Policy: Full refund if cancelled 24+ hours before, 50% refund if 12-24 hours, no refund if <12 hours
    if (hoursBeforeAppointment >= 24) {
      return {
        canCancel: true,
        message: 'Full refund will be processed',
        refundAmount: appointment.consultationFee
      };
    } else if (hoursBeforeAppointment >= 12) {
      return {
        canCancel: true,
        message: '50% refund will be processed',
        refundAmount: appointment.consultationFee * 0.5
      };
    } else if (hoursBeforeAppointment >= 2) {
      return {
        canCancel: true,
        message: 'No refund - less than 12 hours notice',
        refundAmount: 0
      };
    } else {
      return {
        canCancel: false,
        message: 'Cannot cancel appointment less than 2 hours before scheduled time'
      };
    }
  }

  private async processRefund(appointment: Appointment, refundAmount: number): Promise<void> {
    try {
      // This would integrate with payment service
      this.logger.info('Processing refund', {
        appointmentId: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        refundAmount,
        consultationFee: appointment.consultationFee
      });

      // Publish refund event for payment service to process
      await this.eventBus.publish('appointment.refund_requested', {
        id: this.generateEventId(),
        type: 'appointment.refund_requested',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          patientId: appointment.patientId,
          refundAmount,
          originalAmount: appointment.consultationFee,
          paymentMethod: appointment.paymentMethod,
          paymentTransactionId: appointment.paymentTransactionId
        }
      });

    } catch (error) {
      this.logger.error('Failed to process refund', {
        appointmentId: appointment.id,
        refundAmount,
        error: error.message
      });
    }
  }

  private async releaseAppointmentSlot(appointmentId: string): Promise<void> {
    try {
      // This would update the availability slot to make it bookable again
      this.logger.info('Releasing appointment slot', { appointmentId });

      // Implementation depends on slot management system
    } catch (error) {
      this.logger.error('Failed to release appointment slot', {
        appointmentId,
        error: error.message
      });
    }
  }

  // =============================================================================
  // REMINDER METHODS
  // =============================================================================

  private async scheduleReminders(appointment: Appointment): Promise<void> {
    try {
      const reminderSettings = {
        email24h: appointment.scheduledDateTime.getTime() - 24 * 60 * 60 * 1000,
        email2h: appointment.scheduledDateTime.getTime() - 2 * 60 * 60 * 1000,
        sms24h: appointment.scheduledDateTime.getTime() - 24 * 60 * 60 * 1000,
        sms2h: appointment.scheduledDateTime.getTime() - 2 * 60 * 60 * 1000
      };

      // Schedule reminder events
      const now = Date.now();

      if (reminderSettings.email24h > now) {
        await this.scheduleReminder(appointment, 'email', '24h', new Date(reminderSettings.email24h));
      }

      if (reminderSettings.email2h > now) {
        await this.scheduleReminder(appointment, 'email', '2h', new Date(reminderSettings.email2h));
      }

      if (reminderSettings.sms24h > now) {
        await this.scheduleReminder(appointment, 'sms', '24h', new Date(reminderSettings.sms24h));
      }

      if (reminderSettings.sms2h > now) {
        await this.scheduleReminder(appointment, 'sms', '2h', new Date(reminderSettings.sms2h));
      }

    } catch (error) {
      this.logger.error('Failed to schedule reminders', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async rescheduleReminders(appointment: Appointment): Promise<void> {
    try {
      // Cancel existing reminders and schedule new ones
      await this.cancelReminders(appointment.id);
      await this.scheduleReminders(appointment);

    } catch (error) {
      this.logger.error('Failed to reschedule reminders', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async scheduleReminder(appointment: Appointment, method: string, timing: string, scheduledAt: Date): Promise<void> {
    try {
      await this.eventBus.publish('appointment.reminder_scheduled', {
        id: this.generateEventId(),
        type: 'appointment.reminder_scheduled',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          patientId: appointment.patientId,
          patientContactNumber: appointment.patientInfo?.primaryContactNumber,
          patientEmail: appointment.patientInfo?.email,
          doctorId: appointment.doctorId,
          doctorName: `${appointment.doctorInfo?.firstName} ${appointment.doctorInfo?.lastName}`,
          scheduledDateTime: appointment.scheduledDateTime,
          method,
          timing,
          scheduledAt
        }
      });

    } catch (error) {
      this.logger.error('Failed to schedule reminder', {
        appointmentId: appointment.id,
        method,
        timing,
        scheduledAt,
        error: error.message
      });
    }
  }

  private async cancelReminders(appointmentId: string): Promise<void> {
    try {
      await this.eventBus.publish('appointment.reminders_cancelled', {
        id: this.generateEventId(),
        type: 'appointment.reminders_cancelled',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId
        }
      });

    } catch (error) {
      this.logger.error('Failed to cancel reminders', {
        appointmentId,
        error: error.message
      });
    }
  }

  // =============================================================================
  // WAITLIST METHODS
  // =============================================================================

  private async offerSlotToWaitlist(appointment: Appointment): Promise<void> {
    try {
      const waitlistEntries = await this.getWaitlistForDoctor(appointment.doctorId, 5);

      for (const entry of waitlistEntries) {
        // Check if the freed slot matches the waitlist entry's preferences
        const matchesPreference = this.checkWaitlistSlotMatch(entry, appointment);

        if (matchesPreference) {
          // Offer the slot to the waitlist entry
          await this.offerSlotToWaitlistEntry(entry, appointment);
          break; // Only offer to one entry
        }
      }

    } catch (error) {
      this.logger.error('Failed to offer slot to waitlist', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private checkWaitlistSlotMatch(entry: WaitlistEntry, appointment: Appointment): boolean {
    const appointmentTime = appointment.scheduledDateTime;

    // Check if appointment time is within preferred date range
    if (appointmentTime < entry.preferredDateRange.from || appointmentTime > entry.preferredDateRange.to) {
      return false;
    }

    // Check if consultation type matches
    if (entry.consultationType !== appointment.consultationType) {
      return false;
    }

    // Check if appointment time matches preferred time slots
    if (entry.preferredTimeSlots && entry.preferredTimeSlots.length > 0) {
      const appointmentHour = appointmentTime.getHours();
      const appointmentMinute = appointmentTime.getMinutes();
      const appointmentTimeInMinutes = appointmentHour * 60 + appointmentMinute;

      const matchesTimeSlot = entry.preferredTimeSlots.some(slot => {
        const startMinutes = this.timeStringToMinutes(slot.startTime);
        const endMinutes = this.timeStringToMinutes(slot.endTime);
        return appointmentTimeInMinutes >= startMinutes && appointmentTimeInMinutes <= endMinutes;
      });

      if (!matchesTimeSlot) {
        return false;
      }
    }

    return true;
  }

  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  private async offerSlotToWaitlistEntry(entry: WaitlistEntry, appointment: Appointment): Promise<void> {
    try {
      await this.eventBus.publish('appointment.slot_offered_to_waitlist', {
        id: this.generateEventId(),
        type: 'appointment.slot_offered_to_waitlist',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          waitlistEntryId: entry.id,
          patientId: entry.patientId,
          doctorId: entry.doctorId,
          offeredAppointmentId: appointment.id,
          offeredDateTime: appointment.scheduledDateTime,
          responseDeadline: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes to respond
          contactNumber: entry.contactNumber,
          email: entry.email,
          preferredContactMethod: entry.preferredContactMethod
        }
      });

    } catch (error) {
      this.logger.error('Failed to offer slot to waitlist entry', {
        waitlistEntryId: entry.id,
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  // =============================================================================
  // METRICS CALCULATION METHODS
  // =============================================================================

  private async calculateAppointmentMetrics(filters: any): Promise<any> {
    try {
      // Get base metrics
      const baseMetrics = await this.appointmentRepository.searchAppointments({
        ...filters,
        limit: 10000
      });

      const appointments = baseMetrics.items;

      // Calculate metrics
      const totalAppointments = appointments.length;
      const scheduledAppointments = appointments.filter(apt => apt.status === AppointmentStatus.SCHEDULED).length;
      const completedAppointments = appointments.filter(apt => apt.status === AppointmentStatus.COMPLETED).length;
      const cancelledAppointments = appointments.filter(apt => apt.status === AppointmentStatus.CANCELLED).length;
      const noShowAppointments = appointments.filter(apt => apt.status === AppointmentStatus.NO_SHOW).length;
      const rescheduledCount = appointments.reduce((sum, apt) => sum + apt.rescheduleCount, 0);

      const showRate = totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100) : 0;
      const cancellationRate = totalAppointments > 0 ? ((cancelledAppointments / totalAppointments) * 100) : 0;
      const noShowRate = totalAppointments > 0 ? ((noShowAppointments / totalAppointments) * 100) : 0;
      const rescheduleRate = totalAppointments > 0 ? ((rescheduledCount / totalAppointments) * 100) : 0;

      // Calculate revenue
      const revenue = appointments
        .filter(apt => apt.status === AppointmentStatus.COMPLETED && apt.paymentStatus === 'paid')
        .reduce((sum, apt) => sum + apt.consultationFee, 0);

      // Group by appointment type
      const revenueByAppointmentType: Record<string, number> = {};
      appointments
        .filter(apt => apt.status === AppointmentStatus.COMPLETED && apt.paymentStatus === 'paid')
        .forEach(apt => {
          revenueByAppointmentType[apt.appointmentType] = (revenueByAppointmentType[apt.appointmentType] || 0) + apt.consultationFee;
        });

      // Group by consultation type
      const revenueByConsultationType: Record<string, number> = {};
      appointments
        .filter(apt => apt.status === AppointmentStatus.COMPLETED && apt.paymentStatus === 'paid')
        .forEach(apt => {
          revenueByConsultationType[apt.consultationType] = (revenueByConsultationType[apt.consultationType] || 0) + apt.consultationFee;
        });

      return {
        totalAppointments,
        scheduledAppointments,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        rescheduledAppointments: rescheduledCount,
        utilizationRate: showRate,
        averageConsultationDuration: 30, // Would calculate from actual durations
        averageWaitTime: 15, // Would calculate from check-in times
        showRate,
        cancellationRate,
        rescheduleRate,
        noShowRate,
        revenue,
        revenueByAppointmentType,
        revenueByConsultationType,
        doctorPerformance: [], // Would implement doctor-specific metrics
        departmentPerformance: [] // Would implement department-specific metrics
      };

    } catch (error) {
      this.logger.error('Failed to calculate appointment metrics', {
        error: error.message,
        filters
      });

      // Return empty metrics on error
      return {
        totalAppointments: 0,
        scheduledAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        noShowAppointments: 0,
        rescheduledAppointments: 0,
        utilizationRate: 0,
        averageConsultationDuration: 0,
        averageWaitTime: 0,
        showRate: 0,
        cancellationRate: 0,
        rescheduleRate: 0,
        noShowRate: 0,
        revenue: 0,
        revenueByAppointmentType: {},
        revenueByConsultationType: {},
        doctorPerformance: [],
        departmentPerformance: []
      };
    }
  }

  private calculateUtilizationRate(totalAppointments: number, dailySlots: any[]): number {
    if (dailySlots.length === 0) return 0;

    const totalSlotCapacity = dailySlots.reduce((sum, slot) => sum + (slot.maxAppointmentsPerSlot || 1), 0);
    return totalSlotCapacity > 0 ? (totalAppointments / totalSlotCapacity) * 100 : 0;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private convertToSummary(appointment: Appointment): AppointmentSummary {
    return {
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      patientId: appointment.patientId,
      mrn: appointment.mrn,
      patientName: `${appointment.patientInfo?.firstName} ${appointment.patientInfo?.lastName}`.trim(),
      doctorId: appointment.doctorId,
      doctorName: `${appointment.doctorInfo?.firstName} ${appointment.doctorInfo?.lastName}`.trim(),
      departmentId: appointment.departmentId,
      departmentName: '', // Would fetch from department service
      facilityId: appointment.facilityId,
      facilityName: '', // Would fetch from facility service
      appointmentType: appointment.appointmentType,
      consultationType: appointment.consultationType,
      status: appointment.status,
      scheduledDateTime: appointment.scheduledDateTime,
      durationMinutes: appointment.estimatedDuration,
      location: appointment.location?.name,
      consultationFee: appointment.consultationFee,
      paymentStatus: appointment.paymentStatus,
      bookingChannel: appointment.bookingChannel,
      isConfirmed: appointment.isConfirmed,
      isCheckedIn: appointment.isCheckedIn
    };
  }

  private async updateDoctorMetrics(doctorId: string, appointment: Appointment): Promise<void> {
    try {
      // This would update doctor performance metrics
      // Implementation would depend on metrics service
      this.logger.info('Updating doctor metrics', {
        doctorId,
        appointmentId: appointment.id,
        status: appointment.status,
        duration: appointment.estimatedDuration
      });

    } catch (error) {
      this.logger.error('Failed to update doctor metrics', {
        doctorId,
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async updateNoShowMetrics(doctorId: string): Promise<void> {
    try {
      // This would update doctor no-show metrics
      this.logger.info('Updating doctor no-show metrics', {
        doctorId
      });

    } catch (error) {
      this.logger.error('Failed to update doctor no-show metrics', {
        doctorId,
        error: error.message
      });
    }
  }

  private async handleNoShowPayment(appointment: Appointment): Promise<void> {
    try {
      // Handle payment for no-show (typically no refund)
      if (appointment.paymentStatus === 'paid') {
        this.logger.info('No-show payment processed - no refund', {
          appointmentId: appointment.id,
          consultationFee: appointment.consultationFee
        });
      }

    } catch (error) {
      this.logger.error('Failed to handle no-show payment', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  // =============================================================================
  // EVENT PUBLISHING METHODS
  // =============================================================================

  private async publishAppointmentCreatedEvent(appointment: Appointment): Promise<void> {
    try {
      const event: AppointmentCreatedEvent = {
        id: this.generateEventId(),
        type: 'appointment.created',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          patientId: appointment.patientId,
          mrn: appointment.mrn,
          doctorId: appointment.doctorId,
          departmentId: appointment.departmentId,
          facilityId: appointment.facilityId,
          appointmentType: appointment.appointmentType,
          consultationType: appointment.consultationType,
          scheduledDateTime: appointment.scheduledDateTime,
          estimatedDuration: appointment.estimatedDuration,
          consultationFee: appointment.consultationFee,
          patientName: `${appointment.patientInfo?.firstName} ${appointment.patientInfo?.lastName}`,
          patientContactNumber: appointment.patientInfo?.primaryContactNumber,
          patientEmail: appointment.patientInfo?.email,
          doctorName: `${appointment.doctorInfo?.firstName} ${appointment.doctorInfo?.lastName}`,
          location: appointment.location?.name,
          bookingChannel: appointment.bookingChannel,
          isUrgent: appointment.isUrgent
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('appointment.created', event);
    } catch (error) {
      this.logger.error('Failed to publish appointment created event', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async publishAppointmentUpdatedEvent(updatedAppointment: Appointment, originalAppointment: Appointment): Promise<void> {
    try {
      const event: AppointmentUpdatedEvent = {
        id: this.generateEventId(),
        type: 'appointment.updated',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: updatedAppointment.id,
          appointmentNumber: updatedAppointment.appointmentNumber,
          updatedFields: this.getUpdatedFields(updatedAppointment, originalAppointment),
          originalData: originalAppointment,
          updatedData: updatedAppointment
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('appointment.updated', event);
    } catch (error) {
      this.logger.error('Failed to publish appointment updated event', {
        appointmentId: updatedAppointment.id,
        error: error.message
      });
    }
  }

  private async publishAppointmentCancelledEvent(appointment: Appointment, reason: string, reasonCategory?: string): Promise<void> {
    try {
      const event: AppointmentCancelledEvent = {
        id: this.generateEventId(),
        type: 'appointment.cancelled',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          reason,
          reasonCategory: reasonCategory as any,
          cancelledAt: new Date(),
          refundAmount: appointment.refundAmount,
          consultationFee: appointment.consultationFee
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('appointment.cancelled', event);
    } catch (error) {
      this.logger.error('Failed to publish appointment cancelled event', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async publishAppointmentRescheduledEvent(appointment: Appointment): Promise<void> {
    try {
      const event: AppointmentRescheduledEvent = {
        id: this.generateEventId(),
        type: 'appointment.rescheduled',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          originalScheduledDateTime: appointment.originalScheduledDateTime!,
          newScheduledDateTime: appointment.scheduledDateTime,
          rescheduleCount: appointment.rescheduleCount,
          rescheduleReason: appointment.rescheduleReason
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('appointment.rescheduled', event);
    } catch (error) {
      this.logger.error('Failed to publish appointment rescheduled event', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async publishAppointmentConfirmedEvent(appointment: Appointment): Promise<void> {
    try {
      const event: AppointmentConfirmedEvent = {
        id: this.generateEventId(),
        type: 'appointment.confirmed',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          confirmedAt: appointment.confirmedAt!,
          confirmationMethod: appointment.confirmationMethod!
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('appointment.confirmed', event);
    } catch (error) {
      this.logger.error('Failed to publish appointment confirmed event', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async publishAppointmentCheckedInEvent(appointment: Appointment): Promise<void> {
    try {
      const event: AppointmentCheckedInEvent = {
        id: this.generateEventId(),
        type: 'appointment.checked_in',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          checkedInAt: appointment.checkedInAt!,
          checkInNotes: appointment.checkInNotes
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('appointment.checked_in', event);
    } catch (error) {
      this.logger.error('Failed to publish appointment checked-in event', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async publishAppointmentCompletedEvent(appointment: Appointment): Promise<void> {
    try {
      const event: AppointmentCompletedEvent = {
        id: this.generateEventId(),
        type: 'appointment.completed',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          completedAt: new Date(),
          actualStartDateTime: appointment.actualStartDateTime!,
          actualEndDateTime: appointment.actualEndDateTime!,
          actualDuration: appointment.actualEndDateTime && appointment.actualStartDateTime
            ? (new Date(appointment.actualEndDateTime).getTime() - new Date(appointment.actualStartDateTime).getTime()) / (1000 * 60)
            : undefined
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('appointment.completed', event);
    } catch (error) {
      this.logger.error('Failed to publish appointment completed event', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async publishAppointmentNoShowEvent(appointment: Appointment): Promise<void> {
    try {
      const event: AppointmentNoShowEvent = {
        id: this.generateEventId(),
        type: 'appointment.no_show',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          appointmentId: appointment.id,
          appointmentNumber: appointment.appointmentNumber,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          scheduledDateTime: appointment.scheduledDateTime,
          noShowAt: new Date(),
          consultationFee: appointment.consultationFee
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('appointment.no_show', event);
    } catch (error) {
      this.logger.error('Failed to publish appointment no-show event', {
        appointmentId: appointment.id,
        error: error.message
      });
    }
  }

  private async publishWaitlistEntryCreatedEvent(waitlistEntry: WaitlistEntry): Promise<void> {
    try {
      const event: WaitlistEntryCreatedEvent = {
        id: this.generateEventId(),
        type: 'waitlist.created',
        timestamp: new Date(),
        source: 'appointment-service',
        data: {
          waitlistEntryId: waitlistEntry.id,
          patientId: waitlistEntry.patientId,
          doctorId: waitlistEntry.doctorId,
          departmentId: waitlistEntry.departmentId,
          facilityId: waitlistEntry.facilityId,
          preferredDateRange: waitlistEntry.preferredDateRange,
          consultationType: waitlistEntry.consultationType,
          urgencyLevel: waitlistEntry.urgencyLevel,
          position: waitlistEntry.position,
          joinedAt: waitlistEntry.joinedAt
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('waitlist.created', event);
    } catch (error) {
      this.logger.error('Failed to publish waitlist entry created event', {
        waitlistEntryId: waitlistEntry.id,
        error: error.message
      });
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUpdatedFields(updated: Appointment, original: Appointment): string[] {
    const fields: string[] = [];

    // Compare relevant fields
    if (updated.scheduledDateTime !== original.scheduledDateTime) fields.push('scheduledDateTime');
    if (updated.appointmentType !== original.appointmentType) fields.push('appointmentType');
    if (updated.consultationType !== original.consultationType) fields.push('consultationType');
    if (updated.status !== original.status) fields.push('status');
    if (updated.consultationFee !== original.consultationFee) fields.push('consultationFee');
    if (updated.location?.name !== original.location?.name) fields.push('location');
    if (updated.chiefComplaint !== original.chiefComplaint) fields.push('chiefComplaint');

    return fields;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default AppointmentService;