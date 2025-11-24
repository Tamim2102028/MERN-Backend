import mongoose, { Schema } from "mongoose";
import { ROOM_STATUS } from "../constants/index.js";

const roomSchema = new Schema(
  {
    // --- 1. Basic Info ---
    title: {
      type: String,
      required: true,
      trim: true,
    }, // e.g. "Chemistry 1st Paper"

    description: { type: String, trim: true },
    coverImage: { type: String },

    // --- 2. Access ---
    joinCode: {
      type: String,
      unique: true,
      index: true,
    },

    // --- 3. Organization (Restricted to Teacher's Institution) ---
    institution: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },

    // --- 4. Auto-Join Criteria ---
    // টিচার যখন রুম বানাবে, এই ইনফো সিলেক্ট করবে।
    // সিস্টেম তখন Matching Student-দের অ্যাড করে দেবে।
    academicCriteria: {
      session: { type: String, required: true }, // e.g. "2021-22"
      section: { type: String }, // e.g. "A" (Optional)
      subSection: { type: String }, // e.g. "A1" (Optional)
    },

    // --- 5. Management ---
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coTeachers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // --- 6. Config ---
    status: {
      type: String,
      enum: Object.values(ROOM_STATUS),
      default: ROOM_STATUS.ACTIVE,
    },

    settings: {
      allowStudentPosting: { type: Boolean, default: true },
      allowComments: { type: Boolean, default: true },
    },

    membersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// --- Indexes ---
// ফাস্ট লোডিংয়ের জন্য
roomSchema.index({
  institution: 1,
  department: 1,
  "academicCriteria.session": 1,
});
roomSchema.index({ creator: 1 });

export const Room = mongoose.model("Room", roomSchema);
