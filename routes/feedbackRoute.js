import express from 'express';
import FeedbackController from '../src/feedback/feedback.controller.js';
import auth from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { errorHandler } from '../utils/errors.js';

const router = express.Router();
router.use(auth);

router.get('/',  requirePermission('feedback.view'),   FeedbackController.getFeedback);
router.post('/', requirePermission('feedback.create'), FeedbackController.createFeedback);

router.use(errorHandler);
export default router;
