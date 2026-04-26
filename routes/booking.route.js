// In your routes file
import express from "express";
import { protect } from "../middlewares/auth.midleware.js";
import {
  cancelBooking,
  createBooking,
  getAllBookings,
  getAvailableTimeSlots,
  getBookingById,
  getUserBookings,
  updateBookingStatus,
  updatePaymentStatus,
  verifyRazorpayPayment,
} from "../controllers/booking.controller.js";

const router = express.Router();

// User routes
router.post("/", protect, createBooking);
router.get("/bookings", protect, getUserBookings);
router.get("/bookings/:id", protect, getBookingById);
router.put("/bookings/:id/cancel", protect, cancelBooking);

router.get("/available-slots", protect, getAvailableTimeSlots);
router.put("/bookings/:id/payment", protect, updatePaymentStatus);
// Admin routes
router.get("/admin/bookings", protect, getAllBookings);
router.put("/admin/bookings/:id/status", protect, updateBookingStatus);
router.post("/verify-payment", protect, verifyRazorpayPayment);

export const bookingRouter = router;
