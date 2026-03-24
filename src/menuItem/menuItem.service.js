// src/menuItem/service.js
import MenuItem from "../../model/menuItem.js";
import mongoose from "mongoose";
import { deleteS3Object } from "../../utils/s3Manager.js";

class MenuItemService {
  // Create menu item — hotelId always from token
  static async createMenuItem(data, userHotelId) {
    const menuItem = new MenuItem({
      ...data,
      hotelId: userHotelId // NEVER from request body
    });
    return menuItem.save();
  }

  // Get menu items with filtering and pagination
  static async getMenuItems(query, userRole, userHotelId) {
    const {
      category,
      available,
      search,
      page = 1,
      limit = 20
    } = query;

    const filter = {};

    // STRICT hotel isolation — always filter by token's hotelId
    if (userRole === 'admin') {
      // Admin can access any hotel if hotelId is provided
      if (query.hotelId) {
        filter.hotelId = query.hotelId;
      }
    } else {
      filter.hotelId = userHotelId;
    }

    // Guests only see available items
    if (userRole === 'guest') {
      filter.available = true;
    }

    if (category) {
      filter.category = category;
    }

    // Non-guest roles can filter by availability explicitly
    if (available !== undefined && userRole !== 'guest') {
      filter.available = available === 'true';
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      MenuItem.find(filter)
        .sort({ category: 1, name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MenuItem.countDocuments(filter)
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit)
    };
  }

  // Get single menu item with hotel ownership check
  static async getMenuItemById(itemId, userRole, userHotelId) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error("Invalid menu item ID");
    }

    const menuItem = await MenuItem.findById(itemId).lean();

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    // Strict hotel isolation — admin bypasses
    if (userRole !== 'admin' && menuItem.hotelId.toString() !== userHotelId.toString()) {
      throw new Error("Access denied: Cross-hotel access forbidden");
    }

    return menuItem;
  }

  // Update menu item with ownership validation
  static async updateMenuItem(itemId, data, userHotelId) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error("Invalid menu item ID");
    }

    const menuItem = await MenuItem.findById(itemId);

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    // Strict hotel ownership
    if (menuItem.hotelId.toString() !== userHotelId.toString()) {
      throw new Error("Access denied: Cross-hotel access forbidden");
    }

    // Prevent changing hotelId
    delete data.hotelId;

    // Delete old image from S3 if a new image is being uploaded
    if (data.image && menuItem.image && data.image !== menuItem.image) {
      deleteS3Object(menuItem.image).catch(() => { });
    }

    Object.assign(menuItem, data);
    return menuItem.save();
  }

  // Delete menu item with ownership validation
  static async deleteMenuItem(itemId, userHotelId) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error("Invalid menu item ID");
    }

    const menuItem = await MenuItem.findById(itemId);

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    // Strict hotel ownership
    if (menuItem.hotelId.toString() !== userHotelId.toString()) {
      throw new Error("Access denied: Cross-hotel access forbidden");
    }

    // Delete image from S3 if it exists
    if (menuItem.image) {
      deleteS3Object(menuItem.image).catch(() => { });
    }

    await MenuItem.findByIdAndDelete(itemId);
    return { message: "Menu item deleted successfully" };
  }

  // Toggle availability — production-friendly soft toggle
  static async toggleAvailability(itemId, available, userHotelId) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error("Invalid menu item ID");
    }

    const menuItem = await MenuItem.findById(itemId);

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    // Strict hotel ownership
    if (menuItem.hotelId.toString() !== userHotelId.toString()) {
      throw new Error("Access denied: Cross-hotel access forbidden");
    }

    menuItem.available = available;
    return menuItem.save();
  }
}

export default MenuItemService;
