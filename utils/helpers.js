// utils/helpers.js
import Hotel from "../model/hotel.js";
import mongoose from "mongoose";

export async function generateHotelId() {
  const counter = await mongoose.connection
    .collection("counters")
    .findOneAndUpdate(
      { _id: "hotelId" },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );

  return `HTL${String(counter.seq).padStart(3, "0")}`;
}

// Generate Room ID (e.g. room_ab12cd)
export const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Generate Booking ID (e.g. bkg_x9k2p4)
export const generateBookingId = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Generate Guest ID (e.g. gst_k4m9q2)
export const generateGuestId = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Format date to YYYY-MM-DD
export const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
};

// Generate POS Order ID (e.g. pos_x9k2p4)
export const generatePOSOrderId = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Generate Housekeeping Task ID (e.g. hk_x9k2p4)
export const generateHousekeepingId = () => {
  return Math.random().toString(36).substring(2, 8);
};