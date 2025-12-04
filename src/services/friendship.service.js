import { Friendship } from "../models/friendship.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { FRIENDSHIP_STATUS } from "../constants/index.js";
import { createNotification } from "./notification.service.js";
import { NOTIFICATION_TYPES } from "../constants/index.js";

// ======================= ACTION SERVICES (WRITE) =======================

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

export const acceptFriendRequestService = async (userId, requestId) => {
  const request = await Friendship.findOne({
    _id: requestId,
    recipient: userId,
    status: FRIENDSHIP_STATUS.PENDING,
  });

  if (!request) throw new ApiError(404, "Request not found");

  request.status = FRIENDSHIP_STATUS.ACCEPTED;
  await request.save();

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

export const cancelOrRejectRequestService = async (userId, requestId) => {
  const request = await Friendship.findOneAndDelete({
    _id: requestId,
    $or: [{ requester: userId }, { recipient: userId }],
    status: FRIENDSHIP_STATUS.PENDING,
  });

  if (!request) throw new ApiError(404, "Request not found");
  return { message: "Request removed" };
};

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

export const blockUserService = async (userId, targetId) => {
  // ব্লকিং লজিক আগের মতোই (রিপিট কমানোর জন্য সংক্ষেপে রাখলাম, আপনার আগেরটা ঠিক আছে)
  // ... (Update status to BLOCKED and decrement counts)
  let friendship = await Friendship.findOne({
    $or: [
      { requester: userId, recipient: targetId },
      { requester: targetId, recipient: userId },
    ],
  });

  if (friendship && friendship.status === FRIENDSHIP_STATUS.ACCEPTED) {
    await User.findByIdAndUpdate(userId, { $inc: { connectionsCount: -1 } });
    await User.findByIdAndUpdate(targetId, { $inc: { connectionsCount: -1 } });
  }

  if (friendship) {
    friendship.status = FRIENDSHIP_STATUS.BLOCKED;
    friendship.blockedBy = userId;
    await friendship.save();
  } else {
    await Friendship.create({
      requester: userId,
      recipient: targetId,
      status: FRIENDSHIP_STATUS.BLOCKED,
      blockedBy: userId,
    });
  }
  return { success: true };
};

export const unblockUserService = async (userId, targetId) => {
  const friendship = await Friendship.findOneAndDelete({
    $or: [
      { requester: userId, recipient: targetId },
      { requester: targetId, recipient: userId },
    ],
    status: FRIENDSHIP_STATUS.BLOCKED,
    blockedBy: userId,
  });
  if (!friendship) throw new ApiError(404, "Block entry not found");
  return { success: true };
};

// ======================= LIST SERVICES (READ - SEPARATED) =======================

// 1. Get Friends List
export const getFriendsListService = async (userId, page, limit) => {
  const skip = (page - 1) * limit;
  const query = {
    $or: [{ requester: userId }, { recipient: userId }],
    status: FRIENDSHIP_STATUS.ACCEPTED,
  };

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

  // Normalize: আমার বন্ধু যে, তার প্রোফাইল দেখাবো
  const docs = rawData
    .map((item) => {
      if (!item.requester || !item.recipient) return null;
      const friend =
        item.requester._id.toString() === userId.toString()
          ? item.recipient
          : item.requester;

      return {
        _id: item._id, // Friendship ID (for Unfriend)
        status: item.status,
        profile: {
          _id: friend._id,
          fullName: friend.fullName,
          userName: friend.userName,
          avatar: friend.avatar,
          institutionName: friend.institution?.name || "No Institution",
        },
      };
    })
    .filter((i) => i !== null);

  return {
    docs,
    pagination: {
      totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      limit,
      hasNextPage: page < Math.ceil(totalDocs / limit),
    },
  };
};

// 2. Get Incoming Requests
export const getIncomingRequestsService = async (userId, page, limit) => {
  const skip = (page - 1) * limit;
  const query = { recipient: userId, status: FRIENDSHIP_STATUS.PENDING };

  const totalDocs = await Friendship.countDocuments(query);
  const rawData = await Friendship.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("requester", "fullName userName avatar institution")
    .populate({
      path: "requester",
      populate: { path: "institution", select: "name" },
    })
    .lean();

  // Normalize: যে পাঠিয়েছে (Requester) তাকে দেখাবো
  const docs = rawData
    .map((item) => {
      if (!item.requester) return null;
      return {
        _id: item._id, // Request ID (for Accept/Reject)
        status: item.status,
        createdAt: item.createdAt,
        profile: {
          _id: item.requester._id,
          fullName: item.requester.fullName,
          userName: item.requester.userName,
          avatar: item.requester.avatar,
          institutionName: item.requester.institution?.name || "No Institution",
        },
      };
    })
    .filter((i) => i !== null);

  return {
    docs,
    pagination: {
      totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      limit,
      hasNextPage: page < Math.ceil(totalDocs / limit),
    },
  };
};

// 3. Get Sent Requests
export const getSentRequestsService = async (userId, page, limit) => {
  const skip = (page - 1) * limit;
  const query = { requester: userId, status: FRIENDSHIP_STATUS.PENDING };

  const totalDocs = await Friendship.countDocuments(query);
  const rawData = await Friendship.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("recipient", "fullName userName avatar institution")
    .populate({
      path: "recipient",
      populate: { path: "institution", select: "name" },
    })
    .lean();

  // Normalize: যাকে পাঠিয়েছি (Recipient) তাকে দেখাবো
  const docs = rawData
    .map((item) => {
      if (!item.recipient) return null;
      return {
        _id: item._id, // Request ID (for Cancel)
        status: item.status,
        createdAt: item.createdAt,
        profile: {
          _id: item.recipient._id,
          fullName: item.recipient.fullName,
          userName: item.recipient.userName,
          avatar: item.recipient.avatar,
          institutionName: item.recipient.institution?.name || "No Institution",
        },
      };
    })
    .filter((i) => i !== null);

  return {
    docs,
    pagination: {
      totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      limit,
      hasNextPage: page < Math.ceil(totalDocs / limit),
    },
  };
};

// 4. Get Blocked Users
export const getBlockedUsersService = async (userId, page, limit) => {
  const skip = (page - 1) * limit;
  // আমি যাকে ব্লক করেছি
  const query = {
    requester: userId,
    status: FRIENDSHIP_STATUS.BLOCKED,
    blockedBy: userId,
  };

  const totalDocs = await Friendship.countDocuments(query);
  const rawData = await Friendship.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("recipient", "fullName userName avatar institution")
    .populate({
      path: "recipient",
      populate: { path: "institution", select: "name" },
    })
    .lean();

  // Normalize: যে ব্লক খেয়েছে (Recipient) তাকে দেখাবো
  const docs = rawData
    .map((item) => {
      if (!item.recipient) return null;
      return {
        _id: item._id,
        status: item.status,
        profile: {
          _id: item.recipient._id, // User ID (for Unblock)
          fullName: item.recipient.fullName,
          userName: item.recipient.userName,
          avatar: item.recipient.avatar,
          institutionName: item.recipient.institution?.name || "No Institution",
        },
      };
    })
    .filter((i) => i !== null);

  return {
    docs,
    pagination: {
      totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      limit,
      hasNextPage: page < Math.ceil(totalDocs / limit),
    },
  };
};

// 5. Suggestions (As defined before)
export const getFriendSuggestionsService = async (userId, page, limit) => {
  // ... (আপনার আগের সাজেশন্স লজিক হুবহু এখানে বসবে, রিপিট কমানোর জন্য স্কিপ করলাম, কোড ঠিক আছে) ...
  // Just wrap return in { docs, pagination }
  return { docs: [], pagination: { totalDocs: 0, page, limit } }; // Placeholder logic, put real logic here
};
