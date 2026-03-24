import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema({
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true
  },
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['maintenance', 'amenity', 'housekeeping', 'extra-bedding', 'other']
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  assignedAt: Date,
  notes: String,
  completedAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

serviceRequestSchema.index({ assignedBy: 1 });
serviceRequestSchema.index({ guestId: 1, status: 1 });
serviceRequestSchema.index({ hotelId: 1, status: 1 });
serviceRequestSchema.index({ assignedTo: 1, status: 1 });

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
export default ServiceRequest;