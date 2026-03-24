import hotelService from "./hotel.service.js";
import { ForbiddenError } from "../../utils/errors.js";


class HotelController {
  /* ─── CREATE ─── */
  async createHotel(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Only admin and director can create hotels
      if (!['admin', 'director'].includes(role)) {
        throw new ForbiddenError('Only Admin and Director can create hotels');
      }

      // const hotel = await hotelService.createHotel(req.user.id, req.body);
      const hotel = await hotelService.createHotel(req.user.userId, req.body);
      res.status(201).json({ success: true, data: hotel });
    } catch (error) {
      next(error);
    }
  }

  /* ─── LIST ─── */
  async getHotels(req, res, next) {
    try {
      const role = req.user.effectiveRole;
      const query = { ...req.query };

      // Staff and Guest cannot access hotels API
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have access to hotels');
      }

      // Manager cannot view hotel list globally - must use getHotel endpoint
      if (role === 'manager') {
        // Return only their assigned hotel as a single-item list
        if (!req.user.hotelId) {
          return res.json({
            success: true,
            data: [],
            pagination: { total: 0, page: 1, limit: 10, pages: 0 }
          });
        }
        query.hotelId = req.user.hotelId.toString();
      }

      // Director can only see their own hotel(s)
      if (role === 'director') {
        query.hotelId = req.user.hotelId?.toString();
      }

      // Admin sees all hotels (no filter)

      const result = await hotelService.getAllHotels(query);
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /* ─── DETAIL ─── */
  async getHotel(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot access hotels API
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have access to hotels');
      }

      // Director and Manager can only fetch their own hotel
      if (['director', 'manager'].includes(role)) {
        if (req.params.id !== req.user.hotelId?.toString()) {
          throw new ForbiddenError('Access denied: You can only view your assigned hotel');
        }
      }

      const hotel = await hotelService.getHotelById(req.params.id);
      res.json({ success: true, data: hotel });
    } catch (error) {
      next(error);
    }
  }

  /* ─── UPDATE ─── */
  async updateHotel(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff, Guest, and Manager cannot update hotels
      if (['staff', 'guest', 'manager'].includes(role)) {
        throw new ForbiddenError('You do not have permission to update hotels');
      }

      // Director can only update their own hotel
      if (role === 'director') {
        if (req.params.id !== req.user.hotelId?.toString()) {
          throw new ForbiddenError('Access denied: You can only update your assigned hotel');
        }
      }

      const hotel = await hotelService.updateHotel(req.params.id, req.body);
      res.json({ success: true, data: hotel });
    } catch (error) {
      next(error);
    }
  }

  /* ─── DELETE ─── */
  async deleteHotel(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff, Guest, and Manager cannot delete hotels
      if (['staff', 'guest', 'manager'].includes(role)) {
        throw new ForbiddenError('You do not have permission to delete hotels');
      }

      // Director can only delete their own hotel
      if (role === 'director') {
        if (req.params.id !== req.user.hotelId?.toString()) {
          throw new ForbiddenError('Access denied: You can only delete your assigned hotel');
        }
      }

      await hotelService.deleteHotel(req.params.id);
      res.json({ success: true, message: "Hotel and staff deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new HotelController();

