// HMS Patient Service ABDM Integration
// Ayushman Bharat Digital Mission integration for patient data

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import { Logger } from '@hms/shared/logger';
import { config } from '@/config';

// =============================================================================
// ABDM INTERFACES AND TYPES
// =============================================================================

export interface ABDMAccessToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  scope: string;
}

export interface ABHAPatient {
  abhaNumber: string;
  healthId: string;
  profile: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dayOfBirth?: string;
    monthOfBirth?: string;
    yearOfBirth?: string;
    gender?: string;
    mobile?: string;
    email?: string;
    address?: {
      country?: string;
    };
    identifiers?: Array<{
      type: string;
      value: string;
    }>;
  };
}

export interface ABHACreateRequest {
  aadhaarNumber?: string;
  mobileNumber?: string;
  name: {
    first: string;
    last: string;
    middle?: string;
  };
  gender?: 'M' | 'F' | 'O';
    dayOfBirth: string;
    monthOfBirth: string;
    yearOfBirth: string;
  address?: {
    state: string;
    district: string;
    village?: string;
    town?: string;
    pincode: string;
    postOffice?: string;
  };
  email?: string;
  consent?: string;
}

export interface HealthIdCreateRequest {
  profile: {
    patientName: {
      first: string;
      last: string;
      middle?: string;
    };
    dayOfBirth: string;
    monthOfBirth: string;
    yearOfBirth: string;
    gender?: 'M' | 'F' | 'O';
    address: {
      country?: string;
      state?: string;
      district?: string;
      village?: string;
      town?: string;
      pincode: string;
      postOffice?: string;
    };
    mobile?: string;
    email?: string;
    healthId?: string;
    password?: string;
    confirmPassword?: string;
    loginId?: string;
    profilePhoto?: string;
  };
}

export interface ConsentRequest {
  hipId: string;
  hipName: string;
  requesterType: 'HIP' | 'HIU' | 'HFR';
  purpose: string;
    dateRange?: {
      from: string;
      to: string;
    };
  expiryDate?: string;
  permissions?: string[];
  frequencyUnit?: string;
  frequencyValue?: number;
  hiTypes?: string[];
}

export interface DocumentRequest {
  title: string;
  documentCategory: string;
  documentName?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  accessPeriod?: {
    fromDate: string;
    toDate: string;
  };
  signatories?: Array<{
    name: string;
    designation?: string;
  }>;
}

export interface LinkedCareContext {
  referenceNumber: string;
  display: string;
  careContextReference: string;
  encounterDate: string;
  careContexts?: Array<{
    patientReference: string;
    encounterReference: string;
  }>;
}

// =============================================================================
// ABDM SERVICE CLASS
// =============================================================================

export class ABDMService {
  private logger: Logger;
  private client: AxiosInstance;
  private accessToken: ABDMAccessToken | null = null;

  constructor(logger: Logger) {
    this.logger = logger.withContext({ service: 'ABDMService' });
    this.client = this.initializeClient();
  }

  // =============================================================================
  // CLIENT INITIALIZATION
  // =============================================================================

  private initializeClient(): AxiosInstance {
    const client = axios.create({
      baseURL: config.abdm.baseUrl,
      timeout: config.abdm.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HMS-Patient-Service/1.0.0'
      }
    });

    // Request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        this.logger.debug('ABDM API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL
        });
        return config;
      },
      (error) => {
        this.logger.error('ABDM Request Error', {
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    client.interceptors.response.use(
      (response) => {
        this.logger.debug('ABDM API Response', {
          status: response.status,
          url: response.config.url,
          duration: response.headers['x-response-time']
        });
        return response;
      },
      (error) => {
        this.logger.error('ABDM Response Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );

    return client;
  }

  // =============================================================================
  // AUTHENTICATION METHODS
  // =============================================================================

  async getAccessToken(): Promise<ABDMAccessToken> {
    try {
      if (this.accessToken && this.isTokenValid(this.accessToken)) {
        return this.accessToken;
      }

      const formData = new FormData();
      formData.append('clientId', config.abdm.clientId);
      formData.append('clientSecret', config.abdm.clientSecret);
      formData.append('grantType', 'client_credentials');

      const response = await this.client.post<ABDMAccessToken>(
        config.abdm.tokenUrl,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      this.accessToken = response.data;
      this.logger.info('ABDM access token obtained successfully');

      return this.accessToken;

    } catch (error) {
      this.logger.error('Failed to get ABDM access token', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`ABDM authentication failed: ${error.message}`);
    }
  }

  private isTokenValid(token: ABDMAccessToken): boolean {
    return token && token.expiresIn > Date.now() / 1000;
  }

  // =============================================================================
  // AADHA OTP VERIFICATION
  // =============================================================================

  async generateAadhaarOtp(aadhaarNumber: string): Promise<string> {
    try {
      const token = await this.getAccessToken();

      const payload = {
        aadhaarNumber: aadhaarNumber
      };

      const response = await this.client.post<{ txnId: string }>(
        `${config.abdm.abhaNumberUrl}/aadhaar/otp`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId
          }
        }
      );

      const txnId = response.data.txnId;
      this.logger.info('Aadhaar OTP generated', {
        txnId,
        aadhaarNumber: this.maskAadhaar(aadhaarNumber)
      });

      return txnId;

    } catch (error) {
      this.logger.error('Failed to generate Aadhaar OTP', {
        aadhaarNumber: this.maskAadhaar(aadhaarNumber),
        error: error.message
      });
      throw new Error(`Aadhaar OTP generation failed: ${error.message}`);
    }
  }

  async verifyAadhaarOtp(txnId: string, otp: string): Promise<ABHAPatient> {
    try {
      const token = await this.getAccessToken();

      const payload = {
        otp: otp,
        txnId: txnId
      };

      const response = await this.client.post<ABHAPatient>(
        `${config.abdm.abhaNumberUrl}/aadhaar/confirm`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId,
            'X-TXN-ID': txnId
          }
        }
      );

      this.logger.info('Aadhaar OTP verified successfully', {
        txnId,
        abhaNumber: response.data.abhaNumber
      });

      return response.data;

    } catch (error) {
      this.logger.error('Failed to verify Aadhaar OTP', {
        txnId,
        error: error.message
      });
      throw new Error(`Aadhaar OTP verification failed: ${error.message}`);
    }
  }

  // =============================================================================
  // ABHA NUMBER CREATION
  // =============================================================================

  async createABHA(request: ABHACreateRequest): Promise<ABHAPatient> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.post<ABHAPatient>(
        `${config.abdm.abhaNumberUrl}/abha`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId
          }
        }
      );

      this.logger.info('ABHA number created successfully', {
        abhaNumber: response.data.abhaNumber,
        healthId: response.data.healthId
      });

      return response.data;

    } catch (error) {
      this.logger.error('Failed to create ABHA number', {
        error: error.message,
        request: {
          ...request,
          aadhaarNumber: request.aadhaarNumber ? this.maskAadhaar(request.aadhaarNumber) : undefined
        }
      });
      throw new Error(`ABHA creation failed: ${error.message}`);
    }
  }

  // =============================================================================
  // HEALTH ID MANAGEMENT
  // =============================================================================

  async createHealthId(request: HealthIdCreateRequest): Promise<ABHAPatient> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.post<ABHAPatient>(
        `${config.abdm.profileUrl}/health-id`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId
          }
        }
      );

      this.logger.info('Health ID created successfully', {
        abhaNumber: response.data.abhaNumber,
        healthId: response.data.healthId
      });

      return response.data;

    } catch (error) {
      this.logger.error('Failed to create Health ID', {
        error: error.message
      });
      throw new Error(`Health ID creation failed: ${error.message}`);
    }
  }

  async verifyHealthIdNumber(healthIdNumber: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      const payload = {
        healthId: healthIdNumber
      };

      const response = await this.postWithRetry(
        `${config.abdm.healthIdVerificationUrl}/healthId/number`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId
          }
        }
      );

      return response.status === 200;

    } catch (error) {
      this.logger.error('Health ID verification failed', {
        healthIdNumber: this.maskHealthId(healthIdNumber),
        error: error.message
      });
      return false;
    }
  }

  async getPatientProfile(healthIdNumber: string): Promise<ABHAPatient> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get<ABHAPatient>(
        `${config.abdm.profileUrl}/health-information/fetch`,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId,
            'X-HID': healthIdNumber
          }
        }
      );

      return response.data;

    } catch (error) {
      this.logger.error('Failed to fetch patient profile', {
        healthIdNumber: this.maskHealthId(healthIdNumber),
        error: error.message
      });
      throw new Error(`Failed to fetch patient profile: ${error.message}`);
    }
  }

  // =============================================================================
  // CONSENT MANAGEMENT
  // =============================================================================

  async createConsent(request: ConsentRequest): Promise<string> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.post<{ consentId: string }>(
        config.abdm.consentManagerUrl,
        request,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': request.hipId,
            'X-HID': request.hipId || ''
          }
        }
      );

      const consentId = response.data.consentId;
      this.logger.info('Consent created successfully', {
        consentId,
        hipId: request.hipId,
        purpose: request.purpose
      });

      return consentId;

    } catch (error) {
      this.logger.error('Failed to create consent', {
        error: error.message,
        request
      });
      throw new Error(`Consent creation failed: ${error.message}`);
    }
  }

  // =============================================================================
  // LINKED CARE CONTEXTS
  // =============================================================================

  async getLinkedCareContexts(healthIdNumber: string): Promise<LinkedCareContext[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get<LinkedCareContext[]>(
        `${config.abdm.linkedCareContextUrl}/status`,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId,
            'X-HID': healthIdNumber
          }
        }
      );

      return response.data;

    } catch (error) {
      this.logger.error('Failed to fetch linked care contexts', {
        healthIdNumber: this.maskHealthId(healthIdNumber),
        error: error.message
      });
      throw new Error(`Failed to fetch linked care contexts: ${error.message}`);
    }
  }

  // =============================================================================
  // DISCOVER SERVICES
  // =============================================================================

  async discoverServices(healthIdNumber: string): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `${config.abdm.discoverServicesUrl}`,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId,
            'X-HID': healthIdNumber
          }
        }
      );

      return response.data;

    } catch (error) {
      this.logger.error('Failed to discover services', {
        healthIdNumber: this.maskHealthId(healthIdNumber),
        error: error.message
      });
      throw new Error(`Failed to discover services: ${error.message}`);
    }
  }

  // =============================================================================
  // DOCTOR CONSULTATION LINKS
  // =============================================================================

  async getConsultationLinks(healthIdNumber: string): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `${config.abdm.doctorConsultationUrl}/links`,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId,
            'X-HID': healthIdNumber
          }
        }
      );

      return response.data;

    } catch (error) {
      this.logger.error('Failed to fetch consultation links', {
        healthIdNumber: this.maskHealthId(healthIdNumber),
        error: error.message
      });
      throw new Error(`Failed to fetch consultation links: ${error.message}`);
    }
  }

  // =============================================================================
  // HEALTH FACILITY INTEGRATION
  // =============================================================================

  async getHealthFacilities(): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        config.abdm.cmHealthFacilityUrl,
        {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'X-CM-ID': config.abdm.hipId
          }
        }
      );

      return response.data;

    } catch (error) {
      this.logger.error('Failed to fetch health facilities', {
        error: error.message
      });
      throw new Error(`Failed to fetch health facilities: ${error.message}`);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private postWithRetry(url: string, data: any, options?: AxiosRequestConfig, maxRetries = 3): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.post(url, data, options);
        return response;
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = config.abdm.retryDelay * Math.pow(2, attempt - 1);
          this.logger.warn(`ABDM API request failed, retrying in ${delay}ms}`, {
            attempt,
            url,
            error: error.message
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private maskAadhaar(aadhaarNumber: string): string {
    if (!aadhaarNumber || aadhaarNumber.length < 4) {
      return 'INVALID';
    }
    return aadhaarNumber.substring(0, 4) + 'XXXX' + aadhaarNumber.substring(aadhaarNumber.length - 4);
  }

  private maskHealthId(healthIdNumber: string): string {
    if (!healthIdNumber || healthIdNumber.length < 8) {
      return 'INVALID';
    }
    return healthIdNumber.substring(0, 4) + 'XXXX' + healthIdNumber.substring(healthIdNumber.length - 4);
  }

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    abdmEnabled: boolean;
    tokenValid: boolean;
    services: Record<string, any>;
  }> {
    try {
      const healthData = {
        status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
        abdmEnabled: config.abdm.enabled,
        tokenValid: this.accessToken ? this.isTokenValid(this.accessToken) : false,
        services: {}
      };

      if (config.abdm.enabled) {
        try {
          const facilities = await this.getHealthFacilities();
          healthData.services.facilities = { status: 'available', count: facilities.length };
        } catch (error) {
          healthData.services.facilities = { status: 'error', error: error.message };
          if (healthData.status === 'healthy') healthData.status = 'degraded';
        }
      }

      return healthData;

    } catch (error) {
      return {
        status: 'unhealthy',
        abdmEnabled: config.abdm.enabled,
        tokenValid: false,
        services: {
          error: error.message
        }
      };
    }
  }

  // =============================================================================
  // GETTERS
  // =============================================================================

  isABDMEnabled(): boolean {
    return config.abdm.enabled;
  }

  getABDMMode(): 'sandbox' | 'production' {
    return config.abdm.mode;
  }

  getABDMConfig(): typeof config.abdm {
    return config.abdm;
  }
}

export default ABDMService;