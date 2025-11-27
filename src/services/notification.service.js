import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";

// ==========================================
// 1. CREATE NOTIFICATION (Internal Use Only)
// ==========================================
/**
 * এই ফাংশনটি কোনো API দিয়ে কল হবে না।
 * এটা কল হবে PostService বা FriendshipService এর ভেতর থেকে।
 */
export const createNotification = async ({
  recipient,
  actor,
  type,
  relatedId,
  relatedModel,
  message,
}) => {
  // ১. নিজেকে নিজে নোটিফিকেশন পাঠানোর দরকার নেই
  // (যেমন: নিজের পোস্টে নিজে লাইক দিলে)
  if (recipient.toString() === actor.toString()) {
    return null;
  }

  // ২. নোটিফিকেশন তৈরি
  const notification = await Notification.create({
    recipient,
    actor,
    type,
    relatedId,
    relatedModel,
    message,
    isRead: false,
  });

  return notification;
};

// ==========================================
// 2. GET USER NOTIFICATIONS
// ==========================================
export const getUserNotificationsService = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({
    recipient: userId,
    isHidden: false,
  })
    .sort({ createdAt: -1 }) // লেটেস্ট আগে
    .skip(skip)
    .limit(limit)
    // নোটিফিকেশনের অ্যাক্টর (যে কাজটা করেছে) তার তথ্য
    .populate("actor", "fullName userName avatar")
    // জেনেরিক পপুলেট (Post, Comment, Friendship, etc.)
    .populate("relatedId")
    .lean();

  return notifications;
};

// ==========================================
// 3. GET UNREAD COUNT (For Red Badge 🔴)
// ==========================================
export const getUnreadCountService = async (userId) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
    isHidden: false,
  });
  return count;
};

// ==========================================
// 4. MARK AS READ
// ==========================================
export const markNotificationReadService = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId }, // সিকিউরিটি: অন্যরটা মার্ক করা যাবে না
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found or unauthorized");
  }

  return notification;
};

// ==========================================
// 5. MARK ALL AS READ (Optional utility)
// ==========================================
export const markAllReadService = async (userId) => {
  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } }
  );
  return { success: true };
};
