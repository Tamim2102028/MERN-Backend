import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.model.js";
import { USER_TYPES } from "../constants/index.js";
import connectDB from "../db/index.js";

dotenv.config({ path: "./.env" });

const seedOwner = async () => {
  try {
    await connectDB();

    // চেক করি অলরেডি ওনার আছে কিনা
    const ownerExists = await User.findOne({ userType: USER_TYPES.OWNER });

    if (ownerExists) {
      console.log("⚠️ Owner already exists!");
      process.exit(0);
    }

    // ওনার তৈরি করা
    await User.create({
      fullName: "System Owner",
      email: process.env.OWNER_EMAIL, // .env ফাইলে আপনার মেইল রাখবেন
      password: process.env.OWNER_PASSWORD, // .env ফাইলে পাসওয়ার্ড রাখবেন
      userType: USER_TYPES.OWNER,
      nickName: "TheBoss",
      // বাকি ফিল্ডগুলো মডেলের ডিফল্ট ভ্যালু নিয়ে নেবে
    });

    console.log("✅ Owner Account Created Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  }
};

seedOwner();

// node src/seed/owner.seed.js
