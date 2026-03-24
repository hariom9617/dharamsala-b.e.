import express from 'express';
import ServiceRequestController from '../src/serviceRequest/serviceRequest.controller.js';
import auth from '../middleware/auth.js';
import { errorHandler } from '../utils/errors.js';
import { requirePermission } from '../middleware/permissions.js';

const router = express.Router();
router.use(auth);

router.get('/', requirePermission("serviceRequest.view"), ServiceRequestController.getServiceRequests);
router.get('/:id', requirePermission("serviceRequest.view"), ServiceRequestController.getServiceRequest);
router.post('/', requirePermission("serviceRequest.create"), ServiceRequestController.createServiceRequest);
router.put('/:id', requirePermission("serviceRequest.update"), ServiceRequestController.updateServiceRequest);
router.delete('/:id', requirePermission("serviceRequest.delete"), ServiceRequestController.deleteServiceRequest);

router.use(errorHandler);
export default router;
