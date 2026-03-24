// model/booking.js
import mongoose from "mongoose";
import { generateBookingId } from "../utils/helpers.js";

const bookingSchema = new mongoose.Schema(
  {
    // API-facing ID
    id: {
      type: String,
      unique: true,
      default: () => `bkg_${generateBookingId()}`,
      immutable: true,
    },

    // Relations
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },

    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
      index: true,
    },

    // Dates
    checkIn: {
      type: Date,
      required: true,
      index: true,
    },

    checkOut: {
      type: Date,
      required: true,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ["confirmed", "checked-in", "checked-out", "cancelled"],
      default: "confirmed",
      index: true,
    },

    // Amounts
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Optional
    specialRequests: {
      type: String,
    },

    // Check-in / check-out metadata
    checkInTime: Date,
    checkOutTime: Date,

    // Cancellation
    cancellationReason: String,
    refundAmount: Number,

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "staff",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "staff",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
bookingSchema.index({ hotelId: 1, status: 1 });
bookingSchema.index({ hotelId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ roomId: 1, status: 1 });

export default mongoose.model("Booking", bookingSchema);
