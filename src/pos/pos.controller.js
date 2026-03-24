// src/pos/controller.js
import POSService from "./pos.service.js";
import { ForbiddenError, BadRequestError } from "../../utils/errors.js";

class POSController {
  // Create a new POS order (Guest only)
  static async createOrder(req, res, next) {
    try {
      // Role-based access control
      if (req.user.role === 'guest') {
        // Guests can create orders for themselves only
        const order = await POSService.createOrder({
          ...req.body,
          guestId: req.user.id,
          hotelId: req.user.hotelId
        }); // No userId passed - processedBy stays null

        return res.status(201).json({
          success: true,
          data: order,
          message: "POS order created successfully"
        });
      } else if (req.user.role === 'admin') {
        // Admin can create orders manually
        const order = await POSService.createOrder(req.body, req.user.id);

        return res.status(201).json({
          success: true,
          data: order,
          message: "POS order created successfully"
        });
      } else {
        // Staff cannot create POS orders
        throw new ForbiddenError('Access denied: Staff cannot create POS orders');
      }
    } catch (error) {
      next(error);
    }
  }

  // Get POS orders with role-based filtering
  static async getOrders(req, res, next) {
    try {
      let query = { ...req.query };

      // Role-based access control
      if (req.user.role === 'guest') {
        // Guests can only see their own orders
        query.guestId = req.user.id;
        // Override any hotelId from query params
        query.hotelId = req.user.hotelId;
      } else if (req.user.role === 'admin') {
        // Admin can see all orders - no filtering
        // Allow admin to filter by any parameter
      } else {
        // Staff can only see orders from their hotel
        query.hotelId = req.user.hotelId;
        // Remove any guestId filter for staff (they can see all hotel orders)
        delete query.guestId;
      }

      const result = await POSService.getOrders(query);

      return res.status(200).json({
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

  // Get POS order by ID with ownership validation
  static async getOrderById(req, res, next) {
    try {
      const order = await POSService.getOrderById(req.params.id);

      // Role-based access control
      if (req.user.role === 'guest') {
        // Guests can only view their own orders
        if (!order.guestId || order.guestId.toString() !== req.user.id) {
          throw new ForbiddenError('Access denied: You can only view your own orders');
        }
      } else if (req.user.role === 'admin') {
        // Admin can view any order - no restrictions
      } else {
        // Staff can only view orders from their hotel
        if (!order.hotelId || order.hotelId.toString() !== req.user.hotelId) {
          throw new ForbiddenError('Access denied: You can only view orders from your hotel');
        }
      }

      return res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  // Update order status (staff/admin only)
  static async updateOrderStatus(req, res, next) {
    try {
      const { status, notes } = req.body;

      if (!status) {
        throw new BadRequestError('Status is required');
      }

      const validStatuses = ['pending', 'completed', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestError('Invalid status');
      }

      // Get the order first
      const order = await POSService.getOrderById(req.params.id);

      // Role-based access control
      if (req.user.role === 'guest') {
        // Guests cannot update order status
        throw new ForbiddenError('Access denied: Guests cannot update order status');
      } else if (req.user.role === 'admin') {
        // Admin can update any order - no restrictions
      } else {
        // Staff can only update orders from their hotel
        if (!order.hotelId || order.hotelId.toString() !== req.user.hotelId) {
          throw new ForbiddenError('Access denied: You can only update orders from your hotel');
        }
      }

      const updatedOrder = await POSService.updateOrderStatus(
        req.params.id,
        status,
        notes,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        data: updatedOrder,
        message: "Order status updated successfully"
      });
    } catch (error) {
      next(error);
    }
  }
}

export default POSController;
