import Joi from 'joi';
import { InvoiceStatus, PaymentMethod, InvoiceType } from '../models/billing.model';

// Invoice Validations
export const createInvoiceSchema = Joi.object({
  patientId: Joi.string().uuid().required().messages({
    'string.uuid': 'Patient ID must be a valid UUID',
    'any.required': 'Patient ID is required'
  }),
  invoiceType: Joi.string().valid(...Object.values(InvoiceType)).required().messages({
    'any.only': 'Invalid invoice type',
    'any.required': 'Invoice type is required'
  }),
  visitId: Joi.string().uuid().optional(),
  appointmentId: Joi.string().uuid().optional(),
  doctorId: Joi.string().uuid().optional(),
  items: Joi.array().items(
    Joi.object({
      itemId: Joi.string().uuid().required().messages({
        'string.uuid': 'Item ID must be a valid UUID',
        'any.required': 'Item ID is required'
      }),
      quantity: Joi.number().positive().required().messages({
        'number.positive': 'Quantity must be a positive number',
        'any.required': 'Quantity is required'
      }),
      unitPrice: Joi.number().min(0).optional(),
      discount: Joi.number().min(0).optional(),
      discountType: Joi.string().valid('PERCENTAGE', 'FIXED').optional()
    })
  ).min(1).required().messages({
    'array.min': 'At least one item is required',
    'any.required': 'Items array is required'
  }),
  insuranceInfo: Joi.object({
    providerId: Joi.string().uuid().required(),
    providerName: Joi.string().required(),
    policyNumber: Joi.string().required(),
    memberId: Joi.string().required(),
    preAuthNumber: Joi.string().optional(),
    tpaId: Joi.string().optional(),
    tpaName: Joi.string().optional(),
    isCashless: Joi.boolean().required(),
    approvedAmount: Joi.number().min(0).optional(),
    coPaymentAmount: Joi.number().min(0).optional(),
    deductibleAmount: Joi.number().min(0).optional()
  }).optional(),
  corporateInfo: Joi.object({
    companyId: Joi.string().uuid().required(),
    companyName: Joi.string().required(),
    employeeId: Joi.string().required(),
    department: Joi.string().required(),
    billingContact: Joi.string().required(),
    creditLimit: Joi.number().min(0).optional()
  }).optional(),
  notes: Joi.string().max(1000).optional(),
  dueDate: Joi.date().min('now').optional()
}).messages({
  'object.unknown': 'Unknown field in request body'
});

export const updateInvoiceStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(InvoiceStatus)).required().messages({
    'any.only': 'Invalid invoice status',
    'any.required': 'Invoice status is required'
  }),
  notes: Joi.string().max(1000).optional()
}).messages({
  'object.unknown': 'Unknown field in request body'
});

// Payment Validations
export const createPaymentSchema = Joi.object({
  invoiceId: Joi.string().uuid().required().messages({
    'string.uuid': 'Invoice ID must be a valid UUID',
    'any.required': 'Invoice ID is required'
  }),
  paymentMethod: Joi.string().valid(...Object.values(PaymentMethod)).required().messages({
    'any.only': 'Invalid payment method',
    'any.required': 'Payment method is required'
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be a positive number',
    'any.required': 'Amount is required'
  }),
  paymentMode: Joi.string().required().messages({
    'any.required': 'Payment mode is required'
  }),
  cardInfo: Joi.when('paymentMethod', {
    is: PaymentMethod.CARD,
    then: Joi.object({
      cardNumber: Joi.string().creditCard().required().messages({
        'string.creditCard': 'Invalid credit card number',
        'any.required': 'Card number is required'
      }),
      expiryMonth: Joi.string().pattern(/^(0[1-9]|1[0-2])$/).required().messages({
        'string.pattern.base': 'Expiry month must be between 01 and 12',
        'any.required': 'Expiry month is required'
      }),
      expiryYear: Joi.string().pattern(/^[0-9]{4}$/).required().messages({
        'string.pattern.base': 'Expiry year must be a 4-digit number',
        'any.required': 'Expiry year is required'
      }),
      cardHolderName: Joi.string().max(100).optional(),
      cvv: Joi.string().pattern(/^[0-9]{3,4}$/).required().messages({
        'string.pattern.base': 'CVV must be 3 or 4 digits',
        'any.required': 'CVV is required'
      })
    }).required(),
    otherwise: Joi.optional()
  }),
  bankInfo: Joi.when('paymentMethod', {
    is: Joi.valid(PaymentMethod.NET_BANKING, PaymentMethod.CHEQUE),
    then: Joi.object({
      bankName: Joi.string().required().messages({
        'any.required': 'Bank name is required'
      }),
      accountNumber: Joi.string().required().messages({
        'any.required': 'Account number is required'
      }),
      ifscCode: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).required().messages({
        'string.pattern.base': 'Invalid IFSC code format',
        'any.required': 'IFSC code is required'
      }),
      transactionRef: Joi.string().optional(),
      chequeNumber: Joi.when('paymentMethod', {
        is: PaymentMethod.CHEQUE,
        then: Joi.string().required().messages({
          'any.required': 'Cheque number is required for cheque payments'
        }),
        otherwise: Joi.optional()
      }),
      chequeDate: Joi.when('paymentMethod', {
        is: PaymentMethod.CHEQUE,
        then: Joi.date().required().messages({
          'any.required': 'Cheque date is required for cheque payments'
        }),
        otherwise: Joi.optional()
      })
    }).required(),
    otherwise: Joi.optional()
  }),
  upiInfo: Joi.when('paymentMethod', {
    is: PaymentMethod.UPI,
    then: Joi.object({
      vpa: Joi.string().pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/).optional(),
      transactionId: Joi.string().optional(),
      customerMobile: Joi.string().pattern(/^[0-9]{10}$/).optional()
    }).optional(),
    otherwise: Joi.optional()
  }),
  gatewayInfo: Joi.object({
    gatewayName: Joi.string().optional(),
    gatewayTransactionId: Joi.string().optional()
  }).optional(),
  notes: Joi.string().max(500).optional()
}).messages({
  'object.unknown': 'Unknown field in request body'
});

export const refundPaymentSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Refund amount must be a positive number',
    'any.required': 'Refund amount is required'
  }),
  reason: Joi.string().max(500).required().messages({
    'any.required': 'Refund reason is required'
  })
}).messages({
  'object.unknown': 'Unknown field in request body'
});

// Billable Item Validations
export const createBillableItemSchema = Joi.object({
  name: Joi.string().max(200).required().messages({
    'any.required': 'Item name is required'
  }),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().max(100).required().messages({
    'any.required': 'Category is required'
  }),
  subcategory: Joi.string().max(100).optional(),
  hsnCode: Joi.string().max(20).optional(),
  sacCode: Joi.string().max(20).optional(),
  unitOfMeasurement: Joi.string().max(50).required().messages({
    'any.required': 'Unit of measurement is required'
  }),
  standardRate: Joi.number().min(0).required().messages({
    'number.min': 'Standard rate must be a non-negative number',
    'any.required': 'Standard rate is required'
  }),
  cost: Joi.number().min(0).optional(),
  taxRate: Joi.object({
    cgst: Joi.number().min(0).max(100).default(9).optional(),
    sgst: Joi.number().min(0).max(100).default(9).optional(),
    igst: Joi.number().min(0).max(100).default(18).optional(),
    cess: Joi.number().min(0).max(100).default(0).optional()
  }).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  minQuantity: Joi.number().min(0).optional(),
  maxQuantity: Joi.number().min(0).optional(),
  requiresPrescription: Joi.boolean().default(false).optional(),
  requiresAuthorization: Joi.boolean().default(false).optional(),
  contractRates: Joi.array().items(
    Joi.object({
      insuranceProviderId: Joi.string().uuid().required(),
      rate: Joi.number().min(0).required()
    })
  ).optional(),
  seasonalRates: Joi.array().items(
    Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().min(Joi.ref('startDate')).required(),
      rate: Joi.number().min(0).required()
    })
  ).optional(),
  departmentId: Joi.string().uuid().required().messages({
    'string.uuid': 'Department ID must be a valid UUID',
    'any.required': 'Department ID is required'
  })
}).messages({
  'object.unknown': 'Unknown field in request body'
});

// Query Parameter Validations
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional()
});

export const searchInvoicesSchema = Joi.object({
  query: Joi.string().max(200).optional(),
  patientId: Joi.string().uuid().optional(),
  status: Joi.string().valid(...Object.values(InvoiceStatus)).optional(),
  invoiceType: Joi.string().valid(...Object.values(InvoiceType)).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const analyticsSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  period: Joi.number().integer().min(1).max(365).optional()
});

// Helper function to get enum values
function ...Object.values(obj: any): string[] {
  return Object.values(obj);
}

// Validation middleware factory
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: Function) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: Function) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
    }

    req.query = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: Function) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Parameter validation failed',
        errors
      });
    }

    req.params = value;
    next();
  };
};

// UUID parameter validation
export const uuidParamsSchema = Joi.object({
  invoiceId: Joi.string().uuid().required(),
  paymentId: Joi.string().uuid().optional(),
  patientId: Joi.string().uuid().optional()
});

export const invoiceIdParamSchema = Joi.object({
  invoiceId: Joi.string().uuid().required()
});

export const paymentIdParamSchema = Joi.object({
  paymentId: Joi.string().uuid().required()
});

export const patientIdParamSchema = Joi.object({
  patientId: Joi.string().uuid().required()
});