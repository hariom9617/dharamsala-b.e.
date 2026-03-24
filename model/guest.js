import mongoose from 'mongoose';

// Guest schema for hotel guests only
const guestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      unique: true,
      lowercase: true
    },
    role: {
      type: String,
      default: 'guest',
      required: true
    },

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true
    },

    // Distinguish walk-in vs self-registered guests
    registrationType: {
      type: String,
      enum: ['self', 'walk-in'],
      default: 'self'
    },

    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },

    idType: {
      type: String,
      enum: ["Aadhar", "Passport", "Driving License", "Voter ID", "PAN Card"]
    },

    idNumber: {
      type: String
    },

    notes: {
      type: String
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    },

    lastLogin: {
      type: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model('Guest', guestSchema);
