// src/housekeeping/service.js
import HousekeepingTask from "../../model/housekeepingTask.js";
import { BadRequestError, NotFoundError } from '../../utils/errors.js'; // Make sure you have this error utility

class HousekeepingService {
  
  static async createTask(taskData) {
    try {
      const task = new HousekeepingTask(taskData);
      await task.save();
      return task;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestError('Validation failed', error.errors);
      }
      throw error;
    }
  }
 
  static async getTasks(query) {
    const { 
      hotelId, 
      status, 
      type, 
      priority, 
      assignedTo,
      date,
      search,
      page = 1, 
      limit = 50 
    } = query;

    if (!hotelId) {
      throw new BadRequestError('hotelId is required');
    }

    // Base filter - only non-deleted tasks
    const filter = { 
      hotelId,
      isDeleted: false
    };

    // Apply filters
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // Text search across relevant fields
    if (search) {
      filter.$or = [
        { roomNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Date filter
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      filter.scheduledAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        HousekeepingTask.find(filter)
          .sort({ 
            status: 1, // Pending first
            priority: -1, // High priority first
            scheduledAt: 1 // Earlier tasks first
          })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        HousekeepingTask.countDocuments(filter)
      ]);

      return { 
        data, 
        total, 
        page: Number(page), 
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error('Failed to fetch tasks');
    }
  }

  static async getTaskById(taskId) {
    if (!taskId) {
      throw new BadRequestError('Task ID is required');
    }

    const task = await HousekeepingTask.findOne({ 
      id: taskId,
      isDeleted: false 
    }).lean();

    if (!task) {
      throw new NotFoundError('Housekeeping task not found');
    }

    return task;
  }

  static async updateTask(taskId, updateData, userId) {
    if (!taskId) {
      throw new BadRequestError('Task ID is required');
    }

    // Handle status changes
    if (updateData.status) {
      const now = new Date();
      if (updateData.status === 'in-progress' && !updateData.startedAt) {
        updateData.startedAt = now;
      } else if (updateData.status === 'completed' && !updateData.completedAt) {
        updateData.completedAt = now;
        updateData.completedBy = userId;
      } else if (updateData.status === 'cancelled') {
        updateData.completedAt = null;
        updateData.completedBy = null;
      }
    }

    try {
      const task = await HousekeepingTask.findOneAndUpdate(
        { 
          id: taskId,
          isDeleted: false 
        },
        { $set: updateData },
        { 
          new: true, 
          runValidators: true 
        }
      ).lean();

      if (!task) {
        throw new NotFoundError('Housekeeping task not found');
      }

      return task;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestError('Validation failed', error.errors);
      }
      throw error;
    }
  }


  static async deleteTask(taskId) {
    if (!taskId) {
      throw new BadRequestError('Task ID is required');
    }

    const task = await HousekeepingTask.findOneAndUpdate(
      { 
        id: taskId,
        isDeleted: false 
      },
      { 
        $set: { 
          isDeleted: true,
          deletedAt: new Date() 
        } 
      },
      { new: true }
    );

    if (!task) {
      throw new NotFoundError('Housekeeping task not found');
    }

    return task;
  }


  static async updateTaskStatus(taskId, status, userId, notes) {
    if (!status) {
      throw new BadRequestError('Status is required');
    }

    const updateData = { status };
    if (notes) {
      updateData.notes = notes;
    }

    return this.updateTask(taskId, updateData, userId);
  }

  static async getTaskStatistics(hotelId) {
    if (!hotelId) {
      throw new BadRequestError('hotelId is required');
    }

    const stats = await HousekeepingTask.aggregate([
      {
        $match: { 
          hotelId,
          isDeleted: false 
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return stats.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {});
  }
}

export default HousekeepingService;