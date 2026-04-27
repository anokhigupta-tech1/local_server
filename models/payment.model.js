// // models/payment.model.js
// import mongoose from "mongoose";

// const paymentSchema = new mongoose.Schema(
//   {
//     booking: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Booking",
//       required: true,
//     },
//     transactionId: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     paymentDate: {
//       type: Date,
//       default: Date.now,
//     },
//     amount: {
//       type: Number,
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ["success", "failed", "pending"],
//       default: "pending",
//     },
//   },
//   { timestamps: true }
// );

// export const Payment = mongoose.model("Payment", paymentSchema);

// models/payment.model.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// 🔥 ADD THIS MIDDLEWARE
paymentSchema.post("save", async function (doc) {
  try {
    const Booking = mongoose.model("Booking");

    if (doc.status === "success") {
      await Booking.findByIdAndUpdate(doc.booking, {
        status: "confirmed",
        paymentStatus: "paid",
      });
    }

    if (doc.status === "failed") {
      await Booking.findByIdAndUpdate(doc.booking, {
        paymentStatus: "failed",
      });
    }
  } catch (error) {
    console.error("Error updating booking:", error);
  }
});

export const Payment = mongoose.model("Payment", paymentSchema);
