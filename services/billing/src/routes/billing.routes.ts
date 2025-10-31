import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import {
  validateCreateInvoice,
  validateUpdateInvoiceStatus,
  validateCreatePayment,
  validateRefundPayment,
  validateCreateBillableItem,
  validatePagination,
  validateDateRange,
  validateSearchInvoices,
  validateAnalytics,
  validateInvoiceIdParam,
  validatePaymentIdParam,
  validatePatientIdParam
} from '../middleware/validation';
import { authenticateToken, authorizeRoles } from '@hms-helpers/shared';
import { UserRole } from '@hms-helpers/shared';

const router = Router();
const billingController = new BillingController();

// Apply authentication to all routes
router.use(authenticateToken);

// Invoice Routes
router.post('/invoices', 
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING, UserRole.DOCTOR, UserRole.RECEPTIONIST),
  validateCreateInvoice,
  billingController.createInvoice
);

router.get('/invoices/:invoiceId',
  validateInvoiceIdParam,
  billingController.getInvoiceById
);

router.put('/invoices/:invoiceId/status',
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING),
  validateInvoiceIdParam,
  validateUpdateInvoiceStatus,
  billingController.updateInvoiceStatus
);

router.get('/patients/:patientId/invoices',
  validatePatientIdParam,
  validatePagination,
  billingController.getPatientInvoices
);

router.get('/invoices/outstanding',
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING),
  billingController.getOutstandingInvoices
);

router.get('/invoices/search',
  validateSearchInvoices,
  billingController.searchInvoices
);

// Payment Routes
router.post('/payments',
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING, UserRole.RECEPTIONIST),
  validateCreatePayment,
  billingController.processPayment
);

router.post('/payments/:paymentId/refund',
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING),
  validatePaymentIdParam,
  validateRefundPayment,
  billingController.refundPayment
);

router.get('/invoices/:invoiceId/payments',
  validateInvoiceIdParam,
  billingController.getInvoicePayments
);

// Billable Items Routes
router.post('/billable-items',
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING),
  validateCreateBillableItem,
  billingController.createBillableItem
);

router.get('/billable-items',
  billingController.getBillableItems
);

// Analytics Routes
router.get('/analytics',
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING),
  validateAnalytics,
  billingController.getBillingAnalytics
);

router.get('/dashboard',
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING),
  validateAnalytics,
  billingController.getDashboardData
);

// GST Compliance Routes
router.post('/invoices/:invoiceId/einvoice',
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING),
  validateInvoiceIdParam,
  billingController.generateEInvoice
);

// Reports Routes
router.get('/reports/invoices',
  authorizeRoles(UserRole.ADMIN, UserRole.BILLING),
  validateDateRange,
  billingController.generateInvoiceReport
);

// Health Check Route (no auth required)
router.get('/health',
  billingController.healthCheck
);

export default router;