import express from "express";
import { upload } from "../middlewares/upload.js";
import {
  createAccount,
  login,
  
} from "../controllers/auth.controller.js";
import {
  loginValidation,
  registerValidations,
} from "../validations/authvalidations.js";
import validate from "../middlewares/validate.js";
import { validateCreateProfessionalProfile } from "../validations/professionalService.validator.js";
import { createProfessionalProfile } from "../controllers/professionalService.controller.js";

const router = express.Router();

router.post(
  "/register",
  // upload.single("profilePicture"),
  registerValidations,
  validate,
  createAccount,
);
router.post(
  "/register-profetionals",

  validateCreateProfessionalProfile,
  validate,
  createProfessionalProfile,
);

router.post("/login", loginValidation, validate, login);

export const authRouter = router;
