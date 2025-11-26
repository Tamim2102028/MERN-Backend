import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.model.js";
import { USER_TYPES } from "../constants/index.js";
import connectDB from "../db/index.js";

dotenv.config({ path: "./.env" });

const seedOwner = async () => {
  try {
    await connectDB();

    // Check if owner already exists
    const ownerExists = await User.findOne({ userType: USER_TYPES.OWNER });

    if (ownerExists) {
      console.log("⚠️ Owner already exists!");
      process.exit(0);
    }

    // Create owner account
    await User.create({
      fullName: "System Owner",
      email: process.env.OWNER_EMAIL,
      password: process.env.OWNER_PASSWORD,
      userType: USER_TYPES.OWNER,
      userName: "owner", // ⚠️ UPDATED from nickName
    });

    console.log("✅ Owner Account Created Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  }
};

seedOwner();

// To run: node src/seed/ownerSeed.js
