// model/housekeepingTask.js
import mongoose from "mongoose";
import { generateHousekeepingId } from "../utils/helpers.js";

const housekeepingTaskSchema = new mongoose.Schema(
  {
    // API-facing ID
    id: {
      type: String,
      unique: true,
      immutable: true,
      default: () => `hk_${generateHousekeepingId()}`,
      index: true
    },

    // Relations
    hotelId: {
      type: String,  // Changed from ObjectId to String
      required: true,
      index: true
    },

    roomId: {
      type: String,
      required: true,
      index: true
    },

    assignedTo: {
      type: String,  // Changed from ObjectId to String
      index: true
    },

    completedBy: {
      type: String   // Changed from ObjectId to String
    },

    // Task Details
    roomNumber: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["cleaning", "turndown", "deep-clean", "maintenance", "inspection"],
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
      index: true
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    scheduledAt: {
      type: Date,
      required: true,
      index: true
    },

    startedAt: Date,
    completedAt: Date,

    // Soft Delete (Future Safe)
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: Date
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound Indexes
housekeepingTaskSchema.index({ hotelId: 1, scheduledAt: 1 });
housekeepingTaskSchema.index({ hotelId: 1, status: 1 });
housekeepingTaskSchema.index({ assignedTo: 1, status: 1 });
housekeepingTaskSchema.index({ type: 1, priority: 1 });

// Removed the virtual for assignedToName since we're using string IDs
// and can't populate with string IDs

// Lifecycle Hook (Improved)
housekeepingTaskSchema.pre("save", function (next) {
  if (!this.isModified("status")) return next();

  const now = new Date();

  switch (this.status) {
    case "in-progress":
      if (!this.startedAt) {
        this.startedAt = now;
      }
      break;

    case "completed":
      if (!this.completedAt) {
        this.completedAt = now;
      }
      if (!this.completedBy && this.assignedTo) {
        this.completedBy = this.assignedTo;
      }
      break;

    case "cancelled":
      this.completedAt = null;
      this.completedBy = null;
      break;
  }

  next();
});

// Query Helper (Cleaner Controllers)
housekeepingTaskSchema.query.active = function () {
  return this.where({ isDeleted: false });
};

export default mongoose.model("HousekeepingTask", housekeepingTaskSchema);