// src/housekeeping/controller.js
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import HousekeepingService from "./housekeeping.service.js";
import { validateCreateTask, validateUpdateTask, validateGetTasks } from '../../middleware/validators/housekeeping.js';

const { Types } = mongoose;

class HousekeepingController {
  // Create a new housekeeping task
  static async createTask(req, res, next) {
    try {
      // Validate request
      await Promise.all(validateCreateTask.map(validation => validation.run(req)));
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }
      // Convert string IDs to ObjectIds
      const taskData = {
        ...req.body,
        // hotelId: new Types.ObjectId(req.body.hotelId),
        // assignedTo: req.body.assignedTo ? new Types.ObjectId(req.body.assignedTo) : undefined
      };
      const task = await HousekeepingService.createTask(taskData);
      
      res.status(201).json({
        success: true,
        data: task,
        message: "Housekeeping task created successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  // Get housekeeping tasks
  static async getTasks(req, res, next) {
    try {
      const result = await HousekeepingService.getTasks(req.query);
      
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

  // Get task by ID
  static async getTask(req, res, next) {
    try {
      const task = await HousekeepingService.getTaskById(req.params.id);
      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      next(error);
    }
  }

  // Update task
  static async updateTask(req, res, next) {
    try {
      const task = await HousekeepingService.updateTask(
        req.params.id,
        req.body,
        req.user._id
      );
      
      res.json({
        success: true,
        data: task,
        message: "Housekeeping task updated successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  // Update task status
  static async updateTaskStatus(req, res, next) {
    try {
      const { status, notes } = req.body;
      
      const task = await HousekeepingService.updateTaskStatus(
        req.params.id,
        status,
        req.user._id,
        notes
      );
      
      res.json({
        success: true,
        data: task,
        message: "Task status updated successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete task
  static async deleteTask(req, res, next) {
    try {
      await HousekeepingService.deleteTask(req.params.id);
      
      res.json({
        success: true,
        message: "Housekeeping task deleted successfully"
      });
    } catch (error) {
      next(error);
    }
  }
}

export default HousekeepingController;