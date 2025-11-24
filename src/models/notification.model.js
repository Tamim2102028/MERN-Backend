import mongoose, { Schema } from "mongoose";
import { NOTIFICATION_TYPES } from "../constants/index.js";

const notificationSchema = new Schema(
  {
    // ১. কাকে নোটিফিকেশন পাঠাচ্ছি?
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ২. কে ট্রিগার করেছে?
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // ৩. টাইপ
    type: {
      type: Schema.Types.String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },

    // ৪. রেফারেন্স (Post, Comment, etc.)
    relatedId: {
      type: Schema.Types.ObjectId,
      refPath: "relatedModel",
    },
    relatedModel: {
      type: String,
    },

    message: { type: String },

    // ৫. স্ট্যাটাস
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// --- Indexes (Performance Optimizations) ---

// ১. ইউজারের নোটিফিকেশন ফিড দ্রুত লোড করার জন্য
notificationSchema.index({ recipient: 1, createdAt: -1 });

// ২. Unread Count দ্রুত গোনার জন্য
notificationSchema.index({ recipient: 1, isRead: 1 });

// ৩. ✅ TTL Index (Auto Delete after 30 Days)
// 30 days * 24 hours * 60 mins * 60 secs = 2592000 seconds
// ৩০ দিন পার হলেই MongoDB এই ডকুমেন্ট ডিলিট করে দিবে।
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const Notification = mongoose.model("Notification", notificationSchema);
