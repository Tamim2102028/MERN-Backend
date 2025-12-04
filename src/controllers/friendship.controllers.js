import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  sendFriendRequestService,
  acceptFriendRequestService,
  cancelOrRejectRequestService,
  unfriendUserService,
  getFriendshipListService,
  getFriendSuggestionsService,
} from "../services/friendship.service.js";

export const sendRequest = asyncHandler(async (req, res) => {
  const result = await sendFriendRequestService(
    req.user._id,
    req.params.userId
  );
  return res.status(200).json(new ApiResponse(200, result, "Request sent"));
});

export const acceptRequest = asyncHandler(async (req, res) => {
  const result = await acceptFriendRequestService(
    req.user._id,
    req.params.requestId
  );
  return res.status(200).json(new ApiResponse(200, result, "Request accepted"));
});

// ✅ Cancel Sent Request / Reject Incoming Request
export const cancelRequest = asyncHandler(async (req, res) => {
  const result = await cancelOrRejectRequestService(
    req.user._id,
    req.params.requestId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Request cancelled/rejected"));
});

export const unfriend = asyncHandler(async (req, res) => {
  const result = await unfriendUserService(req.user._id, req.params.userId);
  return res.status(200).json(new ApiResponse(200, result, "Unfriended"));
});

export const getList = asyncHandler(async (req, res) => {
  const { type } = req.params; // friends, incoming, sent
  const { page, limit } = req.query;
  const list = await getFriendshipListService(
    req.user._id,
    type,
    parseInt(page),
    parseInt(limit)
  );
  return res
    .status(200)
    .json(new ApiResponse(200, list, `${type} list fetched`));
});

export const getSuggestions = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await getFriendSuggestionsService(
    req.user._id,
    parseInt(page),
    parseInt(limit)
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Friend suggestions fetched"));
});
