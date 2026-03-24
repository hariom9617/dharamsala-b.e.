import Room from "../../model/room.js";
import Hotel from "../../model/hotel.js";
import mongoose from "mongoose";
import BookingService from "../booking/booking.service.js";
import { ConflictError } from "../../utils/errors.js";

class RoomService {
  static async createRoom(payload, user) {
    const hotel = await Hotel.findById(payload.hotelId);
    if (!hotel || hotel.status !== "active") {
      throw new Error("Invalid or inactive hotel");
    }

    const existingRoom = await Room.findOne({ hotelId: payload.hotelId, roomNumber: payload.roomNumber });
    if (existingRoom) {
      throw new ConflictError("Room number already exists in this hotel");
    }

    // Validate category and customCategoryLabel
    if (payload.category === "other" && !payload.customCategoryLabel) {
      throw new Error("customCategoryLabel is required when category is 'other'");
    }

    if (payload.category !== "other" && payload.customCategoryLabel) {
      throw new Error("customCategoryLabel should only be set when category is 'other'");
    }

    return Room.create({
      ...payload,
      createdBy: user.id
    });
  }


  static async bulkCreateRooms(hotelId, roomConfigs, user) {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel || hotel.status !== "active") {
      throw new Error("Invalid or inactive hotel");
    }

    const roomsToCreate = [];
    let roomCounter = 1;

    for (const config of roomConfigs) {
      const { category, count, amenities, price, maxOccupancy, customCategoryLabel } = config;

      // Validate category
      if (!["deluxe", "premium", "suite", "other"].includes(category)) {
        throw new Error(`Invalid category: ${category}`);
      }

      // Validate customCategoryLabel for "other" category
      if (category === "other" && !customCategoryLabel) {
        throw new Error("customCategoryLabel is required when category is 'other'");
      }

      if (category !== "other" && customCategoryLabel) {
        throw new Error("customCategoryLabel should only be set when category is 'other'");
      }

      // Validate required fields
      if (!count || count < 1) {
        throw new Error(`Invalid count for category ${category}`);
      }

      if (!price || price < 0) {
        throw new Error(`Invalid price for category ${category}`);
      }

      if (!maxOccupancy || maxOccupancy < 1) {
        throw new Error(`Invalid maxOccupancy for category ${category}`);
      }

      // Generate individual room documents
      for (let i = 0; i < count; i++) {
        const floor = Math.floor((roomCounter - 1) / 10) + 1; // 10 rooms per floor
        const roomIndexOnFloor = ((roomCounter - 1) % 10) + 1;

        const roomNumber = `${floor}${String(roomIndexOnFloor).padStart(2, "0")}`;


        const roomDoc = {
          hotelId,
          roomNumber,
          category,
          floor,
          amenities: amenities || [],
          price,
          maxOccupancy,
          status: "available",
          createdBy: user.id
        };

        // Add customCategoryLabel only if category is "other"
        if (category === "other") {
          roomDoc.customCategoryLabel = customCategoryLabel;
        }

        roomsToCreate.push(roomDoc);
        roomCounter++;
      }
    }

    // Bulk insert all rooms
    const createdRooms = await Room.insertMany(roomsToCreate);
    return createdRooms;
  }

  static async getRooms(query, user) {
    const {
      hotelId,
      status,
      category,
      amenities,
      page = 1,
      limit = 50,
      sortBy = "floor",
      sortOrder = "asc"
    } = query;

    if (!hotelId) throw new Error("hotelId is required");

    const filter = { hotelId };

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (amenities) filter.amenities = { $all: amenities.split(",") };

    const skip = (page - 1) * limit;

    //  SAFE SORT MAP (prevents injection)
    const allowedSortFields = {
      floor: "floor",
      roomNumber: "roomNumber",
      price: "price",
      status: "status",
      createdAt: "createdAt"
    };

    const sortField = allowedSortFields[sortBy] || "floor";
    const sortDirection = sortOrder === "desc" ? -1 : 1;

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .sort({ [sortField]: sortDirection, roomNumber: 1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: 'currentBooking.bookingId',
          select: 'id',
          populate: {
            path: 'guestId',
            select: 'name phone email id'
          }
        })
        .lean(),
      Room.countDocuments(filter)
    ]);

    return {
      data: rooms,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getRoomById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid room id");
    }

    const room = await Room.findById(id).populate("hotelId", "name status");
    if (!room) throw new Error("Room not found");

    return room;
  }

  static async updateRoom(id, payload, user) {
    const room = await Room.findByIdAndUpdate(
      id,
      { ...payload, updatedBy: user.id },
      { new: true }
    );

    if (!room) throw new Error("Room not found");
    return room;
  }

  static async updateStatus(id, status, bookingData, user) {
    const room = await Room.findById(id);
    if (!room) throw new Error("Room not found");

    room.status = status;
    room.currentBooking = status === "occupied" ? bookingData : null;
    room.updatedBy = user.id;

    await room.save();
    return room;
  }

  static async deleteRoom(id) {
    const room = await Room.findById(id);
    if (!room) throw new Error("Room not found");

    await room.deleteOne();
    return true;
  }

  static async getTotalRoomsCount(hotelId) {
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      throw new Error("Invalid hotel id");
    }

    return Room.countDocuments({ hotelId });
  }

  static async getRoomsByCategory(hotelId) {
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      throw new Error("Invalid hotel id");
    }

    const aggregation = await Room.aggregate([
      {
        $match: {
          hotelId: new mongoose.Types.ObjectId(hotelId)
        }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          availableCount: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] }
          },
          occupiedCount: {
            $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] }
          },
          maintenanceCount: {
            $sum: { $cond: [{ $eq: ["$status", "maintenance"] }, 1, 0] }
          },
          cleaningCount: {
            $sum: { $cond: [{ $eq: ["$status", "cleaning"] }, 1, 0] }
          },
          averagePrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          rooms: {
            $push: {
              _id: "$_id",
              roomNumber: "$roomNumber",
              status: "$status",
              price: "$price",
              amenities: "$amenities",
              customCategoryLabel: "$customCategoryLabel"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1,
          availableCount: 1,
          occupiedCount: 1,
          maintenanceCount: 1,
          cleaningCount: 1,
          averagePrice: { $round: ["$averagePrice", 2] },
          minPrice: 1,
          maxPrice: 1,
          rooms: 1
        }
      },
      {
        $sort: { category: 1 }
      }
    ]);

    return aggregation;
  }


  static async getRoomStatistics(hotelId) {
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      throw new Error("Invalid hotel id");
    }

    const [totalRooms, categoryBreakdown, statusBreakdown] = await Promise.all([
      Room.countDocuments({ hotelId }),
      Room.aggregate([
        { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 }
          }
        },
        { $project: { _id: 0, category: "$_id", count: 1 } },
        { $sort: { category: 1 } }
      ]),
      Room.aggregate([
        { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        },
        { $project: { _id: 0, status: "$_id", count: 1 } },
        { $sort: { status: 1 } }
      ])
    ]);

    return {
      totalRooms,
      byCategory: categoryBreakdown,
      byStatus: statusBreakdown
    };
  }
  static async getAvailableRoomsByDate({ checkIn, checkOut, hotelId, category }) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (start >= end) {
      throw new Error("checkOut must be after checkIn");
    }

    // Use SAME logic as booking API - single source of truth
    const rooms = await BookingService.getAvailableRoomIds(
      hotelId,
      category,
      start,
      end
    );

    return rooms;
  }

}

export default RoomService;