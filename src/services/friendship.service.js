import { Friendship } from "../models/friendship.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { FRIENDSHIP_STATUS } from "../constants/index.js";
import { createNotification } from "./notification.service.js";
import { NOTIFICATION_TYPES } from "../constants/index.js";

// 1. Send Request
export const sendFriendRequestService = async (requesterId, recipientId) => {
  if (requesterId.toString() === recipientId.toString())
    throw new ApiError(400, "Invalid action");

  const existing = await Friendship.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  });

  if (existing) {
    if (existing.status === FRIENDSHIP_STATUS.ACCEPTED)
      throw new ApiError(400, "Already friends");
    if (existing.status === FRIENDSHIP_STATUS.BLOCKED)
      throw new ApiError(403, "Action blocked");
    if (existing.status === FRIENDSHIP_STATUS.PENDING)
      return { message: "Request already pending" };
  }

  const request = await Friendship.create({
    requester: requesterId,
    recipient: recipientId,
    status: FRIENDSHIP_STATUS.PENDING,
  });

  // Notification
  createNotification({
    recipient: recipientId,
    actor: requesterId,
    type: NOTIFICATION_TYPES.FRIEND_REQUEST,
    relatedId: requesterId,
    relatedModel: "User",
    message: "sent you a friend request.",
  }).catch(() => {});

  return request;
};

// 2. Accept Request
export const acceptFriendRequestService = async (userId, requestId) => {
  const request = await Friendship.findOne({
    _id: requestId,
    recipient: userId, // যে এক্সেপ্ট করছে সে অবশ্যই রিসিভেন্ট হতে হবে
    status: FRIENDSHIP_STATUS.PENDING,
  });

  if (!request) throw new ApiError(404, "Request not found");

  request.status = FRIENDSHIP_STATUS.ACCEPTED;
  await request.save();

  // Notification
  createNotification({
    recipient: request.requester,
    actor: userId,
    type: NOTIFICATION_TYPES.FRIEND_ACCEPT,
    relatedId: userId,
    relatedModel: "User",
    message: "accepted your friend request.",
  }).catch(() => {});

  return { message: "Accepted" };
};

// 3. Cancel / Reject Request (আপনার চাওয়া Cancel API)
// এটা দিয়ে Sent Request ক্যানসেল করা যাবে, আবার Incoming Request রিজেক্টও করা যাবে
export const cancelOrRejectRequestService = async (userId, requestId) => {
  const request = await Friendship.findOneAndDelete({
    _id: requestId,
    $or: [{ requester: userId }, { recipient: userId }], // আমি সেন্ডার বা রিসিভার যেই হই না কেন
    status: FRIENDSHIP_STATUS.PENDING,
  });

  if (!request) throw new ApiError(404, "Request not found or already handled");
  return { message: "Request removed" };
};

// 4. Unfriend
export const unfriendUserService = async (userId, friendId) => {
  const deleted = await Friendship.findOneAndDelete({
    $or: [
      { requester: userId, recipient: friendId },
      { requester: friendId, recipient: userId },
    ],
    status: FRIENDSHIP_STATUS.ACCEPTED,
  });

  if (!deleted) throw new ApiError(404, "Friendship not found");
  return { message: "Unfriended" };
};

// 5. Get Lists (With Pagination Metadata)
export const getFriendshipListService = async (userId, type, page, limit) => {
  const skip = (page - 1) * limit;
  let query = {};

  if (type === "incoming") {
    query = { recipient: userId, status: FRIENDSHIP_STATUS.PENDING };
  } else if (type === "sent") {
    query = { requester: userId, status: FRIENDSHIP_STATUS.PENDING };
  } else if (type === "friends") {
    query = {
      $or: [{ requester: userId }, { recipient: userId }],
      status: FRIENDSHIP_STATUS.ACCEPTED,
    };
  } else if (type === "blocked") {
    query = { requester: userId, status: FRIENDSHIP_STATUS.BLOCKED };
  }

  // ✅ ১. মোট কতগুলো ডাটা আছে সেটা গোনা (Metadata এর জন্য)
  const totalDocs = await Friendship.countDocuments(query);

  const rawData = await Friendship.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("requester", "fullName userName avatar institution")
    .populate("recipient", "fullName userName avatar institution")
    .populate({
      path: "requester",
      populate: { path: "institution", select: "name" },
    })
    .populate({
      path: "recipient",
      populate: { path: "institution", select: "name" },
    })
    .lean();

  const formattedData = rawData
    .map((item) => {
      if (!item.requester || !item.recipient) return null;

      let profileData = null;
      if (type === "incoming") profileData = item.requester;
      else if (type === "sent") profileData = item.recipient;
      else if (type === "friends" || type === "blocked") {
        profileData =
          item.requester._id.toString() === userId.toString()
            ? item.recipient
            : item.requester;
      }

      return {
        _id: item._id,
        status: item.status,
        createdAt: item.createdAt,
        profile: {
          _id: profileData._id,
          fullName: profileData.fullName,
          userName: profileData.userName,
          avatar: profileData.avatar,
          institutionName: profileData.institution?.name || "No Institution",
        },
      };
    })
    .filter((i) => i !== null);

  // ✅ ২. মেটাডাটা সহ রিটার্ন করা
  const totalPages = Math.ceil(totalDocs / limit);

  return {
    docs: formattedData, // আসল ডাটা
    pagination: {
      totalDocs,
      totalPages,
      page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

// 6. Get Friend Suggestions (New Feature)
export const getFriendSuggestionsService = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  // ১. কাদের বাদ দিব? (নিজে + অলরেডি ফ্রেন্ড + রিকোয়েস্ট পাঠানো/পাওয়া + ব্লকড)
  const existingRelations = await Friendship.find({
    $or: [{ requester: userId }, { recipient: userId }],
  }).select("requester recipient");

  const excludeIds = existingRelations.reduce(
    (acc, rel) => {
      acc.push(rel.requester.toString());
      acc.push(rel.recipient.toString());
      return acc;
    },
    [userId.toString()]
  ); // নিজেকেও বাদ দিলাম

  // ২. ইউজার খোঁজা (যাদের ID exclude লিস্টে নেই)
  const query = { _id: { $nin: excludeIds }, accountStatus: "ACTIVE" };

  const totalDocs = await User.countDocuments(query);

  const users = await User.find(query)
    .sort({ createdAt: -1 }) // অথবা র‍্যান্ডম করা যেতে পারে
    .skip(skip)
    .limit(limit)
    .select("fullName userName avatar institution")
    .populate("institution", "name")
    .lean();

  // ৩. ফ্রন্টএন্ডের জন্য একই ফরম্যাটে ডাটা সাজানো
  const formattedData = users.map((u) => ({
    _id: null, // সাজেশনে কোনো ফ্রেন্ডশিপ আইডি নেই
    status: "NONE",
    profile: {
      _id: u._id,
      fullName: u.fullName,
      userName: u.userName,
      avatar: u.avatar,
      institutionName: u.institution?.name || "No Institution",
    },
  }));

  const totalPages = Math.ceil(totalDocs / limit);

  return {
    docs: formattedData,
    pagination: {
      totalDocs,
      totalPages,
      page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
