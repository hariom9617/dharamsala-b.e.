// model/analytics.js
import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    occupancy: Number,
    revenue: Number,
    totalRooms: Number,
    occupiedRooms: Number,
    availableRooms: Number,
    maintenanceRooms: Number,
    checkIns: Number,
    checkOuts: Number,
    serviceRequests: Number,
    completedServiceRequests: Number,
    averageRating: Number,
    totalGuests: Number
  }
}, {
  timestamps: true
});

// Index for faster date range queries
analyticsSchema.index({ hotelId: 1, date: 1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);
export default Analytics;