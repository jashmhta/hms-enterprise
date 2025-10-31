/**
 * Validation Middleware for Appointment Service
 * HMS Enterprise
 * 
 * Validates request data for appointment operations with comprehensive
 * validation logic and error handling.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import {
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  BulkAppointmentRequest,
  RescheduleAppointmentRequest,
  WaitlistRequest,
  CancelAppointmentRequest,
  CreateSlotRequest,
  AvailabilityRequest,
  AppointmentSearchParams,
  TimeSlot,
  DayAvailability
} from '../models/appointment.model';

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Generic validation middleware using Zod schemas
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          expected: err.expected,
          received: err.received
        }));

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          details: validationErrors,
          timestamp: new Date().toISOString()
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          success: false,
          message: 'Query validation failed',
          error: 'QUERY_VALIDATION_ERROR',
          details: validationErrors,
          timestamp: new Date().toISOString()
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate appointment date logic
 */
export function validateAppointmentDate(req: Request, res: Response, next: NextFunction) {
  const { scheduledDateTime } = req.body;

  if (!scheduledDateTime) {
    return next(new ValidationError('scheduledDateTime is required', 'scheduledDateTime'));
  }

  const appointmentDate = new Date(scheduledDateTime);
  const now = new Date();

  // Check if appointment is in the past
  if (appointmentDate < now) {
    return res.status(400).json({
      success: false,
      message: 'Appointment date cannot be in the past',
      error: 'PAST_DATE_NOT_ALLOWED',
      timestamp: new Date().toISOString()
    });
  }

  // Check if appointment is too far in the future (more than 1 year)
  const maxFutureDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
  if (appointmentDate > maxFutureDate) {
    return res.status(400).json({
      success: false,
      message: 'Appointment date cannot be more than 1 year in advance',
      error: 'DATE_TOO_FAR_FUTURE',
      timestamp: new Date().toISOString()
    });
  }

  // Check if appointment is during business hours
  const appointmentHour = appointmentDate.getHours();
  if (appointmentHour < 8 || appointmentHour > 18) {
    return res.status(400).json({
      success: false,
      message: 'Appointments must be scheduled between 8:00 AM and 6:00 PM',
      error: 'OUTSIDE_BUSINESS_HOURS',
      timestamp: new Date().toISOString()
    });
  }

  // Check if appointment is on a weekend
  const dayOfWeek = appointmentDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return res.status(400).json({
      success: false,
      message: 'Appointments cannot be scheduled on weekends',
      error: 'WEEKEND_NOT_ALLOWED',
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Validate time slot duration
 */
export function validateTimeSlot(req: Request, res: Response, next: NextFunction) {
  const { startTime, endTime } = req.body;

  if (!startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: 'Start time and end time are required',
      error: 'MISSING_TIME_DATA',
      timestamp: new Date().toISOString()
    });
  }

  const start = new Date(startTime);
  const end = new Date(startTime);
  const [endHours, endMinutes] = endTime.split(':');
  end.setHours(parseInt(endHours), parseInt(endMinutes));

  // Check if end time is after start time
  if (end <= start) {
    return res.status(400).json({
      success: false,
      message: 'End time must be after start time',
      error: 'INVALID_TIME_RANGE',
      timestamp: new Date().toISOString()
    });
  }

  // Check minimum duration (15 minutes)
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  if (durationMinutes < 15) {
    return res.status(400).json({
      success: false,
      message: 'Minimum appointment duration is 15 minutes',
      error: 'DURATION_TOO_SHORT',
      details: { providedDuration: durationMinutes, minimumDuration: 15 },
      timestamp: new Date().toISOString()
    });
  }

  // Check maximum duration (4 hours)
  if (durationMinutes > 240) {
    return res.status(400).json({
      success: false,
      message: 'Maximum appointment duration is 4 hours',
      error: 'DURATION_TOO_LONG',
      details: { providedDuration: durationMinutes, maximumDuration: 240 },
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Validate doctor availability conflicts
 */
export function validateDoctorAvailability(req: Request, res: Response, next: NextFunction) {
  const { doctorId, scheduledDateTime, duration } = req.body;

  if (!doctorId || !scheduledDateTime) {
    return res.status(400).json({
      success: false,
      message: 'Doctor ID and scheduled date time are required',
      error: 'MISSING_REQUIRED_FIELDS',
      timestamp: new Date().toISOString()
    });
  }

  // This is a basic validation - actual conflict checking is done in the service layer
  const appointmentDate = new Date(scheduledDateTime);
  const durationMinutes = duration || 30;
  const endTime = new Date(appointmentDate.getTime() + (durationMinutes * 60 * 1000));

  // Attach calculated end time to request for service layer use
  req.body.calculatedEndTime = endTime;

  next();
}

/**
 * Validate patient eligibility
 */
export function validatePatientEligibility(req: Request, res: Response, next: NextFunction) {
  const { patientId, appointmentType } = req.body;

  if (!patientId) {
    return res.status(400).json({
      success: false,
      message: 'Patient ID is required',
      error: 'MISSING_PATIENT_ID',
      timestamp: new Date().toISOString()
    });
  }

  if (!appointmentType) {
    return res.status(400).json({
      success: false,
      message: 'Appointment type is required',
      error: 'MISSING_APPOINTMENT_TYPE',
      timestamp: new Date().toISOString()
    });
  }

  // Additional validation based on appointment type
  const restrictedTypes = ['SURGERY', 'EMERGENCY', 'SPECIAL_PROCEDURE'];
  if (restrictedTypes.includes(appointmentType)) {
    // These types might require additional prerequisites
    // This is a placeholder for business logic validation
    req.body.requiresPreAuthorization = true;
  }

  next();
}

/**
 * Validate bulk appointment request
 */
export function validateBulkAppointment(req: Request, res: Response, next: NextFunction) {
  const { appointments } = req.body as BulkAppointmentRequest;

  if (!appointments || !Array.isArray(appointments)) {
    return res.status(400).json({
      success: false,
      message: 'Appointments array is required',
      error: 'MISSING_APPOINTMENTS_ARRAY',
      timestamp: new Date().toISOString()
    });
  }

  if (appointments.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one appointment is required',
      error: 'EMPTY_APPOINTMENTS_ARRAY',
      timestamp: new Date().toISOString()
    });
  }

  if (appointments.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Cannot create more than 100 appointments in bulk',
      error: 'BULK_LIMIT_EXCEEDED',
      details: { limit: 100, requested: appointments.length },
      timestamp: new Date().toISOString()
    });
  }

  // Validate each appointment has required fields
  for (let i = 0; i < appointments.length; i++) {
    const appointment = appointments[i];
    if (!appointment.patientId || !appointment.doctorId || !appointment.scheduledDateTime) {
      return res.status(400).json({
        success: false,
        message: `Appointment at index ${i} is missing required fields`,
        error: 'INVALID_APPOINTMENT_DATA',
        details: { index: i, appointment },
        timestamp: new Date().toISOString()
      });
    }
  }

  next();
}

/**
 * Validate reschedule request
 */
export function validateRescheduleRequest(req: Request, res: Response, next: NextFunction) {
  const { appointmentId, newScheduledDateTime, reason } = req.body as RescheduleAppointmentRequest;

  if (!appointmentId) {
    return res.status(400).json({
      success: false,
      message: 'Appointment ID is required',
      error: 'MISSING_APPOINTMENT_ID',
      timestamp: new Date().toISOString()
    });
  }

  if (!newScheduledDateTime) {
    return res.status(400).json({
      success: false,
      message: 'New scheduled date time is required',
      error: 'MISSING_NEW_DATE_TIME',
      timestamp: new Date().toISOString()
    });
  }

  const newDate = new Date(newScheduledDateTime);
  const now = new Date();

  if (newDate <= now) {
    return res.status(400).json({
      success: false,
      message: 'New appointment date must be in the future',
      error: 'INVALID_NEW_DATE',
      timestamp: new Date().toISOString()
    });
  }

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Reschedule reason is required',
      error: 'MISSING_RESCHEDULE_REASON',
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Validate waitlist request
 */
export function validateWaitlistRequest(req: Request, res: Response, next: NextFunction) {
  const { patientId, doctorId, preferredDateRange, appointmentType } = req.body as WaitlistRequest;

  if (!patientId || !doctorId || !appointmentType) {
    return res.status(400).json({
      success: false,
      message: 'Patient ID, doctor ID, and appointment type are required',
      error: 'MISSING_REQUIRED_FIELDS',
      timestamp: new Date().toISOString()
    });
  }

  if (preferredDateRange) {
    const { startDate, endDate } = preferredDateRange;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end <= start) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date',
          error: 'INVALID_DATE_RANGE',
          timestamp: new Date().toISOString()
        });
      }

      // Check if date range is reasonable (not more than 6 months)
      const rangeMs = end.getTime() - start.getTime();
      const rangeDays = rangeMs / (1000 * 60 * 60 * 24);
      if (rangeDays > 180) {
        return res.status(400).json({
          success: false,
          message: 'Preferred date range cannot exceed 6 months',
          error: 'DATE_RANGE_TOO_LONG',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  next();
}

/**
 * Validate search parameters
 */
export function validateSearchParams(req: Request, res: Response, next: NextFunction) {
  const { page, limit, dateRange, doctorId, patientId } = req.query;

  // Validate pagination
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;

  if (pageNum < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page number must be greater than 0',
      error: 'INVALID_PAGE_NUMBER',
      timestamp: new Date().toISOString()
    });
  }

  if (limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100',
      error: 'INVALID_LIMIT',
      timestamp: new Date().toISOString()
    });
  }

  // Validate date range
  if (dateRange) {
    try {
      const parsedRange = JSON.parse(dateRange as string);
      const { startDate, endDate } = parsedRange;
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end <= start) {
          return res.status(400).json({
            success: false,
            message: 'End date must be after start date',
            error: 'INVALID_DATE_RANGE',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range format',
        error: 'INVALID_DATE_RANGE_FORMAT',
        timestamp: new Date().toISOString()
      });
    }
  }

  next();
}

/**
 * Validate calendar integration settings
 */
export function validateCalendarIntegration(req: Request, res: Response, next: NextFunction) {
  const { provider, calendarId, syncEnabled } = req.body;

  const validProviders = ['google', 'outlook', 'apple'];
  if (provider && !validProviders.includes(provider)) {
    return res.status(400).json({
      success: false,
      message: `Provider must be one of: ${validProviders.join(', ')}`,
      error: 'INVALID_CALENDAR_PROVIDER',
      timestamp: new Date().toISOString()
    });
  }

  if (syncEnabled !== undefined && typeof syncEnabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Sync enabled must be a boolean',
      error: 'INVALID_SYNC_ENABLED_TYPE',
      timestamp: new Date().toISOString()
    });
  }

  next();
}

export default {
  validateBody,
  validateQuery,
  validateAppointmentDate,
  validateTimeSlot,
  validateDoctorAvailability,
  validatePatientEligibility,
  validateBulkAppointment,
  validateRescheduleRequest,
  validateWaitlistRequest,
  validateSearchParams,
  validateCalendarIntegration,
  ValidationError
};