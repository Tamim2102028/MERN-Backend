import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as FriendshipService from "../services/friendship.service.js";

// --- Actions ---
export const sendRequest = asyncHandler(async (req, res) => {
  const result = await FriendshipService.sendFriendRequestService(
    req.user._id,
    req.params.userId
  );
  return res.status(200).json(new ApiResponse(200, result, "Request sent"));
});

export const acceptRequest = asyncHandler(async (req, res) => {
  const result = await FriendshipService.acceptFriendRequestService(
    req.user._id,
    req.params.requestId
  );
  return res.status(200).json(new ApiResponse(200, result, "Request accepted"));
});

export const cancelRequest = asyncHandler(async (req, res) => {
  const result = await FriendshipService.cancelOrRejectRequestService(
    req.user._id,
    req.params.requestId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Request cancelled/rejected"));
});

export const unfriend = asyncHandler(async (req, res) => {
  const result = await FriendshipService.unfriendUserService(
    req.user._id,
    req.params.userId
  );
  return res.status(200).json(new ApiResponse(200, result, "Unfriended"));
});

export const blockUser = asyncHandler(async (req, res) => {
  const result = await FriendshipService.blockUserService(
    req.user._id,
    req.params.userId
  );
  return res.status(200).json(new ApiResponse(200, result, "User blocked"));
});

export const unblockUser = asyncHandler(async (req, res) => {
  const result = await FriendshipService.unblockUserService(
    req.user._id,
    req.params.userId
  );
  return res.status(200).json(new ApiResponse(200, result, "User unblocked"));
});

// --- Specific List Controllers ---

export const getFriends = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await FriendshipService.getFriendsListService(
    req.user._id,
    +page || 1,
    +limit || 20
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Friends list fetched"));
});

export const getIncomingRequests = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await FriendshipService.getIncomingRequestsService(
    req.user._id,
    +page || 1,
    +limit || 20
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Incoming requests fetched"));
});

export const getSentRequests = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await FriendshipService.getSentRequestsService(
    req.user._id,
    +page || 1,
    +limit || 20
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Sent requests fetched"));
});

export const getBlockedUsers = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await FriendshipService.getBlockedUsersService(
    req.user._id,
    +page || 1,
    +limit || 20
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Blocked users fetched"));
});

export const getSuggestions = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await FriendshipService.getFriendSuggestionsService(
    req.user._id,
    +page || 1,
    +limit || 20
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Suggestions fetched"));
});

