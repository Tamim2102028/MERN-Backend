import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFile = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // 1. Upload to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // 2. File uploaded successfully, now remove local file
    // (Sync ব্যবহার করছি কারণ এটা ব্লক করা জরুরি যাতে ক্লিনআপ নিশ্চিত হয়)
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (cleanupError) {
      console.error("Error removing local file after upload:", cleanupError);
    }

    return response;
  } catch (error) {
    // 3. Upload Failed? Still try to remove local file
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (cleanupError) {
      console.error("Error removing local file after failure:", cleanupError);
    }

    // null রিটার্ন করলে কন্ট্রোলার বুঝবে আপলোড হয়নি
    return null;
  }
};

// Delete from Cloudinary (Unchanged but ensuring null check)
const deleteFile = async (fileId) => {
  try {
    if (!fileId) return null;
    return await cloudinary.uploader.destroy(fileId);
  } catch (error) {
    console.error("Error deleting file from cloudinary:", error);
    return null;
  }
};

export { uploadFile, deleteFile };
