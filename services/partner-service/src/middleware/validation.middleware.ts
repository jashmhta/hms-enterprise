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
  partner: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    type: Joi.string().valid('lab', 'pharmacy', 'insurance', 'equipment', 'software', 'consultant', 'other').required(),
    category: Joi.string().required(),
    description: Joi.string().max(1000).optional(),
    contactPerson: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(10).max(20).required(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional(),
      country: Joi.string().optional()
    }).required(),
    website: Joi.string().uri().optional(),
    taxId: Joi.string().optional(),
    licenseNumber: Joi.string().optional(),
    accreditation: Joi.string().optional(),
    services: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().min(1).max(100).required(),
        description: Joi.string().max(500).optional(),
        code: Joi.string().required(),
        category: Joi.string().required(),
        pricing: Joi.object({
          type: Joi.string().valid('fixed', 'per_item', 'percentage', 'tiered').required(),
          basePrice: Joi.number().positive().optional(),
          unitPrice: Joi.number().positive().optional(),
          percentage: Joi.number().positive().optional(),
          currency: Joi.string().default('USD')
        }).required(),
        availability: Joi.object({
          days: Joi.array().items(Joi.string()).required(),
          startTime: Joi.string().required(),
          endTime: Joi.string().required(),
          timezone: Joi.string().required(),
          leadTime: Joi.number().positive().required()
        }).required(),
        isActive: Joi.boolean().default(true)
      })
    ).optional(),
    integrationType: Joi.string().valid('api', 'file', 'manual', 'webhook').required(),
    contractStart: Joi.date().optional(),
    contractEnd: Joi.date().optional(),
    paymentTerms: Joi.number().positive().default(30),
    currency: Joi.string().default('USD'),
    commissionRate: Joi.number().min(0).max(1).optional(),
    apiCredentials: Joi.object({
      apiKey: Joi.string().required(),
      apiSecret: Joi.string().required(),
      endpoint: Joi.string().uri().required(),
      version: Joi.string().required(),
      authType: Joi.string().valid('api_key', 'oauth2', 'bearer', 'basic').required()
    }).optional(),
    webhookConfig: Joi.object({
      url: Joi.string().uri().required(),
      events: Joi.array().items(Joi.string()).required(),
      secret: Joi.string().required(),
      retryPolicy: Joi.object({
        maxAttempts: Joi.number().positive().default(3),
        delay: Joi.number().positive().default(5000),
        backoff: Joi.string().valid('linear', 'exponential').default('exponential')
      }).default()
    }).optional(),
    syncConfig: Joi.object({
      type: Joi.string().valid('pull', 'push', 'bidirectional').required(),
      frequency: Joi.string().required(),
      dataFormat: Joi.string().valid('json', 'xml', 'csv', 'hl7').required(),
      mapping: Joi.array().items(
        Joi.object({
          sourceField: Joi.string().required(),
          targetField: Joi.string().required(),
          transformation: Joi.string().optional(),
          defaultValue: Joi.any().optional()
        })
      ).optional()
    }).optional()
  }),

  order: Joi.object({
    partnerId: Joi.string().uuid().required(),
    patientId: Joi.string().uuid().required(),
    type: Joi.string().valid('lab_test', 'medicine', 'equipment', 'consultation', 'other').required(),
    items: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid().required(),
        serviceId: Joi.string().required(),
        serviceName: Joi.string().min(1).max(200).required(),
        description: Joi.string().max(500).optional(),
        quantity: Joi.number().positive().required(),
        unitPrice: Joi.number().positive().required(),
        totalPrice: Joi.number().positive().required(),
        specifications: Joi.object().optional(),
        requirements: Joi.object().optional()
      })
    ).min(1).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    requestedFor: Joi.date().optional(),
    currency: Joi.string().default('USD'),
    paymentMethod: Joi.string().optional(),
    deliveryInfo: Joi.object({
      type: Joi.string().valid('pickup', 'delivery', 'digital').required(),
      address: Joi.object({
        street: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        zipCode: Joi.string().optional(),
        country: Joi.string().optional()
      }).optional(),
      contactPerson: Joi.string().optional(),
      contactPhone: Joi.string().optional(),
      instructions: Joi.string().max(500).optional(),
      estimatedDelivery: Joi.date().optional()
    }).optional(),
    notes: Joi.string().max(1000).optional(),
    internalNotes: Joi.string().max(1000).optional(),
    metadata: Joi.object().optional()
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'completed', 'cancelled', 'refunded').required(),
    reason: Joi.string().max(500).optional()
  }),

  cancelOrder: Joi.object({
    reason: Joi.string().min(1).max(500).required()
  }),

  rating: Joi.object({
    rating: Joi.number().min(1).max(5).required()
  }),

  integration: Joi.object({
    integrationType: Joi.string().valid('abdm', 'lab', 'pharmacy', 'insurance', 'payment', 'other').required(),
    partnerServiceId: Joi.string().uuid().required(),
    config: Joi.object({
      endpoint: Joi.string().uri().required(),
      credentials: Joi.object({
        apiKey: Joi.string().required(),
        apiSecret: Joi.string().optional()
      }).required(),
      settings: Joi.object().required(),
      mapping: Joi.array().items(
        Joi.object({
          sourceField: Joi.string().required(),
          targetField: Joi.string().required(),
          transformation: Joi.string().optional(),
          defaultValue: Joi.any().optional()
        })
      ).optional(),
      webhook: Joi.object({
        url: Joi.string().uri().required(),
        secret: Joi.string().required()
      }).optional()
    }).required()
  }),

  syncData: Joi.object({
    syncType: Joi.string().valid('full', 'incremental', 'realtime').default('incremental')
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
    search: Joi.string().max(100).optional(),
    type: Joi.string().optional(),
    status: Joi.string().optional(),
    category: Joi.string().optional(),
    priority: Joi.string().optional(),
    paymentStatus: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    isActive: Joi.boolean().optional(),
    isVerified: Joi.boolean().optional()
  })
};