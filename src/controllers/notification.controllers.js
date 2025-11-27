import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  getUserNotificationsService,
  getUnreadCountService,
  markNotificationReadService,
  markAllReadService,
} from "../services/notification.service.js";

// 1. Get List
export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const notifications = await getUserNotificationsService(
    req.user._id,
    parseInt(page) || 1,
    parseInt(limit) || 20
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, notifications, "Notifications fetched successfully")
    );
});

// 2. Get Unread Count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await getUnreadCountService(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, { count }, "Unread count fetched"));
});

// 3. Mark Single as Read
export const markNotificationRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const updatedNotification = await markNotificationReadService(
    req.user._id,
    notificationId
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedNotification, "Notification marked as read")
    );
});

// 4. Mark All as Read
export const markAllRead = asyncHandler(async (req, res) => {
  await markAllReadService(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "All notifications marked as read"));
});
