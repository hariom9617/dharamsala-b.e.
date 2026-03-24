import express from 'express';
import auth from '../middleware/auth.js';
import EventController from '../src/event/event.controller.js';
import { requireRole } from '../middleware/permissions.js';
import { errorHandler } from '../utils/errors.js';

const router = express.Router();

// Apply authentication middleware
router.use(auth);

// Event CRUD routes - Admin/Manager only
router.post('/', requireRole('admin', 'director', 'manager'), EventController.create);
router.get('/', requireRole('admin', 'manager', 'staff'), EventController.getAll);
router.get('/:id', requireRole('admin', 'manager', 'staff'), EventController.getById);
router.put('/:id', requireRole('admin', 'director', 'manager'), EventController.update);
router.delete('/:id', requireRole('admin', 'director', 'manager'), EventController.delete);

// Error handling middleware
router.use(errorHandler);

export default router;
