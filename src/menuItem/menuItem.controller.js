// src/menuItem/controller.js
import MenuItemService from "./menuItem.service.js";
import { ForbiddenError, NotFoundError, BadRequestError } from "../../utils/errors.js";

class MenuItemController {
  // POST /api/menu-items — Director/Manager only
  static async createMenuItem(req, res, next) {
    try {
      // Attach S3 image URL if file was uploaded
      if (req.file?.location) {
        req.body.image = req.file.location;
      }

      const menuItem = await MenuItemService.createMenuItem(
        req.body,
        req.user.hotelId // hotelId ALWAYS from token
      );

      return res.status(201).json({
        success: true,
        data: menuItem
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/menu-items — All roles (filtered by hotel)
  static async getMenuItems(req, res, next) {
    try {
      const result = await MenuItemService.getMenuItems(
        req.query,
        req.user.role,
        req.user.hotelId
      );

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

  // GET /api/menu-items/:id — All roles (hotel ownership checked)
  static async getMenuItemById(req, res, next) {
    try {
      const menuItem = await MenuItemService.getMenuItemById(
        req.params.id,
        req.user.role,
        req.user.hotelId
      );

      return res.status(200).json({
        success: true,
        data: menuItem
      });
    } catch (error) {
      if (error.message === "Menu item not found") {
        return next(new NotFoundError("Menu item not found"));
      }
      if (error.message.includes("Access denied")) {
        return next(new ForbiddenError(error.message));
      }
      if (error.message === "Invalid menu item ID") {
        return next(new BadRequestError(error.message));
      }
      next(error);
    }
  }

  // PUT /api/menu-items/:id — Director/Manager only
  static async updateMenuItem(req, res, next) {
    try {
      // Attach S3 image URL if new file was uploaded
      if (req.file?.location) {
        req.body.image = req.file.location;
      }

      const menuItem = await MenuItemService.updateMenuItem(
        req.params.id,
        req.body,
        req.user.hotelId
      );

      return res.status(200).json({
        success: true,
        data: menuItem
      });
    } catch (error) {
      if (error.message === "Menu item not found") {
        return next(new NotFoundError("Menu item not found"));
      }
      if (error.message.includes("Access denied")) {
        return next(new ForbiddenError(error.message));
      }
      if (error.message === "Invalid menu item ID") {
        return next(new BadRequestError(error.message));
      }
      next(error);
    }
  }

  // DELETE /api/menu-items/:id — Director/Manager only
  static async deleteMenuItem(req, res, next) {
    try {
      const result = await MenuItemService.deleteMenuItem(
        req.params.id,
        req.user.hotelId
      );

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      if (error.message === "Menu item not found") {
        return next(new NotFoundError("Menu item not found"));
      }
      if (error.message.includes("Access denied")) {
        return next(new ForbiddenError(error.message));
      }
      if (error.message === "Invalid menu item ID") {
        return next(new BadRequestError(error.message));
      }
      next(error);
    }
  }

  // PATCH /api/menu-items/:id/availability — Director/Manager only
  static async toggleAvailability(req, res, next) {
    try {
      const { available } = req.body;

      if (typeof available !== 'boolean') {
        return next(new BadRequestError("'available' must be a boolean"));
      }

      const menuItem = await MenuItemService.toggleAvailability(
        req.params.id,
        available,
        req.user.hotelId
      );

      return res.status(200).json({
        success: true,
        data: menuItem
      });
    } catch (error) {
      if (error.message === "Menu item not found") {
        return next(new NotFoundError("Menu item not found"));
      }
      if (error.message.includes("Access denied")) {
        return next(new ForbiddenError(error.message));
      }
      if (error.message === "Invalid menu item ID") {
        return next(new BadRequestError(error.message));
      }
      next(error);
    }
  }
}

export default MenuItemController;
