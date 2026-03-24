// src/feedback/service.js
import Feedback from '../../model/feedback.js';
import { NotFoundError } from '../../utils/errors.js';

export const getFeedback = async (filters = {}, pagination = {}) => {
  const { page = 1, limit = 20, ...queryFilters } = filters;
  const skip = (page - 1) * limit;

  // Build the query
  const query = { ...queryFilters };

  // Handle date range
  if (query.startDate || query.endDate) {
    query.createdAt = {};
    if (query.startDate) {
      query.createdAt.$gte = new Date(query.startDate);
      delete query.startDate;
    }
    if (query.endDate) {
      query.createdAt.$lte = new Date(query.endDate);
      delete query.endDate;
    }
  }

  // Handle rating range
  if (query.minRating || query.maxRating) {
    query.rating = {};
    if (query.minRating) {
      query.rating.$gte = Number(query.minRating);
      delete query.minRating;
    }
    if (query.maxRating) {
      query.rating.$lte = Number(query.maxRating);
      delete query.maxRating;
    }
  }

  const [items, total] = await Promise.all([
    Feedback.find(query)
      .populate('guestId', 'name email phone')
      .populate('hotelId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Feedback.countDocuments(query)
  ]);

  // Format the response
  const formattedItems = items.map(item => ({
    id: item.id,
    guestId: item.guestId?._id || item.guestId,
    guestName: item.guestId?.name || 'Guest',
    hotelId: item.hotelId?._id || item.hotelId,
    hotelName: item.hotelId?.name || 'Hotel',
    bookingId: item.bookingId,
    rating: item.rating,
    category: item.category,
    comment: item.comment,
    createdAt: item.createdAt
  }));

  return {
    data: formattedItems,
    total,
    page: Number(page),
    limit: Number(limit)
  };
};

export const createFeedback = async (data) => {
  const feedback = new Feedback(data);
  await feedback.save();

  try {
    // Populate the response
    const populated = await Feedback.findById(feedback._id)
      .populate('guestId', 'name email phone')
      .populate('hotelId', 'name')
      .lean();
    return {
      id: populated._id,
      guestId: populated.guestId?._id || data.guestId,
      guestName: populated.guestId?.name || 'Guest',
      hotelId: populated.hotelId?._id || data.hotelId,
      hotelName: populated.hotelId?.name || 'Hotel',
      bookingId: populated.bookingId,
      rating: populated.rating,
      category: populated.category,
      comment: populated.comment,
      createdAt: populated.createdAt
    };
  } catch (error) {
    // If population fails, return the basic feedback data
    return {
      id: feedback._id,
      guestId: data.guestId,
      guestName: 'Guest',
      hotelId: data.hotelId,
      hotelName: 'Hotel',
      bookingId: data.bookingId,
      rating: data.rating,
      category: data.category,
      comment: data.comment,
      createdAt: feedback.createdAt
    };
  }
};