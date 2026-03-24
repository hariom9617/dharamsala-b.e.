import staffService from "./staff.service.js";
import { ForbiddenError, BadRequestError } from "../../utils/errors.js";
import mongoose from "mongoose";

class StaffController {
  async create(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot create staff
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have permission to create staff');
      }

      // Pass requester for hierarchy validation
      const staff = await staffService.create(req.body, req.user);
      res.status(201).json({ success: true, data: staff });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const role = req.user.effectiveRole;
      const query = { ...req.query };

      // Staff and Guest cannot view staff list
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have permission to view staff list');
      }

      // Hotel scope for director & manager
      if (['director', 'manager'].includes(role)) {
        query.hotelId = req.user.hotelId;
      }

      // Pass requester info to service
      query.requesterRole = role;
      query.requesterId = req.user.id;

      const result = await staffService.getAll(query);

      // For Manager: also include director info (name only)
      let director = null;
      if (role === 'manager' && req.user.hotelId) {
        director = await staffService.getDirectorForManager(req.user.hotelId);
      }

      res.json({
        success: true,
        data: result.data,
        counts: result.counts,        
        pagination: result.pagination,
        ...(director && { director })
      });
    } catch (err) {
      next(err);
    }
  }

  async getByHotelId(req, res, next) {
    try {
      const role = req.user.effectiveRole;
      const { hotelId } = req.params;

      // Validate hotelId format
      if (!mongoose.Types.ObjectId.isValid(hotelId)) {
        throw new BadRequestError('Invalid hotelId format');
      }

      // Staff and Guest cannot view staff list
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have permission to view staff list');
      }

      // Non-admin can only view their own hotel's staff
      if (role !== 'admin' && hotelId !== req.user.hotelId?.toString()) {
        throw new ForbiddenError('You can only view staff of your own hotel');
      }

      const result = await staffService.getByHotelId(hotelId, {
        page: req.query.page,
        limit: req.query.limit,
        requesterRole: role,
        requesterId: req.user.id
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      // Pass requester for visibility control
      const staff = await staffService.getById(req.params.id, req.user);
      res.json({ success: true, data: staff });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot update other staff
      if (['staff', 'guest'].includes(role)) {
        // Staff can only update their own profile (limited fields)
        if (role === 'staff' && req.params.id === req.user.id.toString()) {
          // Allow only certain fields for self-update
          const allowedFields = ['name', 'email'];
          const sanitizedData = {};
          allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
              sanitizedData[field] = req.body[field];
            }
          });
          const staff = await staffService.update(req.params.id, sanitizedData, req.user);
          return res.json({ success: true, data: staff });
        }
        throw new ForbiddenError('You do not have permission to update staff');
      }

      // Pass requester for hierarchy validation
      const staff = await staffService.update(req.params.id, req.body, req.user);
      res.json({ success: true, data: staff });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      // Staff and Guest cannot delete staff
      if (['staff', 'guest'].includes(role)) {
        throw new ForbiddenError('You do not have permission to delete staff');
      }

      // Pass requester for hierarchy validation
      await staffService.remove(req.params.id, req.user);
      res.json({ success: true, message: "Staff deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
}

export default new StaffController();
