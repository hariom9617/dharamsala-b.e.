import Amenity from "../model/amenity.js";
import Hotel from "../model/hotel.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const hotel = await Hotel.findOne({
  hotelId: process.env.DEFAULT_HOTEL_ID
});

if (!hotel) throw new Error("Hotel not found");

const amenities = [
  {
    name: "Swimming Pool",
    hotelId: hotel._id,
    category: "recreation",
    available: true
  },
  {
    name: "Spa & Wellness",
    hotelId: hotel._id,
    category: "wellness",
    available: true
  }
];

await Amenity.insertMany(amenities);
console.log("✅ Amenities seeded");

await mongoose.disconnect();
