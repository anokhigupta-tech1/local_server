
import {
  createAccountService,
  loginService,
} from "../services/auth.services.js";
// import AppError from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandller.js";


export const createAccount = asyncHandler(async (req, res, next) => {
  console.log(req.body);
  createAccountService(req, res, next);
});

export const login = asyncHandler(async (req, res, next) => {
  loginService(req, res, next);
});


// export const createProfessionalWithService = asyncHandler(
//   async (req, res, next) => {
//     const { categoryName, experience, pricing, name, email, password, phone } =
//       req.body;

//     console.log("REQ BODY:", req.body);

//     // ✅ 1. Check duplicate user
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return next(new AppError("User already exists with this email", 400));
//     }

//     // ✅ 2. Create Professional
//     const professional = await Professional.create({
//       categoryName,
//     });

//     // ✅ 3. Create Service
//     const service = await Service.create({
//       professional: professional._id,
//       experience,
//       pricing,
//     });

//     // ✅ 4. Link service
//     professional.services.push(service._id);
//     await professional.save();

//     // ✅ 5. Hash password
//     const hashedPassword =  hashPassword(password);

//     // ✅ 6. Create User
//     const user = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       phone,
//       role: "professional",
//       profilePicture: req?.file?.path,
//     });

//     if (!user) {
//       return next(new AppError("User not created", 400));
//     }

//     // ✅ 7. Generate token
//     const token = generateToken(user);

//     if (!token) {
//       return next(new AppError("Token not generated", 500));
//     }

//     user.password = undefined;

//     // ✅ 8. Final response
//     res.status(201).json({
//       success: true,
//       message: "Professional account created successfully",
//       data: {
//         professional,
//         service,
//         user,
//         token,
//       },
//     });
//   }
// );
