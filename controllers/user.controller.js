import mongoose from "mongoose";
import { User } from "../models/User.js";

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id; // from auth middleware
    const { googleMapLink } = req.body;
    console.log(googleMapLink);
    // Allowed fields only
    const allowedFields = [
      "name",
      "phone",
      "altPhone",
      "address",
      "dob",
      "gMapUrl",
    ];

    const updates = {};

    // Filter only allowed fields
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Handle image upload
    if (req.file) {
      updates.profilePicture = `/uploads/images/${req.file.filename}`;
    }

    // Prevent empty update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // Check duplicate phone
    if (updates.phone) {
      const existing = await User.findOne({
        phone: updates.phone,
        _id: { $ne: userId },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Phone number already in use",
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...updates, gMapUrl: googleMapLink },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET /api/user/profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    // const bookings

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};
