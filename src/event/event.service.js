import Event from '../../model/event.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';

class EventService {
  static async create(data, userId) {
    const { hotelId, title, description, type, startTime, endTime, location, roomId, attendees } = data;

    // Validation
    if (!hotelId) throw new BadRequestError('Hotel ID is required');
    if (!title) throw new BadRequestError('Title is required');
    if (!startTime) throw new BadRequestError('Start time is required');

    const start = new Date(startTime);
    if (isNaN(start.getTime())) throw new BadRequestError('Invalid start time format');

    if (endTime) {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) throw new BadRequestError('Invalid end time format');
      if (start > end) throw new BadRequestError('Start time must be before end time');
    }

    const event = await Event.create({
      hotelId,
      title,
      description,
      type: type || 'meeting',
      startTime: start,
      endTime: endTime ? new Date(endTime) : null,
      location,
      roomId,
      attendees: attendees || [],
      createdBy: userId
    });

    return event;
  }

  static async getAll({ hotelId, from, to, page, limit, userId, userRole }) {
    // const query = {
    //   hotelId,
    //   startTime: { $gte: from, $lte: to }
    // };
    const query = {
      hotelId,
      startTime: { $lte: to },
      $or: [
        { endTime: null },
        { endTime: { $gte: from } }
      ]
    };

    // Staff access: only events they're invited to or created
    if (userRole === 'staff') {
      query.$or = [
        { createdBy: userId },
        { 'attendees.userId': userId }
      ];
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('createdBy', 'name email')
        .populate('attendees.userId', 'name email')
        .populate('roomId', 'roomNumber')
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query)
    ]);

    return { data: events, total };
  }

  static async getById(id, user) {
    const event = await Event.findById(id)
      .populate('createdBy', 'name email')
      .populate('attendees.userId', 'name email')
      .populate('roomId', 'roomNumber')
      .lean();

    if (!event) throw new NotFoundError('Event not found');

    // Multi-tenant security
    const role = user.effectiveRole;
    if (role !== 'admin' && user.hotelId !== event.hotelId.toString()) {
      throw new ForbiddenError('Access denied');
    }

    // Staff access: only if they're invited or created it
    if (role === 'staff') {
      const isCreator = event.createdBy._id.toString() === user.userId.toString();
      const isInvited = event.attendees.some(att => 
        att.userId && att.userId._id.toString() === user.userId.toString()
      );

      if (!isCreator && !isInvited) {
        throw new ForbiddenError('Access denied');
      }
    }

    return event;
  }

  static async update(id, data, user) {
    const event = await Event.findById(id);
    if (!event) throw new NotFoundError('Event not found');

    // Multi-tenant security
    const role = user.effectiveRole;
    if (role !== 'admin' && user.hotelId !== event.hotelId.toString()) {
      throw new ForbiddenError('Access denied');
    }

    // Validation for time updates
    if (data.startTime) {
      const start = new Date(data.startTime);
      if (isNaN(start.getTime())) throw new BadRequestError('Invalid start time format');

      if (data.endTime) {
        const end = new Date(data.endTime);
        if (isNaN(end.getTime())) throw new BadRequestError('Invalid end time format');
        if (start > end) throw new BadRequestError('Start time must be before end time');
      }
    }

    Object.assign(event, data);
    await event.save();

    return event;
  }

  static async delete(id, user) {
    const event = await Event.findById(id);
    if (!event) throw new NotFoundError('Event not found');

    // Multi-tenant security
    const role = user.effectiveRole;
    if (role !== 'admin' && user.hotelId !== event.hotelId.toString()) {
      throw new ForbiddenError('Access denied');
    }

    await Event.findByIdAndDelete(id);
  }
}

export default EventService;
