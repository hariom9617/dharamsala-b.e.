import express from 'express';
import BookingController from '../src/booking/booking.controller.js';
import auth from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { errorHandler } from '../utils/errors.js';

const router = express.Router();
router.use(auth);


router.get('/my-bookings', requirePermission('booking.view_own'), BookingController.getMyBookings);
router.get('/my-bookings/history', requirePermission('booking.view_own'), BookingController.getMyBookingHistory);
router.post('/:id/check-in', requirePermission('booking.check_in_own'), BookingController.checkInOwn);
router.post('/:id/check-out', requirePermission('booking.check_out_own'), BookingController.checkOutOwn);
router.get('/', requirePermission('booking.view'), BookingController.list);
router.get('/:id', requirePermission('booking.view'), BookingController.getById);
router.post('/', requirePermission('booking.create'), BookingController.create);
router.put('/:id', requirePermission('booking.update'), BookingController.update);
router.post('/:id/staff-check-in', requirePermission('booking.update'), BookingController.checkIn);
router.post('/:id/staff-check-out', requirePermission('booking.update'), BookingController.checkOut);

router.post('/:id/cancel', requirePermission('booking.cancel'), BookingController.cancel);

router.use(errorHandler);
export default router;
