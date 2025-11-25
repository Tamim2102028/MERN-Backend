import { ApiError } from "../utils/ApiError.js";
import fs from "fs"; // ফাইল সিস্টেম মডিউল লাগবে

const validate = (schema) => {
  return (req, res, next) => {
    // ১. ভ্যালিডেশন চেক
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      // ⚠️ ভ্যালিডেশন ফেইল করেছে!

      // ২. চেক করি কোনো ফাইল আপলোড হয়ে আটকে আছে কিনা (Cleanup Logic)
      const filesToDelete = [];

      // Single file (req.file)
      if (req.file) {
        filesToDelete.push(req.file.path);
      }

      // Multiple files (req.files) - এটা Object বা Array হতে পারে
      if (req.files) {
        // যদি Array হয় (upload.array)
        if (Array.isArray(req.files)) {
          req.files.forEach((file) => filesToDelete.push(file.path));
        }
        // যদি Object হয় (upload.fields) - যেমন আমাদের register এ
        else {
          Object.values(req.files).forEach((fileArray) => {
            fileArray.forEach((file) => filesToDelete.push(file.path));
          });
        }
      }

      // ৩. ফাইলগুলো ডিলিট করা
      filesToDelete.forEach((filePath) => {
        try {
          fs.unlinkSync(filePath); // ডিলিট
          console.log(`🗑️ Validation Failed: Deleted temp file -> ${filePath}`);
        } catch (err) {
          console.error("Error deleting file:", err);
        }
      });

      // ৪. এরর রেসপন্স পাঠানো
      const errorMessages = error.details.map((detail) => detail.message);
      return next(new ApiError(422, "Validation Error", errorMessages));
    }

    // সব ঠিক থাকলে সামনে যাও
    next();
  };
};

export { validate };
