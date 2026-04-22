import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload folders exist
const createFolderIfNotExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/others";

    if (file.mimetype.startsWith("image/")) {
      uploadPath = "uploads/images";
    } else if (
      file.mimetype === "application/pdf" ||
      file.mimetype.includes("excel") ||
      file.mimetype.includes("spreadsheet") ||
      file.mimetype === "text/csv"
    ) {
      uploadPath = "uploads/documents";
    }

    createFolderIfNotExists(uploadPath);
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
     
    )}${ext}`;
    cb(null, uniqueName);
  },
});

// File Filter (Security)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "text/csv",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

// Final Upload Middleware
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});