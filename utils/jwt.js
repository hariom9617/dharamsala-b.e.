// utils/jwt.js
import jwt from 'jsonwebtoken';

export const generateToken = ({ userId, hotelId, role }) => {
  return jwt.sign(
    {
      userId: userId,
      hotelId: hotelId || null,
      role: role,
      effectiveRole: role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};