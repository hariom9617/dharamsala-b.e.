
// src/inventory/controller.js
import * as inventoryService from './inventory.service.js';
import { validationResult } from 'express-validator';
import { BadRequestError } from '../../utils/errors.js';

export default class InventoryController {
  static async getInventoryItems(req, res, next) {
    try {
      const { category, lowStock, search, page = 1, limit = 50 } = req.query;
      const hotelId = req.query.hotelId || req.user.hotelId;

      if (!hotelId) {
        throw new BadRequestError('hotel ID is required');
      }

      const filters = { hotelId };
      if (category) filters.category = category;
      if (lowStock === 'true') filters.quantity = { $lte: 10 };
      if (search) filters.search = search;

      const result = await inventoryService.getInventoryItems(filters, { page, limit });

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

  static async getInventoryItem(req, res, next) {
    try {
      const item = await inventoryService.getInventoryItemById(req.params.id);
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  // ✅ UPGRADED METHOD (ONLY CHANGE)
  static async createInventoryItem(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation error', { errors: errors.array() });
      }

      if (!req.body.hotelId && !req.user?.hotelId) {
        throw new BadRequestError('hotel ID is required');
      }

      const data = {
        ...req.body,
        hotelId: req.body.hotelId || req.user.hotelId
      };

      const item = await inventoryService.createInventoryItem(data);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Inventory item created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateInventoryItem(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation error', { errors: errors.array() });
      }

      const item = await inventoryService.updateInventoryItem(
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        data: item,
        message: 'Inventory item updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async restockInventoryItem(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation error', { errors: errors.array() });
      }

      const item = await inventoryService.restockInventoryItem(
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        data: item,
        message: 'Inventory restocked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteInventoryItem(req, res, next) {
    try {
      await inventoryService.deleteInventoryItem(req.params.id);
      res.json({ success: true, message: 'Inventory item deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
