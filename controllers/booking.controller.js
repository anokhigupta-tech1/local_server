import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandller.js";
import { User } from "../models/User.js";
import { Service } from "../models/service.model.js";
import { Booking } from "../models/booking.model.js";
import {
  sendBookingConfirmationEmail,
  sendProfessionalNotificationEmail,
} from "../utils/emailService.js";
import AppError from "../utils/appError.js";

// export const createBooking = async (req, res) => {
//   const customerId = req.user._id;

//   const {
//     serviceId,
//     serviceDate,
//     timeSlot,
//     totalAmount,
//     paymentStatus = "pending",
//     status = "pending",
//   } = req.body;

//   // ✅ Validate required fields
//   if (!serviceId || !serviceDate || !timeSlot || !totalAmount) {
//     return res.status(400).json({
//       success: false,
//       message:
//         "Missing required fields: serviceId, serviceDate, timeSlot, totalAmount are required",
//     });
//   }

//   try {
//     // ✅ Validate user
//     const user = await User.findById(customerId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // ✅ Validate service
//     const service = await Service.findById(serviceId);
//     if (!service) {
//       return res.status(404).json({
//         success: false,
//         message: "Service not found",
//       });
//     }

//     // ✅ Parse service date safely
//     const serviceDateTime = new Date(serviceDate);

//     if (isNaN(serviceDateTime.getTime())) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid service date format",
//       });
//     }

//     // ✅ Normalize current date
//     const currentDate = new Date();
//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);

//     // ❌ Prevent past service date
//     if (serviceDateTime < todayStart) {
//       return res.status(400).json({
//         success: false,
//         message: "Service date cannot be in the past",
//       });
//     }

//     // ✅ Check slot availability
//     const existingBooking = await Booking.findOne({
//       service: serviceId,
//       serviceDate: serviceDateTime,
//       timeSlot,
//       status: { $nin: ["cancelled", "completed"] },
//     });

//     if (existingBooking) {
//       return res.status(409).json({
//         success: false,
//         message: `Time slot ${timeSlot} is already booked for ${serviceDate}`,
//       });
//     }

//     // ⚠️ Optional price validation
//     if (service.price && totalAmount !== service.price) {
//       console.warn(
//         `Total amount ${totalAmount} doesn't match service price ${service.price}`,
//       );
//     }

//     // ✅ Create booking (IMPORTANT CHANGE HERE)
//     const booking = await Booking.create({
//       user: customerId,
//       service: serviceId,

//       // 🔥 FIX: Auto set booking date
//       bookingDate: new Date(),

//       serviceDate: serviceDateTime,
//       timeSlot,
//       totalAmount,
//       paymentStatus,
//       status,
//     });

//     // ✅ Populate response
//     const populatedBooking = await Booking.findById(booking._id)
//       .populate("user", "name email phone")
//       .populate("service", "name description price duration");

//     return res.status(201).json({
//       success: true,
//       message: "Booking created successfully",
//       data: populatedBooking,
//     });
//   } catch (error) {
//     console.error("Error creating booking:", error);

//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: "Duplicate booking detected",
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: "Failed to create booking",
//       error: error.message,
//     });
//   }
// };

// Additional useful controllers

// ✅ Populate response

export const createBooking = asyncHandler(async (req, res) => {
  const customerId = req.user._id;

  const {
    serviceId,
    serviceDate,
    timeSlot,
    customerDetails,
    totalAmount,
    paymentStatus = "pending",
    status = "pending",
  } = req.body;

  // ✅ 1. Validate required fields
  if (!serviceId || !serviceDate || !timeSlot || !totalAmount) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: serviceId, serviceDate, timeSlot, totalAmount are required",
    });
  }

  // ✅ 2. Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid service ID",
    });
  }

  // ✅ 3. Validate user
  const user = await User.findById(customerId).select("name email phone");
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // ✅ 4. Validate service + populate professional
  const service = await Service.findById(serviceId)
    .select(" pricing duration professional userId location serviceName title")
    .populate("professional", "categoryName")
    .populate("userId", "name email");

  if (!service) {
    throw new AppError(404, "this service is not available at thi time slot");
  }

  // ✅ 5. Validate & parse date
  const serviceDateTime = new Date(serviceDate);
  if (isNaN(serviceDateTime.getTime())) {
    throw new AppError(422, "Invalid service date format");
  }

  // Prevent past booking
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (serviceDateTime < todayStart) {
    throw new AppError(422, "Service date cannot be in the past");
  }

  // ✅ 6. Prevent double booking (CRITICAL)
  const existingBooking = await Booking.findOne({
    service: serviceId,
    serviceDate: serviceDateTime,
    timeSlot,
    status: { $nin: ["cancelled", "completed"] },
  });

  if (existingBooking) {
    throw new AppError(
      409,
      `Time slot ${timeSlot} is already booked for ${serviceDate}`,
    );

    ƒ;
  }

  // ✅ 7. Optional price validation
  if (service.pricing && totalAmount !== service.pricing) {
    console.warn(
      `⚠️ Price mismatch: received ${totalAmount}, expected ${service.price}`,
    );
  }

  // ✅ 8. Create booking
  const booking = await Booking.create({
    user: customerId,
    service: serviceId,
    professinalId: service.professional._id,
    bookingDate: new Date(),
    serviceDate: serviceDateTime,
    timeSlot,
    totalAmount,
    paymentStatus,
    status,
  });

  // ✅ 9. Populate booking for response + emails
  const populatedBooking = await Booking.findById(booking._id)
    .populate("user", "name email phone")
    .populate({
      path: "service",
      select: "name price duration professional",
      populate: {
        path: "professional",
        select: "name email",
      },
    })
    .lean();

  const formattedDate = serviceDateTime.toDateString();
  const formattedTime = timeSlot;
  console.log(service);
  const emailPayload = {
    bookingId: populatedBooking._id.toString(),
    serviceName: service.serviceName,
    servicePrice: totalAmount,
    bookingDate: formattedDate,
    bookingTime: formattedTime,
    location: service?.location,
  };

  // ✅ 11. Send emails (NON-BLOCKING 🔥)
  Promise.allSettled([
    // Customer email
    customerDetails?.email &&
      sendBookingConfirmationEmail({
        ...emailPayload,
        userEmail: customerDetails.email,
        userName: customerDetails.name,
        professionalName: service?.professional?.user?.name || "Professional",
        message: "Created",
      }),

    // Professional email
    service?.professional?.user?.email &&
      sendProfessionalNotificationEmail({
        ...emailPayload,
        professionalEmail: service?.professional?.user?.email,
        professionalName: service?.professional?.user?.name,
        customerName: customerDetails.name,
      }),
  ]).then((results) => {
    console.log(results);
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          index === 0
            ? "❌ Customer email failed"
            : "❌ Professional email failed",
          result.reason,
        );
      }
    });
  });

  // ✅ 12. Final response
  return res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data: populatedBooking,
  });
});

/**
 * Get all bookings for the authenticated user
 */
export const getUserBookings = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { status, page = 1, limit = 10 } = req.query;

  const query = { user: customerId };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const bookings = await Booking.find(query)
    .populate("service", "serviceName title price duration")
    .populate("user", "name email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(query);

  return res.status(200).json({
    success: true,
    data: bookings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get a single booking by ID
 */
export const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customerId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking ID",
    });
  }

  const booking = await Booking.findOne({
    _id: id,
    user: customerId,
  })
    .populate("user", "name email phone address")
    .populate("service", "name description price duration category");

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: booking,
  });
});

/**
 * Cancel a booking
 */
export const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customerId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking ID",
    });
  }

  const booking = await Booking.findOne({
    _id: id,
    user: customerId,
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  // Check if booking can be cancelled (e.g., not already completed or cancelled)
  if (booking.status === "completed") {
    return res.status(400).json({
      success: false,
      message: "Cannot cancel a completed booking",
    });
  }

  if (booking.status === "cancelled") {
    return res.status(400).json({
      success: false,
      message: "Booking is already cancelled",
    });
  }

  // Optional: Check cancellation deadline (e.g., 24 hours before service)
  const serviceDateTime = new Date(booking.serviceDate);
  const currentDateTime = new Date();
  const hoursUntilService =
    (serviceDateTime - currentDateTime) / (1000 * 60 * 60);

  if (hoursUntilService < 24) {
    return res.status(400).json({
      success: false,
      message:
        "Bookings can only be cancelled at least 24 hours before service time",
    });
  }

  booking.status = "cancelled";
  await booking.save();

  return res.status(200).json({
    success: true,
    message: "Booking cancelled successfully",
    data: booking,
  });
});

/**
 * Get available time slots for a service on a specific date
 */
export const getAvailableTimeSlots = asyncHandler(async (req, res) => {
  console.log("object");
  const { serviceId, date } = req.query;
  console.log("serviceId");
  if (!serviceId || !date) {
    return res.status(400).json({
      success: false,
      message: "Service ID and date are required",
    });
  }

  // Define your available time slots (this can be dynamic based on service)
  const allTimeSlots = [
    "09:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "12:00 PM - 01:00 PM",
    "02:00 PM - 03:00 PM",
    "03:00 PM - 04:00 PM",
    "04:00 PM - 05:00 PM",
  ];

  const serviceDate = new Date(date);
  serviceDate.setHours(0, 0, 0, 0);

  // Get booked time slots for this service on the given date
  const bookedBookings = await Booking.find({
    service: serviceId,
    serviceDate: {
      $gte: serviceDate,
      $lt: new Date(serviceDate.getTime() + 24 * 60 * 60 * 1000),
    },
    status: { $nin: ["cancelled", "completed"] },
  });

  const bookedSlots = bookedBookings.map((booking) => booking.timeSlot);
  console.log(bookedSlots);
  const availableSlots = allTimeSlots.filter(
    (slot) => !bookedSlots.includes(slot),
  );
  console.log(availableSlots);
  return res.status(200).json({
    success: true,
    data: {
      date,
      availableSlots,
      bookedSlots,
    },
  });
});

/**
 * Admin: Get all bookings (for admin panel)
 */
export const getAllBookings = asyncHandler(async (req, res) => {
  const { status, paymentStatus, page = 1, limit = 10 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  const skip = (page - 1) * limit;

  const bookings = await Booking.find(query)
    .populate("user", "name email phone")
    .populate("service", "name description price")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(query);

  return res.status(200).json({
    success: true,
    data: bookings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Admin: Update booking status
 */
// Example usage in your booking confirmation API route
export async function updateBookingStatus(req, res) {
  const { status } = req.body;
  const { id: bookingId } = req.params;

  try {
    // Fix: Correct populate syntax - remove quotes and use array or object
    const booking = await Booking.findByIdAndUpdate(
      { _id: bookingId },
      { status },
    );
    // Check if booking exists
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    if (status === "confirmed") {
      // Validate required data before sending email
      if (!booking.userId?.email) {
        console.error("Customer email not found for booking:", bookingId);
      } else {
        // Send confirmation email to customer
        const emailResult = await sendBookingConfirmationEmail({
          userEmail: booking.userId.email,
          userName: booking.userId.name || "Customer",
          bookingId: booking._id,
          serviceName: booking.serviceId?.name || "Service",
          servicePrice: booking.serviceId?.price || 0,
          professionalName: booking.professionalId?.name || "Professional",
          bookingDate: booking.serviceDate
            ? new Date(booking.serviceDate).toLocaleDateString()
            : "Date to be confirmed",
          bookingTime: booking.timeSlot || "Time to be confirmed",
          duration: booking.serviceId?.duration || "1 hour",
          location: booking.address || "To be confirmed",
          notes: booking.notes || "No special notes",
        });

        if (emailResult.success) {
          console.log("Confirmation email sent to customer");
        } else {
          console.error(
            "Failed to send confirmation email:",
            emailResult.error,
          );
        }
      }

      // Optional: Send notification to professional
      if (booking.professionalId?.email) {
        await sendProfessionalNotificationEmail({
          professionalEmail: booking.professionalId.email,
          professionalName: booking.professionalId.name,
          customerName: booking.userId?.name || "Customer",
          bookingId: booking._id,
          serviceName: booking.serviceId?.name,
          servicePrice: booking.serviceId?.price,
          bookingDate: booking.serviceDate
            ? new Date(booking.serviceDate).toLocaleDateString()
            : "Date to be confirmed",
          bookingTime: booking.timeSlot,
          customerNotes: booking.notes,
        }).catch((err) => {
          console.error("Failed to send professional notification:", err);
        });
      }
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export const updatePaymentStatus = async (req, res) => {
  const bookingId = req.params.id;

  const { paymentId, paymentStatus } = req.body;

  try {
    // ✅ Validate booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // 🔐 Optional: ensure user owns booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // ✅ Validate payment status
    const validStatuses = ["pending", "paid", "failed"];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    // ⚠️ Prevent re-payment (important logic)
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment already completed",
      });
    }

    // ✅ Update fields
    booking.paymentStatus = paymentStatus;

    if (paymentStatus === "paid") {
      booking.paymentId = paymentId || null;
      booking.paymentDate = new Date();
    }

    if (paymentStatus === "failed") {
      booking.paymentId = paymentId || null;
    }

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Error updating payment:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message,
    });
  }
};
