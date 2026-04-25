// controllers/user.controller.js
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import fs from "fs";
import path from "path";

export const updateUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = { ...req.body };

    // Prevent restricted fields update
    delete updateData.role;
    delete updateData.status;

    // Get current user
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // =========================
    // HANDLE PROFILE IMAGE
    // =========================
    if (req.file) {
      updateData.profilePicture = req.file.path;

      // Delete old image if exists
      if (
        existingUser.profilePicture &&
        fs.existsSync(existingUser.profilePicture)
      ) {
        fs.unlinkSync(existingUser.profilePicture);
      }
    }

    // =========================
    // HANDLE PASSWORD HASHING
    // =========================
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    // =========================
    // DUPLICATE EMAIL CHECK
    // =========================
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await User.findOne({
        email: updateData.email,
        _id: { $ne: userId },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    // =========================
    // DUPLICATE PHONE CHECK
    // =========================
    if (updateData.phone && updateData.phone !== existingUser.phone) {
      const phoneExists = await User.findOne({
        phone: updateData.phone,
        _id: { $ne: userId },
      });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone already in use",
        });
      }
    }

    // =========================
    // DUPLICATE ALT PHONE CHECK
    // =========================
    if (updateData.altPhone && updateData.altPhone !== existingUser.altPhone) {
      const altPhoneExists = await User.findOne({
        altPhone: updateData.altPhone,
        _id: { $ne: userId },
      });

      if (altPhoneExists) {
        return res.status(400).json({
          success: false,
          message: "Alt phone already in use",
        });
      }
    }

    // =========================
    // UPDATE USER
    // =========================
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update User Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id; // comes from auth middleware

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
