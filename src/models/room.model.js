import mongoose, { Schema } from "mongoose";
import { ROOM_STATUS } from "../constants/index.js";

const roomSchema = new Schema(
  {
    // --- Basic Info ---
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, trim: true },
    coverImage: { type: String },

    // --- Access ---
    joinCode: {
      type: String,
      unique: true,
      required: true,
      index: true, // সার্চ ফাস্ট করার জন্য
    },

    // --- Creator ---
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // --- Settings ---
    status: {
      type: String,
      enum: Object.values(ROOM_STATUS),
      default: ROOM_STATUS.ACTIVE,
    },
    settings: {
      allowStudentPosting: { type: Boolean, default: true },
      // allowComments: { type: Boolean, default: true }, // ফিউচার
    },

    // --- Future Proofing (Optional for now) ---
    institution: { type: Schema.Types.ObjectId, ref: "Institution" },
    department: { type: Schema.Types.ObjectId, ref: "Department" },
    academicCriteria: {
      session: { type: String },
      section: { type: String },
    },

    membersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);
