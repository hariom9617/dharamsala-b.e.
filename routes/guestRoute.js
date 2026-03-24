import express from 'express';
import auth from '../middleware/auth.js';
import GuestController from '../src/guest/guest.controller.js';
import { requirePermission } from '../middleware/permissions.js';
import { errorHandler } from '../utils/errors.js';

const router = express.Router();

router.post('/register', GuestController.selfRegister);
router.get('/', auth, requirePermission('guest.view'), GuestController.getAll);
router.get('/:id', auth, requirePermission('guest.view'), GuestController.getById);
router.get('/:id/current-booking', auth, requirePermission('booking.view'), GuestController.getCurrentBooking);
router.post('/', auth, requirePermission('guest.create'), GuestController.createOrUpdate);
router.put('/:id', auth, requirePermission('guest.update'), GuestController.update);

router.use(errorHandler);

export default router;
