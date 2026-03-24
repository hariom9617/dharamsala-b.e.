// jobs/updateAnalytics.js
import cron from 'node-cron';
import Analytics from '../model/analytics.js';
import Booking from '../model/booking.js';
import Room from '../model/room.js';
import Feedback from '../model/feedback.js';
import ServiceRequest from '../model/serviceRequest.js';

const updateDailyAnalytics = async () => {
  try {
    const hotels = await Hotel.find({});
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    for (const hotel of hotels) {
      const [bookings, rooms, feedback, serviceRequests] = await Promise.all([
        Booking.aggregate([
          { 
            $match: { 
              hotelId: hotel._id,
              checkIn: { $lte: today },
              checkOut: { $gte: today }
            } 
          },
          { 
            $group: { 
              _id: null, 
              revenue: { $sum: '$totalAmount' },
              count: { $sum: 1 }
            } 
          }
        ]),
        Room.aggregate([
          { $match: { hotelId: hotel._id } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        Feedback.aggregate([
          { 
            $match: { 
              hotelId: hotel._id,
              createdAt: { 
                $gte: new Date(today.getFullYear(), today.getMonth(), 1),
                $lte: today
              }
            } 
          },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]),
        ServiceRequest.countDocuments({ 
          hotelId: hotel._id,
          status: 'pending'
        })
      ]);

      const roomStatus = rooms.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});

      await Analytics.findOneAndUpdate(
        { hotelId: hotel._id, date: today },
        {
          $set: {
            metrics: {
              occupancy: (roomStatus.occupied / (roomStatus.available + roomStatus.occupied)) * 100 || 0,
              revenue: bookings[0]?.revenue || 0,
              totalRooms: (roomStatus.available || 0) + (roomStatus.occupied || 0) + (roomStatus.maintenance || 0),
              occupiedRooms: roomStatus.occupied || 0,
              availableRooms: roomStatus.available || 0,
              maintenanceRooms: roomStatus.maintenance || 0,
              checkIns: 0, // You'll need to implement this
              checkOuts: 0, // You'll need to implement this
              serviceRequests: serviceRequests,
              averageRating: feedback[0]?.avgRating || 0
            }
          }
        },
        { upsert: true, new: true }
      );
    }
    console.log('Daily analytics updated successfully');
  } catch (error) {
    console.error('Error updating analytics:', error);
  }
};

// Run at midnight every day
cron.schedule('0 0 * * *', updateDailyAnalytics);

// For testing, you can run it immediately
// updateDailyAnalytics().catch(console.error);