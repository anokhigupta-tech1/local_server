// controllers/earnings.controller.js
import { Booking } from "../models/booking.model.js";
import { Service } from "../models/service.model.js";
import { Professional } from "../models/professional.model.js";

import mongoose from "mongoose";

// Get earnings overview (total earnings, pending, withdrawn, etc.)
export const getEarningsOverview = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchCondition = {};

    // Filter based on user role
    if (userRole === "professional") {
      // Find professional record for this user
      const professional = await Professional.findOne({ user: userId });
      if (!professional) {
        return res.status(404).json({
          success: false,
          message: "Professional profile not found",
        });
      }

      // Find all services by this professional
      const services = await Booking.find({ user: req.user._id });
      const serviceIds = services.map((s) => s._id);

      matchCondition = {
        service: { $in: serviceIds },
        status: "confirmed",
      };
    } else if (userRole === "admin") {
      matchCondition = { status: "confirmed" };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view earnings",
      });
    }

    // Calculate earnings statistics
    const [
      totalEarnings,
      pendingEarnings,
      withdrawnEarnings,
      monthlyEarnings,
      stats,
    ] = await Promise.all([
      // Total earnings (all time)
      Booking.aggregate([
        { $match: matchCondition },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      // Pending earnings (bookings completed but payment not withdrawn)
      Booking.aggregate([
        {
          $match: {
            ...matchCondition,
            status: "confirmed",
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      // Withdrawn earnings (you can add a withdrawal model or mark as withdrawn)
      Booking.aggregate([
        {
          $match: {
            ...matchCondition,
            status: "confirmed",
            isWithdrawn: true,
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      // Current month earnings
      Booking.aggregate([
        {
          $match: {
            ...matchCondition,
            bookingDate: {
              $gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1,
              ),
              $lte: new Date(),
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      // Additional stats (total bookings, average earning, etc.)
      Booking.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            averageEarning: { $avg: "$totalAmount" },
            maxEarning: { $max: "$totalAmount" },
            minEarning: { $min: "$totalAmount" },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: totalEarnings[0]?.total || 0,
        pendingEarnings: pendingEarnings[0]?.total || 0,
        withdrawnEarnings: withdrawnEarnings[0]?.total || 0,
        monthlyEarnings: monthlyEarnings[0]?.total || 0,
        totalBookings: stats[0]?.totalBookings || 0,
        averageEarning: stats[0]?.averageEarning || 0,
        maxEarning: stats[0]?.maxEarning || 0,
        minEarning: stats[0]?.minEarning || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching earnings overview:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching earnings overview",
      error: error.message,
    });
  }
};

// Get earnings chart data
export const getEarningsChart = async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchCondition = { status: "confirmed" };

    // Filter based on user role
    if (userRole === "professional") {
      const professional = await Professional.findOne({ user: userId });
      if (professional) {
        const services = await Service.find({ professional: professional._id });
        const serviceIds = services.map((s) => s._id);
        matchCondition.service = { $in: serviceIds };
      }
    }

    let groupFormat;
    let startDate;
    const endDate = new Date();

    // Set date range and grouping format based on period
    switch (period) {
      case "week":
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        groupFormat = "%a"; // Mon, Tue, Wed
        break;
      case "month":
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        groupFormat = "%d %b"; // 01 Jan
        break;
      case "quarter":
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 90);
        groupFormat = "%b %d"; // Jan 01
        break;
      case "year":
        startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        groupFormat = "%b %Y"; // Jan 2024
        break;
      default:
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        groupFormat = "%d %b";
    }

    matchCondition.bookingDate = { $gte: startDate, $lte: endDate };

    const chartData = await Booking.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat, date: "$bookingDate" },
          },
          earnings: { $sum: "$totalAmount" },
          bookings: { $sum: 1 },
          average: { $avg: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: chartData,
      period,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("Error fetching earnings chart:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching earnings chart data",
      error: error.message,
    });
  }
};

// Get recent earnings history
export const getRecentEarnings = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchCondition = { status: "confirmed" };

    // Filter based on user role
    if (userRole === "professional") {
      const professional = await Professional.findOne({ user: userId });
      if (!professional) {
        return res.status(404).json({
          success: false,
          message: "Professional profile not found",
        });
      }

      const services = await Service.find({ professional: professional._id });
      const serviceIds = services.map((s) => s._id);
      matchCondition.service = { $in: serviceIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [earnings, total] = await Promise.all([
      Booking.find(matchCondition)
        .populate("user", "name email profilePicture")
        .populate({
          path: "service",
          select: "serviceName pricing title",
          populate: {
            path: "professional",
            select: "categoryName",
            populate: { path: "user", select: "name" },
          },
        })
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),

      Booking.countDocuments(matchCondition),
    ]);

    // Format earnings data
    const formattedEarnings = earnings.map((earning) => ({
      id: earning._id,
      bookingId: earning._id,
      serviceName: earning.service?.serviceName || "Unknown Service",
      customerName: earning.user?.name || "Unknown Customer",
      customerImage: earning.user?.profilePicture,
      amount: earning.totalAmount,
      date: earning.bookingDate,
      status: earning.status,
      status: earning.status,
      serviceDate: earning.serviceDate,
      timeSlot: earning.timeSlot,
    }));

    res.status(200).json({
      success: true,
      data: formattedEarnings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching recent earnings:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent earnings",
      error: error.message,
    });
  }
};

// Get earnings by category/service
export const getEarningsByCategory = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchCondition = { status: "confirmed" };

    if (userRole === "professional") {
      const professional = await Professional.findOne({ user: userId });
      if (professional) {
        const services = await Service.find({ professional: professional._id });
        const serviceIds = services.map((s) => s._id);
        matchCondition.service = { $in: serviceIds };
      }
    }

    const earningsByCategory = await Booking.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: "services",
          localField: "service",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: "$service" },
      {
        $lookup: {
          from: "professionals",
          localField: "service.professional",
          foreignField: "_id",
          as: "professional",
        },
      },
      { $unwind: "$professional" },
      {
        $group: {
          _id: "$professional.categoryName",
          totalEarnings: { $sum: "$totalAmount" },
          totalBookings: { $sum: 1 },
          averageEarning: { $avg: "$totalAmount" },
        },
      },
      { $sort: { totalEarnings: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: earningsByCategory,
    });
  } catch (error) {
    console.error("Error fetching earnings by category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching earnings by category",
      error: error.message,
    });
  }
};

// Withdraw earnings
export const withdrawEarnings = async (req, res) => {
  try {
    const { amount, withdrawalMethod, accountDetails } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal amount",
      });
    }

    // Check if user has sufficient pending earnings
    const professional = await Professional.findOne({ user: userId });
    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional profile not found",
      });
    }

    const services = await Service.find({ professional: professional._id });
    const serviceIds = services.map((s) => s._id);

    const pendingEarnings = await Booking.aggregate([
      {
        $match: {
          service: { $in: serviceIds },
          status: "completed",
          status: "confirmed",
          isWithdrawn: { $ne: true },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const availableBalance = pendingEarnings[0]?.total || 0;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance for withdrawal",
      });
    }

    // Here you would create a withdrawal request record
    // For now, just mark the earnings as withdrawn
    const bookingsToWithdraw = await Booking.find({
      service: { $in: serviceIds },
      status: "completed",
      status: "confirmed",
      isWithdrawn: { $ne: true },
    }).limit(1); // In real scenario, you'd need proper logic

    // Update bookings as withdrawn
    await Booking.updateMany(
      {
        service: { $in: serviceIds },
        status: "completed",
        status: "confirmed",
        isWithdrawn: { $ne: true },
      },
      {
        $set: {
          isWithdrawn: true,
          withdrawnAt: new Date(),
          withdrawalAmount: amount,
          withdrawalMethod,
          accountDetails,
        },
      },
    );

    res.status(200).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      data: {
        amount,
        withdrawalMethod,
        remainingBalance: availableBalance - amount,
        requestedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error withdrawing earnings:", error);
    res.status(500).json({
      success: false,
      message: "Error processing withdrawal",
      error: error.message,
    });
  }
};

// Get earnings summary for dashboard
export const getEarningsSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchCondition = { status: "confirmed" };

    if (userRole === "professional") {
      const professional = await Professional.findOne({ user: userId });
      if (professional) {
        const services = await Service.find({ professional: professional._id });
        const serviceIds = services.map((s) => s._id);
        matchCondition.service = { $in: serviceIds };
      }
    }

    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

    const [weeklyEarnings, monthlyEarnings, yearlyEarnings, growth] =
      await Promise.all([
        Booking.aggregate([
          { $match: { ...matchCondition, bookingDate: { $gte: startOfWeek } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),

        Booking.aggregate([
          {
            $match: { ...matchCondition, bookingDate: { $gte: startOfMonth } },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),

        Booking.aggregate([
          { $match: { ...matchCondition, bookingDate: { $gte: startOfYear } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),

        // Calculate growth compared to previous period
        Booking.aggregate([
          {
            $match: {
              ...matchCondition,
              bookingDate: {
                $gte: new Date(
                  currentDate.setMonth(currentDate.getMonth() - 1),
                ),
                $lt: startOfMonth,
              },
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
      ]);

    const previousMonthEarnings = growth[0]?.total || 0;
    const currentMonthEarnings = monthlyEarnings[0]?.total || 0;
    const growthPercentage =
      previousMonthEarnings === 0
        ? 100
        : ((currentMonthEarnings - previousMonthEarnings) /
            previousMonthEarnings) *
          100;

    res.status(200).json({
      success: true,
      data: {
        weekly: weeklyEarnings[0]?.total || 0,
        monthly: monthlyEarnings[0]?.total || 0,
        yearly: yearlyEarnings[0]?.total || 0,
        growth: growthPercentage.toFixed(1),
      },
    });
  } catch (error) {
    console.error("Error fetching earnings summary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching earnings summary",
      error: error.message,
    });
  }
};
