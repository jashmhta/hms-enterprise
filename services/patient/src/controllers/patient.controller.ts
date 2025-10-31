// HMS Patient Service Controller
// HTTP API endpoints for patient management with ABDM integration

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@hms/shared';
import { PatientService } from '@/services/patient.service';
import {
  CreatePatientRequest,
  UpdatePatientRequest,
  SearchPatientRequest,
  CreateVisitRequest,
  ABDMConsentRequest
} from '@/models/patient.model';
import { validationResult } from 'express-validator';

// =============================================================================
// PATIENT CONTROLLER CLASS
// =============================================================================

export class PatientController {
  private patientService: PatientService;
  private logger: Logger;

  constructor(patientService: PatientService, logger: Logger) {
    this.patientService = patientService;
    this.logger = logger.withContext({ controller: 'PatientController' });
  }

  // =============================================================================
  // PATIENT CORE ENDPOINTS
  // =============================================================================

  createPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const patientData: CreatePatientRequest = req.body;

      // Add request context
      patientData.registrationSource = patientData.registrationSource || 'walk-in';
      patientData.registrationLocation = patientData.registrationLocation || req.headers['x-facility-id'] as string;

      const result = await this.patientService.createPatient(patientData);

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
      this.logger.error('Create patient controller error', {
        error: error.message,
        body: req.body,
        headers: req.headers
      });
      next(error);
    }
  };

  getPatientById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required',
          errors: ['Patient ID parameter is missing']
        });
        return;
      }

      const result = await this.patientService.getPatientById(patientId);

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
      this.logger.error('Get patient by ID controller error', {
        error: error.message,
        params: req.params
      });
      next(error);
    }
  };

  getPatientByMRN = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mrn } = req.params;

      if (!mrn) {
        res.status(400).json({
          success: false,
          message: 'MRN is required',
          errors: ['MRN parameter is missing']
        });
        return;
      }

      const result = await this.patientService.getPatientByMRN(mrn);

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
      this.logger.error('Get patient by MRN controller error', {
        error: error.message,
        params: req.params
      });
      next(error);
    }
  };

  updatePatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const { patientId } = req.params;
      const updateData: UpdatePatientRequest = req.body;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required',
          errors: ['Patient ID parameter is missing']
        });
        return;
      }

      const result = await this.patientService.updatePatient(patientId, updateData);

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
      this.logger.error('Update patient controller error', {
        error: error.message,
        params: req.params,
        body: req.body
      });
      next(error);
    }
  };

  deletePatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required',
          errors: ['Patient ID parameter is missing']
        });
        return;
      }

      const result = await this.patientService.deletePatient(patientId);

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
      this.logger.error('Delete patient controller error', {
        error: error.message,
        params: req.params
      });
      next(error);
    }
  };

  // =============================================================================
  // PATIENT SEARCH ENDPOINTS
  // =============================================================================

  searchPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const searchRequest: SearchPatientRequest = {
        query: req.query.query as string,
        mrn: req.query.mrn as string,
        firstName: req.query.firstName as string,
        lastName: req.query.lastName as string,
        phone: req.query.phone as string,
        email: req.query.email as string,
        aadhaarNumber: req.query.aadhaarNumber as string,
        abhaNumber: req.query.abhaNumber as string,
        dateOfBirth: req.query.dateOfBirth ? new Date(req.query.dateOfBirth as string) : undefined,
        gender: req.query.gender as any,
        bloodGroup: req.query.bloodGroup as any,
        status: req.query.status as any,
        registrationDateFrom: req.query.registrationDateFrom ? new Date(req.query.registrationDateFrom as string) : undefined,
        registrationDateTo: req.query.registrationDateTo ? new Date(req.query.registrationDateTo as string) : undefined,
        lastVisitDateFrom: req.query.lastVisitDateFrom ? new Date(req.query.lastVisitDateFrom as string) : undefined,
        lastVisitDateTo: req.query.lastVisitDateTo ? new Date(req.query.lastVisitDateTo as string) : undefined,
        departmentId: req.query.departmentId as string,
        doctorId: req.query.doctorId as string,
        facilityId: req.query.facilityId as string,
        includeInactive: req.query.includeInactive === 'true',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC' || 'DESC'
      };

      const result = await this.patientService.searchPatients(searchRequest);

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
      this.logger.error('Search patients controller error', {
        error: error.message,
        query: req.query
      });
      next(error);
    }
  };

  getPatientSummaries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = {
        status: req.query.status as any,
        registrationDateFrom: req.query.registrationDateFrom ? new Date(req.query.registrationDateFrom as string) : undefined,
        registrationDateTo: req.query.registrationDateTo ? new Date(req.query.registrationDateTo as string) : undefined,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : undefined
      };

      const result = await this.patientService.getPatientSummaries(filter);

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
      this.logger.error('Get patient summaries controller error', {
        error: error.message,
        query: req.query
      });
      next(error);
    }
  };

  // =============================================================================
  // PATIENT VISIT ENDPOINTS
  // =============================================================================

  createPatientVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const visitData: CreateVisitRequest = req.body;

      // Add request context
      visitData.facilityId = visitData.facilityId || req.headers['x-facility-id'] as string;

      const result = await this.patientService.createPatientVisit(visitData);

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
      this.logger.error('Create patient visit controller error', {
        error: error.message,
        body: req.body,
        headers: req.headers
      });
      next(error);
    }
  };

  getPatientVisits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required',
          errors: ['Patient ID parameter is missing']
        });
        return;
      }

      const options = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 20,
        status: req.query.status as string,
        visitType: req.query.visitType as string,
        departmentId: req.query.departmentId as string,
        doctorId: req.query.doctorId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      const result = await this.patientService.getPatientVisits(patientId, options);

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
      this.logger.error('Get patient visits controller error', {
        error: error.message,
        params: req.params,
        query: req.query
      });
      next(error);
    }
  };

  // =============================================================================
  // PATIENT PROFILE ENDPOINTS
  // =============================================================================

  getPatientProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required',
          errors: ['Patient ID parameter is missing']
        });
        return;
      }

      const result = await this.patientService.getPatientProfile(patientId);

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
      this.logger.error('Get patient profile controller error', {
        error: error.message,
        params: req.params
      });
      next(error);
    }
  };

  // =============================================================================
  // ABDM INTEGRATION ENDPOINTS
  // =============================================================================

  generateAadhaarOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { aadhaarNumber } = req.body;

      if (!aadhaarNumber) {
        res.status(400).json({
          success: false,
          message: 'Aadhaar number is required',
          errors: ['Aadhaar number is missing']
        });
        return;
      }

      const result = await this.patientService.generateAadhaarOtp(aadhaarNumber);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            txnId: result.txnId
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: [result.message]
        });
      }

    } catch (error) {
      this.logger.error('Generate Aadhaar OTP controller error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  };

  verifyAadhaarOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { txnId, otp } = req.body;

      if (!txnId || !otp) {
        res.status(400).json({
          success: false,
          message: 'Transaction ID and OTP are required',
          errors: ['Transaction ID or OTP is missing']
        });
        return;
      }

      const result = await this.patientService.verifyAadhaarOtp(txnId, otp);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            patient: result.patient
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: [result.message]
        });
      }

    } catch (error) {
      this.logger.error('Verify Aadhaar OTP controller error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  };

  createABHA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const abhaRequest = req.body;

      if (!abhaRequest) {
        res.status(400).json({
          success: false,
          message: 'ABHA creation request data is required',
          errors: ['Request body is missing']
        });
        return;
      }

      const result = await this.patientService.createABHA(abhaRequest);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            patient: result.patient
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: [result.message]
        });
      }

    } catch (error) {
      this.logger.error('Create ABHA controller error', {
        error: error.message,
        body: req.body
      });
      next(error);
    }
  };

  linkABHAToPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;
      const abhaData = req.body;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required',
          errors: ['Patient ID parameter is missing']
        });
        return;
      }

      if (!abhaData || (!abhaData.abhaNumber && !abhaData.healthId)) {
        res.status(400).json({
          success: false,
          message: 'ABHA number or Health ID is required',
          errors: ['ABHA details are missing']
        });
        return;
      }

      const result = await this.patientService.linkABHAToPatient(patientId, abhaData);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: [result.message]
        });
      }

    } catch (error) {
      this.logger.error('Link ABHA to patient controller error', {
        error: error.message,
        params: req.params,
        body: req.body
      });
      next(error);
    }
  };

  createABDMConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;
      const consentRequest: ABDMConsentRequest = req.body;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Patient ID is required',
          errors: ['Patient ID parameter is missing']
        });
        return;
      }

      if (!consentRequest) {
        res.status(400).json({
          success: false,
          message: 'Consent request data is required',
          errors: ['Request body is missing']
        });
        return;
      }

      // Add patient ID to consent request
      consentRequest.hipId = consentRequest.hipId || req.headers['x-hip-id'] as string;

      const result = await this.patientService.createABDMConsent(patientId, consentRequest);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            consentId: result.consentId
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: [result.message]
        });
      }

    } catch (error) {
      this.logger.error('Create ABDM consent controller error', {
        error: error.message,
        params: req.params,
        body: req.body
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
        message: 'Patient service is healthy',
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          service: 'patient-service'
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

  getABDMStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // This would typically come from a service method
      // For now, return basic ABDM configuration status
      const abdmEnabled = process.env.ABDM_ENABLED === 'true';
      const abdmMode = process.env.ABDM_MODE || 'sandbox';

      res.status(200).json({
        success: true,
        message: 'ABDM status retrieved successfully',
        data: {
          enabled: abdmEnabled,
          mode: abdmMode,
          hipId: process.env.ABDM_HIP_ID,
          hipName: process.env.ABDM_HIP_NAME,
          baseUrl: process.env.ABDM_BASE_URL
        }
      });

    } catch (error) {
      this.logger.error('Get ABDM status controller error', {
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

export default PatientController;