// model/hotel.js
import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema(
  {
    /* ---------------- BASIC INFO ---------------- */
    name: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
      maxlength: 100,
    },

    hotelId: {
      type: String,
      unique: true,
      uppercase: true,
      index: true,
    },

    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },

    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },

    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },

    /* ---------------- ROOMS ---------------- */
    // Note: totalRooms is calculated dynamically from Room collection
    // See virtual property below

    /* ---------------- RATING ---------------- */
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (v) => Math.round(v * 10) / 10,
    },

    /* ---------------- STATUS ---------------- */
    status: {
      type: String,
      enum: ["active", "closed", "maintenance"],
      default: "active",
      index: true,
    },

    /* ---------------- STAFF ---------------- */
    assignedManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },

    assignedDirector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },

    /* ---------------- META ---------------- */
    amenities: {
      type: [String],
      default: [],
    },

    description: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    contact: {
      email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email"],
      },
      phone: {
        type: String,
        trim: true,
        match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
      },
    },
  },
  {
    timestamps: true,
     id: false,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ---------------- VIRTUALS ---------------- */
// Note: totalRooms must be populated manually via aggregation query
// Use Room.countDocuments({ hotelId: hotel._id }) in the service layer
// Virtual fields cannot perform async operations or database queries

/* ---------------- TEXT SEARCH ---------------- */
hotelSchema.index({
  name: "text",
  location: "text",
  city: "text",
  country: "text",
});

/* ---------------- SAFE HOTEL ID GENERATION ---------------- */
 
// Remove the entire pre-save hook and replace it with:
hotelSchema.pre("save", async function (next) {
  if (this.hotelId) return next();
  
  // Generate a random 4-digit number instead of using a counter
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  this.hotelId = `HOTEL-${randomNum}`;
  
  // Check if this ID already exists
  const existingHotel = await this.constructor.findOne({ hotelId: this.hotelId });
  if (existingHotel) {
    // If ID exists, try again (very unlikely with random 4-digit number)
    return this.save(); // This will generate a new random number
  }
  
  next();
});

const Hotel = mongoose.model("Hotel", hotelSchema);
export default Hotel;
