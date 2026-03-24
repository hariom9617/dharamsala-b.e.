import express from 'express';
import auth from '../middleware/auth.js';
import AnalyticsController from '../src/analytics/analytics.controller.js';
import { requirePermission } from '../middleware/permissions.js';
import { errorHandler } from '../utils/errors.js';

const router = express.Router();
router.use(auth);

// Single dashboard endpoint with role-based access control
router.get(
  '/dashboard',
  requirePermission('analytics.view'),
  AnalyticsController.getDashboard
);

// Keep hotel-specific analytics endpoint for detailed hotel data
router.get(
  '/hotels/:hotelId',
  requirePermission('analytics.view'),
  AnalyticsController.getHotelAnalytics
);

router.use(errorHandler);
export default router;
