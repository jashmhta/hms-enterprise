import { Request, Response, NextFunction } from 'express';
import { validateRequest, validateQuery, validateParams } from '../validation/billing.validation';

// Export validation middleware for use in routes
export {
  validateRequest,
  validateQuery,
  validateParams
};

// Specific validation schemas for different routes
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  createPaymentSchema,
  refundPaymentSchema,
  createBillableItemSchema,
  paginationSchema,
  dateRangeSchema,
  searchInvoicesSchema,
  analyticsSchema,
  uuidParamsSchema,
  invoiceIdParamSchema,
  paymentIdParamSchema,
  patientIdParamSchema
} from '../validation/billing.validation';

export const validateCreateInvoice = validateRequest(createInvoiceSchema);
export const validateUpdateInvoiceStatus = validateRequest(updateInvoiceStatusSchema);
export const validateCreatePayment = validateRequest(createPaymentSchema);
export const validateRefundPayment = validateRequest(refundPaymentSchema);
export const validateCreateBillableItem = validateRequest(createBillableItemSchema);

export const validatePagination = validateQuery(paginationSchema);
export const validateDateRange = validateQuery(dateRangeSchema);
export const validateSearchInvoices = validateQuery(searchInvoicesSchema);
export const validateAnalytics = validateQuery(analyticsSchema);

export const validateUuidParams = validateParams(uuidParamsSchema);
export const validateInvoiceIdParam = validateParams(invoiceIdParamSchema);
export const validatePaymentIdParam = validateParams(paymentIdParamSchema);
export const validatePatientIdParam = validateParams(patientIdParamSchema);