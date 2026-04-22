// validations/professionalService.validator.js
import { body, param, query } from "express-validator";
import { Professional } from "../models/professional.model.js";
import { Service } from "../models/service.model.js";
import AppError from "../utils/appError.js";
import { Availability } from "../models/availability.model.js";
import { User } from "../models/User.js";

// Custom validation functions
// const isValidObjectId = (value) => {
//   if (!value.match(/^[0-9a-fA-F]{24}$/)) {
//     throw new AppError("Invalid ID format");
//   }
//   return true;
// };

// const isTimeFormat = (value) => {
//   if (!value.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
//     throw new AppError("Time must be in HH:MM format");
//   }
//   return true;
// };

const checkOverlappingAvailability = async (
  serviceId,
  startTime,
  endTime,
  excludeId = null,
) => {
  const query = {
    service: serviceId,
    $or: [{ startTime: { $lte: endTime }, endTime: { $gte: startTime } }],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const overlapping = await Availability.findOne(query);
  if (overlapping) {
    throw new AppError("Availability slot overlaps with existing slot");
  }
  return true;
};

// Professional Profile Validations

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Helper function to validate time format (HH:MM)
const isTimeFormat = (time) => {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

export const validateCreateProfessionalProfile = [
  // Name validation
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim()
    .escape(),

  // Email validation (matching client-side)
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email is too long"),

  // Password validation (matching client-side requirements)
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain at least one special character"),

  // Experience validation
  body("experience")
    .optional() // Changed from notEmpty to optional
    .isInt({ min: 0, max: 50 }) // Changed max to 50 to match client-side
    .withMessage("Experience must be a number between 0 and 50")
    .toInt(),

  // Rating validation
  body("rating")
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be between 0 and 5")
    .toFloat(),

  // Jobs completed validation
  body("jobs")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Jobs completed must be a positive number")
    .toInt(),

  // Starting price validation
  body("pricing")
    .notEmpty()
    .withMessage("Starting price is required")
    .isFloat({ min: 0, max: 10000 })
    .withMessage("Starting price must be between 0 and 10000")
    .toFloat(),
];

// Optional: Validation for updating professional profile (partial updates)
// export const validateUpdateProfessionalProfile = [
//   body("name")
//     .optional()
//     .isString()
//     .withMessage("Name must be a string")
//     .isLength({ min: 2, max: 100 })
//     .withMessage("Name must be between 2 and 100 characters")
//     .trim()
//     .escape(),

//   body("title")
//     .optional()
//     .isString()
//     .withMessage("Title must be a string")
//     .isLength({ min: 2, max: 100 })
//     .withMessage("Title must be between 2 and 100 characters")
//     .trim()
//     .escape(),

//   body("location")
//     .optional()
//     .isString()
//     .withMessage("Location must be a string")
//     .isLength({ min: 2, max: 200 })
//     .withMessage("Location must be between 2 and 200 characters")
//     .trim()
//     .escape(),

//   body("experience")
//     .optional()
//     .isInt({ min: 0, max: 50 })
//     .withMessage("Experience must be a number between 0 and 50")
//     .toInt(),

//   body("startingPrice")
//     .optional()
//     .isFloat({ min: 0, max: 10000 })
//     .withMessage("Starting price must be between 0 and 10000")
//     .toFloat(),

//   body("expertise")
//     .optional()
//     .isArray()
//     .withMessage("Expertise must be an array")
//     .custom((value) => {
//       if (value && value.length > 20) {
//         throw new Error("Maximum 20 expertise areas allowed");
//       }
//       if (value && value.length > 0) {
//         for (let skill of value) {
//           if (typeof skill !== "string" || skill.trim().length < 2) {
//             throw new Error(
//               "Each expertise must be at least 2 characters long",
//             );
//           }
//         }
//       }
//       return true;
//     }),
// ];

// Validation for adding/updating services only
export const validateServices = [
  body("services")
    .isArray({ min: 1 })
    .withMessage("At least one service is required")
    .custom((services) => {
      if (services && services.length > 20) {
        throw new Error("Maximum 20 services allowed");
      }
      return true;
    }),

  body("services.*.serviceTitle")
    .notEmpty()
    .withMessage("Service title is required")
    .isString()
    .withMessage("Service title must be a string")
    .isLength({ min: 2, max: 100 })
    .withMessage("Service title must be between 2 and 100 characters")
    .trim()
    .escape(),

  body("services.*.description")
    .notEmpty()
    .withMessage("Service description is required")
    .isString()
    .withMessage("Description must be a string")
    .isLength({ min: 5, max: 500 })
    .withMessage("Description must be between 5 and 500 characters")
    .trim()
    .escape(),

  body("services.*.price")
    .notEmpty()
    .withMessage("Service price is required")
    .isFloat({ min: 0, max: 10000 })
    .withMessage("Service price must be between 0 and 10000")
    .toFloat(),
];

// Validation for expertise only
export const validateExpertise = [
  body("expertise")
    .notEmpty()
    .withMessage("Expertise is required")
    .isArray({ min: 1 })
    .withMessage("At least one expertise is required")
    .custom((value) => {
      if (value && value.length > 20) {
        throw new Error("Maximum 20 expertise areas allowed");
      }
      if (value && value.length > 0) {
        for (let skill of value) {
          if (typeof skill !== "string" || skill.trim().length < 2) {
            throw new Error(
              "Each expertise must be at least 2 characters long",
            );
          }
          if (skill.trim().length > 50) {
            throw new Error("Each expertise cannot exceed 50 characters");
          }
        }
      }
      return true;
    }),
];

// Update Professional Profile Validations
export const validateUpdateProfessionalProfile = [
  param("id")
    .custom(isValidObjectId)
    .withMessage("Invalid professional ID format"),

  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim()
    .escape(),

  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters")
    .trim()
    .escape(),

  body("location")
    .optional()
    .isString()
    .withMessage("Location must be a string")
    .isLength({ min: 2, max: 200 })
    .withMessage("Location must be between 2 and 200 characters")
    .trim()
    .escape(),

  body("experience")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Experience must be a number between 0 and 100")
    .toInt(),

  body("rating")
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be between 0 and 5")
    .toFloat(),

  body("jobs")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Jobs completed must be a positive number")
    .toInt(),

  body("startingPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Starting price must be a positive number")
    .toFloat(),

  body("expertise")
    .optional()
    .isArray()
    .withMessage("Expertise must be an array")
    .custom((value) => {
      if (value && value.length > 0) {
        for (let skill of value) {
          if (typeof skill !== "string" || skill.trim().length < 2) {
            throw new Error(
              "Each expertise must be at least 2 characters long",
            );
          }
        }
      }
      return true;
    }),
];

// Get Professional Profile Validations
export const validateGetProfessionalProfile = [
  param("id")
    .optional()
    .custom(isValidObjectId)
    .withMessage("Invalid professional ID format"),
];

// Add Service Validations
export const validateAddService = [
  param("professionalId")
    .custom(isValidObjectId)
    .withMessage("Invalid professional ID format")
    .custom(async (professionalId) => {
      const professional = await Professional.findOne({
        user: professionalId,
      });
      if (!professional) {
        throw new Error("Professional not found");
      }
      return true;
    }),

  body("experience")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Experience must be a positive number")
    .toInt(),

  body("startingPrice")
    .notEmpty()
    .withMessage("Pricing is required")
    .isFloat({ min: 0 })
    .withMessage("Pricing must be a positive number")
    .toFloat(),

  body("availabilityTimes")
    .optional()
    .isArray()
    .withMessage("Availability times must be an array"),

  body("availabilityTimes.*.startTime")
    .notEmpty()
    .withMessage("Start time is required")
    .custom(isTimeFormat)
    .withMessage("Invalid start time format (use HH:MM)"),

  body("availabilityTimes.*.endTime")
    .notEmpty()
    .withMessage("End time is required")
    .custom(isTimeFormat)
    .withMessage("Invalid end time format (use HH:MM)")
    .custom((endTime, { req }) => {
      const startTime = req.body.startTime;
      if (startTime && endTime <= startTime) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),
];

// Update Service Validations
export const validateUpdateService = [
  param("serviceId")
    .custom(isValidObjectId)
    .withMessage("Invalid service ID format")
    .custom(async (serviceId) => {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw new Error("Service not found");
      }
      return true;
    }),

  body("experience")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Experience must be a positive number")
    .toInt(),

  body("pricing")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Pricing must be a positive number")
    .toFloat(),

  body("availabilityStatus")
    .optional()
    .isIn(["available", "unavailable"])
    .withMessage(
      "Availability status must be either 'available' or 'unavailable'",
    ),

  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be either 'active' or 'inactive'"),
];

// Delete Service Validations
export const validateDeleteService = [
  param("serviceId")
    .custom(isValidObjectId)
    .withMessage("Invalid service ID format")
    .custom(async (serviceId) => {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw new Error("Service not found");
      }
      return true;
    }),
];

// Add Availability Validations
export const validateAddAvailability = [
  param("serviceId")
    .custom(isValidObjectId)
    .withMessage("Invalid service ID format")
    .custom(async (serviceId) => {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw new Error("Service not found");
      }
      return true;
    }),

  body("startTime")
    .notEmpty()
    .withMessage("Start time is required")
    .custom(isTimeFormat)
    .withMessage("Invalid start time format (use HH:MM)"),

  body("endTime")
    .notEmpty()
    .withMessage("End time is required")
    .custom(isTimeFormat)
    .withMessage("Invalid end time format (use HH:MM)")
    .custom((endTime, { req }) => {
      const startTime = req.body.startTime;
      if (endTime <= startTime) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),

  body().custom(async (value, { req }) => {
    const { serviceId } = req.params;
    const { startTime, endTime } = req.body;
    await checkOverlappingAvailability(serviceId, startTime, endTime);
    return true;
  }),
];

// Get Availabilities Validations
export const validateGetAvailabilities = [
  param("serviceId")
    .custom(isValidObjectId)
    .withMessage("Invalid service ID format")
    .custom(async (serviceId) => {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw new Error("Service not found");
      }
      return true;
    }),

  query("status")
    .optional()
    .isIn(["available", "booked"])
    .withMessage("Status must be either 'available' or 'booked'"),

  query("date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format (use ISO 8601)"),
];

// Update Availability Status Validations
export const validateUpdateAvailabilityStatus = [
  param("availabilityId")
    .custom(isValidObjectId)
    .withMessage("Invalid availability ID format"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["available", "booked"])
    .withMessage("Status must be either 'available' or 'booked'"),
];

// Delete Availability Validations
export const validateDeleteAvailability = [
  param("availabilityId")
    .custom(isValidObjectId)
    .withMessage("Invalid availability ID format"),
];

// Bulk Availability Validations
export const validateBulkAddAvailability = [
  param("serviceId")
    .custom(isValidObjectId)
    .withMessage("Invalid service ID format")
    .custom(async (serviceId) => {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw new Error("Service not found");
      }
      return true;
    }),

  body("slots")
    .isArray({ min: 1 })
    .withMessage("At least one availability slot is required"),

  body("slots.*.startTime")
    .notEmpty()
    .withMessage("Start time is required for each slot")
    .custom(isTimeFormat)
    .withMessage("Invalid start time format (use HH:MM)"),

  body("slots.*.endTime")
    .notEmpty()
    .withMessage("End time is required for each slot")
    .custom(isTimeFormat)
    .withMessage("Invalid end time format (use HH:MM)")
    .custom((endTime, { req, path }) => {
      const index = path.split(".")[1];
      const startTime = req.body.slots[index].startTime;
      if (endTime <= startTime) {
        throw new Error(
          `End time must be after start time for slot ${parseInt(index) + 1}`,
        );
      }
      return true;
    }),

  body("slots").custom(async (slots, { req }) => {
    const { serviceId } = req.params;

    for (const slot of slots) {
      const { startTime, endTime } = slot;
      await checkOverlappingAvailability(serviceId, startTime, endTime);
    }
    return true;
  }),
];

// Search Professionals Validations
export const validateSearchProfessionals = [
  query("query")
    .optional()
    .isString()
    .withMessage("Search query must be a string")
    .isLength({ min: 2 })
    .withMessage("Search query must be at least 2 characters")
    .trim(),

  query("category")
    .optional()
    .isString()
    .withMessage("Category must be a string")
    .trim(),

  query("location")
    .optional()
    .isString()
    .withMessage("Location must be a string")
    .trim(),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be a positive number")
    .toFloat(),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be a positive number")
    .toFloat()
    .custom((maxPrice, { req }) => {
      const minPrice = req.query.minPrice;
      if (minPrice && maxPrice < minPrice) {
        throw new Error("Maximum price must be greater than minimum price");
      }
      return true;
    }),

  query("minRating")
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage("Minimum rating must be between 0 and 5")
    .toFloat(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("sortBy")
    .optional()
    .isIn(["rating", "experience", "startingPrice", "jobs", "createdAt"])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be 'asc' or 'desc'"),
];
