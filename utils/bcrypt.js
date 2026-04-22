import AppError from "./appError.js";
import { asyncHandler } from "./asyncHandller.js";
import bcrypt from "bcryptjs";
export const hashPassword = (password) => {
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    if (!hashedPassword) {
      throw new AppError("password not hashed", 500);
    }
    return hashedPassword;
  } catch (error) {
    throw new AppError(error.message, 500, error);
  }
};

export const comparePassword = (password, userPassword) => {
  try {
    const isPasswordMatched = bcrypt.compareSync(password, userPassword);
    if (isPasswordMatched) {
      return true;
    }
    return false;
  } catch (error) {
    console.log(error);
    throw new AppError(error.message, 500, error);
  }
};
