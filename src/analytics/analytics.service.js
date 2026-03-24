// src/analytics/analytics.service.js

import Booking from "../../model/booking.js";
import Hotel from "../../model/hotel.js";
import Room from "../../model/room.js";
import ServiceRequest from "../../model/serviceRequest.js";
import { NotFoundError } from "../../utils/errors.js";

const normalizeStart = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const normalizeEnd = (date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const resolveDateRange = (startDate, endDate) => {
  const now = new Date();

  if (!startDate && !endDate) {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = firstDay.toISOString().split("T")[0];
    endDate = now.toISOString().split("T")[0];
  }

  if (startDate && !endDate) {
    endDate = startDate;
  }

  return {
    start: normalizeStart(startDate),
    end: normalizeEnd(endDate),
  };
};

const generateDateRange = (start, end) => {
  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const getPreviousPeriod = (start, end) => {
  const diff = end - start;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - diff);

  return {
    start: normalizeStart(previousStart),
    end: normalizeEnd(previousEnd),
  };
};

const calculateGrowth = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const hotelMatch = (hotelIds) =>
  hotelIds.length > 1 ? { $in: hotelIds } : hotelIds[0];

const getStayBookings = async (hotelIds, start, end) => {
  return Booking.find({
    hotelId: hotelMatch(hotelIds),
    checkIn: { $lte: end },
    checkOut: { $gte: start },
  });
};

const getSummaryMetrics = async (hotelIds, start, end) => {
  const [bookings, roomAgg] = await Promise.all([
    getStayBookings(hotelIds, start, end),
    Room.aggregate([
      { $match: { hotelId: hotelMatch(hotelIds) } },
      { $group: { _id: null, totalRooms: { $sum: 1 } } },
    ]),
  ]);

  const totalRooms = roomAgg[0]?.totalRooms || 0;
  const totalDays =
    Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  let totalRevenue = 0;
  let totalRoomNights = 0;

  for (const booking of bookings) {
    const overlapStart = new Date(
      Math.max(booking.checkIn, start)
    );

    const overlapEnd = new Date(
      Math.min(booking.checkOut, end)
    );

    const overlapNights =
      (overlapEnd - overlapStart) /
      (1000 * 60 * 60 * 24);

    if (overlapNights > 0) {
      const totalBookingNights =
        (booking.checkOut - booking.checkIn) /
        (1000 * 60 * 60 * 24);

      const perNightRevenue =
        booking.totalAmount / totalBookingNights;

      totalRevenue += perNightRevenue * overlapNights;
      totalRoomNights += overlapNights;
    }
  }

  const occupancyRate =
    totalRooms > 0
      ? Number(
          (
            (totalRoomNights /
              (totalRooms * totalDays)) *
            100
          ).toFixed(1)
        )
      : 0;

  const ADR =
    totalRoomNights > 0
      ? Number(
          (totalRevenue / totalRoomNights).toFixed(2)
        )
      : 0;

  const RevPAR =
    totalRooms > 0
      ? Number(
          (
            totalRevenue /
            (totalRooms * totalDays)
          ).toFixed(2)
        )
      : 0;

  return {
    totalBookings: bookings.length,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    occupancyRate,
    ADR,
    RevPAR,
  };
};

const getRevenueByDate = async (hotelIds, start, end) => {
  const bookings = await getStayBookings(
    hotelIds,
    start,
    end
  );

  const dateMap = new Map();

  for (const booking of bookings) {
    const totalBookingNights =
      (booking.checkOut - booking.checkIn) /
      (1000 * 60 * 60 * 24);

    const perNightRevenue =
      booking.totalAmount / totalBookingNights;

    let current = new Date(
      Math.max(booking.checkIn, start)
    );

    const lastDate = new Date(
      Math.min(booking.checkOut, end)
    );

    while (current < lastDate) {
      const dateStr =
        current.toISOString().split("T")[0];

      dateMap.set(
        dateStr,
        (dateMap.get(dateStr) || 0) +
          perNightRevenue
      );

      current.setUTCDate(
        current.getUTCDate() + 1
      );
    }
  }

  return generateDateRange(start, end).map((date) => ({
    date,
    revenue: Number(
      (dateMap.get(date) || 0).toFixed(2)
    ),
  }));
};

const getPendingServiceRequests = async (hotelIds) =>
  ServiceRequest.countDocuments({
    hotelId: hotelMatch(hotelIds),
    status: "pending",
  });

const getTopPerformingHotels = async (
  hotelIds,
  start,
  end
) => {
  const hotels = await Hotel.find(
    { _id: hotelMatch(hotelIds) },
    "_id name"
  );

  const result = [];

  for (const hotel of hotels) {
    const metrics = await getSummaryMetrics(
      [hotel._id],
      start,
      end
    );

    result.push({
      id: hotel._id.toString(),
      name: hotel.name,
      revenue: metrics.totalRevenue,
      occupancy: metrics.occupancyRate,
    });
  }

  return result
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
};

const getComparisons = async (
  hotelIds,
  start,
  end
) => {
  const previous = getPreviousPeriod(start, end);

  const [currentMetrics, previousMetrics] =
    await Promise.all([
      getSummaryMetrics(hotelIds, start, end),
      getSummaryMetrics(
        hotelIds,
        previous.start,
        previous.end
      ),
    ]);

  return {
    revenue: {
      current: currentMetrics.totalRevenue,
      previous: previousMetrics.totalRevenue,
      growth: calculateGrowth(
        currentMetrics.totalRevenue,
        previousMetrics.totalRevenue
      ),
    },
    bookings: {
      current: currentMetrics.totalBookings,
      previous: previousMetrics.totalBookings,
      growth: calculateGrowth(
        currentMetrics.totalBookings,
        previousMetrics.totalBookings
      ),
    },
  };
};

const buildDashboard = async (
  hotelIds,
  start,
  end
) => {
  const [
    summary,
    revenueByDate,
    comparisons,
    topPerformingHotels,
    pendingServiceRequests,
  ] = await Promise.all([
    getSummaryMetrics(hotelIds, start, end),
    getRevenueByDate(hotelIds, start, end),
    getComparisons(hotelIds, start, end),
    getTopPerformingHotels(hotelIds, start, end),
    getPendingServiceRequests(hotelIds),
  ]);

  return {
    summary,
    revenueByDate,
    comparisons,
    topPerformingHotels,
    pendingServiceRequests,
  };
};

export const getAdminAnalytics = async (
  startDate,
  endDate
) => {
  const { start, end } = resolveDateRange(
    startDate,
    endDate
  );

  const hotels = await Hotel.find({}, "_id");
  const hotelIds = hotels.map((h) => h._id);

  return buildDashboard(hotelIds, start, end);
};

export const getDirectorAnalytics = async (
  managedHotels,
  startDate,
  endDate
) => {
  if (!managedHotels?.length) {
    throw new NotFoundError(
      "No hotels assigned to this director"
    );
  }

  const { start, end } = resolveDateRange(
    startDate,
    endDate
  );

  return buildDashboard(managedHotels, start, end);
};

export const getManagerAnalytics = async (
  hotelId,
  startDate,
  endDate
) => {
  if (!hotelId) {
    throw new NotFoundError(
      "No hotel assigned to this manager"
    );
  }

  const { start, end } = resolveDateRange(
    startDate,
    endDate
  );

  return buildDashboard([hotelId], start, end);
};

export const getHotelAnalytics = (
  hotelId,
  startDate,
  endDate
) => getManagerAnalytics(hotelId, startDate, endDate);