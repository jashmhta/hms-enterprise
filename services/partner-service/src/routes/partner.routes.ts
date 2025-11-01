import { Router } from 'express';
import { PartnerController } from '../controllers/partner.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Partner routes
router.post('/partners', PartnerController.createPartner);
router.get('/partners', PartnerController.getPartners);
router.get('/partners/stats', PartnerController.getPartnerStats);
router.get('/partners/active', PartnerController.getActivePartners);
router.get('/partners/type/:type', PartnerController.getPartnersByType);
router.get('/partners/:id', PartnerController.getPartnerById);
router.put('/partners/:id', PartnerController.updatePartner);
router.delete('/partners/:id', PartnerController.deletePartner);
router.patch('/partners/:id/activate', PartnerController.activatePartner);
router.patch('/partners/:id/deactivate', PartnerController.deactivatePartner);
router.patch('/partners/:id/verify', PartnerController.verifyPartner);
router.patch('/partners/:id/rating', PartnerController.updatePartnerRating);

// Partner integration routes
router.get('/partners/:id/integrations', PartnerController.getPartnerIntegrations);
router.post('/partners/:id/integrations', PartnerController.createPartnerIntegration);
router.post('/partners/:id/test-integration', PartnerController.testPartnerIntegration);
router.post('/partners/:id/sync', PartnerController.syncPartnerData);

// Order routes
router.post('/orders', PartnerController.createOrder);
router.get('/orders', PartnerController.getOrders);
router.get('/orders/stats', PartnerController.getOrderStats);
router.get('/orders/pending', PartnerController.getPendingOrders);
router.get('/orders/overdue', PartnerController.getOverdueOrders);
router.get('/orders/:id', PartnerController.getOrderById);
router.put('/orders/:id', PartnerController.updateOrder);
router.patch('/orders/:id/status', PartnerController.updateOrderStatus);
router.post('/orders/:id/cancel', PartnerController.cancelOrder);

// Orders by partner
router.get('/partners/:partnerId/orders', PartnerController.getOrdersByPartner);
router.get('/partners/:partnerId/orders/stats', PartnerController.getPartnerOrderStats);

// Orders by patient
router.get('/patients/:patientId/orders', PartnerController.getOrdersByPatient);

export default router;