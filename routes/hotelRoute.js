import express from 'express';
import auth from '../middleware/auth.js';
import hotelController from '../src/hotel/hotel.controller.js';
import { requirePermission } from '../middleware/permissions.js';

const router = express.Router();

router.get('/', auth, requirePermission("hotel.view"), hotelController.getHotels);
router.post('/', auth, requirePermission("hotel.create"), hotelController.createHotel);
router.get('/:id', auth, requirePermission("hotel.view"), hotelController.getHotel);
router.put('/:id', auth, requirePermission("hotel.update"), hotelController.updateHotel);
router.delete('/:id', auth, requirePermission("hotel.delete"), hotelController.deleteHotel);

export default router;