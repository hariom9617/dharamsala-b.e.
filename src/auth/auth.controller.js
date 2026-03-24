import authService from './auth.service.js';
import { BadRequestError } from '../../utils/errors.js';

class AuthController {
  async handleOtp(req, res, next) {
    try {
      const { phone, otp, hotelId, isAdmin } = req.body;

      if (!phone) {
        throw new BadRequestError('Phone number is required');
      }

      // Normalize phone to 10 digits
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new BadRequestError('Invalid phone number');
      }

      let result;

      // Auto mode: send OTP or verify OTP
      if (!otp) {
        result = await authService.sendOtp({ phone: cleanPhone });
      } else {
        result = await authService.verifyOtp({
          phone: cleanPhone,
          otp,
          hotelId,
          isAdmin
        });
      }

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
  
  async me(req, res, next) {
    try {
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();