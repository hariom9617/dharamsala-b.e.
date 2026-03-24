import mongoose from "mongoose";
import { generateRoomId } from "../utils/helpers.js";

const roomSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      default: () => `room_${generateRoomId()}`,
      immutable: true
    },

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true
    },

    roomNumber: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      enum: ["deluxe", "premium", "suite", "other"],
      required: true,
      index: true
    },

    customCategoryLabel: {
      type: String,
      trim: true,
      maxlength: 50,
      validate: {
        validator: function (value) {
          // customCategoryLabel is required only when category is "other"
          if (this.category === "other" && !value) {
            return false;
          }
          // customCategoryLabel should not be set for standard categories
          if (this.category !== "other" && value) {
            return false;
          }
          return true;
        },
        message: props => {
          if (props.instance.category === "other") {
            return "customCategoryLabel is required when category is 'other'";
          }
          return "customCategoryLabel should only be set when category is 'other'";
        }
      }
    },

    floor: {
      type: Number,
      required: true
    },

    maxOccupancy: {
      type: Number,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    amenities: {
      type: [String],
      default: []
    },

    status: {
      type: String,
      enum: ["available", "occupied", "maintenance", "cleaning"],
      default: "available",
      index: true
    },

    currentBooking: {
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        default: null
      },
      guestName: String,
      checkIn: Date,
      checkOut: Date
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff"
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff"
    }
  },
  { timestamps: true }
);

roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

export default mongoose.model("Room", roomSchema);