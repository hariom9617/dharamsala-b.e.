import express from "express";
import auth from "../middleware/auth.js";
import RoomController from "../src/room/room.controller.js";
import { requirePermission } from "../middleware/permissions.js";

const router = express.Router();

// Public route for checking room availability
router.get("/available", auth, RoomController.getAvailableRooms);

// Protected routes for admin/manager operations
router.get("/total-count", auth, requirePermission("room.view"), RoomController.getTotalRoomsCount);
router.get("/categories", auth, requirePermission("room.view"), RoomController.getRoomsByCategory);
router.get("/statistics", auth, requirePermission("room.view"), RoomController.getRoomStatistics);

// List and detail routes
router.get("/", auth, requirePermission("room.view"), RoomController.getAll);
router.get("/:id", auth, requirePermission("room.view"), RoomController.getById);

// Mutations
router.post("/", auth, requirePermission("room.create"), RoomController.create);
router.put("/:id", auth, requirePermission("room.update"), RoomController.update);
router.patch("/:id/status", auth, requirePermission("room.update"), RoomController.updateStatus);
router.delete("/:id", auth, requirePermission("room.delete"), RoomController.remove);

export default router;
