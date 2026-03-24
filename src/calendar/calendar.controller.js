// src/calendar/calendar.controller.js
import * as calendarService from './calendar.service.js';
import { BadRequestError, ForbiddenError } from '../../utils/errors.js';

export default class CalendarController {
  // Unified Calendar Endpoint
  static async getCalendar(req, res, next) {
    try {
      const { hotelId, from, to, include } = req.query;
      const role = req.user.effectiveRole;

      // Derive hotelId securely
      let finalHotelId;

      if (role === 'admin') {
        finalHotelId = hotelId;
        if (!finalHotelId) {
          throw new BadRequestError('Hotel ID is required for admin');
        }
      } else {
        finalHotelId = req.user.hotelId;
      }

      // Validate required parameters
      if (!finalHotelId) {
        throw new BadRequestError('hotelId is required');
      }

      if (!from || !to) {
        throw new BadRequestError('from and to dates are required');
      }

      // Validate date range
      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new BadRequestError('Invalid date format. Use ISO date format');
      }

      if (fromDate > toDate) {
        throw new BadRequestError('from date must be before or equal to to date');
      }

      // Validate date range (max 90 days for performance)
      const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        throw new BadRequestError('Date range cannot exceed 90 days');
      }

      // Parse include parameter
      const includeTypes = include ? include.split(',').map(type => type.trim()) : ['bookings', 'housekeeping', 'events'];
      const validTypes = ['bookings', 'housekeeping', 'events'];
      const invalidTypes = includeTypes.filter(type => !validTypes.includes(type));
      
      if (invalidTypes.length > 0) {
        throw new BadRequestError(`Invalid include types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`);
      }

      // Role-based access control
      let accessLevel = 'full';
      if (role === 'staff') {
        accessLevel = 'limited';
      } else if (role === 'guest') {
        throw new ForbiddenError('Guests do not have calendar access');
      }

      const data = await calendarService.getCalendarData({
        hotelId: finalHotelId,
        from,
        to,
        includeTypes,
        accessLevel,
        userId: req.user.userId,
        userRole: role,
        userHotelId: req.user.hotelId,
        assignedRoomIds: req.user.assignedRoomIds || []
      });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
