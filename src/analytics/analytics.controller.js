// src/analytics/controller.js
import * as analyticsService from './analytics.service.js';
import { BadRequestError, ForbiddenError } from '../../utils/errors.js';

export default class AnalyticsController {

  static async getDashboard(req, res, next) {
    try {
      const { startDate, endDate, hotelId } = req.query;
      const { role, managedHotels, hotelId: userHotelId } = req.user;

      let data;

      switch (role) {

        /* ===================== ADMIN ===================== */
        case 'admin': {

          // If specific hotel requested → show only that hotel
          if (hotelId) {
            data = await analyticsService.getManagerAnalytics(
              hotelId,
              startDate,
              endDate
            );
          } else {
            // All hotels
            data = await analyticsService.getAdminAnalytics(
              startDate,
              endDate
            );
          }

          break;
        }

        /* ===================== DIRECTOR ===================== */
        case 'director': {

          const directorHotels = managedHotels || [];

          if (!directorHotels.length) {
            throw new BadRequestError('No hotels assigned to this director');
          }

          // If specific hotel requested
          if (hotelId) {

            // Must belong to director
            if (!directorHotels.map(id => id.toString()).includes(hotelId)) {
              throw new ForbiddenError('Access denied to this hotel');
            }

            data = await analyticsService.getManagerAnalytics(
              hotelId,
              startDate,
              endDate
            );

          } else {

            // All assigned hotels combined
            data = await analyticsService.getDirectorAnalytics(
              directorHotels,
              startDate,
              endDate
            );
          }

          break;
        }

        /* ===================== MANAGER ===================== */
        case 'manager': {

          if (!userHotelId) {
            throw new BadRequestError('No hotel assigned to this manager');
          }

          // Manager cannot access other hotels
          if (hotelId && hotelId !== userHotelId.toString()) {
            throw new ForbiddenError(
              'Managers can only view their assigned hotel'
            );
          }

          data = await analyticsService.getManagerAnalytics(
            userHotelId,
            startDate,
            endDate
          );

          break;
        }

        default:
          throw new ForbiddenError(
            'Access denied: Analytics not available for your role'
          );
      }

      return res.status(200).json({
        success: true,
        data
      });

    } catch (error) {
      next(error);
    }
  }

  static async getHotelAnalytics(req, res, next) {
    try {
      const { hotelId } = req.params;
      const { startDate, endDate } = req.query;
      const { role, managedHotels, hotelId: userHotelId } = req.user;

      // Admin can view any hotel
      if (role === 'admin') {
        const data = await analyticsService.getManagerAnalytics(
          hotelId,
          startDate,
          endDate
        );
        return res.json({ success: true, data });
      }

      // Director must own hotel
      if (role === 'director') {
        if (!managedHotels?.map(id => id.toString()).includes(hotelId)) {
          throw new ForbiddenError('Access denied to this hotel');
        }

        const data = await analyticsService.getManagerAnalytics(
          hotelId,
          startDate,
          endDate
        );

        return res.json({ success: true, data });
      }

      // Manager must match hotel
      if (role === 'manager') {
        if (userHotelId?.toString() !== hotelId) {
          throw new ForbiddenError(
            'Managers can only access their assigned hotel'
          );
        }

        const data = await analyticsService.getManagerAnalytics(
          hotelId,
          startDate,
          endDate
        );

        return res.json({ success: true, data });
      }

      throw new ForbiddenError('Access denied');

    } catch (error) {
      next(error);
    }
  }
}