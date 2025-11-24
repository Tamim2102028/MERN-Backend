import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// কনফিগারেশন এখানেই থাক (আপাতত)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ ফাংশনের নাম জেনারেল রাখা হলো (uploadFile)
const uploadFile = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // আপলোড হচ্ছে...
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // সফল হলে লোকাল ফাইল ডিলিট
    try {
      fs.unlinkSync(localFilePath);
    } catch (error) {
      console.error("Error removing local file:", error);
    }

    return response;
  } catch (error) {
    // ব্যর্থ হলে লোকাল ফাইল ডিলিট
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

// ✅ ফাংশনের নাম জেনারেল রাখা হলো (deleteFile)
const deleteFile = async (fileId) => {
  try {
    if (!fileId) return null;

    // Cloudinary তে পাবলিক আইডি দিয়ে ডিলিট করা হয়
    const result = await cloudinary.uploader.destroy(fileId);
    return result;
  } catch (error) {
    console.error("Error deleting file:", error);
    return null;
  }
};

export { uploadFile, deleteFile };
