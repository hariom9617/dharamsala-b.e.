// src/booking/booking.service.js
import mongoose from "mongoose";
import Booking from "../../model/booking.js";
import Room from "../../model/room.js";
import Guest from "../../model/guest.js";
import Hotel from "../../model/hotel.js";
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
  ForbiddenError
} from "../../utils/errors.js";

class BookingService {

  static calculatePricing(checkIn, checkOut, pricePerDay) {
    const hours = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60));
    if (hours <= 0) throw new BadRequestError("Invalid booking duration");
    const days = Math.ceil(hours / 24);
    return {
      durationHours: hours,
      durationDays: days,
      pricePerDay,
      totalAmount: days * pricePerDay
    };
  }

  static async getAvailableRoomIds(hotelId, roomType, checkIn, checkOut) {
    const overlappingRoomIds = await Booking.find({
      hotelId,
      status: { $in: ["confirmed", "checked-in"] },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn }
    }).distinct("roomId");

    const filter = {
      hotelId,
      status: { $in: ["available", "cleaning"] },
      _id: { $nin: overlappingRoomIds }
    };

    if (roomType && roomType !== "all") {
      filter.category = roomType;
    }

    const rooms = await Room.find(filter).sort({ roomNumber: 1 });

    return rooms;
  }

  static async autoAssignRoom(hotelId, roomType, checkIn, checkOut) {
    const rooms = await this.getAvailableRoomIds(
      hotelId,
      roomType,
      checkIn,
      checkOut
    );

    if (!rooms.length) {
      throw new ConflictError("No available rooms in selected category");
    }

    return rooms.sort((a,b) => a.roomNumber - b.roomNumber)[0];
  }

  static async createGuestBooking(payload, user) {
    const { roomType, checkIn, checkOut, specialRequests } = payload;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    // Enhanced date validation
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError("Invalid booking dates");
    }
    if (end <= start) {
      throw new BadRequestError("Invalid booking dates: Check-out must be after check-in");
    }

    // Use hotelId from user token for multi-tenant safety
    const hotelId = user.hotelId;
    if (!hotelId) throw new BadRequestError("User must belong to a hotel");

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) throw new NotFoundError("Hotel not found");

    const guest = await Guest.findById(user.userId);
    if (!guest) throw new NotFoundError("Guest not found");
    
    // Validate guest belongs to the hotel
    if (guest.hotelId.toString() !== hotelId.toString()) {
      throw new ForbiddenError("Guest does not belong to this hotel");
    }

    const room = await this.autoAssignRoom(hotelId, roomType, start, end);

    const pricing = this.calculatePricing(start, end, room.price);

    const booking = await Booking.create({
      hotelId,
      roomId: room._id,
      guestId: guest._id,
      guestName: guest.name,
      guestPhone: guest.phone,
      guestEmail: guest.email,
      roomNumber: room.roomNumber,
      roomType: room.category,
      roomCategory: room.category,
      checkIn: start,
      checkOut: end,
      status: "confirmed",
      ...pricing,
      specialRequests,
      createdBy: user.userId
    });

    return booking;
  }

  static async create(payload, userId) {
    const { guestId, hotelId, roomId, checkIn, checkOut, specialRequests } = payload;

    // Validate guest belongs to hotel
    const guest = await Guest.findOne({
      _id: guestId,
      hotelId: hotelId
    });
    if (!guest) throw new NotFoundError("Guest not found");

    const room = await Room.findById(roomId);
    if (!room) throw new NotFoundError("Room not found");

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (end <= start) throw new BadRequestError("Invalid dates");

    const overlap = await Booking.findOne({
      roomId,
      status: { $in: ["confirmed", "checked-in"] },
      checkIn: { $lt: end },
      checkOut: { $gt: start }
    });

    if (overlap) throw new ConflictError("Room already booked");

    const pricing = this.calculatePricing(start, end, room.price);

    const booking = await Booking.create({
      hotelId,
      roomId,
      guestId,
      guestName: guest.name,
      guestPhone: guest.phone,
      guestEmail: guest.email,
      roomNumber: room.roomNumber,
      roomType: room.category,
      roomCategory: room.category,
      checkIn: start,
      checkOut: end,
      status: "confirmed",
      ...pricing,
      specialRequests,
      createdBy: userId
    });

    return booking;
  }

  static async getGuestBookings(guestId, query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const skip = (page - 1) * limit;

    const filter = { guestId };

    const [data, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("hotelId", "name city")
        .populate("roomId", "roomNumber category")
        .lean(),
      Booking.countDocuments(filter)
    ]);

    return { data, total };
  }

  static async getAll(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Hotel filtering (required for multi-tenant security)
    if (query.hotelId) filter.hotelId = query.hotelId;

    // Date range filtering for calendar integration
    if (query.from && query.to) {
      const fromDate = new Date(query.from);
      const toDate = new Date(query.to);
      
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        filter.$or = [
          { checkIn: { $gte: fromDate, $lte: toDate } },
          { checkOut: { $gte: fromDate, $lte: toDate } }
        ];
      }
    }

    // Exclude cancelled bookings
    filter.status = { $ne: 'cancelled' };

    // Additional filters
    if (query.status) filter.status = query.status;
    if (query.guestId) filter.guestId = query.guestId;
    if (query.roomId) filter.roomId = query.roomId;

    const [data, total] = await Promise.all([
      Booking.find(filter)
        .populate('guestId', 'name email phone')
        .populate('roomId', 'roomNumber type')
        .sort({ checkIn: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter)
    ]);

    return { data, total, page, limit };
  }

  static async getById(id) {
    const booking = await Booking.findById(id);
    if (!booking) throw new NotFoundError("Booking not found");
    return booking;
  }

  static async update(id, payload, userId) {
    const booking = await Booking.findByIdAndUpdate(
      id,
      { ...payload, updatedBy: userId },
      { new: true }
    );
    if (!booking) throw new NotFoundError("Booking not found");
    return booking;
  }

  static async checkInWithRoomUpdate(id, userId) {
    const booking = await Booking.findById(id);
    if (!booking) throw new NotFoundError("Booking not found");
    booking.status = "checked-in";
    booking.updatedBy = userId;
    await booking.save();
    return booking;
  }

  static async checkOutWithCalculation(id, userId) {
    const booking = await Booking.findById(id);
    if (!booking) throw new NotFoundError("Booking not found");
    booking.status = "checked-out";
    booking.updatedBy = userId;
    await booking.save();
    return booking;
  }

  static async cancel(id, payload, userId) {
    const booking = await Booking.findById(id);
    if (!booking) throw new NotFoundError("Booking not found");
    booking.status = "cancelled";
    booking.updatedBy = userId;
    await booking.save();
    return booking;
  }
}

export default BookingService;