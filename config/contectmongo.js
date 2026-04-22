import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandller.js";
import "dotenv/config";
export const conntecMongodb=asyncHandler(async()=>{
await mongoose.connect(process.env.MONGODB_URI);
console.log("mongodb connected")
});