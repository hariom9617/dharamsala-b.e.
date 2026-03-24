import Hotel from '../../model/hotel.js';
import Room from '../../model/room.js';
import mongoose from 'mongoose';
import { NotFoundError } from '../../utils/errors.js';

class PublicService {

  async listHotels(query = {}) {
    let { page = 1, limit = 10, search, city } = query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (page - 1) * limit;

    // Only show active hotels
    const filter = { status: 'active' };

    // Optional city filter for initial load optimization
    if (city) filter.city = new RegExp(`^${city}$`, 'i');
    if (search) filter.$text = { $search: search };

    const [hotels, total] = await Promise.all([
      Hotel.find(filter)
        .select('name hotelId city location country rating amenities description contact')
        .skip(skip)
        .limit(limit)
        .lean(),
      Hotel.countDocuments(filter)
    ]);

    // Add room availability summary for each hotel
    const hotelsWithAvailability = await Promise.all(
      hotels.map(async (hotel) => {
        const roomStats = await Room.aggregate([
          {
            $match: {
              hotelId: hotel._id,
              status: 'available'
            }
          },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' }
            }
          },
          {
            $project: {
              _id: 0,
              category: '$_id',
              availableCount: '$count',
              minPrice: 1,
              maxPrice: 1
            }
          }
        ]);

        const totalAvailable = roomStats.reduce((sum, cat) => sum + cat.availableCount, 0);

        return {
          ...hotel,
          availableRooms: totalAvailable,
          roomCategories: roomStats
        };
      })
    );

    return {
      data: hotelsWithAvailability,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }


  async getRoomAvailability(hotelId, query = {}) {
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      throw new NotFoundError('Invalid hotel ID');
    }

    const hotel = await Hotel.findById(hotelId).select('name hotelId city location status');
    if (!hotel) {
      throw new NotFoundError('Hotel not found');
    }

    if (hotel.status !== 'active') {
      throw new NotFoundError('Hotel is not currently accepting bookings');
    }

    const { category } = query;

    const matchStage = {
      hotelId: new mongoose.Types.ObjectId(hotelId),
      status: 'available'
    };

    if (category && category !== 'all') {
      matchStage.category = category;
    }

    const categories = await Room.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          availableCount: { $sum: 1 },
          pricePerDay: { $first: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          amenities: { $first: '$amenities' },
          maxOccupancy: { $max: '$maxOccupancy' }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          availableCount: 1,
          pricePerDay: 1,
          minPrice: 1,
          maxPrice: 1,
          amenities: 1,
          maxOccupancy: 1
        }
      },
      { $sort: { pricePerDay: 1 } }
    ]);

    return {
      hotel: {
        _id: hotel._id,
        name: hotel.name,
        hotelId: hotel.hotelId,
        city: hotel.city,
        location: hotel.location
      },
      categories,
      totalAvailable: categories.reduce((sum, cat) => sum + cat.availableCount, 0)
    };
  }
}

export default new PublicService();
