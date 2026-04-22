// routes/professionalService.routes.js
import express from "express";
import { protect } from "../middlewares/auth.midleware.js";
import validate from "../middlewares/validate.js";
import {
  validateAddAvailability,
  validateAddService,
  validateCreateProfessionalProfile,
} from "../validations/professionalService.validator.js";
import {
  addAvailability,
  addService,
  createProfessionalProfile,
  deleteAvailability,
  deleteService,
  getAllProfessionalsServiceById,
  getAvailabilities,
  getProfessionalProfile,
  getServices,
  professionalAvailability,
  updateAvailabilityStatus,
  updateProfessionalProfile,
  updateService,
} from "../controllers/professionalService.controller.js";

const router = express.Router();
router.get("/services/:id", getAllProfessionalsServiceById);

// All routes require authentication

router.use(protect);

// Professional profile routes
router.post(
  "/profile",
validateCreateProfessionalProfile,
  validate,
  createProfessionalProfile,
);

router.get("/profile/", getProfessionalProfile);
router.get("/services", getServices);
router.put("/profile/:id", updateProfessionalProfile);

// Service routes
router.post(
  "/:professionalId/services",
validateAddService,
  validate,
  addService,
);

router.put("/services/:serviceId", updateService);
router.delete("/services/:serviceId", deleteService);

// Availability routes
router.post(
  "/services/:serviceId/availability",
  validateAddAvailability,
  validate,
  addAvailability,
);

router.get("/services/:serviceId/availability", getAvailabilities);
router.patch("/availability/:availabilityId", updateAvailabilityStatus);
router.patch("/availability", professionalAvailability);
router.delete("/availability/:availabilityId", deleteAvailability);

export const serviceRouter= router;
