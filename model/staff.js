import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
      lowercase: true
    },

    role: {
      type: String,
      enum: ['admin', 'director', 'manager', 'staff'],
      default: 'staff',
      required: true
    },

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    },

    temporaryAccess: [
      {
        role: {
          type: String,
          lowercase: true,
          trim: true
        },
        allowedPermissions: {
          type: [String],
          default: []
        },
        expiresAt: {
          type: Date,
          required: true
        },
        grantedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Staff'
        }
      }
    ],

    lastLogin: {
      type: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model('Staff', staffSchema);
