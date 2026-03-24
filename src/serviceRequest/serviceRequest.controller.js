import asyncHandler from 'express-async-handler';
import * as serviceRequestService from './serviceRequest.service.js';
import { validationResult } from 'express-validator';
import { ForbiddenError } from '../../utils/errors.js';

export default class ServiceRequestController {
  static getServiceRequests = asyncHandler(async (req, res) => {
      const { hotelId, guestId, status, type, priority, page = 1, limit = 20 } = req.query;
      
      // Build filters based on user role
      const filters = {};
      
      if (req.user.role === 'guest') {
        filters.guestId = req.user.id;
      } else if (req.user.role === 'admin') {
        if (hotelId) filters.hotelId = hotelId;
        if (guestId) filters.guestId = guestId;
        if (status) filters.status = status;
        if (type) filters.type = type;
        if (priority) filters.priority = priority;
      } else if (req.user.role === 'manager' || req.user.role === 'director') {
        filters.hotelId = req.user.hotelId;
        if (guestId) filters.guestId = guestId;
        if (status) filters.status = status;
        if (type) filters.type = type;
        if (priority) filters.priority = priority;
      } else if (req.user.role === 'staff') {
        filters.hotelId = req.user.hotelId;
        filters.assignedTo = req.user.id;
        if (status) filters.status = status;
        if (type) filters.type = type;
        if (priority) filters.priority = priority;
      } else {
        throw new ForbiddenError('Access denied: Unauthorized role');
      }

      const result = await serviceRequestService.getServiceRequests(filters, { page, limit });
      
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit
      });
  });

  static getServiceRequest = asyncHandler(async (req, res) => {
      const request = await serviceRequestService.getServiceRequestById(req.params.id);
      
      if (req.user.role === 'guest') {
        if (!request.guestId || request.guestId.toString() !== req.user.id) {
          throw new ForbiddenError('Access denied: You can only view your own service requests');
        }
      } else if (req.user.role === 'admin') {
        // Admin can view any request
      } else if (req.user.role === 'manager' || req.user.role === 'director') {
        const requestHotelId = request.hotelId?._id?.toString() || request.hotelId?.toString();
        const userHotelId = req.user.hotelId?._id?.toString() || req.user.hotelId?.toString();
        if (!request.hotelId || requestHotelId !== userHotelId) {
          throw new ForbiddenError('Access denied: You can only view service requests from your hotel');
        }
      } else if (req.user.role === 'staff') {
        const requestHotelId = request.hotelId?._id?.toString() || request.hotelId?.toString();
        const userHotelId = req.user.hotelId?._id?.toString() || req.user.hotelId?.toString();
        if (!request.hotelId || requestHotelId !== userHotelId) {
          throw new ForbiddenError('Access denied: You can only view service requests from your hotel');
        }
        if (!request.assignedTo || request.assignedTo.toString() !== req.user.id) {
          throw new ForbiddenError('Access denied: You can only view service requests assigned to you');
        }
      } else {
        throw new ForbiddenError('Access denied: Unauthorized role');
      }
      
      res.json({ success: true, data: request });
  });

  static createServiceRequest = asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation error', { errors: errors.array() });
      }

      let requestData = { ...req.body };
      
      if (req.user.role === 'guest') {
        requestData.guestId = req.user.id;
        requestData.hotelId = req.user.hotelId;
      } else if (req.user.role === 'admin') {
        if (requestData.guestId && requestData.hotelId) {
          const Guest = require('../../model/guest.js').default;
          const guest = await Guest.findById(requestData.guestId);
          if (!guest || guest.hotelId.toString() !== requestData.hotelId.toString()) {
            throw new BadRequestError('Guest does not belong to the specified hotel');
          }
        }
      } else {
        requestData.hotelId = req.user.hotelId;
        
        if (!requestData.guestId) {
          throw new BadRequestError('guestId is required for staff to create service requests');
        }
        
        const Guest = require('../../model/guest.js').default;
        const guest = await Guest.findById(requestData.guestId);
        if (!guest || guest.hotelId.toString() !== req.user.hotelId.toString()) {
          throw new BadRequestError('Guest does not belong to your hotel');
        }
      }

      const request = await serviceRequestService.createServiceRequest({
        ...requestData,
        status: 'pending'
      });

      res.status(201).json({
        success: true,
        data: request,
        message: 'Service request created successfully'
      });
  });

  static updateServiceRequest = asyncHandler(async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation error', { errors: errors.array() });
      }

      const existingRequest = await serviceRequestService.getServiceRequestById(req.params.id);
      
      if (req.user.role === 'guest') {
        if (!existingRequest.guestId || existingRequest.guestId.toString() !== req.user.id) {
          throw new ForbiddenError('Access denied: You can only update your own service requests');
        }
      } else if (req.user.role === 'admin') {
        // Admin can update any request
      } else if (req.user.role === 'manager' || req.user.role === 'director') {
        const requestHotelId = existingRequest.hotelId?._id?.toString() || existingRequest.hotelId?.toString();
        const userHotelId = req.user.hotelId?._id?.toString() || req.user.hotelId?.toString();
        if (!existingRequest.hotelId || requestHotelId !== userHotelId) {
          throw new ForbiddenError('Access denied: You can only update service requests from your hotel');
        }
      } else if (req.user.role === 'staff') {
        const requestHotelId = existingRequest.hotelId?._id?.toString() || existingRequest.hotelId?.toString();
        const userHotelId = req.user.hotelId?._id?.toString() || req.user.hotelId?.toString();
        if (!existingRequest.hotelId || requestHotelId !== userHotelId) {
          throw new ForbiddenError(
            'Access denied: You can only update service requests from your hotel'
          );
        }

        if (String(existingRequest.assignedTo) !== String(req.user.id)) {
          throw new ForbiddenError(
            'Access denied: You can only update service requests assigned to you'
          );
        }
      } else {
        throw new ForbiddenError('Access denied: Unauthorized role');
      }

      const updates = { ...req.body };
      if (updates.staffId) {
        updates.assignedTo = updates.staffId;
        delete updates.staffId;
        updates.assignedBy = req.user.id;
        updates.assignedAt = new Date();
      }

      const request = await serviceRequestService.updateServiceRequest(
        req.params.id,
        updates
      );

      res.json({
        success: true,
        data: request,
        message: 'Service request updated successfully'
      });
  });

  static deleteServiceRequest = asyncHandler(async (req, res) => {
      const existingRequest = await serviceRequestService.getServiceRequestById(req.params.id);
      
      if (req.user.role === 'guest') {
        if (!existingRequest.guestId || existingRequest.guestId.toString() !== req.user.id) {
          throw new ForbiddenError('Access denied: You can only delete your own service requests');
        }
      } else if (req.user.role === 'admin') {
        // Admin can delete any request
      } else if (req.user.role === 'manager' || req.user.role === 'director') {
        const requestHotelId = existingRequest.hotelId?._id?.toString() || existingRequest.hotelId?.toString();
        const userHotelId = req.user.hotelId?._id?.toString() || req.user.hotelId?.toString();
        if (!existingRequest.hotelId || requestHotelId !== userHotelId) {
          throw new ForbiddenError('Access denied: You can only delete service requests from your hotel');
        }
      } else if (req.user.role === 'staff') {
        const requestHotelId = existingRequest.hotelId?._id?.toString() || existingRequest.hotelId?.toString();
        const userHotelId = req.user.hotelId?._id?.toString() || req.user.hotelId?.toString();
        if (!existingRequest.hotelId || requestHotelId !== userHotelId) {
          throw new ForbiddenError('Access denied: You can only delete service requests from your hotel');
        }
        if (!existingRequest.assignedTo || existingRequest.assignedTo.toString() !== req.user.id) {
          throw new ForbiddenError('Access denied: You can only delete service requests assigned to you');
        }
      } else {
        throw new ForbiddenError('Access denied: Unauthorized role');
      }

      await serviceRequestService.deleteServiceRequest(req.params.id);
      res.json({ success: true, message: 'Service request deleted successfully' });
  });
}