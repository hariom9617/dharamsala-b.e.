// middleware/validators/housekeeping.js
import { body, query } from 'express-validator';

export const validateCreateTask = [
  body('hotelId').notEmpty().withMessage('hotel ID is required'),
  body('roomId').notEmpty().withMessage('Room ID is required'),
  body('roomNumber').notEmpty().withMessage('Room number is required'),
  body('type')
    .isIn(['cleaning', 'turndown', 'deep-clean', 'maintenance', 'inspection'])
    .withMessage('Invalid task type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
  body('scheduledAt')
    .isISO8601()
    .withMessage('Invalid scheduled date')
];

export const validateUpdateTask = [
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled date')
];

export const validateGetTasks = [
  query('hotelId').notEmpty().withMessage('hotel ID is required'),
  query('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  query('type')
    .optional()
    .isIn(['cleaning', 'turndown', 'deep-clean', 'maintenance', 'inspection'])
    .withMessage('Invalid task type'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
  query('date').optional().isISO8601().withMessage('Invalid date format'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
];