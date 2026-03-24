// model/feedback.js
import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true,
    index: true
  },
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  },
  bookingId: {
    type: String,
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  category: {
    type: String,
    required: true,
    enum: ['service', 'room', 'food', 'facilities', 'cleanliness', 'staff', 'other']
  },
  comment: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Indexes for better query performance
feedbackSchema.index({ hotelId: 1, createdAt: -1 });
feedbackSchema.index({ guestId: 1, createdAt: -1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ category: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;