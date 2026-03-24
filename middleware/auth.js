import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors.js';
import Staff from '../model/staff.js';
import Guest from '../model/guest.js';
import Hotel from '../model/hotel.js';


const ROLE_HIERARCHY = ['admin', 'director', 'manager', 'staff', 'guest'];

const computeEffectiveRole = (permanentRole, temporaryRole) => {
  if (!temporaryRole) return permanentRole;

  const permIdx = ROLE_HIERARCHY.indexOf(permanentRole);
  const tempIdx = ROLE_HIERARCHY.indexOf(temporaryRole);

  // Lower index = higher privilege
  // If temp role not found in hierarchy, use permanent
  if (tempIdx === -1) return permanentRole;
  if (permIdx === -1) return temporaryRole;

  return tempIdx < permIdx ? temporaryRole : permanentRole;
};

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId;

    if (!userId) {
      throw new UnauthorizedError('Invalid token structure');
    }

    let user = await Staff.findOne({
      _id: userId,
      isActive: true
    }).select('-__v');

    let userType = 'staff';

    if (!user) {
      user = await Guest.findById(userId).select('-__v');
      userType = 'guest';
    }

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    let hotelName = null;
    if (user.hotelId) {
      const hotel = await Hotel.findById(user.hotelId).select('name');
      hotelName = hotel ? hotel.name : null;
    }

    /* ================= TEMPORARY ACCESS LOGIC ================= */
    let temporaryRole = null;
    let temporaryPermissions = [];

    if (userType === 'staff' && user.temporaryAccess?.length) {
      const now = new Date();
      // Find first non-expired entry
      const active = user.temporaryAccess.find(t => t.expiresAt > now);

      if (active) {
        temporaryRole = active.role || null;
        temporaryPermissions = Array.isArray(active.allowedPermissions)
          ? active.allowedPermissions
          : [];
      }
    }
    /* ========================================================== */

    const permanentRole = user.role || 'guest';
    const effectiveRole = computeEffectiveRole(permanentRole, temporaryRole);

    req.user = {
      userId: user._id,
      role: permanentRole,              // Permanent role (label)
      temporaryRole,                    // Temporary role (if any)
      effectiveRole,                    // Higher privilege of permanent/temporary
      temporaryPermissions,             // Additional permissions from temporary access
      hotelId: user.hotelId,
      hotelName,
      name: user.name,
      email: user.email || null,
      phone: user.phone || null,
      type: userType,
      assignedRoomIds: user.assignedRoomIds || [],   // Staff guest-scope
      managerId: user.managerId || null              // For manager-scoped staff
    };

    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token'));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired'));
    }
    next(err);
  }
};

export default auth;
