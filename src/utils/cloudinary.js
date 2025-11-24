import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Upload Function ---
const uploadToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // 1. Upload
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // 2. File uploaded successfully, remove local file
    // fs.unlinkSync ব্লকিং অপারেশন, তাই আমরা চেক করে রিমুভ করব
    try {
      fs.unlinkSync(localFilePath);
    } catch (error) {
      console.error("Error removing local file:", error);
    }

    return response;
  } catch (error) {
    // Upload failed, remove local file safely
    try {
      fs.unlinkSync(localFilePath);
    } catch (removeError) {
      console.error(
        "Error removing local file after failed upload:",
        removeError
      );
    }
    return null;
  }
};

// --- ✅ NEW: Delete Function (For Updates) ---
// ইউজার ছবি পাল্টালে বা পোস্ট ডিলিট করলে এটা কল করবেন
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    // Cloudinary থেকে ইমেজ ডিলিট করা
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting from cloudinary:", error);
    return null;
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
