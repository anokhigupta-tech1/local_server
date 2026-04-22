import jwt from "jsonwebtoken";
import AppError from "./appError.js";

export const generateToken = (user) => {
  try {
    return jwt.sign(
      {
        userId: user._id,
        name: user.name,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
      }
    );
  } catch (error) {
    throw new AppError("Token generation failed", 500);
  }
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (error) {
    throw new AppError("Invalid or expired token", 401);
  }
};