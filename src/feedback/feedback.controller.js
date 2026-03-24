// src/feedback/controller.js
import * as feedbackService from './feedback.service.js';
import { validationResult } from 'express-validator';
import { BadRequestError } from '../../utils/errors.js';

export default class FeedbackController {
  static async getFeedback(req, res, next) {
    try {
      const { 
        hotelId, 
        guestId, 
        category, 
        minRating, 
        maxRating, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      const filters = {
        ...(hotelId && { hotelId }),
        ...(guestId && { guestId }),
        ...(category && { category }),
        ...(minRating && { minRating }),
        ...(maxRating && { maxRating }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        page,
        limit
      };

      const result = await feedbackService.getFeedback(filters);
      
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    } catch (error) {
      next(error);
    }
  }

  static async createFeedback(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError('Validation error', { errors: errors.array() });
    }
    const { hotelId, bookingId, rating, category, comment } = req.body;
    
    const data = {
      hotelId,
      bookingId,
      rating,
      category,
      comment,
      guestId: req.body.guestId || req.user?.id
    };
    // Validate required fields
    if (!data.hotelId || !data.bookingId || !data.rating || !data.category) {
      throw new BadRequestError('Missing required fields');
    }
    const feedback = await feedbackService.createFeedback(data);
    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    next(error);
  }
}
}