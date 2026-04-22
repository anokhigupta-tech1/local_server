// routes/earnings.routes.js
import express from "express";
import {
  getEarningsOverview,
  getEarningsChart,
  getRecentEarnings,
  getEarningsByCategory,
  withdrawEarnings,
  getEarningsSummary
} from "../controllers/earnings.controller.js";
import { protect } from "../middlewares/auth.midleware.js";

const router = express.Router();

// All earnings routes require authentication
router.use(protect);


// Earnings routes
router.get("/overview", getEarningsOverview);
router.get("/chart", getEarningsChart);
router.get("/recent", getRecentEarnings);
router.get("/by-category", getEarningsByCategory);
router.get("/summary", getEarningsSummary);
router.post("/withdraw", withdrawEarnings);

export const earningRouter= router;