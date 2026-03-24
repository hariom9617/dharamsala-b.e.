import mongoose from "mongoose";
import dotenv from "dotenv";
import Hotel from "../model/hotel.js";
import User from "../model/staff.js";

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const DEFAULT_HOTEL = {
  name: process.env.DEFAULT_HOTEL_NAME,
  hotelId: process.env.DEFAULT_HOTEL_ID,
  location: process.env.DEFAULT_HOTEL_LOCATION,
  city: process.env.DEFAULT_HOTEL_CITY,
  country: process.env.DEFAULT_HOTEL_COUNTRY,
  totalRooms: Number(process.env.DEFAULT_HOTEL_TOTAL_ROOMS),
  occupiedRooms: 0,
  rating: Number(process.env.DEFAULT_HOTEL_RATING),
  status: process.env.DEFAULT_HOTEL_STATUS,
  manager: process.env.DEFAULT_HOTEL_MANAGER,
  director: process.env.DEFAULT_HOTEL_DIRECTOR,
  phone: process.env.DEFAULT_HOTEL_PHONE,
  email: process.env.DEFAULT_HOTEL_EMAIL,
};

async function ensureDefaultHotel() {
  try {
    let hotel = await Hotel.findOne({ hotelId: DEFAULT_HOTEL.hotelId });

    if (!hotel) {
      console.log("🏨 Creating default hotel...");
      hotel = await Hotel.create(DEFAULT_HOTEL);
      console.log("✅ Hotel created:", hotel._id);
    } else {
      console.log("✅ Hotel already exists");
    }
  } catch (err) {
    console.error("❌ Hotel seed failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

ensureDefaultHotel();
