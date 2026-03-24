// model/amenity.js
import mongoose from 'mongoose';

const amenitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'hotel',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['recreation', 'wellness', 'dining', 'business', 'fitness', 'other']
  },
  image: {
    type: String,
    required: true
  },
  gallery: [{
    type: String
  }],
  available: {
    type: Boolean,
    default: true
  },
  operatingHours: String,
  location: String,
  bookingRequired: {
    type: Boolean,
    default: false
  },
  bookingPhone: String,
  rules: [String]
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Indexes
amenitySchema.index({ hotelId: 1 });
amenitySchema.index({ category: 1 });
amenitySchema.index({ available: 1 });

const Amenity = mongoose.model('Amenity', amenitySchema);

export default Amenity;