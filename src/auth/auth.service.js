import Staff from '../../model/staff.js';
import Guest from '../../model/guest.js';
import Hotel from '../../model/hotel.js';
import { generateToken } from '../../utils/jwt.js';
import { generateOtp } from '../../utils/twilio.js';
import { BadRequestError,UnauthorizedError,NotFoundError } from '../../utils/errors.js';

// In-memory OTP store (Redis later)
const otpStore = new Map();

const OTP_EXPIRY = 5 * 60 * 1000;
const RESEND_COOLDOWN = 30 * 1000;
const MASTER_OTP = process.env.MASTER_OTP;

// Cleanup expired OTPs
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(phone);
    }
  }
}, 60 * 1000);

// Send or resend OTP
export const sendOtp = async ({ phone }) => {
  const now = Date.now();
  const existing = otpStore.get(phone);

  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN - (now - existing.lastSentAt)) / 1000
    );
    throw new BadRequestError(`Please wait ${wait}s before retrying`);
  }

  const otp = generateOtp();

  console.log(`[DEBUG OTP] ${phone} -> ${otp}`);

  otpStore.set(phone, {
    otp,
    expiresAt: now + OTP_EXPIRY,
    lastSentAt: now,
    attempts: 0
  });

  return {
    message: 'OTP sent successfully',
    data: {
      phone,
      ...(process.env.NODE_ENV !== 'production' && { debugOtp: otp })
    }
  };
};

// Verify OTP and login
 export const verifyOtp = async ({
  phone,
  otp,
  hotelId,
  isAdmin = false
}) => {
  const MASTER_OTP = process.env.MASTER_OTP;

  // ✅ 1. MASTER OTP → BYPASS OTP STORE
  if (otp === MASTER_OTP) {
    console.log('[MASTER OTP LOGIN]', phone);
  } else {
    // 🔒 NORMAL OTP FLOW
    const stored = otpStore.get(phone);

    if (!stored) {
      throw new UnauthorizedError('OTP expired or not requested');
    }

    if (stored.expiresAt < Date.now()) {
      otpStore.delete(phone);
      throw new UnauthorizedError('OTP expired');
    }

    if (stored.otp !== otp) {
      stored.attempts += 1;

      if (stored.attempts >= 5) {
        otpStore.delete(phone);
        throw new UnauthorizedError('Too many invalid attempts');
      }

      throw new UnauthorizedError('Invalid OTP');
    }

    // ✅ Valid OTP → remove it
    otpStore.delete(phone);
  }

  // 🏨 Resolve hotel
  let hotel;
  if (hotelId) {
    hotel = await Hotel.findById(hotelId);
    if (!hotel) throw new NotFoundError('Hotel not found');
  } else {
    hotel = await Hotel.findOne() || await ensureDefaultHotel();
  }

  // 🔎 First try to find an existing staff or guest
  let user = await Staff.findOne({ phone, isActive: true });
  let isGuest = false;

  // If no staff found, try to find a guest
  if (!user) {
    user = await Guest.findOne({ phone });
    isGuest = true;
  }

  // If still no user found, reject login - don't create account
  if (!user) {
    throw new UnauthorizedError('User not registered. Please sign up first.');
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken({
    userId: user._id,
    hotelId: user.hotelId,
    role: user.role
  });

  return {
    message: 'Login successful',
    data: {
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        hotel: user.hotelId
      }
    }
  };
};


export default {
  sendOtp,
  verifyOtp
};