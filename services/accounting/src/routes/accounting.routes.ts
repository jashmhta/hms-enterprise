import { Router } from 'express';
import { AccountingController } from '../controllers/accounting.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/transactions', AccountingController.createTransaction);
router.get('/transactions', AccountingController.getTransactions);
router.get('/transactions/:id', AccountingController.getTransactionById);
router.put('/transactions/:id', AccountingController.updateTransaction);
router.delete('/transactions/:id', AccountingController.deleteTransaction);
router.post('/transactions/:id/post', AccountingController.postTransaction);

router.post('/invoices', AccountingController.createInvoice);
router.get('/invoices', AccountingController.getInvoices);
router.get('/invoices/:id', AccountingController.getInvoiceById);
router.put('/invoices/:id', AccountingController.updateInvoice);
router.patch('/invoices/:id/status', AccountingController.updateInvoiceStatus);
router.get('/invoices/:id/pdf', AccountingController.downloadInvoicePDF);
router.get('/invoices/overdue', AccountingController.getOverdueInvoices);

router.post('/payments', AccountingController.addPayment);
router.post('/payments/process', AccountingController.processPayment);

router.post('/expenses', AccountingController.createExpense);
router.get('/expenses', AccountingController.getExpenses);
router.patch('/expenses/:id/approve', AccountingController.approveExpense);

router.get('/patients/:patientId/balance', AccountingController.getPatientBalance);

router.get('/reports/financial-summary', AccountingController.getFinancialSummary);
router.get('/reports/receivables', AccountingController.getReceivablesReport);
router.get('/reports/aging', AccountingController.getAgingReport);

router.post('/chart-of-accounts', AccountingController.createChartOfAccount);
router.get('/chart-of-accounts', AccountingController.getChartOfAccounts);

export default router;