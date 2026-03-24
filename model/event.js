import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['meeting', 'inspection', 'maintenance', 'training', 'other'],
    default: 'meeting'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  location: {
    type: String,
    trim: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  roomNumber: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined'],
      default: 'invited'
    }
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly']
  },
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for performance
eventSchema.index({ hotelId: 1, startTime: 1 });
eventSchema.index({ createdBy: 1, startTime: 1 });
eventSchema.index({ 'attendees.userId': 1, startTime: 1 });

// Virtual for formatted date
eventSchema.virtual('formattedStartTime').get(function() {
  return this.startTime.toISOString();
});

eventSchema.virtual('formattedEndTime').get(function() {
  return this.endTime ? this.endTime.toISOString() : null;
});

// Ensure virtuals are included in JSON
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

const Event = mongoose.model('Event', eventSchema);

export default Event;
