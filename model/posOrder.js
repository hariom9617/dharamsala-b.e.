import mongoose from "mongoose";
import { generatePOSOrderId } from "../utils/helpers.js";

const posOrderSchema = new mongoose.Schema(
  {
    // Public Order ID
    id: {
      type: String,
      unique: true,
      default: () => `pos_${generatePOSOrderId()}`,
      immutable: true,
      index: true
    },

    // Multi-tenant isolation
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true
    },

    // Order placed by Guest
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
      index: true
    },

    // Room where order was placed
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: false,
      index: true
    },

    // Staff who processed/refunded/cancelled (optional)
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null
    },

    // Order Items (Embedded - Single Schema Structure)
    items: [
      {
        name: {
          type: String,
          required: true,
          trim: true
        },
        price: {
          type: Number,
          required: true,
          min: 0
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        }
      }
    ],

    // Final total (calculated in service layer ONLY)
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash", "card", "upi", "wallet"]
    },

    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
      index: true
    },

    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);



// Fast hotel-level queries
posOrderSchema.index({ hotelId: 1, createdAt: -1 });

// Fast guest-level queries
posOrderSchema.index({ guestId: 1, createdAt: -1 });

// Fast room-level queries
posOrderSchema.index({ roomId: 1, createdAt: -1 });

// Optional search index (only keep if needed)
posOrderSchema.index({ "items.name": "text" });

export default mongoose.model("POSOrder", posOrderSchema);
