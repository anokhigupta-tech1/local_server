// models/service.model.js
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    professional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Professional",
      // required: true,
    },
    experience: {
      type: Number,
      // required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
    location: {
      type: String,
    },
    rating: {
      type: Number,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    pricing: {
      type: Number,
      // required: true,
    },
    availability: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Availability",
      },
    ],
    availabilityStatus: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

export const Service = mongoose.model("Service", serviceSchema);
