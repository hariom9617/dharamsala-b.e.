import publicService from './public.service.js';

class PublicController {
  //   GET /api/public/hotels
  //   List active hotels for guest discovery (no auth required)
  
  async listHotels(req, res, next) {
    try {
      const result = await publicService.listHotels(req.query);
      res.json({
        success: true,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }

  //   GET /api/public/hotels/:hotelId/rooms/availability
  //   Get room availability by category for a hotel (no auth required)
  async getRoomAvailability(req, res, next) {
    try {
      const result = await publicService.getRoomAvailability(
        req.params.hotelId,
        req.query
      );
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new PublicController();
