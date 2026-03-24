// routes/index.js
import { Router } from "express";
import hotelRoute from "./hotelRoute.js"; 
import feedbackRoutes from "./feedbackRoute.js";
import authRoutes from "./authRoute.js";
import staffRoutes from "./staffRoute.js";
import roomRoute from "./roomRoute.js";
import bookingRoute from "./bookingRoute.js";
import guestRoute from "./guestRoute.js";
import posOrderRoutes from './posOrderRoute.js';
import housekeepingRoutes from './housekeepingRoute.js';
import serviceRequestRoutes from './serviceRequestRoute.js';
import inventoryRoutes from './inventoryRoute.js';
import analyticsRoutes from './analyticsRoute.js';
import publicRoutes from './publicRoute.js';
import menuItemRoutes from './menuItemRoute.js';
import calendarRoutes from './calendarRoute.js';
import eventRoutes from "./eventRoute.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "JTS API" });
});

router.use("/hotels", hotelRoute);
router.use("/feedback", feedbackRoutes);
router.use("/auth", authRoutes);
router.use("/staff", staffRoutes);
router.use("/rooms", roomRoute);
router.use("/bookings", bookingRoute);
router.use("/guests", guestRoute);
router.use("/pos-orders", posOrderRoutes);
router.use("/housekeeping", housekeepingRoutes);
router.use("/service-requests", serviceRequestRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/menu-items", menuItemRoutes);
router.use("/calendar", calendarRoutes);
router.use("/events", eventRoutes);

// Public routes (no auth required) - for guest hotel  discovery
router.use("/public", publicRoutes);

export default router;