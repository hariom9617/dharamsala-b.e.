import Guest from '../../model/guest.js';
import Booking from '../../model/booking.js';
import Hotel from '../../model/hotel.js';
import mongoose from 'mongoose';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../utils/errors.js';

const sanitizeGuest = (guest) => {
  if (!guest) return guest;
  const { userId, countryCode, id, __v, ...clean } = guest;
  return clean;
};

const maskGuestForStaff = (guest, booking) => ({
  _id: guest._id,
  name: guest.name,
  roomNumber: booking?.roomNumber || null,
  checkIn: booking?.checkIn || null,
  checkOut: booking?.checkOut || null,
  status: booking?.status || null
});

class GuestService {
  static async selfRegister(data) {
    const { phone, name, email, idType, idNumber, address, hotelId } = data;

    if (!phone) throw new BadRequestError('Phone number is required');

    let finalHotelId = hotelId;

    if (!finalHotelId) {
      const defaultHotel = await Hotel.findOne().lean();
      if (!defaultHotel) {
        throw new BadRequestError('Hotel ID is required');
      }
      finalHotelId = defaultHotel._id;
    }

    const hotel = await Hotel.findById(finalHotelId);
    if (!hotel) throw new BadRequestError('Invalid hotel');

    let guest = await Guest.findOne({ phone, hotelId: finalHotelId });

    if (guest) {
      if (name) guest.name = name;
      if (email) guest.email = email;
      if (idType) guest.idType = idType;
      if (idNumber) guest.idNumber = idNumber;
      if (address) guest.address = address;
      guest.registrationType = 'self';
      await guest.save();
      return sanitizeGuest(guest.toObject());
    }

    guest = await Guest.create({
      phone,
      name: name || `Guest-${phone.slice(-4)}`,
      email,
      idType,
      idNumber,
      address,
      hotelId: finalHotelId,
      registrationType: 'self'
    });

    guest.createdBy = guest._id;
    await guest.save();

    return sanitizeGuest(guest.toObject());
  }

  static async createWalkIn(data, creator) {
    if (!creator?.hotelId) throw new Error('Creator must belong to a hotel');

    const { phone, name, email, idType, idNumber, address } = data;
    if (!phone) throw new Error('Phone number is required');

    let guest = await Guest.findOne({ phone });

    if (guest) {
      guest.hotelId ||= creator.hotelId;
      guest.registrationType = 'walk-in';
      guest.createdBy ||= creator.id;
      if (name) guest.name = name;
      if (email) guest.email = email;
      if (idType) guest.idType = idType;
      if (idNumber) guest.idNumber = idNumber;
      if (address) guest.address = address;
      await guest.save();
      return sanitizeGuest(guest.toObject());
    }

    const created = await Guest.create({
      phone,
      name: name || `Guest-${phone.slice(-4)}`,
      email,
      idType,
      idNumber,
      address,
      hotelId: creator.hotelId,
      registrationType: 'walk-in',
      createdBy: creator.id
    });

    return sanitizeGuest(created.toObject());
  }

  static async getAll({ hotelId, search, page = 1, limit = 20, assignedRoomIds, requesterRole }) {
    const filter = {};
    if (hotelId) filter.hotelId = new mongoose.Types.ObjectId(hotelId);

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    if (requesterRole === 'staff' && assignedRoomIds?.length) {
      const bookings = await Booking.find({
        roomId: { $in: assignedRoomIds },
        status: { $in: ['confirmed', 'checked-in'] }
      }).lean();

      const guestIds = [...new Set(bookings.map(b => b.guestId.toString()))];
      if (!guestIds.length) return { data: [], total: 0 };

      filter._id = { $in: guestIds.map(id => new mongoose.Types.ObjectId(id)) };

      const [guests, total] = await Promise.all([
        Guest.find(filter).skip(skip).limit(Number(limit)).lean(),
        Guest.countDocuments(filter)
      ]);

      const bookingMap = {};
      bookings.forEach(b => bookingMap[b.guestId.toString()] = b);

      return {
        data: guests.map(g => maskGuestForStaff(g, bookingMap[g._id.toString()])),
        total
      };
    }

    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'guestId',
          as: 'bookings'
        }
      },
      {
        $addFields: {
          totalBookings: { $size: '$bookings' },
          lastBookingDate: { $max: '$bookings.checkIn' }
        }
      },
      { $project: { bookings: 0 } },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'staff',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          pipeline: [{ $project: { name: 1, role: 1 } }]
        }
      },
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
    ];

    const [result, total] = await Promise.all([
      Guest.aggregate(pipeline),
      Guest.countDocuments(filter)
    ]);

    return { data: result.map(sanitizeGuest), total };
  }

  static async getById(id, requester) {
    const guest = await Guest.findById(id).populate('createdBy', 'name role').lean();
    if (!guest) throw new NotFoundError('Guest not found');

    if (!requester) return sanitizeGuest(guest);

    const role = requester.effectiveRole;

    if (role === 'admin') return sanitizeGuest(guest);

    if (['director', 'manager'].includes(role)) {
      const guestHotelId = guest.hotelId?._id?.toString() || guest.hotelId?.toString();
      const requesterHotelId = requester.hotelId?._id?.toString() || requester.hotelId?.toString();
      if (guestHotelId !== requesterHotelId) {
        throw new ForbiddenError('Access denied');
      }
      return sanitizeGuest(guest);
    }

    if (role === 'staff') {
      const booking = await Booking.findOne({
        guestId: id,
        roomId: { $in: requester.assignedRoomIds || [] },
        status: { $in: ['confirmed', 'checked-in'] }
      }).lean();

      if (!booking) return sanitizeGuest(guest);

      const roomId = booking.roomId?._id?.toString() || booking.roomId?.toString();
      if (!requester.assignedRoomIds?.includes(roomId)) {
        throw new ForbiddenError('Access denied');
      }
    }

    return sanitizeGuest(guest);
  }

  static async getCurrentBooking(guestId, requester) {
    const booking = await Booking.findOne({
      guestId,
      status: { $in: ['confirmed', 'checked-in'] }
    })
      .sort({ checkIn: -1 })
      .populate('hotelId', 'name')
      .populate('roomId', 'roomNumber type')
      .lean();

    if (!booking) return null;

    if (requester?.effectiveRole === 'staff') {
      const roomId = booking.roomId?._id?.toString() || booking.roomId?.toString();
      if (!requester.assignedRoomIds?.includes(roomId)) {
        throw new ForbiddenError('Access denied');
      }
    }

    if (['director', 'manager'].includes(requester?.effectiveRole)) {
      const bookingHotelId = booking.hotelId?._id?.toString() || booking.hotelId?.toString();
      const requesterHotelId = requester.hotelId?._id?.toString() || requester.hotelId?.toString();
      if (bookingHotelId !== requesterHotelId) {
        throw new ForbiddenError('Access denied');
      }
    }

    return booking;
  }

  static async update(id, data) {
    const guest = await Guest.findByIdAndUpdate(id, data, { new: true });
    if (!guest) throw new NotFoundError('Guest not found');
    return sanitizeGuest(guest.toObject());
  }
}

export default GuestService;
