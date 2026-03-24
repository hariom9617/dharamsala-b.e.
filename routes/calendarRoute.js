import express from 'express';
import auth from '../middleware/auth.js';
import CalendarController from '../src/calendar/calendar.controller.js';
import { requireRole } from '../middleware/permissions.js';

const router = express.Router();

// Apply authentication middleware
router.use(auth);

// Unified calendar endpoint
router.get(
  '/',
  requireRole('admin', 'director', 'manager', 'staff'),
  CalendarController.getCalendar.bind(CalendarController)
);

export default router;
