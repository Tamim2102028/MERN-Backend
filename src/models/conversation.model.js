import mongoose, { Schema } from "mongoose";
import { CHAT_TYPES } from "../constants/index.js";

const conversationSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(CHAT_TYPES),
      default: CHAT_TYPES.DUAL,
      required: true,
      index: true,
    },

    // --- Basic Info ---
    // প্রথম ইউজার যখন জয়েন করবে, তার ইনফো দিয়ে অটো নাম জেনারেট হবে।
    // e.g. "CSE - Session 2023-24"
    groupName: { type: String, trim: true },
    groupAvatar: { type: String },

    // --- Target Criteria (For Auto Creation & Joining) ---
    targetCriteria: {
      institution: { type: Schema.Types.ObjectId, ref: "Institution" }, // Must
      department: { type: Schema.Types.ObjectId, ref: "Department" }, // Must
      session: { type: String, trim: true }, // Must

      // Optional (শুধুমাত্র সেকশন/সাব-সেকশন চ্যাটের জন্য)
      section: { type: String, trim: true },
      subSection: { type: String, trim: true },
    },

    // --- Participants ---
    // DUAL হলে ২ জন থাকবে।
    // Auto Group হলে ফাঁকা থাকবে (ChatMembership মডেলে থাকবে)
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],

    lastMessage: {
      text: String,
      sender: { type: Schema.Types.ObjectId, ref: "User" },
      createdAt: Date,
    },
  },
  { timestamps: true }
);

// --- 🔒 Unique Compound Indexes (The Core Logic) ---

// 1. Level 1: BATCH_DEPT_CHAT (Dept + Session must be unique)
conversationSchema.index(
  {
    "targetCriteria.institution": 1,
    "targetCriteria.department": 1,
    "targetCriteria.session": 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: { type: CHAT_TYPES.BATCH_DEPT_CHAT },
  }
);

// 2. Level 2: SECTION_CHAT (Dept + Session + Section must be unique)
conversationSchema.index(
  {
    "targetCriteria.institution": 1,
    "targetCriteria.department": 1,
    "targetCriteria.session": 1,
    "targetCriteria.section": 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: { type: CHAT_TYPES.SECTION_CHAT },
  }
);

// 3. Level 3: SUB_SECTION_CHAT (Dept + Session + Section + SubSection must be unique)
conversationSchema.index(
  {
    "targetCriteria.institution": 1,
    "targetCriteria.department": 1,
    "targetCriteria.session": 1,
    "targetCriteria.section": 1,
    "targetCriteria.subSection": 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: { type: CHAT_TYPES.SUB_SECTION_CHAT },
  }
);

// 4. Normal DUAL Chat
conversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
