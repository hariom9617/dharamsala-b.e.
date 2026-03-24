import ServiceRequest from '../../model/serviceRequest.js';
import { NotFoundError } from '../../utils/errors.js';

const formatServiceRequest = (req) => {
  const guest = req.guestId || {};
  const assignedTo = req.assignedTo || {};
  const assignedBy = req.assignedBy || {};
  return {
    ...req,
    guestId: req.guestId?._id || req.guestId,
    guestName: guest.name,
    guestPhone: guest.phone,
    assignedTo: req.assignedTo?._id || req.assignedTo,
    assignedToName: assignedTo.name,
    assignedBy: req.assignedBy?._id || req.assignedBy,
    assignedByName: assignedBy.name
  };
};

const populateFields = [
  { path: 'guestId', select: 'name phone' },
  { path: 'assignedTo', select: 'name' },
  { path: 'assignedBy', select: 'name' }
];

export const createServiceRequest = async (data) => {
  const serviceRequest = new ServiceRequest(data);
  await serviceRequest.save();
  return serviceRequest;
};

export const getServiceRequests = async (filters = {}, pagination = {}) => {
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;
  const query = { ...filters };

  const [requests, total] = await Promise.all([
    ServiceRequest.find(query)
      .populate(populateFields)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ServiceRequest.countDocuments(query)
  ]);

  return {
    data: requests.map(formatServiceRequest),
    total,
    page: Number(page),
    limit: Number(limit)
  };
};

export const getServiceRequestById = async (id) => {
  const request = await ServiceRequest.findById(id)
    .populate(populateFields)
    .lean();

  if (!request) {
    throw new NotFoundError('Service request not found');
  }

  return formatServiceRequest(request);
};

export const updateServiceRequest = async (id, updates) => {
  const request = await ServiceRequest.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .populate(populateFields)
    .lean();

  if (!request) {
    throw new NotFoundError('Service request not found');
  }

  return formatServiceRequest(request);
};

export const deleteServiceRequest = async (id) => {
  const request = await ServiceRequest.findByIdAndDelete(id);
  if (!request) {
    throw new NotFoundError('Service request not found');
  }
  return { success: true };
};
