// model/menuItem.js
import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    // Multi-tenant isolation
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true
    },

    // Basic item information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    category: {
      type: String,
      required: true,
      enum: ["Breakfast", "Beverages", "Main Course", "Appetizers", "Desserts", "Snacks", "Soups", "Salads"],
      index: true
    },

    image: {
      type: String,
      required: false,
      trim: true
    },

    // Availability
    available: {
      type: Boolean,
      default: true,
      index: true
    },

    // Preparation details
    preparationTime: {
      type: Number, // in minutes
      required: true,
      min: 1,
      max: 120
    },

    // Dietary information
    isVegetarian: {
      type: Boolean,
      default: false
    },


    allergens: [{
      type: String,
      enum: ["Dairy", "Eggs", "Fish", "Shellfish", "Tree Nuts", "Peanuts", "Wheat", "Soy", "Sesame", "Gluten", "None"]
    }]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
menuItemSchema.index({ hotelId: 1, category: 1 });
menuItemSchema.index({ hotelId: 1, available: 1 });
menuItemSchema.index({ hotelId: 1, category: 1, available: 1 });
menuItemSchema.index({ name: "text", description: "text" });

export default mongoose.model("MenuItem", menuItemSchema);
