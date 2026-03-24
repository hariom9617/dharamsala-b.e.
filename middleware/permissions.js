import { ForbiddenError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import User from '../model/staff.js';

export const ROLE_PERMISSIONS = {
  admin: ['*'],

  director: [
    'hotel.view',
    'hotel.manage',

    'room.view',
    'room.create',
    'room.update',
    'room.delete',

    'booking.view',
    'booking.manage',

    'guest.view',
    'guest.create',
    'guest.update',

    'staff.view',
    'staff.create',
    'staff.update',
    'staff.delete',

    'analytics.view',
    'reports.view',

    'serviceRequest.view',
    'serviceRequest.create',
    'serviceRequest.update',
    'serviceRequest.delete',

    'pos.view',
    'pos.update',
    'menu.view',
    'menu.create',
    'menu.update',
    'menu.delete',

    'analytics.view',

    'inventory.view',
    'inventory.create',
    'inventory.update',
    'inventory.delete'
  ],

  manager: [
    'hotel.view',

    'room.view',
    'room.create',
    'room.update',

    'booking.view',
    'booking.manage',
    'booking.create',
    'booking.update',
    'booking.cancel',
    'booking.check_out_own',

    'guest.view',
    'guest.create',
    'guest.update',

    'staff.view',

    'serviceRequest.view',
    'serviceRequest.create',
    'serviceRequest.update',
    'serviceRequest.delete',

    'pos.view',
    'pos.update',
    
    'menu.view',
    'menu.create',
    'menu.update',
    'menu.delete',

    'analytics.view',

    'inventory.view',
    'inventory.update',
    'inventory.delete'
  ],

  staff: [
    'guest.view',
    'guest.checkin',
    'guest.checkout',

    'booking.view',

    'housekeeping.view',
    'pos.view',
    'pos.update',
    'menu.view',

    'serviceRequest.view',
    'serviceRequest.update',

    'inventory.view'
  ],

  guest: [
    'booking.view_own',
    'booking.create',
    'booking.check_in_own',
    'booking.check_out_own',  
    'serviceRequest.view',
    'serviceRequest.create',
    'pos.create',
    'pos.view',
    'menu.view',
    'order.create'
  ]
};

/* ================= ROLE CHECK (LABEL ONLY) ================= */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // 🔒 ONLY permanent role decides role-based access
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    next();
  };
};


/* ================= PERMISSION CHECK (REAL POWER) ================= */
export const requirePermission = (permission) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // 1️⃣ Permanent role → FULL permissions
    const baseRole = req.user.role;
    const basePerms = ROLE_PERMISSIONS[baseRole] || [];

    if (basePerms.includes('*') || basePerms.includes(permission)) {
      return next();
    }

    // 2️⃣ Temporary role → LIMITED permissions (additive only)
    const tempPerms = req.user.temporaryPermissions || [];

    if (tempPerms.includes(permission)) {
      return next();
    }

    return next(new ForbiddenError('Permission denied'));
  };
};

/* ================= USER MANAGEMENT ================= */
const ROLE_MAP = {
  admin: ['director', 'manager', 'staff', 'guest'],
  director: ['manager', 'staff', 'guest'],
  manager: ['staff', 'guest'],
  staff: ['guest'],
  guest: []
};

export const canManageUser = async (req, _res, next) => {
  const { userId } = req.params;

  if (!req.user || !userId) return next();
  if (req.user.id.toString() === userId) return next();
  if (req.user.role === 'admin') return next();

  const target = await User.findById(userId).select('role');
  if (!target) return next(new NotFoundError('User not found'));

  const allowed = ROLE_MAP[req.user.role] || [];
  if (!allowed.includes(target.role)) {
    return next(new ForbiddenError('Cannot manage this user'));
  }

  next();
};
