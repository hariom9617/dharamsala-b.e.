// utils/twilio.js
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

// if (!accountSid || !authToken || !twilioPhone) {
//   console.warn('Twilio credentials not fully configured. SMS functionality may be limited.');
// }

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const sendOtpSms = async (to, otp) => {
  if (!client) {
    console.warn('Twilio client not initialized. SMS not sent.');
    return { success: false, message: 'SMS service not configured' };
  }

  try {
    const message = await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: twilioPhone,
      to: to
    });
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('Twilio error:', error.message);
    throw new Error('Failed to send OTP via SMS');
  }
};

export const generateOtp = () => {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};