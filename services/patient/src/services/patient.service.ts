// HMS Patient Service
// Core business logic for patient management with ABDM integration

import { Logger } from '@hms/shared';
import { EventBus } from '@hms/shared';
import { DatabaseConnectionManager } from '@hms/shared';
import { PatientRepository } from '@/repositories/patient.repository';
import { ABDMService } from '@/services/abdm.service';
import {
  Patient,
  PatientVisit,
  PatientSummary,
  PatientSearchResult,
  CreatePatientRequest,
  UpdatePatientRequest,
  SearchPatientRequest,
  CreateVisitRequest,
  ABDMConsentRequest,
  PatientStatus,
  ABDMVerificationStatus,
  PatientResponse,
  PatientListResponse,
  VisitResponse,
  VisitListResponse,
  PaginationResult,
  PatientProfile,
  PatientWithVisits,
  PatientWithABDM
} from '@/models/patient.model';
import {
  PatientCreatedEvent,
  PatientUpdatedEvent,
  PatientDeletedEvent,
  PatientVisitCreatedEvent,
  PatientVisitUpdatedEvent,
  ABDMConsentCreatedEvent,
  ABDMStatusUpdatedEvent
} from '@hms/shared';

// =============================================================================
// PATIENT SERVICE CLASS
// =============================================================================

export class PatientService {
  private patientRepository: PatientRepository;
  private abdmService: ABDMService;
  private eventBus: EventBus;
  private logger: Logger;

  constructor(
    patientRepository: PatientRepository,
    abdmService: ABDMService,
    eventBus: EventBus,
    logger: Logger
  ) {
    this.patientRepository = patientRepository;
    this.abdmService = abdmService;
    this.eventBus = eventBus;
    this.logger = logger.withContext({ service: 'PatientService' });
  }

  // =============================================================================
  // PATIENT CORE OPERATIONS
  // =============================================================================

  async createPatient(patientData: CreatePatientRequest): Promise<PatientResponse> {
    try {
      this.logger.info('Creating new patient', {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        primaryContactNumber: patientData.primaryContactNumber
      });

      // Validate patient data
      const validationError = this.validatePatientData(patientData);
      if (validationError) {
        return {
          success: false,
          message: validationError,
          errors: [validationError]
        };
      }

      // Check for duplicate patients
      const duplicateCheck = await this.checkForDuplicates(patientData);
      if (duplicateCheck.length > 0) {
        return {
          success: false,
          message: 'Patient with similar details already exists',
          data: duplicateCheck[0],
          errors: ['Duplicate patient found']
        };
      }

      // Create patient
      const patient = await this.patientRepository.createPatient(patientData);

      // ABDM Integration - Link ABHA if provided
      if (patientData.abhaNumber || patientData.healthId) {
        await this.linkABDMPatient(patient.id, {
          abhaNumber: patientData.abhaNumber,
          healthId: patientData.healthId
        });
      }

      // Publish patient created event
      await this.publishPatientCreatedEvent(patient);

      this.logger.info('Patient created successfully', {
        patientId: patient.id,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName
      });

      return {
        success: true,
        message: 'Patient created successfully',
        data: patient
      };

    } catch (error) {
      this.logger.error('Failed to create patient', {
        error: error.message,
        patientData: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          primaryContactNumber: patientData.primaryContactNumber
        }
      });

      return {
        success: false,
        message: `Failed to create patient: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async getPatientById(patientId: string): Promise<PatientResponse> {
    try {
      const patient = await this.patientRepository.getPatientById(patientId);

      if (!patient) {
        return {
          success: false,
          message: 'Patient not found',
          errors: ['Patient ID not found']
        };
      }

      // Get ABDM data if linked
      if (patient.abhaNumber || patient.healthId) {
        try {
          const abdmData = await this.getABDMPatientData(patient);
          // Merge ABDM data if needed
          patient.abdmLastSyncAt = new Date();
        } catch (abdmError) {
          this.logger.warn('Failed to sync ABDM data', {
            patientId,
            error: abdmError.message
          });
        }
      }

      return {
        success: true,
        message: 'Patient retrieved successfully',
        data: patient
      };

    } catch (error) {
      this.logger.error('Failed to get patient', {
        patientId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to get patient: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async getPatientByMRN(mrn: string): Promise<PatientResponse> {
    try {
      const patient = await this.patientRepository.getPatientByMRN(mrn);

      if (!patient) {
        return {
          success: false,
          message: 'Patient not found',
          errors: ['MRN not found']
        };
      }

      // Get ABDM data if linked
      if (patient.abhaNumber || patient.healthId) {
        try {
          await this.getABDMPatientData(patient);
        } catch (abdmError) {
          this.logger.warn('Failed to sync ABDM data', {
            mrn,
            error: abdmError.message
          });
        }
      }

      return {
        success: true,
        message: 'Patient retrieved successfully',
        data: patient
      };

    } catch (error) {
      this.logger.error('Failed to get patient by MRN', {
        mrn,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to get patient by MRN: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async updatePatient(patientId: string, updateData: UpdatePatientRequest): Promise<PatientResponse> {
    try {
      const existingPatient = await this.patientRepository.getPatientById(patientId);
      if (!existingPatient) {
        return {
          success: false,
          message: 'Patient not found',
          errors: ['Patient ID not found']
        };
      }

      // Validate update data
      const validationError = this.validateUpdateData(updateData);
      if (validationError) {
        return {
          success: false,
          message: validationError,
          errors: [validationError]
        };
      }

      // Check for conflicts if key fields are being updated
      if (updateData.primaryContactNumber || updateData.email || updateData.aadhaarNumber) {
        const conflicts = await this.checkForUpdateConflicts(patientId, updateData);
        if (conflicts.length > 0) {
          return {
            success: false,
            message: 'Update conflicts with existing patient records',
            errors: conflicts
          };
        }
      }

      // Update patient
      const updatedPatient = await this.patientRepository.updatePatient(patientId, updateData);

      // ABDM Integration - Update ABDM status if ABHA details changed
      if (updateData.abhaNumber || updateData.healthId) {
        await this.linkABDMPatient(patientId, {
          abhaNumber: updateData.abhaNumber,
          healthId: updateData.healthId
        });
      }

      // Publish patient updated event
      await this.publishPatientUpdatedEvent(updatedPatient, existingPatient);

      this.logger.info('Patient updated successfully', {
        patientId,
        mrn: updatedPatient.mrn,
        updatedFields: Object.keys(updateData).length
      });

      return {
        success: true,
        message: 'Patient updated successfully',
        data: updatedPatient
      };

    } catch (error) {
      this.logger.error('Failed to update patient', {
        patientId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to update patient: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async deletePatient(patientId: string): Promise<PatientResponse> {
    try {
      const patient = await this.patientRepository.getPatientById(patientId);
      if (!patient) {
        return {
          success: false,
          message: 'Patient not found',
          errors: ['Patient ID not found']
        };
      }

      // Check if patient has active visits
      const activeVisits = await this.getActiveVisits(patientId);
      if (activeVisits > 0) {
        return {
          success: false,
          message: 'Cannot delete patient with active visits',
          errors: [`Patient has ${activeVisits} active visits`]
        };
      }

      // Soft delete patient
      const deleted = await this.patientRepository.deletePatient(patientId);

      if (!deleted) {
        return {
          success: false,
          message: 'Failed to delete patient',
          errors: ['Delete operation failed']
        };
      }

      // Publish patient deleted event
      await this.publishPatientDeletedEvent(patient);

      this.logger.info('Patient deleted successfully', {
        patientId,
        mrn: patient.mrn
      });

      return {
        success: true,
        message: 'Patient deleted successfully',
        data: patient
      };

    } catch (error) {
      this.logger.error('Failed to delete patient', {
        patientId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to delete patient: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // PATIENT SEARCH OPERATIONS
  // =============================================================================

  async searchPatients(searchRequest: SearchPatientRequest): Promise<PatientListResponse> {
    try {
      const result = await this.patientRepository.searchPatients(searchRequest);

      return {
        success: true,
        message: 'Patients retrieved successfully',
        data: {
          patients: result.items,
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        }
      };

    } catch (error) {
      this.logger.error('Failed to search patients', {
        error: error.message,
        searchRequest
      });

      return {
        success: false,
        message: `Failed to search patients: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  async getPatientSummaries(filter: {
    status?: PatientStatus;
    registrationDateFrom?: Date;
    registrationDateTo?: Date;
    limit?: number;
  } = {}): Promise<PatientResponse> {
    try {
      const summaries = await this.patientRepository.getPatientSummaries(filter);

      return {
        success: true,
        message: 'Patient summaries retrieved successfully',
        data: summaries as any // Cast as any since PatientResponse expects Patient type
      };

    } catch (error) {
      this.logger.error('Failed to get patient summaries', {
        error: error.message,
        filter
      });

      return {
        success: false,
        message: `Failed to get patient summaries: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // PATIENT VISIT OPERATIONS
  // =============================================================================

  async createPatientVisit(visitData: CreateVisitRequest): Promise<VisitResponse> {
    try {
      // Validate patient exists
      const patient = await this.patientRepository.getPatientById(visitData.patientId);
      if (!patient) {
        return {
          success: false,
          message: 'Patient not found',
          errors: ['Patient ID not found']
        };
      }

      // Validate visit data
      const validationError = this.validateVisitData(visitData);
      if (validationError) {
        return {
          success: false,
          message: validationError,
          errors: [validationError]
        };
      }

      // Get patient MRN
      const mrn = patient.mrn;

      // Create visit
      const visit = await this.patientRepository.createPatientVisit({
        ...visitData,
        mrn
      });

      // Publish visit created event
      await this.publishVisitCreatedEvent(visit, patient);

      this.logger.info('Patient visit created successfully', {
        visitId: visit.id,
        patientId: visitData.patientId,
        visitNumber: visit.visitNumber,
        visitType: visitData.visitType
      });

      return {
        success: true,
        message: 'Patient visit created successfully',
        data: visit
      };

    } catch (error) {
      this.logger.error('Failed to create patient visit', {
        error: error.message,
        visitData
      });

      return {
        success: false,
        message: `Failed to create patient visit: ${error.message}`,
        errors: [error.message]
      };
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
  } = {}): Promise<VisitListResponse> {
    try {
      const result = await this.patientRepository.getPatientVisits(patientId, options);

      return {
        success: true,
        message: 'Patient visits retrieved successfully',
        data: {
          visits: result.items,
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        }
      };

    } catch (error) {
      this.logger.error('Failed to get patient visits', {
        patientId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to get patient visits: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // ABDM INTEGRATION OPERATIONS
  // =============================================================================

  async generateAadhaarOtp(aadhaarNumber: string): Promise<{ success: boolean; txnId?: string; message: string }> {
    try {
      if (!this.abdmService.isABDMEnabled()) {
        return {
          success: false,
          message: 'ABDM integration is not enabled'
        };
      }

      // Validate Aadhaar number
      if (!/^\d{12}$/.test(aadhaarNumber)) {
        return {
          success: false,
          message: 'Invalid Aadhaar number format'
        };
      }

      const txnId = await this.abdmService.generateAadhaarOtp(aadhaarNumber);

      this.logger.info('Aadhaar OTP generated successfully', {
        txnId,
        aadhaarNumber: this.maskAadhaar(aadhaarNumber)
      });

      return {
        success: true,
        txnId,
        message: 'OTP sent to registered mobile number'
      };

    } catch (error) {
      this.logger.error('Failed to generate Aadhaar OTP', {
        aadhaarNumber: this.maskAadhaar(aadhaarNumber),
        error: error.message
      });

      return {
        success: false,
        message: `Failed to generate OTP: ${error.message}`
      };
    }
  }

  async verifyAadhaarOtp(txnId: string, otp: string): Promise<{ success: boolean; patient?: any; message: string }> {
    try {
      if (!this.abdmService.isABDMEnabled()) {
        return {
          success: false,
          message: 'ABDM integration is not enabled'
        };
      }

      const abhaPatient = await this.abdmService.verifyAadhaarOtp(txnId, otp);

      this.logger.info('Aadhaar OTP verified successfully', {
        txnId,
        abhaNumber: abhaPatient.abhaNumber,
        healthId: abhaPatient.healthId
      });

      return {
        success: true,
        patient: abhaPatient,
        message: 'Aadhaar verified successfully'
      };

    } catch (error) {
      this.logger.error('Failed to verify Aadhaar OTP', {
        txnId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to verify OTP: ${error.message}`
      };
    }
  }

  async createABHA(abhaRequest: any): Promise<{ success: boolean; patient?: any; message: string }> {
    try {
      if (!this.abdmService.isABDMEnabled()) {
        return {
          success: false,
          message: 'ABDM integration is not enabled'
        };
      }

      const abhaPatient = await this.abdmService.createABHA(abhaRequest);

      this.logger.info('ABHA created successfully', {
        abhaNumber: abhaPatient.abhaNumber,
        healthId: abhaPatient.healthId
      });

      return {
        success: true,
        patient: abhaPatient,
        message: 'ABHA created successfully'
      };

    } catch (error) {
      this.logger.error('Failed to create ABHA', {
        error: error.message
      });

      return {
        success: false,
        message: `Failed to create ABHA: ${error.message}`
      };
    }
  }

  async linkABHAToPatient(patientId: string, abhaData: {
    abhaNumber?: string;
    healthId?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const patient = await this.patientRepository.getPatientById(patientId);
      if (!patient) {
        return {
          success: false,
          message: 'Patient not found'
        };
      }

      // Update ABDM status in patient record
      await this.patientRepository.updateABDMStatus(patientId, {
        abhaNumber: abhaData.abhaNumber,
        healthId: abhaData.healthId,
        linkStatus: ABDMVerificationStatus.LINKED,
        syncedAt: new Date()
      });

      // Publish ABDM status updated event
      await this.publishABDMStatusUpdatedEvent(patientId, abhaData, ABDMVerificationStatus.LINKED);

      this.logger.info('ABHA linked to patient successfully', {
        patientId,
        abhaNumber: abhaData.abhaNumber,
        healthId: abhaData.healthId
      });

      return {
        success: true,
        message: 'ABHA linked successfully'
      };

    } catch (error) {
      this.logger.error('Failed to link ABHA to patient', {
        patientId,
        abhaData,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to link ABHA: ${error.message}`
      };
    }
  }

  async createABDMConsent(patientId: string, consentRequest: ABDMConsentRequest): Promise<{ success: boolean; consentId?: string; message: string }> {
    try {
      if (!this.abdmService.isABDMEnabled()) {
        return {
          success: false,
          message: 'ABDM integration is not enabled'
        };
      }

      const patient = await this.patientRepository.getPatientById(patientId);
      if (!patient) {
        return {
          success: false,
          message: 'Patient not found'
        };
      }

      if (!patient.abhaNumber && !patient.healthId) {
        return {
          success: false,
          message: 'Patient must have ABHA number linked to create consent'
        };
      }

      const consentId = await this.abdmService.createConsent(consentRequest);

      // Publish consent created event
      await this.publishABDMConsentCreatedEvent(patientId, consentId, consentRequest);

      this.logger.info('ABDM consent created successfully', {
        patientId,
        consentId,
        purpose: consentRequest.purpose
      });

      return {
        success: true,
        consentId,
        message: 'Consent created successfully'
      };

    } catch (error) {
      this.logger.error('Failed to create ABDM consent', {
        patientId,
        consentRequest,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to create consent: ${error.message}`
      };
    }
  }

  // =============================================================================
  // PATIENT PROFILE OPERATIONS
  // =============================================================================

  async getPatientProfile(patientId: string): Promise<PatientResponse> {
    try {
      const patient = await this.patientRepository.getPatientById(patientId);
      if (!patient) {
        return {
          success: false,
          message: 'Patient not found',
          errors: ['Patient ID not found']
        };
      }

      // Get patient visits
      const visitsResult = await this.patientRepository.getPatientVisits(patientId, { limit: 10 });

      const profile: PatientProfile = {
        patient,
        recentVisits: visitsResult.items.slice(0, 5),
        activeMedications: patient.currentMedications?.filter(med => med.isActive) || [],
        activeAllergies: patient.allergies?.filter(allergy => allergy.isActive) || [],
        chronicConditions: patient.medicalHistory?.filter(condition => condition.isChronic) || [],
        insuranceInfo: patient.insuranceDetails || [],
        abdmLinkStatus: patient.abdmLinkStatus,
        abdmCareContexts: [], // Would be loaded from ABDM care contexts table
        documents: [] // Would be loaded from patient documents table
      };

      return {
        success: true,
        message: 'Patient profile retrieved successfully',
        data: profile as any // Cast as any since PatientResponse expects Patient type
      };

    } catch (error) {
      this.logger.error('Failed to get patient profile', {
        patientId,
        error: error.message
      });

      return {
        success: false,
        message: `Failed to get patient profile: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private validatePatientData(patientData: CreatePatientRequest): string | null {
    // Basic validation
    if (!patientData.firstName?.trim()) {
      return 'First name is required';
    }

    if (!patientData.lastName?.trim()) {
      return 'Last name is required';
    }

    if (!patientData.gender) {
      return 'Gender is required';
    }

    if (!patientData.dateOfBirth) {
      return 'Date of birth is required';
    }

    // Calculate age and validate
    const age = new Date().getFullYear() - patientData.dateOfBirth.getFullYear();
    if (age < 0 || age > 150) {
      return 'Invalid date of birth';
    }

    if (!patientData.primaryContactNumber?.trim()) {
      return 'Primary contact number is required';
    }

    if (!/^[6-9]\d{9}$/.test(patientData.primaryContactNumber)) {
      return 'Invalid primary contact number format';
    }

    if (patientData.secondaryContactNumber && !/^[6-9]\d{9}$/.test(patientData.secondaryContactNumber)) {
      return 'Invalid secondary contact number format';
    }

    if (patientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientData.email)) {
      return 'Invalid email format';
    }

    if (patientData.aadhaarNumber && !/^\d{12}$/.test(patientData.aadhaarNumber)) {
      return 'Invalid Aadhaar number format';
    }

    if (!patientData.address?.line1?.trim()) {
      return 'Address line 1 is required';
    }

    if (!patientData.address?.city?.trim()) {
      return 'City is required';
    }

    if (!patientData.address?.state?.trim()) {
      return 'State is required';
    }

    if (!patientData.address?.pincode?.trim()) {
      return 'Pincode is required';
    }

    if (!/^\d{6}$/.test(patientData.address.pincode)) {
      return 'Invalid pincode format';
    }

    if (!patientData.emergencyContact?.name?.trim()) {
      return 'Emergency contact name is required';
    }

    if (!patientData.emergencyContact?.relationship?.trim()) {
      return 'Emergency contact relationship is required';
    }

    if (!patientData.emergencyContact?.primaryContactNumber?.trim()) {
      return 'Emergency contact primary number is required';
    }

    if (!/^[6-9]\d{9}$/.test(patientData.emergencyContact.primaryContactNumber)) {
      return 'Invalid emergency contact number format';
    }

    return null;
  }

  private validateUpdateData(updateData: UpdatePatientRequest): string | null {
    // Validate phone numbers if provided
    if (updateData.primaryContactNumber && !/^[6-9]\d{9}$/.test(updateData.primaryContactNumber)) {
      return 'Invalid primary contact number format';
    }

    if (updateData.secondaryContactNumber && !/^[6-9]\d{9}$/.test(updateData.secondaryContactNumber)) {
      return 'Invalid secondary contact number format';
    }

    if (updateData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
      return 'Invalid email format';
    }

    if (updateData.aadhaarNumber && !/^\d{12}$/.test(updateData.aadhaarNumber)) {
      return 'Invalid Aadhaar number format';
    }

    // Validate date of birth if provided
    if (updateData.dateOfBirth) {
      const age = new Date().getFullYear() - updateData.dateOfBirth.getFullYear();
      if (age < 0 || age > 150) {
        return 'Invalid date of birth';
      }
    }

    // Validate pincode if address is provided
    if (updateData.address?.pincode && !/^\d{6}$/.test(updateData.address.pincode)) {
      return 'Invalid pincode format';
    }

    return null;
  }

  private validateVisitData(visitData: CreateVisitRequest): string | null {
    if (!visitData.patientId?.trim()) {
      return 'Patient ID is required';
    }

    if (!visitData.visitType?.trim()) {
      return 'Visit type is required';
    }

    if (!visitData.departmentId?.trim()) {
      return 'Department ID is required';
    }

    if (!visitData.doctorId?.trim()) {
      return 'Doctor ID is required';
    }

    return null;
  }

  private async checkForDuplicates(patientData: CreatePatientRequest): Promise<Patient[]> {
    try {
      // Check by phone number
      const phoneSearch = await this.patientRepository.searchPatients({
        phone: patientData.primaryContactNumber,
        limit: 5
      });

      // Check by Aadhaar if provided
      let aadhaarSearch: PaginationResult<PatientSearchResult> = { items: [], total: 0, page: 1, limit: 5, hasMore: false, totalPages: 0 };
      if (patientData.aadhaarNumber) {
        aadhaarSearch = await this.patientRepository.searchPatients({
          aadhaarNumber: patientData.aadhaarNumber,
          limit: 5
        });
      }

      // Check by ABHA if provided
      let abhaSearch: PaginationResult<PatientSearchResult> = { items: [], total: 0, page: 1, limit: 5, hasMore: false, totalPages: 0 };
      if (patientData.abhaNumber) {
        abhaSearch = await this.patientRepository.searchPatients({
          abhaNumber: patientData.abhaNumber,
          limit: 5
        });
      }

      // Combine and deduplicate results
      const allResults = [
        ...phoneSearch.items,
        ...aadhaarSearch.items,
        ...abhaSearch.items
      ];

      const uniqueResults = allResults.filter((item, index, self) =>
        index === self.findIndex((t) => t.patientId === item.patientId)
      );

      // Get full patient details for potential duplicates
      const duplicates: Patient[] = [];
      for (const result of uniqueResults) {
        const patient = await this.patientRepository.getPatientById(result.patientId);
        if (patient) {
          duplicates.push(patient);
        }
      }

      return duplicates;

    } catch (error) {
      this.logger.error('Failed to check for duplicates', {
        error: error.message
      });
      return [];
    }
  }

  private async checkForUpdateConflicts(patientId: string, updateData: UpdatePatientRequest): Promise<string[]> {
    try {
      const conflicts: string[] = [];

      // Check phone number conflict
      if (updateData.primaryContactNumber) {
        const phoneSearch = await this.patientRepository.searchPatients({
          phone: updateData.primaryContactNumber,
          limit: 1
        });

        if (phoneSearch.items.length > 0 && phoneSearch.items[0].patientId !== patientId) {
          conflicts.push('Phone number already exists');
        }
      }

      // Check email conflict
      if (updateData.email) {
        const emailSearch = await this.patientRepository.searchPatients({
          email: updateData.email,
          limit: 1
        });

        if (emailSearch.items.length > 0 && emailSearch.items[0].patientId !== patientId) {
          conflicts.push('Email already exists');
        }
      }

      // Check Aadhaar conflict
      if (updateData.aadhaarNumber) {
        const aadhaarSearch = await this.patientRepository.searchPatients({
          aadhaarNumber: updateData.aadhaarNumber,
          limit: 1
        });

        if (aadhaarSearch.items.length > 0 && aadhaarSearch.items[0].patientId !== patientId) {
          conflicts.push('Aadhaar number already exists');
        }
      }

      return conflicts;

    } catch (error) {
      this.logger.error('Failed to check for update conflicts', {
        patientId,
        error: error.message
      });
      return ['Failed to validate uniqueness'];
    }
  }

  private async getActiveVisits(patientId: string): Promise<number> {
    try {
      const visitsResult = await this.patientRepository.getPatientVisits(patientId, {
        status: 'in_progress',
        limit: 1
      });

      return visitsResult.total;

    } catch (error) {
      this.logger.error('Failed to get active visits', {
        patientId,
        error: error.message
      });
      return 0;
    }
  }

  private async linkABDMPatient(patientId: string, abdmData: {
    abhaNumber?: string;
    healthId?: string;
  }): Promise<void> {
    try {
      const linkStatus = (abdmData.abhaNumber || abdmData.healthId)
        ? ABDMVerificationStatus.LINKED
        : ABDMVerificationStatus.NOT_LINKED;

      await this.patientRepository.updateABDMStatus(patientId, {
        abhaNumber: abdmData.abhaNumber,
        healthId: abdmData.healthId,
        linkStatus,
        syncedAt: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to link ABDM patient', {
        patientId,
        abdmData,
        error: error.message
      });
    }
  }

  private async getABDMPatientData(patient: Patient): Promise<void> {
    try {
      if (patient.healthId) {
        const abdmProfile = await this.abdmService.getPatientProfile(patient.healthId);
        // Update patient with ABDM data if needed
        patient.abdmLastSyncAt = new Date();
      }
    } catch (error) {
      // Log warning but don't fail the operation
      this.logger.warn('Failed to fetch ABDM patient data', {
        patientId: patient.id,
        healthId: patient.healthId,
        error: error.message
      });
    }
  }

  private maskAadhaar(aadhaarNumber: string): string {
    if (!aadhaarNumber || aadhaarNumber.length < 4) {
      return 'INVALID';
    }
    return aadhaarNumber.substring(0, 4) + 'XXXX' + aadhaarNumber.substring(aadhaarNumber.length - 4);
  }

  // =============================================================================
  // EVENT PUBLISHING METHODS
  // =============================================================================

  private async publishPatientCreatedEvent(patient: Patient): Promise<void> {
    try {
      const event: PatientCreatedEvent = {
        id: this.generateEventId(),
        type: 'patient.created',
        timestamp: new Date(),
        source: 'patient-service',
        data: {
          patientId: patient.id,
          mrn: patient.mrn,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          phone: patient.primaryContactNumber,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          address: patient.address,
          registrationDate: patient.registrationDate,
          registrationSource: patient.registrationSource,
          facilityId: patient.registrationLocation,
          abhaNumber: patient.abhaNumber,
          healthId: patient.healthId,
          abdmLinkStatus: patient.abdmLinkStatus,
          emergencyContact: patient.emergencyContact
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system' // Should come from authentication context
        }
      };

      await this.eventBus.publish('patient.created', event);
    } catch (error) {
      this.logger.error('Failed to publish patient created event', {
        patientId: patient.id,
        error: error.message
      });
    }
  }

  private async publishPatientUpdatedEvent(updatedPatient: Patient, originalPatient: Patient): Promise<void> {
    try {
      const event: PatientUpdatedEvent = {
        id: this.generateEventId(),
        type: 'patient.updated',
        timestamp: new Date(),
        source: 'patient-service',
        data: {
          patientId: updatedPatient.id,
          mrn: updatedPatient.mrn,
          updatedFields: this.getUpdatedFields(updatedPatient, originalPatient),
          originalData: originalPatient,
          updatedData: updatedPatient
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('patient.updated', event);
    } catch (error) {
      this.logger.error('Failed to publish patient updated event', {
        patientId: updatedPatient.id,
        error: error.message
      });
    }
  }

  private async publishPatientDeletedEvent(patient: Patient): Promise<void> {
    try {
      const event: PatientDeletedEvent = {
        id: this.generateEventId(),
        type: 'patient.deleted',
        timestamp: new Date(),
        source: 'patient-service',
        data: {
          patientId: patient.id,
          mrn: patient.mrn,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          phone: patient.primaryContactNumber,
          deletedAt: new Date()
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('patient.deleted', event);
    } catch (error) {
      this.logger.error('Failed to publish patient deleted event', {
        patientId: patient.id,
        error: error.message
      });
    }
  }

  private async publishVisitCreatedEvent(visit: PatientVisit, patient: Patient): Promise<void> {
    try {
      const event: PatientVisitCreatedEvent = {
        id: this.generateEventId(),
        type: 'patient_visit.created',
        timestamp: new Date(),
        source: 'patient-service',
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          mrn: visit.mrn,
          visitNumber: visit.visitNumber,
          visitType: visit.visitType,
          departmentId: visit.departmentId,
          doctorId: visit.doctorId,
          facilityId: visit.facilityId,
          scheduledDateTime: visit.scheduledDateTime,
          actualArrivalDateTime: visit.actualArrivalDateTime,
          status: visit.status,
          priority: visit.priority,
          chiefComplaint: visit.chiefComplaint,
          paymentType: visit.paymentType,
          patientName: `${patient.firstName} ${patient.lastName}`,
          patientPhone: patient.primaryContactNumber
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('patient_visit.created', event);
    } catch (error) {
      this.logger.error('Failed to publish visit created event', {
        visitId: visit.id,
        error: error.message
      });
    }
  }

  private async publishABDMStatusUpdatedEvent(patientId: string, abdmData: any, status: ABDMVerificationStatus): Promise<void> {
    try {
      const event: ABDMStatusUpdatedEvent = {
        id: this.generateEventId(),
        type: 'abdm.status_updated',
        timestamp: new Date(),
        source: 'patient-service',
        data: {
          patientId,
          abhaNumber: abdmData.abhaNumber,
          healthId: abdmData.healthId,
          linkStatus: status,
          updatedAt: new Date()
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('abdm.status_updated', event);
    } catch (error) {
      this.logger.error('Failed to publish ABDM status updated event', {
        patientId,
        error: error.message
      });
    }
  }

  private async publishABDMConsentCreatedEvent(patientId: string, consentId: string, consentRequest: ABDMConsentRequest): Promise<void> {
    try {
      const event: ABDMConsentCreatedEvent = {
        id: this.generateEventId(),
        type: 'abdm.consent_created',
        timestamp: new Date(),
        source: 'patient-service',
        data: {
          patientId,
          consentId,
          hipId: consentRequest.hipId,
          hiuId: consentRequest.hiuId,
          purpose: consentRequest.purpose,
          dateRange: consentRequest.dateRange,
          expiryDate: consentRequest.expiryDate,
          permissions: consentRequest.permissions,
          hiTypes: consentRequest.hiTypes,
          status: 'requested',
          createdAt: new Date()
        },
        metadata: {
          version: '1.0',
          correlationId: this.generateCorrelationId(),
          userId: 'system'
        }
      };

      await this.eventBus.publish('abdm.consent_created', event);
    } catch (error) {
      this.logger.error('Failed to publish ABDM consent created event', {
        patientId,
        consentId,
        error: error.message
      });
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUpdatedFields(updated: Patient, original: Patient): string[] {
    const fields: string[] = [];

    // Compare relevant fields
    if (updated.firstName !== original.firstName) fields.push('firstName');
    if (updated.lastName !== original.lastName) fields.push('lastName');
    if (updated.primaryContactNumber !== original.primaryContactNumber) fields.push('primaryContactNumber');
    if (updated.email !== original.email) fields.push('email');
    if (updated.address.line1 !== original.address.line1) fields.push('address');
    if (updated.emergencyContact.name !== original.emergencyContact.name) fields.push('emergencyContact');
    if (updated.abhaNumber !== original.abhaNumber) fields.push('abhaNumber');
    if (updated.healthId !== original.healthId) fields.push('healthId');

    return fields;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PatientService;