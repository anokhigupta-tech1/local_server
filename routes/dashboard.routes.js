// routes/dashboard.routes.js
import express from "express";
// import {
//   getDashboardStats,
//   getPendingVerifications,
//   approveProfessional,
//   getRecentActivity,
//   getRevenueChart
// } from "../controllers/dashboard.controller.js";
// import { protect, authorize } from "../middlewares/auth.middleware.js";

import { approveProfessional, getDashboardStats, getPendingVerifications, getRecentActivity, getRevenueChart } from "../controllers/dashboard.controller.js";
import { protect } from "../middlewares/auth.midleware.js";

const router = express.Router();

// All dashboard routes require authentication and admin/service provider role
router.use(protect);


router.get("/stats", getDashboardStats);
router.get("/pending-verifications", getPendingVerifications);
router.put("/approve-professional/:professionalId", approveProfessional);
router.get("/recent-activity", getRecentActivity);
router.get("/revenue-chart", getRevenueChart);

export const dashboardRouter=router;