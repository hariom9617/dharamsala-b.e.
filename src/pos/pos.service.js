// src/pos/service.js
import POSOrder from "../../model/posOrder.js";
import mongoose from "mongoose";
import Guest from "../../model/guest.js";
import Room from "../../model/room.js";

class POSService {
  // Create a new POS order (Guest only - status = pending)
  static async createOrder(orderData, userId = null) {
    const { hotelId, guestId, roomNumber, items, paymentMethod } = orderData;

    // Validate required fields
    if (!hotelId) {
      throw new Error("hotelId is required");
    }

    if (!guestId) {
      throw new Error("guestId is required");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required");
    }

    // For admin creation, validate guest belongs to hotel
    if (userId && hotelId && guestId) {
      const guest = await Guest.findById(guestId);
      if (!guest) {
        throw new Error("Guest not found");
      }
      if (guest.hotelId.toString() !== hotelId.toString()) {
        throw new Error("Guest does not belong to the specified hotel");
      }
    }

    // Convert roomNumber to roomId if provided
    let roomId = null;
    if (roomNumber) {
      const room = await Room.findOne({ 
        hotelId, 
        roomNumber: roomNumber.toString().trim() 
      });
      
      if (!room) {
        throw new Error(`Room ${roomNumber} not found in this hotel`);
      }
      
      roomId = room._id;
    }

    // Calculate item subtotals
    const calculatedItems = items.map((item) => {
      return {
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        subtotal: Number(item.price) * Number(item.quantity)
      };
    });

    // Calculate total amount
    const totalAmount = calculatedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    const order = await POSOrder.create({
      hotelId,
      guestId,
      roomId,
      items: calculatedItems,
      totalAmount,
      paymentMethod,
      status: "pending", // Guest orders start as pending
      processedBy: userId // Only set for admin/staff processing
    });

    return order;
  }

  // Get POS orders with pagination and filters
  static async getOrders(query) {
    const {
      hotelId,
      guestId,
      date,
      paymentMethod,
      page = 1,
      limit = 50
    } = query;

    const filter = {};

    // Hotel filter (required for non-admin access)
    if (hotelId) {
      filter.hotelId = hotelId;
    }

    // Guest filter (for guest access)
    if (guestId) {
      filter.guestId = guestId;
    }

    // Date filter (YYYY-MM-DD)
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);

      filter.createdAt = { $gte: start, $lt: end };
    }

    // Payment method filter
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      POSOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("guestId", "name phone")
        .populate("processedBy", "name")
        .populate("hotelId", "name")
        .populate("roomId", "roomNumber")
        .lean(),
      POSOrder.countDocuments(filter)
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit)
    };
  }

  // Get order by custom ID or Mongo ID
  static async getOrderById(orderId) {
    const filter = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { id: orderId };

    const order = await POSOrder.findOne(filter)
      .populate("guestId", "name phone")
      .populate("processedBy", "name")
      .populate("roomId", "roomNumber")
      .populate("hotelId", "name");

    if (!order) {
      throw new Error("POS order not found");
    }

    return order;
  }

  // Update order status
  static async updateOrderStatus(orderId, status, notes, staffId) {
    const filter = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { id: orderId };

    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (notes) {
      updateData.notes = notes;
    }

    // Add staff who processed the update
    if (staffId) {
      updateData.processedBy = staffId;
    }

    const order = await POSOrder.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("guestId", "name phone")
      .populate("processedBy", "name")
      .populate("roomId", "roomNumber")
      .populate("hotelId", "name");

    if (!order) {
      throw new Error("POS order not found");
    }

    return order;
  }
}

export default POSService;
