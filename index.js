import express from "express";
const app = express();
const port = 3000;
import cors from "cors";
import AppError from "./utils/appError.js";
import { errorHandler } from "./middlewares/errorHandller.js";
import { authRouter } from "./routes/auth.route.js";
import { conntecMongodb } from "./config/contectmongo.js";
import { userRoute } from "./routes/user.routes.js";
import path from "path";
import { serviceRouter } from "./routes/professionalService.routes.js";
import { customerRouter } from "./routes/customer.route.js";
import { bookingRouter } from "./routes/booking.route.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { earningRouter } from "./routes/earnings.routes.js";
const allowedOrigins = [
  "http://localhost:5173",
  "https://ornate-naiad-e13c6b.netlify.app",
  "https://ornate-naiad-e13c6b.netlify.app",
  "*",
];
app.use(cors());

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // allow requests with no origin (like Postman)
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       } else {
//         return callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   }),
// );
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

conntecMongodb();
app.get("/api/health", (req, res, next) => {
  res.status(200).json({
    message: "OK",
    status: 200,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRoute);
app.use("/api/professionals", serviceRouter);
app.use("/api/customer", customerRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/earnings", earningRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log("server is running on port ", port);
});
