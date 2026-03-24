import express from 'express';
import POSController from '../src/pos/pos.controller.js';
import auth from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { errorHandler } from '../utils/errors.js';

const router = express.Router();

router.use(auth);

router.post('/', requirePermission('pos.create'), POSController.createOrder);
router.get('/', requirePermission('pos.view'), POSController.getOrders);
router.get('/:id', requirePermission('pos.view'), POSController.getOrderById);

router.patch('/:id/status', requirePermission('pos.update'), POSController.updateOrderStatus);

router.use(errorHandler);

export default router;