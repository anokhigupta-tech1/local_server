import emailjs from "@emailjs/nodejs";
import "dotenv/config";

// EmailJS Configuration
const EMAILJS_CONFIG = {
  serviceId: process.env.EMAILJS_SERVICE_ID,
  templateId: process.env.EMAILJS_TEMPLATE_ID,
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
};

// Initialize EmailJS with credentials
const initEmailJS = () => {
  emailjs.init({
    publicKey: EMAILJS_CONFIG.publicKey,
    privateKey: EMAILJS_CONFIG.privateKey,
  });
};

// ✅ FIXED: Global email sending function - supports both 'to' and 'to_email'
export const sendEmail = async ({
  to,
  to_email,
  subject,
  templateParams = {},
  templateId,
}) => {
  try {
    initEmailJS();

    // ✅ Use either 'to' or 'to_email' - flexible parameter handling
    const finalParams = {
      to_email: to || to_email,
      subject: subject,
      ...templateParams,
    };

    console.log("📧 Sending email to:", finalParams.to_email);
    console.log("📋 Email params:", finalParams);

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      templateId || EMAILJS_CONFIG.templateId,
      finalParams,
    );

    console.log("✅ Email sent successfully:", response);
    return { success: true, response };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    console.error("Failed params:", {
      to: to || to_email,
      subject,
      templateParams,
    });
    return { success: false, error: error.message };
  }
};

// ✅ FIXED: Booking Confirmation Email
export const sendBookingConfirmationEmail = async (bookingData) => {
  const {
    userEmail,
    userName,
    bookingId,
    serviceName,
    servicePrice,
    professionalName,
    bookingDate,
    bookingTime,
    duration,
    location,
    notes,
  } = bookingData;

  const templateParams = {
    to_name: userName,
    to_email: userEmail,
    booking_id: bookingId,
    service_name: serviceName,
    service_price: servicePrice,
    professional_name: professionalName,
    booking_date: bookingDate,
    booking_time: bookingTime,
    duration: duration || "1 hour",
    location: location || "To be confirmed",
    notes: notes || "No special notes",
    status: "Confirmed",
    year: new Date().getFullYear(),
    support_email: process.env.SUPPORT_EMAIL || "support@servicehub.com",
  };

  return await sendEmail({
    to_email: userEmail,
    subject: `Booking ${bookingId}: ${serviceName} with ${professionalName}`,
    templateParams,
  });
};

// ✅ FIXED: Booking Status Update Email
export const sendBookingStatusEmail = async (bookingData) => {
  const {
    userEmail,
    userName,
    bookingId,
    serviceName,
    professionalName,
    status,
    statusMessage,
    bookingDate,
    bookingTime,
  } = bookingData;

  const statusColors = {
    confirmed: "#10b981",
    pending: "#f59e0b",
    cancelled: "#ef4444",
    completed: "#3b82f6",
    "in-progress": "#8b5cf6",
  };

  const templateParams = {
    to_name: userName,
    to_email: userEmail,
    booking_id: bookingId,
    service_name: serviceName,
    professional_name: professionalName,
    status: status.toUpperCase(),
    status_message: statusMessage || getStatusMessage(status),
    booking_date: bookingDate,
    booking_time: bookingTime,
    status_color: statusColors[status] || "#6b7280",
    year: new Date().getFullYear(),
    support_email: process.env.SUPPORT_EMAIL || "support@servicehub.com",
  };

  return await sendEmail({
    to_email: userEmail,
    subject: `Booking ${status.toUpperCase()}: ${serviceName}`,
    templateParams,
  });
};

// ✅ FIXED: Booking Reminder Email
export const sendBookingReminderEmail = async (bookingData) => {
  const {
    userEmail,
    userName,
    bookingId,
    serviceName,
    professionalName,
    bookingDate,
    bookingTime,
    hoursRemaining,
  } = bookingData;

  const templateParams = {
    to_name: userName,
    to_email: userEmail,
    booking_id: bookingId,
    service_name: serviceName,
    professional_name: professionalName,
    booking_date: bookingDate,
    booking_time: bookingTime,
    hours_remaining: hoursRemaining || "24",
    year: new Date().getFullYear(),
    support_email: process.env.SUPPORT_EMAIL || "support@servicehub.com",
  };

  return await sendEmail({
    to_email: userEmail, // ✅ Fixed: was 'to'
    subject: `Reminder: Your ${serviceName} Booking in ${hoursRemaining || "24"} Hours`,
    templateParams,
  });
};

// ✅ Welcome Email for New Users
export const sendWelcomeEmail = async (userData) => {
  const { userEmail, userName, userRole } = userData;

  const templateParams = {
    to_name: userName,
    to_email: userEmail,
    user_role: userRole || "customer",
    year: new Date().getFullYear(),
    support_email: process.env.SUPPORT_EMAIL || "support@servicehub.com",
  };

  return await sendEmail({
    to_email: userEmail,
    subject: "Welcome to ServiceHub! 🎉",
    templateParams,
    templateId: process.env.EMAILJS_WELCOME_TEMPLATE_ID,
  });
};

// ✅ Professional Notification for New Booking
export const sendProfessionalNotificationEmail = async (bookingData) => {
  const {
    professionalEmail,
    professionalName,
    customerName,
    bookingId,
    serviceName,
    servicePrice,
    bookingDate,
    bookingTime,
    customerNotes,
  } = bookingData;

  const templateParams = {
    to_name: professionalName,
    to_email: professionalEmail,
    customer_name: customerName,
    booking_id: bookingId,
    service_name: serviceName,
    service_price: servicePrice,
    booking_date: bookingDate,
    booking_time: bookingTime,
    customer_notes: customerNotes || "No special requests",
    year: new Date().getFullYear(),
    support_email: process.env.SUPPORT_EMAIL || "support@servicehub.com",
  };

  return await sendEmail({
    to_email: professionalEmail,
    subject: `New Booking Request: ${serviceName} with ${customerName}`,
    templateParams,
  });
};

// ✅ FIXED: Service Added Email
export const sendServiceAddedEmail = async (data) => {
  const {
    professionalEmail,
    professionalName,
    serviceName,
    pricing,
    experience,
  } = data;

  const templateParams = {
    to_name: professionalName,
    to_email: professionalEmail,
    service_name: serviceName,
    pricing: pricing,
    experience: experience,
    year: new Date().getFullYear(),
    support_email: process.env.SUPPORT_EMAIL || "support@servicehub.com",
  };

  return await sendEmail({
    to: professionalEmail, // ✅ This works with fixed sendEmail
    subject: `Service Added Successfully: ${serviceName}`,
    templateParams,
    templateId: process.env.EMAILJS_TEMPLATE_SERVICE_ADDED,
  });
};

// Helper function to get status message
const getStatusMessage = (status) => {
  const messages = {
    confirmed:
      "Your booking has been confirmed! The professional will arrive at the scheduled time.",
    pending:
      "Your booking request has been received and is awaiting confirmation.",
    cancelled:
      "Your booking has been cancelled. If this was a mistake, please contact support.",
    completed:
      "Your service has been marked as completed. Thank you for choosing ServiceHub!",
    "in-progress":
      "Your service is currently in progress. The professional is on their way.",
  };
  return messages[status] || "Your booking status has been updated.";
};

// ✅ Bulk Email Sending
export const sendBulkEmails = async (emailList, templateParams, templateId) => {
  const results = [];

  for (const recipient of emailList) {
    const result = await sendEmail({
      to_email: recipient.email,
      subject: templateParams.subject || "Important Update from ServiceHub",
      templateParams: {
        ...templateParams,
        to_name: recipient.name || "Customer",
        to_email: recipient.email,
      },
      templateId,
    });

    results.push({
      email: recipient.email,
      success: result.success,
      error: result.error,
    });
  }

  console.log(
    `📊 Bulk email results: ${results.filter((r) => r.success).length}/${emailList.length} successful`,
  );
  return results;
};

// Export all functions
export default {
  sendEmail,
  sendBookingConfirmationEmail,
  sendBookingStatusEmail,
  sendBookingReminderEmail,
  sendWelcomeEmail,
  sendProfessionalNotificationEmail,
  sendBulkEmails,
  sendServiceAddedEmail,
};
