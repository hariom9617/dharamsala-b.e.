import asyncHandler from 'express-async-handler';
import GuestService from './guest.service.js';
import { ForbiddenError } from '../../utils/errors.js';
import { generateToken } from '../../utils/jwt.js';

class GuestController {
  
  static selfRegister = asyncHandler(async (req, res) => {
    if (req.user) {
      throw new ForbiddenError('Staff must use /api/guests to create guests');
    }

    const guest = await GuestService.selfRegister(req.body);

    const token = generateToken({
      userId: guest._id,
      hotelId: guest.hotelId,
      role: "guest"
    });

    res.status(201).json({
      success: true,
      data: guest,
      token,
      message: 'Registration successful'
    });
  });

  static getAll = asyncHandler(async (req, res) => {
    const role = req.user.effectiveRole;
    const query = { ...req.query };

    if (role === 'guest') {
      throw new ForbiddenError('Guests cannot view guest list');
    }

    if (['director', 'manager'].includes(role)) {
      query.hotelId = req.user.hotelId;
    }

    if (role === 'staff') {
      query.hotelId = req.user.hotelId;
      query.assignedRoomIds = req.user.assignedRoomIds;
      query.requesterRole = 'staff';

      if (!req.user.assignedRoomIds?.length) {
        return res.json({
          success: true,
          data: [],
          total: 0,
          message: 'No rooms assigned to you'
        });
      }
    }

    const result = await GuestService.getAll(query);

    res.json({
      success: true,
      data: result.data,
      total: result.total
    });
  });

  static getById = asyncHandler(async (req, res) => {
    const guest = await GuestService.getById(req.params.id, req.user);
    
    res.json({ 
      success: true, 
      data: guest 
    });
  });

  static getCurrentBooking = asyncHandler(async (req, res) => {
    const booking = await GuestService.getCurrentBooking(req.params.id, req.user);
    
    res.json({ 
      success: true, 
      data: booking || null 
    });
  });

  static createOrUpdate = asyncHandler(async (req, res) => {
    const role = req.user.effectiveRole;

    if (role === 'guest') {
      throw new ForbiddenError('Guests cannot create other guests');
    }

    if (role === 'staff') {
      throw new ForbiddenError('Staff members cannot create guests. Please contact a manager.');
    }

    const guest = await GuestService.createWalkIn(req.body, req.user);
    
    res.status(201).json({
      success: true,
      data: guest,
      message: 'Walk-in guest created successfully'
    });
  });

  static update = asyncHandler(async (req, res) => {
    const role = req.user.effectiveRole;

    if (role === 'guest') {
      if (req.params.id !== req.user.userId.toString()) {
        throw new ForbiddenError('You can only update your own profile');
      }
      
      const allowedFields = ['name', 'email', 'address'];
      const sanitizedData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          sanitizedData[field] = req.body[field];
        }
      });
      
      const guest = await GuestService.update(req.params.id, sanitizedData);
      return res.json({ 
        success: true, 
        data: guest 
      });
    }

    if (role === 'staff') {
      throw new ForbiddenError('Staff cannot update guest information');
    }

    if (['director', 'manager'].includes(role)) {
      const existingGuest = await GuestService.getById(req.params.id);
      const guestHotelId = existingGuest.hotelId?._id?.toString() || existingGuest.hotelId?.toString();
      const userHotelId = req.user.hotelId?._id?.toString() || req.user.hotelId?.toString();
      
      if (guestHotelId !== userHotelId) {
        throw new ForbiddenError('You can only update guests of your hotel');
      }
    }

    const guest = await GuestService.update(req.params.id, req.body);
    
    res.json({ 
      success: true, 
      data: guest 
    });
  });
}

export default GuestController;
