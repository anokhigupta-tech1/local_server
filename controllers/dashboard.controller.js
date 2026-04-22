// controllers/dashboard.controller.js
// import { Booking } from "../models/booking.model.js";
// import { User } from "../models/user.model.js";
// import { Professional } from "../models/professional.model.js";
import { Service } from "../models/service.model.js";
import { Review } from "../models/review.model.js";
import mongoose from "mongoose";

import { Booking } from "../models/booking.model.js";
import { Professional } from "../models/professional.model.js";
import { User } from "../models/User.js";

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const { timeRange = "30days" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (timeRange === "30days") {
      startDate.setDate(endDate.getDate() - 30);
    } else if (timeRange === "7days") {
      startDate.setDate(endDate.getDate() - 7);
    } else if (timeRange === "90days") {
      startDate.setDate(endDate.getDate() - 90);
    }

    // Parallel queries for better performance
    const [
      totalRevenue,
      totalBookings,
      totalCustomers,
      totalProfessionals,
      recentBookings,
      revenueByPeriod
    ] = await Promise.all([
      // Total Revenue
      Booking.aggregate([
        {
          $match: {
            status: "confirmed",
            bookingDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ]),
      
      // Total Bookings
      Booking.countDocuments({
        bookingDate: { $gte: startDate, $lte: endDate }
      }),
      
      // Total Customers
      User.countDocuments({ role: "customer" }),
      
      // Total Professionals
      Professional.countDocuments(),
      
      // Recent Bookings
      Booking.find()
        .populate("user", "name email")
        .populate({
          path: "service",
          populate: {
            path: "professional",
            populate: { path: "user", select: "name" }
          }
        })
        .sort({ createdAt: -1 })
        .limit(10),
      
      // Revenue by day/week for chart
      Booking.aggregate([
        {
          $match: {
            status: "confirmed",
            bookingDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$bookingDate" }
            },
            revenue: { $sum: "$totalAmount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ])
    ]);

    // Calculate growth percentages
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (endDate - startDate) / (1000 * 60 * 60 * 24));
    
    const previousRevenue = await Booking.aggregate([
      {
        $match: {
          status: "confirmed",
          bookingDate: { $gte: previousPeriodStart, $lt: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" }
        }
      }
    ]);

    const previousBookings = await Booking.countDocuments({
      bookingDate: { $gte: previousPeriodStart, $lt: startDate }
    });

    const revenueGrowth = previousRevenue[0]?.total 
      ? ((totalRevenue[0]?.total - previousRevenue[0]?.total) / previousRevenue[0]?.total) * 100 
      : 0;
    
    const bookingsGrowth = previousBookings 
      ? ((totalBookings - previousBookings) / previousBookings) * 100 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalBookings,
        totalCustomers,
        totalProfessionals,
        revenueGrowth: revenueGrowth.toFixed(1),
        bookingsGrowth: bookingsGrowth.toFixed(1),
        recentBookings,
        revenueChart: revenueByPeriod
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message
    });
  }
};

// Get pending verifications (professionals pending approval)
export const getPendingVerifications = async (req, res) => {
  try {
    const pendingProfessionals = await Professional.find()
      .populate("user", "name email profilePicture createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    // Transform data for frontend
    const verifications = pendingProfessionals.map(prof => ({
      id: prof._id,
      name: prof.user.name,
      role: `${prof.categoryName} · ${Math.ceil((Date.now() - new Date(prof.createdAt)) / (1000 * 60 * 60))}h ago`,
      image: prof.user.profilePicture || "https://static.vecteezy.com/vite/assets/photo-masthead-375-BoK_p8LG.webp",
      experience: prof.experience,
      pricing: prof.pricing,
      userId: prof.user._id
    }));

    res.status(200).json({
      success: true,
      data: verifications
    });
  } catch (error) {
    console.error("Pending verifications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending verifications",
      error: error.message
    });
  }
};

// Approve professional verification
export const approveProfessional = async (req, res) => {
  try {
    const { professionalId } = req.params;
    
    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional not found"
      });
    }

    // Update user role to professional if not already
    await User.findByIdAndUpdate(professional.user, {
      role: "professional",
      status: "active"
    });

    res.status(200).json({
      success: true,
      message: "Professional approved successfully"
    });
  } catch (error) {
    console.error("Approve professional error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving professional",
      error: error.message
    });
  }
};

// Get recent activity
export const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Fetch different types of activities
    const [recentBookings, recentReviews, newProfessionals] = await Promise.all([
      Booking.find()
        .populate("user", "name")
        .populate({
          path: "service",
          populate: {
            path: "professional",
            populate: { path: "user", select: "name" }
          }
        })
        .sort({ createdAt: -1 })
        .limit(limit),
      
      Review.find()
        .populate("user", "name")
        .populate({
          path: "service",
          populate: {
            path: "professional",
            populate: { path: "user", select: "name" }
          }
        })
        .sort({ createdAt: -1 })
        .limit(limit),
      
      Professional.find()
        .populate("user", "name categoryName")
        .sort({ createdAt: -1 })
        .limit(limit)
    ]);

    // Combine and format activities
    const activities = [];
    
    recentBookings.forEach(booking => {
      activities.push({
        id: booking._id,
        type: "booking",
        icon: "CheckCircle",
        title: "New Booking",
        subtitle: `${booking.user.name} booked ${booking.service?.professional?.user?.name || "a service"}`,
        time: getTimeAgo(booking.createdAt),
        timestamp: booking.createdAt
      });
    });
    
    newProfessionals.forEach(prof => {
      activities.push({
        id: prof._id,
        type: "signup",
        icon: "UserPlus",
        title: "New Professional Sign-up",
        subtitle: `${prof.user.name} applied as ${prof.categoryName}`,
        time: getTimeAgo(prof.createdAt),
        timestamp: prof.createdAt
      });
    });
    
    recentReviews.forEach(review => {
      if (review.rating >= 4.5) {
        activities.push({
          id: review._id,
          type: "rating",
          icon: "Star",
          title: "High Rating Received",
          subtitle: `${review.user.name} rated ${review.rating} stars`,
          time: getTimeAgo(review.createdAt),
          timestamp: review.createdAt
        });
      }
    });
    
    // Sort by timestamp and limit
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    res.status(200).json({
      success: true,
      data: activities.slice(0, limit)
    });
  } catch (error) {
    console.error("Recent activity error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent activity",
      error: error.message
    });
  }
};

// Helper function to get time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit === 'hour' ? 'h' : unit === 'minute' ? 'm' : unit[0]} ago`;
    }
  }
  return 'Just now';
}

// Get revenue chart data
export const getRevenueChart = async (req, res) => {
  try {
    const { period = "week" } = req.query;
    
    let groupFormat;
    let dateRange;
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === "week") {
      startDate.setDate(endDate.getDate() - 7);
      // Mon, Tue, etc.
    } else if (period === "month") {
      startDate.setDate(endDate.getDate() - 30);
      groupFormat = "%d %b";
    } else {
      startDate.setDate(endDate.getDate() - 90);
      groupFormat = "%b %d";
    }
    
    const revenueData = await Booking.aggregate([
      {
        $match: {
          status: "confirmed",
          bookingDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat, date: "$bookingDate" }
          },
          value: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    console.error("Revenue chart error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching revenue chart data",
      error: error.message
    });
  }
};