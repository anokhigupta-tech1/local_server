// controllers/professionalService.controller.js
// import { Professional } from "../models/professional.model.js";
// import { Service } from "../models/service.model.js";
// import { Availability } from "../models/availability.model.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { AppError } from "../utils/AppError.js";
// import { successResponse } from "../utils/successResponse.js";

import bcrypt from "bcryptjs";
import { Availability } from "../models/availability.model.js";
import { Booking } from "../models/booking.model.js";
import { Professional } from "../models/professional.model.js";
import { Service } from "../models/service.model.js";
import { User } from "../models/User.js";
import AppError from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandller.js";
import { successResponse } from "../utils/response.js";

// Create professional profile and services
export const createProfessionalProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, password, pricing, experience, categoryName } =
    req.body;

  // 1. Check existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(400, "User already exists");
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Create user
  const user = await User.create({
    name,
    email,
    phone,
    pricing,
    experience,
    role: "professional",
    password: hashedPassword,
  });

  if (!user) {
    throw new AppError(500, "Failed to create user");
  }

  const token = await generateToken(user);
  if (!token) {
    throw new AppError(400, "token not generated");
  }
  // 4. Create professional profile
  const professional = await Professional.create({
    user: user._id,
    experience,
    categoryName,
    pricing: pricing,
  });

  if (!professional) {
    throw new AppError(500, "Failed to create professional profile");
  }

  return res.status(201).json({
    success: true,
    data: { professional, user, token },
    message: "Professional profile created successfully",
  });
});

export const getProfessionalProfile = asyncHandler(async (req, res) => {
  // ✅ Step 1: Get Professional
  const professional = await Professional.findOne({
    user: req.user._id,
  })
    .populate("user", "name email phone")
    .lean();

  if (!professional) {
    throw new AppError(404, "Professional not found");
  }

  // ✅ Step 2: Get Services (FIXED ❗)
  const services = await Service.find({
    professional: professional._id, // ✅ correct relation
  })
    .populate("availability")
    .lean();

  // ✅ Step 3: Get Bookings
  const serviceIds = services.map((s) => s._id);

  let bookings = [];
  if (serviceIds.length > 0) {
    bookings = await Booking.find({
      service: { $in: serviceIds },
    })
      .populate("user", "name email")
      .populate("service", "serviceName pricing")
      .lean();
  }

  // ✅ Step 4: Remove sensitive data safely
  if (professional.user) {
    delete professional.user.password;
  }

  // ✅ Step 5: Response
  return res.status(200).json({
    success: true,
    professional,
    services,
    bookings,
    totalServices: services.length,
    totalBookings: bookings.length,
    message: "Professional profile fetched successfully",
  });
});

// Update professional profile
export const updateProfessionalProfile = asyncHandler(async (req, res) => {
  const professionalId = req.params.id;
  const updateData = req.body;

  const professional = await Professional.findByIdAndUpdate(
    professionalId,
    updateData,
    { new: true, runValidators: true },
  );

  if (!professional) {
    throw new AppError(404, "Professional not found");
  }

  return res
    .status(200)
    .json(
      successResponse(
        200,
        professional,
        "Professional profile updated successfully",
      ),
    );
});

// Add new service
export const addService = asyncHandler(async (req, res) => {
  const professionalId = req.params.professionalId;
  const {
    experience,
    location,
    startingPrice,
    availabilityTimes,
    name,
    title,
  } = req.body;
  console.log(professionalId);
  // Check if professional exists
  const professional = await Professional.findOne({ user: professionalId });
  if (!professional) {
    throw new AppError(404, "Professional not found");
  }

  // Create service
  const service = await Service.create({
    professional: professional._id,
    userId: professionalId,
    experience: experience || professional.experience,
    pricing: startingPrice,
    serviceName: name,
    title,
    location,
    availabilityStatus: "available",
    status: "active",
  });

  // Create availability slots if provided
  let availabilities = [];
  if (availabilityTimes && availabilityTimes.length > 0) {
    availabilities = await Availability.insertMany(
      availabilityTimes.map((time) => ({
        service: service._id,
        startTime: time.startTime,
        endTime: time.endTime,
        status: "available",
      })),
    );
  }

  professional.services.push(service._id);
  await professional.save();

  await sendServiceAddedEmail({
    professionalEmail: professional.user?.email, // ⚠️ check populate
    professionalName: professional.user?.name,
    serviceName: name, // ya dynamic karo
    pricing: startingPrice,
    experience: experience,
  });

  return res.status(201).json({
    status: 201,

    service,
    availabilities,

    message: "Service added successfully",
  });
});

export const getServices = asyncHandler(async (req, res) => {
  // 1. Get professional
  console.log(req.user._id);
  const professional = await Professional.findOne({
    user: req.user._id,
  });

  if (!professional) {
    throw new AppError(404, "Professional not found");
  }

  // 2. Fetch services with proper population
  const services = await Service.find({
    professional: professional._id, // ✅ FIXED
  })
    .select(
      "experience pricing availabilityStatus status availability professional userId",
    )
    .populate("professional", "categoryName")
    .populate("userId", "name email")
    .populate("availability"); // ✅ get time slots

  return res.status(200).json({
    status: 200,
    services,
    message: "Services fetched successfully",
  });
});

// Update service

export const updateService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const { availability, ...updateData } = req.body;

  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new AppError(400, "Invalid service ID");
  }

  const service = await Service.findById(serviceId);

  if (!service) {
    throw new AppError(404, "Service not found");
  }

  if (service.userId.toString() !== req.user._id.toString()) {
    throw new AppError(403, "Not allowed");
  }

  // ❌ remove restricted fields
  ["_id", "professional", "status"].forEach(
    (field) => delete updateData[field],
  );

  // ✅ 1. Update basic fields
  Object.assign(service, updateData);
  await service.save();

  // ✅ 2. Handle availability
  if (availability && Array.isArray(availability)) {
    // delete old slots
    await Availability.deleteMany({ service: serviceId });

    // create new slots
    const newSlots = availability.map((slot) => ({
      service: serviceId,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));

    const createdSlots = await Availability.insertMany(newSlots);

    // store references
    service.availability = createdSlots.map((slot) => slot._id);
    await service.save();
  }

  return res.status(200).json({
    status: 200,
    message: "Service updated successfully",
    service,
  });
});

// Delete service
import mongoose from "mongoose";
import { generateToken } from "../utils/jwt.js";
import {
  sendProfessionalNotificationEmail,
  sendServiceAddedEmail,
} from "../utils/emailService.js";

export const deleteService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  console.log(serviceId);
  // 1. Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new AppError(400, "Invalid service ID");
  }

  // 2. Find service first (for ownership check if needed)
  const service = await Service.findById(serviceId);
  console.log(service);
  if (!service) {
    throw new AppError(404, "Service not found");
  }

  // 3. (Optional but recommended) Authorization check
  // assuming req.user.id exists
  // professional
  if (service.professional.toString() !== req.user._id.toString()) {
    throw new AppError(403, "You are not allowed to delete this service");
  }

  // 4. Delete related availability
  await Availability.deleteMany({ service: serviceId });

  // 5. Delete service
  await Service.findByIdAndDelete(serviceId);

  return res.status(200).json({
    success: true,
    message: "Service deleted successfully",
  });
});

// Add availability slots
export const addAvailability = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const { startTime, endTime } = req.body;

  // Check if service exists
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new AppError(404, "Service not found");
  }

  // Check for overlapping availability
  const overlapping = await Availability.findOne({
    service: serviceId,
    $or: [
      {
        startTime: { $lte: endTime },
        endTime: { $gte: startTime },
      },
    ],
  });

  if (overlapping) {
    throw new AppError(400, "Availability slot overlaps with existing slot");
  }

  const availability = await Availability.create({
    service: serviceId,
    startTime,
    endTime,
    status: "available",
  });

  return res
    .status(201)
    .json(
      successResponse(201, availability, "Availability added successfully"),
    );
});

// Get availabilities for a service
export const getAvailabilities = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  const availabilities = await Availability.find({ service: serviceId }).sort({
    startTime: 1,
  });

  return res
    .status(200)
    .json(
      successResponse(
        200,
        availabilities,
        "Availabilities fetched successfully",
      ),
    );
});

// Update availability status
export const updateAvailabilityStatus = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;
  const { status } = req.body;

  const availability = await Availability.findByIdAndUpdate(
    availabilityId,
    { status },
    { new: true, runValidators: true },
  );

  if (!availability) {
    throw new AppError(404, "Availability not found");
  }

  return res
    .status(200)
    .json(
      successResponse(
        200,
        availability,
        "Availability status updated successfully",
      ),
    );
});

// Delete availability
export const deleteAvailability = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;

  const availability = await Availability.findByIdAndDelete(availabilityId);
  if (!availability) {
    throw new AppError(404, "Availability not found");
  }

  return res
    .status(200)
    .json(successResponse(200, null, "Availability deleted successfully"));
});

export const getAllProfessionalsServiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(id);
  // 1. Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid professional ID",
    });
  }

  // 2. Fetch services with optimization
  const services = await Service.find({ professional: id })
    .select("-__v") // remove unnecessary fields
    .lean(); // improves performance
  console.log(services);
  // 3. Handle empty case
  if (!services || services.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No services found for this professional",
    });
  }

  // 4. Success response
  return res.status(200).json({
    success: true,
    count: services.length,
    data: services,
  });
});

export const professionalAvailability = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const response = await User.findOneAndUpdate(
    { userId: req.user._id },
    { status: status },
  );
  return res.json({
    message: "success",
  });
});

// export const updateBookingStatus = asyncHandler(async (req, res) => {
//   const { bookingId } = req.params;
//   const { status } = req.body;

//   const booking = await Booking.findByIdAndUpdate(
//     bookingId,
//     { status },
//     { new: true }
//   );

//   return res.json({
//     message: "Booking updated",
//     booking,
//   });
// });
