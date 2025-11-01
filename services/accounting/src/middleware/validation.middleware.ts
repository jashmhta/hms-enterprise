import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }
    
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }
    
    next();
  };
};

export const schemas = {
  transaction: Joi.object({
    type: Joi.string().valid('invoice', 'payment', 'refund', 'adjustment', 'write_off', 'prepayment').required(),
    patientId: Joi.string().uuid().required(),
    invoiceId: Joi.string().uuid().optional(),
    paymentId: Joi.string().uuid().optional(),
    description: Joi.string().min(1).max(500).required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().default('USD'),
    date: Joi.date().default(Date.now),
    dueDate: Joi.date().optional(),
    accountId: Joi.string().required(),
    category: Joi.string().required(),
    reference: Joi.string().optional(),
    metadata: Joi.object().optional()
  }),

  invoice: Joi.object({
    patientId: Joi.string().uuid().required(),
    appointmentId: Joi.string().uuid().optional(),
    items: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid().required(),
        description: Joi.string().min(1).max(500).required(),
        quantity: Joi.number().positive().required(),
        unitPrice: Joi.number().positive().required(),
        discount: Joi.number().min(0).default(0),
        taxRate: Joi.number().min(0).max(1).default(0),
        serviceCode: Joi.string().optional(),
        chartOfAccountId: Joi.string().required()
      })
    ).min(1).required(),
    currency: Joi.string().default('USD'),
    paymentTerms: Joi.number().positive().default(30),
    notes: Joi.string().max(1000).optional(),
    metadata: Joi.object().optional()
  }),

  payment: Joi.object({
    patientId: Joi.string().uuid().required(),
    invoiceId: Joi.string().uuid().optional(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().default('USD'),
    method: Joi.string().valid('cash', 'card', 'bank_transfer', 'check', 'insurance', 'online', 'mobile').required(),
    reference: Joi.string().optional(),
    transactionId: Joi.string().optional(),
    notes: Joi.string().max(500).optional(),
    gatewayConfig: Joi.object().optional()
  }),

  expense: Joi.object({
    vendorId: Joi.string().uuid().optional(),
    description: Joi.string().min(1).max(500).required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().default('USD'),
    date: Joi.date().default(Date.now),
    category: Joi.string().required(),
    subcategory: Joi.string().optional(),
    chartOfAccountId: Joi.string().required(),
    receiptUrl: Joi.string().uri().optional(),
    notes: Joi.string().max(500).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    metadata: Joi.object().optional()
  }),

  chartOfAccount: Joi.object({
    code: Joi.string().required(),
    name: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('asset', 'liability', 'equity', 'revenue', 'expense').required(),
    subtype: Joi.string().required(),
    description: Joi.string().max(500).optional(),
    isActive: Joi.boolean().default(true),
    parentId: Joi.string().uuid().optional(),
    normalBalance: Joi.string().valid('debit', 'credit').required(),
    openingBalance: Joi.number().default(0),
    currency: Joi.string().default('USD')
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded').required()
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
    search: Joi.string().max(100).optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    status: Joi.string().optional(),
    type: Joi.string().optional(),
    category: Joi.string().optional(),
    patientId: Joi.string().uuid().optional()
  }),

  dateRange: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required()
  })
};