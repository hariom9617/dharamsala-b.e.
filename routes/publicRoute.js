import express from 'express';
import publicController from '../src/public/public.controller.js';

const router = express.Router();

// List active hotels with availability summary
router.get('/hotels', publicController.listHotels);

// Get room availability by category for a specific hotel
router.get('/hotels/:hotelId/rooms/availability', publicController.getRoomAvailability);

export default router;
