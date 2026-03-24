import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

import connectDB from "./utils/dbConnect.js";
import routes from "./routes/index.js";
import amenityRoutes from "./routes/amenityRoute.js";
import { errorHandler } from "./utils/errors.js";

/* ==================== ENV ==================== */
dotenv.config({ override: true });

/* ==================== APP ==================== */
const app = express();

/* ==================== PROXY TRUST ==================== */
// Required when running behind Nginx / Load Balancer
app.set("trust proxy", true);

/* ==================== MIDDLEWARE ==================== */
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* ==================== ROUTES ==================== */
app.use("/api", routes);
app.use("/api/amenities", amenityRoutes);

/* ==================== HEALTH CHECK ==================== */
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

/* ==================== ERROR HANDLER ==================== */
app.use(errorHandler);

/* ==================== SERVER ==================== */
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 API running on port ${PORT}
        Listening on ALL IPs`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
};

startServer();

/* ==================== GRACEFUL SHUTDOWN ==================== */
const shutdown = () => {
  console.log("🛑 Shutting down server...");
  server?.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
console.log("🔥 DEPLOY TEST:", new Date().toISOString());
