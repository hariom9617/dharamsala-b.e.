import express from "express";
import auth from "../middleware/auth.js";
import { requirePermission, canManageUser } from "../middleware/permissions.js";
import staffController from "../src/staff/staff.controller.js";

const router = express.Router();

router.use(auth);

router.get("/", requirePermission("staff.view"), staffController.getAll.bind(staffController));
router.post("/", requirePermission("staff.create"), staffController.create.bind(staffController));

router.get("/hotel/:hotelId", requirePermission("staff.view"), staffController.getByHotelId.bind(staffController));

router.get("/:id", requirePermission("staff.view"), staffController.getById.bind(staffController));
router.put("/:id", requirePermission("staff.update"), canManageUser, staffController.update.bind(staffController));
router.delete("/:id", requirePermission("staff.delete"), canManageUser, staffController.remove.bind(staffController));

export default router;
