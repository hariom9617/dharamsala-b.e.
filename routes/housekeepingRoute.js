import express from 'express';
import HousekeepingController from '../src/housekeeping/housekeeping.controller.js';
import auth from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { errorHandler } from '../utils/errors.js';

const router = express.Router();

router.use(auth);

router.get('/', requirePermission('housekeeping.view'), HousekeepingController.getTasks);
router.get('/:id', requirePermission('housekeeping.view'), HousekeepingController.getTask);
router.post('/', requirePermission('housekeeping.create'), HousekeepingController.createTask);
router.put('/:id', requirePermission('housekeeping.update'), HousekeepingController.updateTask);
router.patch('/:id/status', requirePermission('housekeeping.update'), HousekeepingController.updateTaskStatus);
router.delete('/:id', requirePermission('housekeeping.delete'), HousekeepingController.deleteTask);

router.use(errorHandler);

export default router;