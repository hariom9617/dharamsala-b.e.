// src/amenity/service.js
import Amenity from '../../model/amenity.js';
import { NotFoundError } from '../../utils/errors.js';

const amenityService = {
  
  async getAmenities({ hotelId, category, available }) {
    const filter = { hotelId };

    if (category) {
      filter.category = category;
    }

    if (available !== undefined) {
      filter.available = available === 'true';
    }

    return await Amenity.find(filter);
  },


  async getAmenityById(id) {
    const amenity = await Amenity.findById(id);
    if (!amenity) {
      throw new NotFoundError('Amenity not found');
    }
    return amenity;
  }
};

export default amenityService;