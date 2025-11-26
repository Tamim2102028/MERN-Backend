import mongoose from "mongoose";
import fs from "fs";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // 1. Convert any error to ApiError
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
    const message = error.message || "Something went wrong";
    error = new ApiError(statusCode, message, error?.errors || [], error.stack);
  }

  // 🔥 2. AUTO CLEANUP LOGIC (Improved) 🔥
  const filesToDelete = [];

  // Case A: Single file (upload.single)
  if (req.file) {
    filesToDelete.push(req.file.path);
  }

  // Case B: Multiple files (upload.array or upload.fields)
  // upload.fields এর ক্ষেত্রে req.files একটা Object হয় { avatar: [..], cover: [..] }
  if (req.files) {
    if (Array.isArray(req.files)) {
      // upload.array case
      req.files.forEach((file) => filesToDelete.push(file.path));
    } else {
      // upload.fields case (Object loop)
      Object.values(req.files).forEach((fileArray) => {
        fileArray.forEach((file) => filesToDelete.push(file.path));
      });
    }
  }

  // 3. Delete files safely
  if (filesToDelete.length > 0) {
    filesToDelete.forEach((filePath) => {
      try {
        // চেক করি ফাইলটা আদৌ আছে কিনা (হয়তো uploadFile ফাংশন অলরেডি ডিলিট করে দিয়েছে)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Auto-Cleanup: Deleted -> ${filePath}`);
        }
      } catch (cleanupErr) {
        // ফাইল ডিলিট করতে গিয়ে এরর হলে কনসোলে দেখাবে কিন্তু সার্ভার ক্রাশ করবে না
        console.error("Error cleaning up file:", cleanupErr);
      }
    });
  }

  // 4. Send Response
  const response = {
    ...error,
    message: error.message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
};

export { errorHandler };
