import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../model/staff.js";
import Hotel from "../model/hotel.js";
import Guest from "../model/guest.js";
import axios from "axios";

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

async function ensureAdmin() {
  const hotel = await Hotel.findOne({ hotelId: process.env.DEFAULT_HOTEL_ID });
  if (!hotel) throw new Error("Hotel not found");

  let admin = await User.findOne({
    phone: process.env.ADMIN_PHONE,
    role: "admin"
  });

  if (!admin) {
    admin = await User.create({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      phone: process.env.ADMIN_PHONE,
      countryCode: process.env.ADMIN_COUNTRY_CODE,
      role: "admin",
      hotelId: hotel._id,
      isActive: true,
      isAdmin: true,
      permissions: ["all"]
    });

    await Guest.create({
      userId: admin._id,
      hotelId: hotel._id,
      phone: process.env.ADMIN_PHONE,
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      isAdmin: true,
      countryCode: process.env.ADMIN_COUNTRY_CODE,
      type: "admin",
      status: "active"
    });

    console.log("✅ Admin created");
  } else {
    console.log("ℹ️ Admin already exists");
  }
}

ensureAdmin()
  .then(() => mongoose.disconnect())
  .catch(console.error);
