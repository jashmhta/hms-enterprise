// HMS Appointment Service Controller
// HTTP API endpoints for appointment scheduling and management

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@hms/shared';
import { AppointmentService } from '@/services/appointment.service';
import {
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  SearchAppointmentsRequest,
  GetAvailableSlotsRequest
} from '@/models/appointment.model';
import { validationResult } from 'express-validator';

// =============================================================================
// APPOINTMENT CONTROLLER CLASS
// =============================================================================

export class AppointmentController {
  private appointmentService: AppointmentService;
  private logger: Logger;

  constructor(appointmentService: AppointmentService, logger: Logger) {
    this.appointmentService = appointmentService;
    this.logger = logger.withContext({ controller: 'AppointmentController' });
  }

  // =============================================================================
  // APPOINTMENT CORE ENDPOINTS
  // =============================================================================

  createAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => err.msg)
        });
        return;
      }

      const appointmentData: CreateAppointmentRequest = req.body;

      // Add request context
      appointmentData.bookingChannel = appointmentData.bookingChannel || 'website';
      appointmentData.bookingSource = appointmentData.bookingSource || req.headers['x-client'] as string;

      const result = await this.appointmentService.createAppointment(appointmentData);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Create appointment controller error', {
        error: error.message,
        body: req.body,
        headers: req.headers
      });
      next(error);
    }
  };

  getAppointmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointmentId } = req.params;

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required',
          errors: ['Appointment ID parameter is missing']
        });
        return;
      }

      const result = await this.appointmentService.getAppointmentById(appointmentId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Get appointment by ID controller error', {
        error: error.message,
        params: req.params
      });
      next(error);
    }
  };

  getAppointmentByNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointmentNumber } = req.params;

      if (!appointmentNumber) {
        res.status(400).json({
          success: false,
          message: 'Appointment number is required',
          errors: ['Appointment number parameter is missing']
        });
        return;
      }

      const result = await this.appointmentService.getAppointmentByNumber(appointmentNumber);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Get appointment by number controller error', {
        error: error.message,
        params: req.params
      });
      next(error);
    }
  };

  updateAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => err.msg)
        });
        return;
      }

      const { appointmentId } = req.params;
      const updateData: UpdateAppointmentRequest = req.body;

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required',
          errors: ['Appointment ID parameter is missing']
        });
        return;
      }

      const result = await this.appointmentService.updateAppointment(appointmentId, updateData);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Update appointment controller error', {
        error: error.message,
        params: req.params,
        body: req.body
      });
      next(error);
    }
  };

  cancelAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointmentId } = req.params;
      const { reason, reasonCategory } = req.body;

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required',
          errors: ['Appointment ID parameter is missing']
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          message: 'Cancellation reason is required',
          errors: ['Cancellation reason is missing']
        });
        return;
      }

      const result = await this.appointmentService.cancelAppointment(appointmentId, reason, reasonCategory);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Cancel appointment controller error', {
        error: error.message,
        params: req.params,
        body: req.body
      });
      next(error);
    }
  };

  // =============================================================================
  // APPOINTMENT SEARCH ENDPOINTS
  // =============================================================================

  searchAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => err.msg)
        });
        return;
      }

      const searchRequest: SearchAppointmentsRequest = {
        patientId: req.query.patientId as string,
        doctorId: req.query.doctorId as string,
        departmentId: req.query.departmentId as string,
        facilityId: req.query.facilityId as string,
        appointmentType: req.query.appointmentType as any,
        consultationType: req.query.consultationType as any,
        status: req.query.status as any,
        priority: req.query.priority as any,
        paymentStatus: req.query.paymentStatus as any,
        bookingChannel: req.query.bookingChannel as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        isConfirmed: req.query.isConfirmed ? req.query.isConfirmed === 'true' : undefined,
        isCheckedIn: req.query.isCheckedIn ? req.query.isCheckedIn === 'true' : undefined,
        isRecurring: req.query.isRecurring ? req.query.isRecurring === 'true' : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',').map(tag => tag.trim()) : undefined,
        includePatientInfo: req.query.includePatientInfo ? req.query.includePatientInfo === 'true' : undefined,
        includeDoctorInfo: req.query.includeDoctorInfo ? req.query.includeDoctorInfo === 'true' : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC' || 'DESC'
      };

      const result = await this.appointmentService.searchAppointments(searchRequest);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Search appointments controller error', {
        error: error.message,
        query: req.query
      });
      next(error);
    }
  };

  // =============================================================================
  // AVAILABILITY ENDPOINTS
  // =============================================================================

  getAvailableSlots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => err.msg)
        });
        return;
      }

      const request: GetAvailableSlotsRequest = {
        doctorId: req.query.doctorId as string,
        departmentId: req.query.departmentId as string,
        facilityId: req.query.facilityId as string,
        consultationType: req.query.consultationType as any,
        appointmentType: req.query.appointmentType as any,
        dateFrom: new Date(req.query.dateFrom as string),
        dateTo: new Date(req.query.dateTo as string),
        includeWeekends: req.query.includeWeekends ? req.query.includeWeekends === 'true' : undefined,
        maxResults: req.query.maxResults ? Math.min(parseInt(req.query.maxResults as string), 200) : 50
      };

      const result = await this.appointmentService.getAvailableSlots(request);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Get available slots controller error', {
        error: error.message,
        query: req.query
      });
      next(error);
    }
  };

  getCalendarView = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { doctorId } = req.params;
      const { date } = req.query;

      if (!doctorId) {
        res.status(400).json({
          success: false,
          message: 'Doctor ID is required',
          errors: ['Doctor ID parameter is missing']
        });
        return;
      }

      const calendarDate = date ? new Date(date as string) : new Date();

      const result = await this.appointmentService.getCalendarView(doctorId, calendarDate);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Get calendar view controller error', {
        error: error.message,
        params: req.params,
        query: req.query
      });
      next(error);
    }
  };

  // =============================================================================
  // APPOINTMENT MANAGEMENT ENDPOINTS
  // =============================================================================

  checkInAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointmentId } = req.params;
      const { notes } = req.body;

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required',
          errors: ['Appointment ID parameter is missing']
        });
        return;
      }

      const result = await this.appointmentService.checkInAppointment(appointmentId, notes);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Check in appointment controller error', {
        error: error.message,
        params: req.params,
        body: req.body
      });
      next(error);
    }
  };

  completeAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointmentId } = req.params;
      const { actualStartDateTime, actualEndDateTime } = req.body;

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required',
          errors: ['Appointment ID parameter is missing']
        });
        return;
      }

      const result = await this.appointmentService.completeAppointment(
        appointmentId,
        actualStartDateTime ? new Date(actualStartDateTime) : undefined,
        actualEndDateTime ? new Date(actualEndDateTime) : undefined
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Complete appointment controller error', {
        error: error.message,
        params: req.params,
        body: req.body
      });
      next(error);
    }
  };

  markNoShow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointmentId } = req.params;

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required',
          errors: ['Appointment ID parameter is missing']
        });
        return;
      }

      const result = await this.appointmentService.markNoShow(appointmentId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Mark no-show controller error', {
        error: error.message,
        params: req.params
      });
      next(error);
    }
  };

  // =============================================================================
  // BULK OPERATIONS ENDPOINTS
  // =============================================================================

  createBulkAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { appointments, createRecurringSeries, recurringPattern } = req.body;

      if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Appointments array is required',
          errors: ['Appointments array must be provided and non-empty']
        });
        return;
      }

      const request = {
        appointments,
        createRecurringSeries: createRecurringSeries || false,
        recurringPattern
      };

      const result = await this.appointmentService.createBulkAppointments(request);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Create bulk appointments controller error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  };

  // =============================================================================
  // WAITLIST ENDPOINTS
  // =============================================================================

  addToWaitlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const waitlistData = req.body;

      if (!waitlistData.patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required',
          errors: ['Patient ID is missing']
        });
        return;
      }

      if (!waitlistData.doctorId) {
        res.status(400).json({
          success: false,
          message: 'Doctor ID is required',
          errors: ['Doctor ID is missing']
        });
        return;
      }

      if (!waitlistData.preferredDateRange || !waitlistData.preferredDateRange.from || !waitlistData.preferredDateRange.to) {
        res.status(400).json({
          success: false,
          message: 'Preferred date range is required',
          errors: ['Preferred date range with from and to dates is missing']
        });
        return;
      }

      const result = await this.appointmentService.addToWaitlist(waitlistData);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.waitlistEntry
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      this.logger.error('Add to waitlist controller error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  };

  getWaitlistForDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { doctorId } = req.params;
      const { limit } = req.query;

      if (!doctorId) {
        res.status(400).json({
          success: false,
          message: 'Doctor ID is required',
          errors: ['Doctor ID parameter is missing']
        });
        return;
      }

      const waitlistEntries = await this.appointmentService.getWaitlistForDoctor(
        doctorId,
        limit ? parseInt(limit as string) : 20
      );

      res.status(200).json({
        success: true,
        message: 'Waitlist retrieved successfully',
        data: {
          waitlistEntries,
          total: waitlistEntries.length
        }
      });

    } catch (error) {
      this.logger.error('Get waitlist for doctor controller error', {
        error: error.message,
        params: req.params,
        query: req.query
      });
      next(error);
    }
  };

  // =============================================================================
  // METRICS ENDPOINTS
  // =============================================================================

  getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        doctorId: req.query.doctorId as string,
        departmentId: req.query.departmentId as string,
        facilityId: req.query.facilityId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        appointmentType: req.query.appointmentType as any,
        consultationType: req.query.consultationType as any
      };

      const result = await this.appointmentService.getMetrics(filters);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.logger.error('Get metrics controller error', {
        error: error.message,
        query: req.query
      });
      next(error);
    }
  };

  // =============================================================================
  // HEALTH CHECK ENDPOINT
  // =============================================================================

  healthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        message: 'Appointment service is healthy',
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          service: 'appointment-service',
          features: {
            scheduling: true,
            waitlist: true,
            reminders: true,
            bulkOperations: true,
            calendarIntegration: true
          }
        }
      });

    } catch (error) {
      this.logger.error('Health check controller error', {
        error: error.message
      });
      next(error);
    }
  };

  // =============================================================================
  // UTILITY ENDPOINTS
  // =============================================================================

  getAppointmentTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointmentTypes = [
        { value: 'new_consultation', label: 'New Consultation', description: 'First-time patient consultation' },
        { value: 'follow_up', label: 'Follow-up', description: 'Follow-up consultation for existing patient' },
        { value: 'review', label: 'Review', description: 'Review consultation or second opinion' },
        { value: 'emergency', label: 'Emergency', description: 'Emergency medical consultation' },
        { value: 'procedure', label: 'Procedure', description: 'Medical procedure appointment' },
        { value: 'surgery', label: 'Surgery', description: 'Surgical procedure appointment' },
        { value: 'vaccination', label: 'Vaccination', description: 'Vaccination appointment' },
        { value: 'health_checkup', label: 'Health Checkup', description: 'Comprehensive health checkup' },
        { value: 'specialist_referral', label: 'Specialist Referral', description: 'Specialist consultation by referral' },
        { value: 'teleconsultation', label: 'Teleconsultation', description: 'Remote video/phone consultation' },
        { value: 'home_visit', label: 'Home Visit', description: 'Doctor home visit' },
        { value: 'corporate_checkup', label: 'Corporate Checkup', description: 'Corporate health checkup' }
      ];

      res.status(200).json({
        success: true,
        message: 'Appointment types retrieved successfully',
        data: appointmentTypes
      });

    } catch (error) {
      this.logger.error('Get appointment types controller error', {
        error: error.message
      });
      next(error);
    }
  };

  getConsultationTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const consultationTypes = [
        { value: 'in_person', label: 'In-Person', description: 'Face-to-face consultation at clinic/hospital' },
        { value: 'video', label: 'Video Consultation', description: 'Remote video consultation' },
        { value: 'phone', label: 'Phone Consultation', description: 'Phone-only consultation' },
        { value: 'chat', label: 'Chat Consultation', description: 'Text-based consultation' }
      ];

      res.status(200).json({
        success: true,
        message: 'Consultation types retrieved successfully',
        data: consultationTypes
      });

    } catch (error) {
      this.logger.error('Get consultation types controller error', {
        error: error.message
      });
      next(error);
    }
  };

  getBookingChannels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bookingChannels = [
        { value: 'walk_in', label: 'Walk-in', description: 'Direct walk-in at reception' },
        { value: 'phone', label: 'Phone', description: 'Booking via phone call' },
        {value: 'website', label: 'Website', description: 'Booking through website' },
        { value: 'mobile_app', label: 'Mobile App', description: 'Booking through mobile application' },
        { value: 'reception', label: 'Reception', description: 'Booking at reception desk' },
        { value: 'referral', label: 'Referral', description: 'Booking through doctor referral' },
        { value: 'corporate', label: 'Corporate', description: 'Corporate wellness booking' },
        { value: 'online_portal', label: 'Online Portal', description: 'Booking through patient portal' }
      ];

      res.status(200).json({
        success: true,
        message: 'Booking channels retrieved successfully',
        data: bookingChannels
      });

    } catch (error) {
      this.logger.error('Get booking channels controller error', {
        error: error.message
      });
      next(error);
    }
  };

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  handleNotFoundError = (req: Request, res: Response): void => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found',
      errors: [`The requested endpoint ${req.method} ${req.originalUrl} was not found`]
    });
  };

  handleMethodNotAllowed = (req: Request, res: Response): void => {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      errors: [`The method ${req.method} is not allowed for endpoint ${req.originalUrl}`]
    });
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default AppointmentController;