import RoomService from "./room.service.js";
import { ForbiddenError } from "../../utils/errors.js";

class RoomController {
  static async create(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Only Admin and Director can create rooms
      if (!['admin', 'director'].includes(role)) {
        throw new ForbiddenError('Only Admin and Director can create rooms');
      }

      // Director can only create rooms in their hotel
      if (role === 'director') {
        if (req.body.hotelId !== req.user.hotelId?.toString()) {
          throw new ForbiddenError('You can only create rooms in your assigned hotel');
        }
      }

      const room = await RoomService.createRoom(req.body, req.user);
      res.status(201).json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req, res, next) {
    try {
      const role = req.user.effectiveRole;
      const query = { ...req.query };

      // Staff and Guest cannot access room management
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have access to room management');
      }

      // Auto-scope to user's hotel for director/manager
      if (!query.hotelId) {
        if (['director', 'manager'].includes(role)) {
          query.hotelId = req.user.hotelId;
        }
      }

      // Director and Manager can only view their hotel's rooms
      if (['director', 'manager'].includes(role)) {
        if (query.hotelId && query.hotelId !== req.user.hotelId?.toString()) {
          throw new ForbiddenError('You can only view rooms of your assigned hotel');
        }
        query.hotelId = req.user.hotelId;
      }

      const result = await RoomService.getRooms(query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot access room management
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have access to room management');
      }

      const room = await RoomService.getRoomById(req.params.id);

      // Director and Manager can only view their hotel's rooms
      if (['director', 'manager'].includes(role)) {
        const roomHotelId = room.hotelId?._id?.toString() || room.hotelId?.toString();
        if (roomHotelId !== req.user.hotelId?.toString()) {
          throw new ForbiddenError('You can only view rooms of your assigned hotel');
        }
      }

      res.json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot update rooms
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have permission to update rooms');
      }

      // Get room to check hotel scope
      const existingRoom = await RoomService.getRoomById(req.params.id);
      const roomHotelId = existingRoom.hotelId?._id?.toString() || existingRoom.hotelId?.toString();

      // Director and Manager can only update their hotel's rooms
      if (['director', 'manager'].includes(role)) {
        if (roomHotelId !== req.user.hotelId?.toString()) {
          throw new ForbiddenError('You can only update rooms in your assigned hotel');
        }
      }

      // MANAGER RESTRICTIONS: Can only edit price, amenities, status
      // CANNOT change category, roomNumber, floor, maxOccupancy
      if (role === 'manager') {
        const allowedFields = ['price', 'amenities', 'status'];
        const requestedFields = Object.keys(req.body);
        const disallowedFields = requestedFields.filter(f => !allowedFields.includes(f));

        if (disallowedFields.length > 0) {
          throw new ForbiddenError(
            `Managers can only update: ${allowedFields.join(', ')}. ` +
            `Attempted to update: ${disallowedFields.join(', ')}`
          );
        }
      }

      // Admin and Director: Can update all fields
      const room = await RoomService.updateRoom(req.params.id, req.body, req.user);
      res.json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot update room status
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have permission to update room status');
      }

      // Get room to check hotel scope
      const existingRoom = await RoomService.getRoomById(req.params.id);
      const roomHotelId = existingRoom.hotelId?._id?.toString() || existingRoom.hotelId?.toString();

      // Director and Manager can only update their hotel's rooms
      if (['director', 'manager'].includes(role)) {
        if (roomHotelId !== req.user.hotelId?.toString()) {
          throw new ForbiddenError('You can only update rooms in your assigned hotel');
        }
      }

      const room = await RoomService.updateStatus(
        req.params.id,
        req.body.status,
        req.body.booking || null,
        req.user
      );
      res.json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Only Admin and Director can delete rooms
      if (!['admin', 'director'].includes(role)) {
        throw new ForbiddenError('Only Admin and Director can delete rooms');
      }

      // Director can only delete their hotel's rooms
      if (role === 'director') {
        const existingRoom = await RoomService.getRoomById(req.params.id);
        const roomHotelId = existingRoom.hotelId?._id?.toString() || existingRoom.hotelId?.toString();
        if (roomHotelId !== req.user.hotelId?.toString()) {
          throw new ForbiddenError('You can only delete rooms in your assigned hotel');
        }
      }

      await RoomService.deleteRoom(req.params.id);
      res.json({ success: true, message: 'Room deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  //   Get total rooms count for a hotel (dynamic calculation)
  static async getTotalRoomsCount(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot access room statistics
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have access to room statistics');
      }

      let hotelId = req.query.hotelId;

      // Auto-scope for director/manager
      if (!hotelId && ['director', 'manager'].includes(role)) {
        hotelId = req.user.hotelId?.toString();
      }

      if (!hotelId) {
        return res.status(400).json({
          success: false,
          message: "hotelId is required"
        });
      }

      // Enforce hotel scoping for director/manager
      if (['director', 'manager'].includes(role) && hotelId !== req.user.hotelId?.toString()) {
        throw new ForbiddenError('You can only view room statistics for your assigned hotel');
      }

      const totalRooms = await RoomService.getTotalRoomsCount(hotelId);
      res.json({ success: true, data: { hotelId, totalRooms } });
    } catch (err) {
      next(err);
    }
  }

  //   Get rooms grouped by category
  static async getRoomsByCategory(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot access room statistics
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have access to room statistics');
      }

      let hotelId = req.query.hotelId;

      // Auto-scope for director/manager
      if (!hotelId && ['director', 'manager'].includes(role)) {
        hotelId = req.user.hotelId?.toString();
      }

      if (!hotelId) {
        return res.status(400).json({
          success: false,
          message: "hotelId is required"
        });
      }

      // Enforce hotel scoping for director/manager
      if (['director', 'manager'].includes(role) && hotelId !== req.user.hotelId?.toString()) {
        throw new ForbiddenError('You can only view room statistics for your assigned hotel');
      }

      const categoryBreakdown = await RoomService.getRoomsByCategory(hotelId);
      res.json({ success: true, data: categoryBreakdown });
    } catch (err) {
      next(err);
    }
  }

  //   Get room statistics for a hotel   
  static async getRoomStatistics(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot access room statistics
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have access to room statistics');
      }

      let hotelId = req.query.hotelId;

      // Auto-scope for director/manager
      if (!hotelId && ['director', 'manager'].includes(role)) {
        hotelId = req.user.hotelId?.toString();
      }

      if (!hotelId) {
        return res.status(400).json({
          success: false,
          message: "hotelId is required"
        });
      }

      // Enforce hotel scoping for director/manager
      if (['director', 'manager'].includes(role) && hotelId !== req.user.hotelId?.toString()) {
        throw new ForbiddenError('You can only view room statistics for your assigned hotel');
      }

      const statistics = await RoomService.getRoomStatistics(hotelId);
      res.json({ success: true, data: statistics });
    } catch (err) {
      next(err);
    }
  }

  static async getAvailableRooms(req, res, next) {
    try {
      let { checkIn, checkOut, hotelId, category } = req.query;

      if (!checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: "checkIn and checkOut are required"
        });
      }

      // normalize category
      if (!category || category === "all") {
        category = undefined;
      }

      /**
       * 🔐 ROLE-BASED HOTEL SCOPING
       */
      if (req.user) {
        const role = req.user.effectiveRole;

        // Director & Manager can ONLY see their hotel
        if (['director', 'manager'].includes(role)) {
          hotelId = req.user.hotelId?.toString();
        }
      }

      const rooms = await RoomService.getAvailableRoomsByDate({
        checkIn,
        checkOut,
        hotelId,
        category
      });

      res.json({
        success: true,
        data: {
          availableCount: rooms.length,
          rooms: rooms.map(r => ({
            id: r.id,
            roomNumber: r.roomNumber,
            category: r.category,
            price: r.price,
            floor: r.floor,
            status: r.status,
            amenities: r.amenities
          }))
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export default RoomController;
