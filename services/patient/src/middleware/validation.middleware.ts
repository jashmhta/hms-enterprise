// HMS Patient Service Validation Middleware
// Express validator middleware for API endpoints

import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// =============================================================================
// VALIDATION RESULT HANDLER
// =============================================================================

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
    return;
  }

  next();
};

// =============================================================================
// PATIENT VALIDATION RULES
// =============================================================================

export const patientValidationMiddleware = {
  // Create patient validation
  createPatient: [
    body('title')
      .optional()
      .isIn(['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'])
      .withMessage('Title must be one of: Mr, Mrs, Ms, Dr, Prof'),

    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

    body('middleName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Middle name cannot exceed 50 characters')
      .matches(/^[a-zA-Z\s'-]*$/)
      .withMessage('Middle name can only contain letters, spaces, hyphens, and apostrophes'),

    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

    body('preferredName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Preferred name cannot exceed 50 characters'),

    body('gender')
      .trim()
      .isIn(['M', 'F', 'O'])
      .withMessage('Gender must be M, F, or O'),

    body('dateOfBirth')
      .notEmpty()
      .withMessage('Date of birth is required')
      .isISO8601()
      .withMessage('Date of birth must be a valid date')
      .custom((value) => {
        const age = new Date().getFullYear() - new Date(value).getFullYear();
        if (age < 0 || age > 150) {
          throw new Error('Date of birth must result in a valid age (0-150 years)');
        }
        return true;
      }),

    body('placeOfBirth')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Place of birth cannot exceed 100 characters'),

    body('primaryContactNumber')
      .trim()
      .notEmpty()
      .withMessage('Primary contact number is required')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Primary contact number must be a valid 10-digit Indian mobile number'),

    body('secondaryContactNumber')
      .optional()
      .trim()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Secondary contact number must be a valid 10-digit Indian mobile number'),

    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Email must be a valid email address')
      .normalizeEmail(),

    body('aadhaarNumber')
      .optional()
      .matches(/^\d{12}$/)
      .withMessage('Aadhaar number must be exactly 12 digits'),

    body('abhaNumber')
      .optional()
      .trim()
      .matches(/^[A-Z0-9]{12}$/)
      .withMessage('ABHA number must be exactly 12 alphanumeric characters'),

    body('healthId')
      .optional()
      .trim()
      .matches(/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)
      .withMessage('Health ID must be a valid ABHA address'),

    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'unknown'])
      .withMessage('Invalid blood group'),

    body('maritalStatus')
      .optional()
      .isIn(['single', 'married', 'divorced', 'widowed', 'separated'])
      .withMessage('Invalid marital status'),

    body('occupation')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Occupation cannot exceed 100 characters'),

    body('education')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Education cannot exceed 100 characters'),

    body('languagePreferences')
      .optional()
      .isArray()
      .withMessage('Language preferences must be an array'),

    body('languagePreferences.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Each language preference must be between 2 and 50 characters'),

    // Address validation
    body('address.line1')
      .notEmpty()
      .withMessage('Address line 1 is required')
      .trim()
      .isLength({ min: 5, max: 255 })
      .withMessage('Address line 1 must be between 5 and 255 characters'),

    body('address.line2')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Address line 2 cannot exceed 255 characters'),

    body('address.line3')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Address line 3 cannot exceed 255 characters'),

    body('address.city')
      .notEmpty()
      .withMessage('City is required')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('City must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('City can only contain letters, spaces, hyphens, and apostrophes'),

    body('address.district')
      .notEmpty()
      .withMessage('District is required')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('District must be between 2 and 100 characters'),

    body('address.state')
      .notEmpty()
      .withMessage('State is required')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('State must be between 2 and 100 characters'),

    body('address.country')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Country must be between 2 and 100 characters'),

    body('address.pincode')
      .notEmpty()
      .withMessage('Pincode is required')
      .matches(/^\d{6}$/)
      .withMessage('Pincode must be exactly 6 digits'),

    body('address.landmark')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Landmark cannot exceed 255 characters'),

    // Emergency contact validation
    body('emergencyContact.name')
      .notEmpty()
      .withMessage('Emergency contact name is required')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Emergency contact name must be between 2 and 100 characters'),

    body('emergencyContact.relationship')
      .notEmpty()
      .withMessage('Emergency contact relationship is required')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Emergency contact relationship must be between 2 and 50 characters'),

    body('emergencyContact.primaryContactNumber')
      .notEmpty()
      .withMessage('Emergency contact primary number is required')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Emergency contact primary number must be a valid 10-digit Indian mobile number'),

    body('emergencyContact.secondaryContactNumber')
      .optional()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Emergency contact secondary number must be a valid 10-digit Indian mobile number'),

    body('emergencyContact.email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Emergency contact email must be a valid email address')
      .normalizeEmail(),

    body('emergencyContact.isNextOfKin')
      .optional()
      .isBoolean()
      .withMessage('isNextOfKin must be a boolean'),

    body('emergencyContact.consentForEmergencyTreatment')
      .optional()
      .isBoolean()
      .withMessage('consentForEmergencyTreatment must be a boolean'),

    // Registration information
    body('registrationSource')
      .optional()
      .isIn(['walk-in', 'online', 'referral', 'abdm'])
      .withMessage('Invalid registration source'),

    body('registrationLocation')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Registration location cannot exceed 100 characters'),

    handleValidationErrors
  ],

  // Update patient validation
  updatePatient: [
    body('title')
      .optional()
      .isIn(['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'])
      .withMessage('Title must be one of: Mr, Mrs, Ms, Dr, Prof'),

    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

    body('gender')
      .optional()
      .isIn(['M', 'F', 'O'])
      .withMessage('Gender must be M, F, or O'),

    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date')
      .custom((value) => {
        const age = new Date().getFullYear() - new Date(value).getFullYear();
        if (age < 0 || age > 150) {
          throw new Error('Date of birth must result in a valid age (0-150 years)');
        }
        return true;
      }),

    body('primaryContactNumber')
      .optional()
      .trim()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Primary contact number must be a valid 10-digit Indian mobile number'),

    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Email must be a valid email address')
      .normalizeEmail(),

    body('aadhaarNumber')
      .optional()
      .matches(/^\d{12}$/)
      .withMessage('Aadhaar number must be exactly 12 digits'),

    body('abhaNumber')
      .optional()
      .trim()
      .matches(/^[A-Z0-9]{12}$/)
      .withMessage('ABHA number must be exactly 12 alphanumeric characters'),

    handleValidationErrors
  ],

  // Search patients validation
  searchPatients: [
    query('query')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),

    query('mrn')
      .optional()
      .trim()
      .matches(/^MRN-\d{4}-\d{7}$/)
      .withMessage('MRN must be in format MRN-YYYY-XXXXXXX'),

    query('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name search must be between 2 and 50 characters'),

    query('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name search must be between 2 and 50 characters'),

    query('phone')
      .optional()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Phone number must be a valid 10-digit Indian mobile number'),

    query('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Email must be a valid email address'),

    query('aadhaarNumber')
      .optional()
      .matches(/^\d{12}$/)
      .withMessage('Aadhaar number must be exactly 12 digits'),

    query('abhaNumber')
      .optional()
      .trim()
      .matches(/^[A-Z0-9]{12}$/)
      .withMessage('ABHA number must be exactly 12 alphanumeric characters'),

    query('gender')
      .optional()
      .isIn(['M', 'F', 'O'])
      .withMessage('Gender must be M, F, or O'),

    query('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'unknown'])
      .withMessage('Invalid blood group'),

    query('status')
      .optional()
      .isIn(['active', 'inactive', 'deceased'])
      .withMessage('Status must be active, inactive, or deceased'),

    query('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),

    query('registrationDateFrom')
      .optional()
      .isISO8601()
      .withMessage('Registration date from must be a valid date'),

    query('registrationDateTo')
      .optional()
      .isISO8601()
      .withMessage('Registration date to must be a valid date'),

    query('lastVisitDateFrom')
      .optional()
      .isISO8601()
      .withMessage('Last visit date from must be a valid date'),

    query('lastVisitDateTo')
      .optional()
      .isISO8601()
      .withMessage('Last visit date to must be a valid date'),

    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    query('sortBy')
      .optional()
      .isIn(['mrn', 'fullName', 'primaryContactNumber', 'email', 'dateOfBirth', 'registrationDate', 'lastVisitDate'])
      .withMessage('Invalid sort field'),

    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC'])
      .withMessage('Sort order must be ASC or DESC'),

    handleValidationErrors
  ],

  // Create visit validation
  createVisit: [
    body('patientId')
      .notEmpty()
      .withMessage('Patient ID is required')
      .isUUID()
      .withMessage('Patient ID must be a valid UUID'),

    body('visitType')
      .notEmpty()
      .withMessage('Visit type is required')
      .isIn(['opd', 'ipd', 'emergency', 'day_care', 'follow_up', 'consultation'])
      .withMessage('Invalid visit type'),

    body('departmentId')
      .notEmpty()
      .withMessage('Department ID is required')
      .isUUID()
      .withMessage('Department ID must be a valid UUID'),

    body('doctorId')
      .notEmpty()
      .withMessage('Doctor ID is required')
      .isUUID()
      .withMessage('Doctor ID must be a valid UUID'),

    body('facilityId')
      .optional()
      .isUUID()
      .withMessage('Facility ID must be a valid UUID'),

    body('scheduledDateTime')
      .optional()
      .isISO8601()
      .withMessage('Scheduled date time must be a valid date'),

    body('priority')
      .optional()
      .isIn(['routine', 'urgent', 'emergency', 'critical'])
      .withMessage('Invalid priority level'),

    body('chiefComplaint')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Chief complaint cannot exceed 1000 characters'),

    body('paymentType')
      .optional()
      .isIn(['cash', 'insurance', 'corporate', 'government_scheme', 'free'])
      .withMessage('Invalid payment type'),

    handleValidationErrors
  ]
};

// =============================================================================
// ABDM VALIDATION RULES
// =============================================================================

export const abdmValidationMiddleware = {
  // Generate Aadhaar OTP validation
  generateAadhaarOtp: [
    body('aadhaarNumber')
      .notEmpty()
      .withMessage('Aadhaar number is required')
      .matches(/^\d{12}$/)
      .withMessage('Aadhaar number must be exactly 12 digits'),

    handleValidationErrors
  ],

  // Verify Aadhaar OTP validation
  verifyAadhaarOtp: [
    body('txnId')
      .notEmpty()
      .withMessage('Transaction ID is required')
      .isLength({ min: 10, max: 100 })
      .withMessage('Transaction ID must be between 10 and 100 characters'),

    body('otp')
      .notEmpty()
      .withMessage('OTP is required')
      .matches(/^\d{6}$/)
      .withMessage('OTP must be exactly 6 digits'),

    handleValidationErrors
  ],

  // Create ABHA validation
  createABHA: [
    body('aadhaarNumber')
      .optional()
      .matches(/^\d{12}$/)
      .withMessage('Aadhaar number must be exactly 12 digits'),

    body('mobileNumber')
      .optional()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Mobile number must be a valid 10-digit Indian mobile number'),

    body('name.first')
      .notEmpty()
      .withMessage('First name is required')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),

    body('name.last')
      .notEmpty()
      .withMessage('Last name is required')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),

    body('name.middle')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Middle name cannot exceed 50 characters'),

    body('gender')
      .notEmpty()
      .withMessage('Gender is required')
      .isIn(['M', 'F', 'O'])
      .withMessage('Gender must be M, F, or O'),

    body('dayOfBirth')
      .notEmpty()
      .withMessage('Day of birth is required')
      .isInt({ min: 1, max: 31 })
      .withMessage('Day of birth must be between 1 and 31'),

    body('monthOfBirth')
      .notEmpty()
      .withMessage('Month of birth is required')
      .isInt({ min: 1, max: 12 })
      .withMessage('Month of birth must be between 1 and 12'),

    body('yearOfBirth')
      .notEmpty()
      .withMessage('Year of birth is required')
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage('Year of birth must be valid'),

    handleValidationErrors
  ],

  // Link ABHA validation
  linkABHA: [
    body('abhaNumber')
      .optional()
      .trim()
      .matches(/^[A-Z0-9]{12}$/)
      .withMessage('ABHA number must be exactly 12 alphanumeric characters'),

    body('healthId')
      .optional()
      .trim()
      .matches(/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)
      .withMessage('Health ID must be a valid ABHA address'),

    body().custom((value, { req }) => {
      if (!req.body.abhaNumber && !req.body.healthId) {
        throw new Error('Either ABHA number or Health ID is required');
      }
      return true;
    }),

    handleValidationErrors
  ],

  // Create consent validation
  createConsent: [
    body('hipId')
      .notEmpty()
      .withMessage('HIP ID is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('HIP ID must be between 1 and 100 characters'),

    body('hiuId')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('HIU ID must be between 1 and 100 characters'),

    body('purpose')
      .notEmpty()
      .withMessage('Purpose is required')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Purpose must be between 5 and 500 characters'),

    body('purposeCode')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Purpose code cannot exceed 50 characters'),

    body('dateRange.from')
      .notEmpty()
      .withMessage('Date range from is required')
      .isISO8601()
      .withMessage('Date range from must be a valid date'),

    body('dateRange.to')
      .notEmpty()
      .withMessage('Date range to is required')
      .isISO8601()
      .withMessage('Date range to must be a valid date'),

    body('expiryDate')
      .optional()
      .isISO8601()
      .withMessage('Expiry date must be a valid date'),

    body('permissions')
      .isArray({ min: 1 })
      .withMessage('Permissions must be a non-empty array'),

    body('permissions.*')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Each permission must be at least 1 character'),

    body('hiTypes')
      .isArray({ min: 1 })
      .withMessage('Health information types must be a non-empty array'),

    body('hiTypes.*')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Each health information type must be at least 1 character'),

    body().custom((value, { req }) => {
      const fromDate = new Date(req.body.dateRange.from);
      const toDate = new Date(req.body.dateRange.to);
      const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;

      if (fromDate >= toDate) {
        throw new Error('Date range from must be before date range to');
      }

      if (expiryDate && toDate > expiryDate) {
        throw new Error('Date range to cannot be after expiry date');
      }

      if (expiryDate && new Date() > expiryDate) {
        throw new Error('Expiry date cannot be in the past');
      }

      return true;
    }),

    handleValidationErrors
  ]
};

// =============================================================================
// PARAM VALIDATION
// =============================================================================

export const paramValidationMiddleware = {
  patientId: [
    param('patientId')
      .notEmpty()
      .withMessage('Patient ID is required')
      .isUUID()
      .withMessage('Patient ID must be a valid UUID'),

    handleValidationErrors
  ],

  mrn: [
    param('mrn')
      .notEmpty()
      .withMessage('MRN is required')
      .matches(/^MRN-\d{4}-\d{7}$/)
      .withMessage('MRN must be in format MRN-YYYY-XXXXXXX'),

    handleValidationErrors
  ]
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  handleValidationErrors
};