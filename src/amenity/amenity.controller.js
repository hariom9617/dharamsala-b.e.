// src/amenity/controller.js
import { validationResult } from 'express-validator';
import amenityService from './amenity.service.js';
import { BadRequestError } from '../../utils/errors.js';

class AmenityController {
  
  async getAmenities(req, res, next) {
    try {
      const { hotelId, category, available } = req.query;
      
      if (!hotelId) {
        throw new BadRequestError('hotelId is required');
      }

      const amenities = await amenityService.getAmenities({
        hotelId,
        category,
        available
      });

      res.json({
        success: true,
        data: amenities
      });
    } catch (error) {
      next(error);
    }
  }

  
  async getAmenityById(req, res, next) {
    try {
      const { id } = req.params;
      const amenity = await amenityService.getAmenityById(id);
      
      res.json({
        success: true,
        data: amenity
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AmenityController();