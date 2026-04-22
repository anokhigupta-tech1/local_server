import { User } from "../models/User.js";
import AppError from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandller.js";
import { comparePassword, hashPassword } from "../utils/bcrypt.js";
import { generateToken } from "../utils/jwt.js";
import { successResponse } from "../utils/response.js";

export const createAccountService = asyncHandler(async (req, res, next) => {
  console.log(req.body);
  // Check if user already exists
  const existingUser = await User.findOne({ email: req.body.email });

  if (existingUser) {
    return next(new AppError(400, "User already exists with this email"));
  }

  // Fix: await the hashPassword function
  const hashedPassword = await hashPassword(req.body.password);
  console.log(hashedPassword);

  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: hashedPassword,
    phone: req.body.phone,
    role: "customer",
    profilePicture: req?.file?.path,
  });

  console.log("user : ", user);
  if (!user) {
    return next(new AppError(400, "user not created"));
  }

  const token = generateToken(user);
  console.log("token : ", token);
  if (!token) {
    return next(new AppError(400, "token not generated"));
  }

  user.password = undefined;

  return successResponse(
    201,
    "created successfully",
    { user, token },
    res,
    req,
  );
});

export const loginService = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  // find user with email
  const user = await User.findOne({ email: email });
  if (!user) {
    throw new AppError(404, "user not exist with this email ");
  }

  // comparePassword password
  // const isMatchedPassword = true;
  const isMatchedPassword = comparePassword(password, user.password);
  if (!isMatchedPassword) {
    throw new AppError(400, "incorrect password");
  }
  // genearet token
  const token = generateToken(user);
  if (!token) {
    throw new AppError(500, "token not not genaretd ");
  }
  user.password = undefined;
  successResponse(200, "loggedin successfully", { user, token }, res, req);
});
