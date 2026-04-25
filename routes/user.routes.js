import express from "express";
// import { getProfile, updateProfile } from "../controllers/user.controller.js";
import { upload } from "../middlewares/upload.js";
import { protect } from "../middlewares/auth.midleware.js";
import { getMyProfile, updateUser } from "../controllers/user.controller.js";


const router = express.Router();

router.put(
  "/update-profile",
  protect,
  upload.single("profilePicture"),
  updateUser
);
router.get(
  "/get-profile",
  protect,

  getMyProfile
);

export const userRoute= router;