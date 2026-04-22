import { Professional } from "../models/professional.model.js";
import { Service } from "../models/service.model.js";
import { asyncHandler } from "../utils/asyncHandller.js";

export const getAllServices = asyncHandler(async (req, res) => {
  const services = await Service.find({})
    .select(
      "experience pricing availabilityStatus status availability professional serviceName title",
    )
    .populate({
      path: "professional",
      select: "categoryName user",
      populate: {
        path: "user",
        select: "name email phone -password",
      },
    })
    .populate({
      path: "availability",
    });
  console.log(services);
  return res.status(200).json({
    success: true,
    services,
    message: "Services fetched successfully",
  });
});

export const getAllProfessionals = asyncHandler(async (req, res) => {
  const { categoryName } = req.query;

  let filter = {
    services: { $exists: true, $ne: [] },
  };

  if (categoryName) {
    filter.categoryName = categoryName;
  }

  const professionals = await Professional.find({})
    .populate({
      path: "user",
      select: "name email phone",
    })
    .populate({
      path: "services",
      select:
        "experience pricing availability availabilityStatus serviceName title",
      populate: {
        path: "availability",
        select: "startTime endTime status",
      },
    })
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: professionals.length,
    data: professionals,
  });
});

export const availableServicesCategories = asyncHandler(async (req, res) => {
  const professional = await Professional.find({})
    .select("categoryName")
    .lean();

  return res.json({
    services: professional,
  });
});
