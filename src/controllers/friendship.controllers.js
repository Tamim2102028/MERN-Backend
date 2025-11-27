import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  sendFriendRequestService,
  acceptFriendRequestService,
  deleteRequestService,
  unfriendUserService,
  blockUserService,
  unblockUserService,
  getFriendshipListService,
} from "../services/friendship.service.js";

// 1. Send Request
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const { userId } = req.params; // Target User ID
  const result = await sendFriendRequestService(req.user._id, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Request processed successfully"));
});

// 2. Accept Request
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const result = await acceptFriendRequestService(req.user._id, requestId);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Friend request accepted"));
});

// 3. Reject / Cancel Request
export const deleteRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  await deleteRequestService(req.user._id, requestId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Request removed successfully"));
});

// 4. Unfriend
export const unfriendUser = asyncHandler(async (req, res) => {
  const { userId } = req.params; // যাকে আনফ্রেন্ড করব তার ID
  await unfriendUserService(req.user._id, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Unfriended successfully"));
});

// 5. Block User
export const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  await blockUserService(req.user._id, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User blocked successfully"));
});

// 6. Unblock User
export const unblockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  await unblockUserService(req.user._id, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User unblocked successfully"));
});

// 7. Get Lists (Helpers)
export const getIncomingRequests = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const list = await getFriendshipListService(
    req.user._id,
    "INCOMING",
    page,
    limit
  );
  return res
    .status(200)
    .json(new ApiResponse(200, list, "Incoming requests fetched"));
});

export const getSentRequests = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const list = await getFriendshipListService(
    req.user._id,
    "SENT",
    page,
    limit
  );
  return res
    .status(200)
    .json(new ApiResponse(200, list, "Sent requests fetched"));
});

export const getFriendsList = asyncHandler(async (req, res) => {
  const { userId } = req.params; // নিজের অথবা অন্যের ফ্রেন্ডলিস্ট
  const { page, limit } = req.query;

  // TODO: এখানে Privacy Check বসানো উচিত (Connection Visibility)।
  // আপাতত নিজেরটা দেখার জন্য বানাচ্ছি।

  const list = await getFriendshipListService(userId, "FRIENDS", page, limit);
  return res
    .status(200)
    .json(new ApiResponse(200, list, "Friends list fetched"));
});

export const getBlockedList = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const list = await getFriendshipListService(
    req.user._id,
    "BLOCKED",
    page,
    limit
  );
  return res
    .status(200)
    .json(new ApiResponse(200, list, "Blocked users fetched"));
});
