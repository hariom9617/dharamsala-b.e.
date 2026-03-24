import express from 'express';
import authController from '../src/auth/auth.controller.js';
import { errorHandler } from '../utils/errors.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Single smart OTP API
router.post('/otp', authController.handleOtp.bind(authController));
router.get('/me', auth, authController.me.bind(authController));

router.use(errorHandler);

export default router;