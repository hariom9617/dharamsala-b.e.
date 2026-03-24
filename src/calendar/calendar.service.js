// src/calendar/calendar.service.js
import Booking from '../../model/booking.js';
import HousekeepingTask from '../../model/housekeepingTask.js';
import Event from '../../model/event.js';
import Room from '../../model/room.js';
import Guest from '../../model/guest.js';
import { BadRequestError } from '../../utils/errors.js';

// Helper: Transform booking to calendar events
const transformBookingToCalendarEvents = (booking) => {
  const events = [];
  
  // Check-in event
  if (booking.checkIn) {
    events.push({
      id: `${booking._id}_checkin`,
      type: 'checkin',
      title: `Guest Check-in - Room ${booking.roomNumber || 'N/A'}`,
      subtitle: `${booking.guestName || 'Guest'} - ${booking.nights || 0} nights`,
      hotelId: booking.hotelId,
      roomId: booking.roomId,
      roomNumber: booking.roomNumber,
      start: booking.checkIn,
      end: null,
      status: booking.status,
      meta: {
        bookingId: booking._id,
        guestId: booking.guestId,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount
      }
    });
  }

  // Check-out event
  if (booking.checkOut) {
    events.push({
      id: `${booking._id}_checkout`,
      type: 'checkout',
      title: `Guest Check-out - Room ${booking.roomNumber || 'N/A'}`,
      subtitle: booking.guestName || 'Guest',
      hotelId: booking.hotelId,
      roomId: booking.roomId,
      roomNumber: booking.roomNumber,
      start: booking.checkOut,
      end: null,
      status: booking.status,
      meta: {
        bookingId: booking._id
      }
    });
  }

  return events;
};

// Helper: Transform housekeeping to calendar event
const transformHousekeepingToCalendarEvent = (task) => {
  return {
    id: `hk_${task._id}`,
    type: task.type || 'maintenance',
    title: `Room ${task.roomNumber || 'N/A'} ${task.type || 'Maintenance'}`,
    subtitle: task.description || task.title || 'Scheduled task',
    hotelId: task.hotelId,
    roomId: task.roomId,
    roomNumber: task.roomNumber,
    start: task.scheduledAt,
    end: task.completedAt || null,
    status: task.status,
    priority: task.priority,
    meta: {
      taskId: task._id,
      assignedTo: task.assignedTo,
      estimatedDuration: task.estimatedDuration
    }
  };
};

// Helper: Transform event to calendar event
const transformEventToCalendarEvent = (event) => {
  return {
    id: `evt_${event._id}`,
    type: event.type || 'meeting',
    title: event.title,
    subtitle: event.description || event.subtitle || '',
    hotelId: event.hotelId,
    roomId: event.roomId,
    roomNumber: event.roomNumber,
    start: event.startTime,
    end: event.endTime,
    status: event.status,
    priority: event.priority,
    meta: {
      eventId: event._id,
      createdBy: event.createdBy,
      attendees: event.attendees,
      location: event.location
    }
  };
};

// Helper: Group events by date (optional enhancement)
const groupEventsByDate = (events) => {
  const grouped = {};
  
  events.forEach(event => {
    const date = new Date(event.start).toISOString().split('T')[0];
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(event);
  });

  return grouped;
};

// Main calendar data aggregation
export const getCalendarData = async ({ hotelId, from, to, includeTypes, accessLevel, userId, userRole, userHotelId, assignedRoomIds }) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Prepare parallel queries
  const queries = [];

  // Bookings query
  if (includeTypes.includes('bookings')) {
    const bookingQuery = {
      hotelId,
      $or: [
        { checkIn: { $gte: fromDate, $lte: toDate } },
        { checkOut: { $gte: fromDate, $lte: toDate } }
      ],
      status: { $ne: 'cancelled' }
    };

    // Staff access: only bookings for their assigned rooms
    if (accessLevel === 'limited' && assignedRoomIds.length > 0) {
      bookingQuery.roomId = { $in: assignedRoomIds };
    }

    queries.push(
      Booking.find(bookingQuery)
        .populate('guestId', 'name email phone')
        .populate('roomId', 'roomNumber')
        .lean()
    );
  }

  // Housekeeping query
  if (includeTypes.includes('housekeeping')) {
    const housekeepingQuery = {
      hotelId,
      scheduledAt: { $gte: fromDate, $lte: toDate }
    };

    // Staff access: only their assigned tasks
    if (accessLevel === 'limited') {
      housekeepingQuery.assignedTo = userId;
    }

    queries.push(
      HousekeepingTask.find(housekeepingQuery)
        .populate('roomId', 'roomNumber')
        .populate('assignedTo', 'name email')
        .lean()
    );
  }

  // Events query
  if (includeTypes.includes('events')) {
    const eventQuery = {
      hotelId,
      startTime: { $gte: fromDate, $lte: toDate }
    };

    // Staff access: only events they're invited to or created
    if (accessLevel === 'limited') {
      eventQuery.$or = [
        { createdBy: userId },
        { 'attendees.userId': userId }
      ];
    }

    queries.push(
      Event.find(eventQuery)
        .populate('createdBy', 'name email')
        .populate('attendees.userId', 'name email')
        .lean()
    );
  }

  // Execute all queries in parallel
  const results = await Promise.all(queries);

  // Transform results into calendar events
  const calendarEvents = [];
  let summary = {
    totalBookings: 0,
    totalCheckIns: 0,
    totalCheckOuts: 0,
    totalHousekeepingTasks: 0,
    totalEvents: 0
  };

  // Process bookings
  if (includeTypes.includes('bookings') && results[0]) {
    const bookings = results.shift();
    summary.totalBookings = bookings.length;
    
    bookings.forEach(booking => {
      const events = transformBookingToCalendarEvents(booking);
      calendarEvents.push(...events);
      
      // Count check-ins and check-outs
      if (booking.checkIn && booking.checkIn >= fromDate && booking.checkIn <= toDate) {
        summary.totalCheckIns++;
      }
      if (booking.checkOut && booking.checkOut >= fromDate && booking.checkOut <= toDate) {
        summary.totalCheckOuts++;
      }
    });
  }

  // Process housekeeping
  if (includeTypes.includes('housekeeping') && results[0]) {
    const housekeepingTasks = results.shift();
    summary.totalHousekeepingTasks = housekeepingTasks.length;
    
    housekeepingTasks.forEach(task => {
      const event = transformHousekeepingToCalendarEvent(task);
      calendarEvents.push(event);
    });
  }

  // Process events
  if (includeTypes.includes('events') && results[0]) {
    const events = results.shift();
    summary.totalEvents = events.length;
    
    events.forEach(event => {
      const calendarEvent = transformEventToCalendarEvent(event);
      calendarEvents.push(calendarEvent);
    });
  }

  // Sort calendar events by start time
  calendarEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

  // Optional: Group by date (can be added as query parameter)
  // const groupByDate = groupEventsByDate(calendarEvents);

  return {
    summary,
    calendar: calendarEvents
    // groupByDate // Optional enhancement
  };
};
