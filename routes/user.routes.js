import express from "express";
import { getProfile, updateProfile } from "../controllers/user.controller.js";
import { upload } from "../middlewares/upload.js";
import { protect } from "../middlewares/auth.midleware.js";


const router = express.Router();

router.put(
  "/update-profile",
  protect,
  upload.single("profilePicture"),
  updateProfile
);
router.get(
  "/get-profile",
  protect,

  getProfile
);

export const userRoute= router;