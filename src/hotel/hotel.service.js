import Hotel from "../../model/hotel.js";
import Staff from "../../model/staff.js";
import Room from "../../model/room.js";
import RoomService from "../room/room.service.js";
import { generateHotelId } from "../../utils/helpers.js";
import mongoose from "mongoose";

class HotelService {
  /* ================= CREATE ================= */
  async createHotel(adminId, data) {
    const {
      name,
      location,
      city,
      country,
      rating,
      status = "active",
      amenities = [],
      description,
      contact,
      roomConfigs
    } = data;

    const hotel = await Hotel.create({
      name,
      location,
      city,
      country,
      rating: rating || 1,
      status,
      amenities,
      description,
      contact,
      createdBy: adminId,
      hotelId: await generateHotelId()
    });

    let createdRooms = [];
    if (roomConfigs && Array.isArray(roomConfigs) && roomConfigs.length > 0) {
      try {
        createdRooms = await RoomService.bulkCreateRooms(
          hotel._id,
          roomConfigs,
          { id: adminId }
        );
      } catch (error) {
        await Hotel.findByIdAndDelete(hotel._id);
        throw new Error(`Hotel created but room creation failed: ${error.message}`);
      }
    }

    // Get total rooms count for the response
    const totalRooms = await RoomService.getTotalRoomsCount(hotel._id);

    // Return hotel with totalRooms included
    const hotelResponse = hotel.toObject();
    hotelResponse.totalRooms = totalRooms;

    return hotelResponse;
  }

  /* ================= GET ALL (single unified method) ================= */
  async getAllHotels(query = {}) {
    let { page = 1, limit = 10, search, status, city, hotelId } = query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (hotelId) filter._id = hotelId;                          // scope injected by controller
    if (status) filter.status = status;
    if (city) filter.city = new RegExp(`^${city}$`, "i");
    if (search) filter.$text = { $search: search };

    const [hotels, total] = await Promise.all([
      Hotel.find(filter).skip(skip).limit(limit).lean(),
      Hotel.countDocuments(filter)
    ]);

    const hotelIds = hotels.map(h => h._id);

    const staff = await Staff.find({
      hotelId: { $in: hotelIds },
      role: { $in: ["manager", "director"] },
      isActive: true
    }).lean();

    const staffMap = {};
    staff.forEach(s => {
      staffMap[s.hotelId] ??= {};
      staffMap[s.hotelId][s.role] = s.name;
    });

    // dynamic room counts
    const hotelsWithCounts = await Promise.all(
      hotels.map(async (h) => ({
        ...h,
        manager: staffMap[h._id]?.manager || null,
        director: staffMap[h._id]?.director || null,
        totalRooms: await RoomService.getTotalRoomsCount(h._id)
      }))
    );

    return {
      data: hotelsWithCounts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }

  /* ================= GET ONE ================= */
  // async getHotelById(id) {
  //   if (!mongoose.Types.ObjectId.isValid(id)) {
  //     throw new Error("Invalid hotel ID");
  //   }

  //   const hotel = await Hotel.findById(id).lean();
  //   if (!hotel) throw new Error("Hotel not found");

  //   const [staff, totalRooms] = await Promise.all([
  //     Staff.find({
  //       hotelId: id,
  //       role: { $in: ["manager", "director"] },
  //       isActive: true
  //     }).lean(),
  //     RoomService.getTotalRoomsCount(id)
  //   ]);

  //   return {
  //     ...hotel,
  //     manager: staff.find(s => s.role === "manager")?.name || null,
  //     director: staff.find(s => s.role === "director")?.name || null,
  //     totalRooms
  //   };
  // }

  async getHotelById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid hotel ID");
  }

  const hotel = await Hotel.findById(id).lean();
  if (!hotel) {
    throw new Error("Hotel not found");
  }

  const [staff, totalRooms, roomStats] = await Promise.all([
    Staff.find({
      hotelId: id,
      role: { $in: ["manager", "director"] },
      isActive: true
    }).lean(),

    RoomService.getTotalRoomsCount(id),

    // already exists in your RoomService
    RoomService.getRoomStatistics(id)
  ]);

  // normalize status counts
  const statusMap = {
    available: 0,
    occupied: 0,
    maintenance: 0,
    cleaning: 0
  };

  if (roomStats?.byStatus?.length) {
    roomStats.byStatus.forEach(stat => {
      statusMap[stat.status] = stat.count;
    });
  }

  return {
    ...hotel,

    // staff info
    manager: staff.find(s => s.role === "manager")?.name || null,
    director: staff.find(s => s.role === "director")?.name || null,

    // room stats
    totalRooms,
    occupiedRooms: statusMap.occupied,
    availableRooms: statusMap.available,
    maintenanceRooms: statusMap.maintenance,
    cleaningRooms: statusMap.cleaning
  };
}


  /* ================= UPDATE (CASCADE LOGIC) ================= */
  async updateHotel(id, data) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid hotel ID");
    }

    const hotel = await Hotel.findById(id);
    if (!hotel) throw new Error("Hotel not found");

    const prevStatus = hotel.status;

    Object.assign(hotel, data);
    await hotel.save();

    if (prevStatus !== hotel.status) {
      if (hotel.status === "closed") {
        await Staff.deleteMany({ hotelId: hotel._id });
      }
      if (hotel.status === "maintenance") {
        await Staff.updateMany({ hotelId: hotel._id }, { isActive: false });
      }
      if (hotel.status === "active") {
        await Staff.updateMany({ hotelId: hotel._id }, { isActive: true });
      }
    }

    // Get total rooms count for the response
    const totalRooms = await RoomService.getTotalRoomsCount(hotel._id);

    // Return hotel with totalRooms included
    const hotelResponse = hotel.toObject();
    hotelResponse.totalRooms = totalRooms;

    return hotelResponse;
  }

  /* ================= DELETE ================= */
  async deleteHotel(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid hotel ID");
    }

    const hotel = await Hotel.findByIdAndDelete(id);
    if (!hotel) throw new Error("Hotel not found");

    await Staff.deleteMany({ hotelId: hotel._id });
    await Room.deleteMany({ hotelId: hotel._id });
    return true;
  }
}

export default new HotelService();
