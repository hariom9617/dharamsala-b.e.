import asyncHandler from 'express-async-handler';
import EventService from './event.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';

class EventController {
  static create = asyncHandler(async (req, res) => {
    const role = req.user.effectiveRole;
    
    // Role validation: Admin/Manager only
    if (!['admin', 'manager'].includes(role)) {
      throw new ForbiddenError('Only Admin and Manager can create events');
    }

    // Multi-tenant security: Force hotelId from token for non-admin users
    let finalHotelId = req.body.hotelId;

    if (role !== 'admin') {
      finalHotelId = req.user.hotelId;
    }

    // Admin validation: hotelId is required
    if (role === 'admin' && !finalHotelId) {
      throw new BadRequestError('Hotel ID is required');
    }

    // Override hotelId in request body
    req.body.hotelId = finalHotelId;

    const event = await EventService.create(req.body, req.user.userId);
    
    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });
  });

  static getAll = asyncHandler(async (req, res) => {
    const { from, to, page = 1, limit = 20 } = req.query;
    const role = req.user.effectiveRole;

    // Derive hotelId securely
    let finalHotelId;

    if (role === 'admin') {
      finalHotelId = req.query.hotelId;
      if (!finalHotelId) {
        throw new BadRequestError('Hotel ID is required for admin');
      }
    } else {
      finalHotelId = req.user.hotelId;
    }

    // Validate dates
    if (!from || !to) {
      throw new BadRequestError('from and to dates are required');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestError('Invalid date format');
    }

    if (fromDate > toDate) {
      throw new BadRequestError('from date must be before to date');
    }

    // Max 90 days validation
    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      throw new BadRequestError('Date range cannot exceed 90 days');
    }

    // Call service
    const result = await EventService.getAll({
      hotelId: finalHotelId,
      from: fromDate,
      to: toDate,
      page: Number(page),
      limit: Number(limit),
      userId: req.user.userId,
      userRole: role
    });

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: Number(page),
      limit: Number(limit)
    });
  });

  static getById = asyncHandler(async (req, res) => {
    const event = await EventService.getById(req.params.id, req.user);
    
    res.json({
      success: true,
      data: event
    });
  });

  static update = asyncHandler(async (req, res) => {
    const role = req.user.effectiveRole;
    
    // Role validation: Admin/Manager only
    if (!['admin', 'manager'].includes(role)) {
      throw new ForbiddenError('Only Admin and Manager can update events');
    }

    const event = await EventService.update(req.params.id, req.body, req.user);
    
    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully'
    });
  });

  static delete = asyncHandler(async (req, res) => {
    const role = req.user.effectiveRole;
    
    // Role validation: Admin/Manager only
    if (!['admin', 'manager'].includes(role)) {
      throw new ForbiddenError('Only Admin and Manager can delete events');
    }

    await EventService.delete(req.params.id, req.user);
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  });
}

export default EventController;
