// models/user.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: Number,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: true,
    },
    address: {
      type: String,
    },
    role: {
      type: String,
      enum: ["customer", "admin", "professional"],
      default: "customer",
    },
    profilePicture: {
      type: String,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },
    altPhone: {
      type: Number,
      unique: true,
      default: function () {
        return this.phone;
      },
    },
   dob: {
  type: Date,

  validate: {
    validator: function (value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const minAgeDate = new Date();
      minAgeDate.setFullYear(today.getFullYear() - 18);

      return value < today && value <= minAgeDate;
    },
    message: "User must be at least 18 years old and DOB must be in the past",
  },
},

gMapUrl: {
  type: String,
  validate: {
    validator: function (value) {
      // allow only Google Maps URLs
      const regex = /^(https?:\/\/)?(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps)/i;
      return regex.test(value);
    },
    message: "Only valid Google Maps URL is allowed",
  },
}
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
