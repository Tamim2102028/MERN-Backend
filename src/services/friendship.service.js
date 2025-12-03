import { Friendship } from "../models/friendship.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  FRIENDSHIP_STATUS,
  FRIEND_REQUEST_POLICY,
} from "../constants/index.js";
import { createNotification } from "./notification.service.js"; // ✅ ADDED
import { NOTIFICATION_TYPES } from "../constants/index.js"; // ✅ ADDED

// ==========================================
// 1. SEND FRIEND REQUEST (With Privacy & Logic)
// ==========================================
export const sendFriendRequestService = async (requesterId, recipientId) => {
  if (requesterId.toString() === recipientId.toString()) {
    throw new ApiError(400, "You cannot send a friend request to yourself.");
  }

  // A. টার্গেট ইউজার এবং তার প্রাইভেসি সেটিংস চেক করা
  const recipient = await User.findById(recipientId).select("privacySettings");
  if (!recipient) {
    throw new ApiError(404, "User not found.");
  }

  // 🔥 Privacy Check: সে কি রিকোয়েস্ট এলাউ করে?
  if (
    recipient.privacySettings?.friendRequestPolicy ===
    FRIEND_REQUEST_POLICY.NOBODY
  ) {
    throw new ApiError(403, "This user does not accept friend requests.");
  }

  // B. এক্সিস্টিং রিলেশন চেক করা
  const existingRelation = await Friendship.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  });

  if (existingRelation) {
    // ১. যদি অলরেডি ফ্রেন্ড হয়
    if (existingRelation.status === FRIENDSHIP_STATUS.ACCEPTED) {
      throw new ApiError(400, "You are already friends.");
    }
    // ২. যদি ব্লকড থাকে
    if (existingRelation.status === FRIENDSHIP_STATUS.BLOCKED) {
      throw new ApiError(
        403,
        "You cannot send a request due to privacy/block settings."
      );
    }
    // ৩. যদি আমি অলরেডি পাঠিয়ে থাকি
    if (existingRelation.requester.toString() === requesterId.toString()) {
      throw new ApiError(400, "Friend request already sent.");
    }

    // 🔥 ৪. AUTO ACCEPT LOGIC (Reverse Request)
    // যদি সে আমাকে আগেই পাঠিয়ে থাকে (Pending), তাহলে এখন আমি পাঠালে সেটা অটোমেটিক Accept হবে
    if (existingRelation.recipient.toString() === requesterId.toString()) {
      existingRelation.status = FRIENDSHIP_STATUS.ACCEPTED;
      await existingRelation.save(); // Hook will update connectionsCount

      // 🔥 NOTIFICATION (Auto Accept)
      createNotification({
        recipient: existingRelation.requester, // যে আগে রিকোয়েস্ট দিয়েছিল
        actor: requesterId,
        type: NOTIFICATION_TYPES.FRIEND_ACCEPT,
        relatedId: requesterId,
        relatedModel: "User",
        message: "accepted your friend request.",
      }).catch(console.error);

      return {
        status: FRIENDSHIP_STATUS.ACCEPTED,
        message: "Friend request accepted automatically!",
      };
    }
  }

  // C. সব ঠিক থাকলে নতুন রিকোয়েস্ট তৈরি
  const newRequest = await Friendship.create({
    requester: requesterId,
    recipient: recipientId,
    status: FRIENDSHIP_STATUS.PENDING,
  });

  // 🔥 NOTIFICATION (New Request)
  createNotification({
    recipient: recipientId,
    actor: requesterId,
    type: NOTIFICATION_TYPES.FRIEND_REQUEST,
    relatedId: requesterId, // ক্লিক করলে ইউজারের প্রোফাইল খুলবে
    relatedModel: "User",
    message: "sent you a friend request.",
  }).catch(console.error);

  return { status: FRIENDSHIP_STATUS.PENDING, data: newRequest };
};

// ==========================================
// 2. ACCEPT FRIEND REQUEST
// ==========================================
export const acceptFriendRequestService = async (userId, requestId) => {
  const request = await Friendship.findOne({
    _id: requestId,
    recipient: userId,
    status: FRIENDSHIP_STATUS.PENDING,
  });

  if (!request) {
    throw new ApiError(404, "Friend request not found or already processed.");
  }

  request.status = FRIENDSHIP_STATUS.ACCEPTED;
  await request.save();

  // 🔥 NOTIFICATION (Accept)
  createNotification({
    recipient: request.requester, // যে রিকোয়েস্ট পাঠিয়েছিল
    actor: userId, // আমি (যে এক্সেপ্ট করলাম)
    type: NOTIFICATION_TYPES.FRIEND_ACCEPT,
    relatedId: userId,
    relatedModel: "User",
    message: "accepted your friend request.",
  }).catch(console.error);

  return request;
};

// ==========================================
// 3. REJECT / CANCEL REQUEST (Delete)
// ==========================================
export const deleteRequestService = async (userId, requestId) => {
  // লজিক:
  // - আমি যদি Recipient হই -> REJECT
  // - আমি যদি Requester হই -> CANCEL

  const request = await Friendship.findOneAndDelete({
    _id: requestId,
    $or: [{ requester: userId }, { recipient: userId }],
    status: FRIENDSHIP_STATUS.PENDING, // শুধু পেন্ডিং ডিলিট করা যাবে
  });

  if (!request) {
    throw new ApiError(404, "Request not found.");
  }

  return { success: true };
};

// ==========================================
// 4. UNFRIEND (Breaking Up)
// ==========================================
export const unfriendUserService = async (userId, friendId) => {
  const friendship = await Friendship.findOneAndDelete({
    $or: [
      { requester: userId, recipient: friendId },
      { requester: friendId, recipient: userId },
    ],
    status: FRIENDSHIP_STATUS.ACCEPTED,
  });

  if (!friendship) {
    throw new ApiError(404, "Friendship not found.");
  }

  // Hook অটোমেটিক connectionsCount কমিয়ে দেবে
  return { success: true };
};

// ==========================================
// 5. BLOCK USER
// ==========================================
export const blockUserService = async (userId, targetId) => {
  if (userId.toString() === targetId.toString()) {
    throw new ApiError(400, "You cannot block yourself.");
  }

  // ১. আগে কোনো রিলেশন আছে কিনা দেখি
  let friendship = await Friendship.findOne({
    $or: [
      { requester: userId, recipient: targetId },
      { requester: targetId, recipient: userId },
    ],
  });

  // ২. যদি তারা ফ্রেন্ড থাকে, তবে ব্লকিং এর আগে কাউন্ট কমাতে হবে
  // (কারণ আমরা স্ট্যাটাস আপডেট করছি, ডিলিট করছি না। ডিলিট হুক ট্রিগার হবে না)
  if (friendship && friendship.status === FRIENDSHIP_STATUS.ACCEPTED) {
    await User.findByIdAndUpdate(userId, { $inc: { connectionsCount: -1 } });
    await User.findByIdAndUpdate(targetId, { $inc: { connectionsCount: -1 } });
  }

  if (friendship) {
    // রিলেশন থাকলে আপডেট করে ব্লক করে দিচ্ছি
    friendship.status = FRIENDSHIP_STATUS.BLOCKED;
    friendship.blockedBy = userId; // কে ব্লক দিল
    await friendship.save();
  } else {
    // রিলেশন না থাকলে নতুন ব্লক এন্ট্রি তৈরি করছি
    await Friendship.create({
      requester: userId,
      recipient: targetId,
      status: FRIENDSHIP_STATUS.BLOCKED,
      blockedBy: userId,
    });
  }

  return { success: true };
};

// ==========================================
// 6. UNBLOCK USER
// ==========================================
export const unblockUserService = async (userId, targetId) => {
  const friendship = await Friendship.findOneAndDelete({
    $or: [
      { requester: userId, recipient: targetId },
      { requester: targetId, recipient: userId },
    ],
    status: FRIENDSHIP_STATUS.BLOCKED,
    blockedBy: userId, // আমি ব্লক দিলেই কেবল আমি আনব্লক করতে পারব
  });

  if (!friendship) {
    throw new ApiError(
      404,
      "Block entry not found or you didn't block this user."
    );
  }

  return { success: true };
};

// ==========================================
// 7. GET LISTS (Incoming / Sent / Friends)
// ==========================================
export const getFriendshipListService = async (userId, type, page, limit) => {
  const skip = (page - 1) * limit;
  let query = {};
  let populateField = "";

  if (type === "INCOMING") {
    // আমাকে কে পাঠিয়েছে (Pending)
    query = { recipient: userId, status: FRIENDSHIP_STATUS.PENDING };
    populateField = "requester";
  } else if (type === "SENT") {
    // আমি কাকে পাঠিয়েছি (Pending)
    query = { requester: userId, status: FRIENDSHIP_STATUS.PENDING };
    populateField = "recipient";
  } else if (type === "FRIENDS") {
    // আমার বন্ধু কারা (Accepted)
    query = {
      $or: [{ requester: userId }, { recipient: userId }],
      status: FRIENDSHIP_STATUS.ACCEPTED,
    };
    // এখানে পপুলেট ডাইনামিক করতে হবে (যে আমি না, সে-ই বন্ধু)
    // এটা সার্ভিসে করা জটিল, তাই আমরা কন্ট্রোলারে বা এখানে লুপ চালিয়ে ম্যাপ করতে পারি।
    // অথবা Mongoose Virtuals ইউজ করতে পারি। আপাতত সিম্পল পপুলেট করছি।
  } else if (type === "BLOCKED") {
    query = {
      $or: [{ requester: userId }, { recipient: userId }],
      status: FRIENDSHIP_STATUS.BLOCKED,
      blockedBy: userId,
    };
  }

  let data = await Friendship.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("requester", "fullName userName avatar")
    .populate("recipient", "fullName userName avatar")
    .lean();

  // ফ্রেন্ডলিস্টের জন্য ডাটা ক্লিন করা (যাতে শুধু বন্ধুর প্রোফাইল থাকে)
  if (type === "FRIENDS") {
    data = data.map((f) => ({
      _id: f._id, // Friendship ID (Unfriend করার জন্য লাগবে)
      friend:
        f.requester._id.toString() === userId.toString()
          ? f.recipient
          : f.requester,
      since: f.updatedAt,
    }));
  } else if (type === "BLOCKED") {
    data = data.map((f) => ({
      _id: f._id,
      blockedUser:
        f.requester._id.toString() === userId.toString()
          ? f.recipient
          : f.requester,
    }));
  }

  return data;
};

// ==========================================
// 8. GET FRIEND SUGGESTIONS
// ==========================================
/**
 * Friend Suggestions Logic:
 *
 * Include (OR):
 * - Same Institution এর users
 * - Same Department এর users
 * - Friends of Friends
 *
 * Exclude:
 * - নিজেকে
 * - Already Friends
 * - Pending Incoming Requests
 * - Pending Sent Requests
 * - Blocked users
 */
export const getFriendSuggestionsService = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  // ১. Current user এর info নিই
  const currentUser = await User.findById(userId).select(
    "institution academicInfo.department"
  );

  if (!currentUser) {
    throw new ApiError(404, "User not found.");
  }

  // ২. Exclude করার জন্য user IDs collect করি
  // (Friends, Pending requests, Blocked)
  const existingRelations = await Friendship.find({
    $or: [{ requester: userId }, { recipient: userId }],
  }).select("requester recipient");

  const excludeUserIds = new Set([userId.toString()]); // নিজেকে exclude

  existingRelations.forEach((rel) => {
    excludeUserIds.add(rel.requester.toString());
    excludeUserIds.add(rel.recipient.toString());
  });

  // ৩. Friends of Friends খুঁজি
  // প্রথমে আমার friends দের IDs নিই
  const myFriendships = await Friendship.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: FRIENDSHIP_STATUS.ACCEPTED,
  }).select("requester recipient");

  const myFriendIds = myFriendships.map((f) =>
    f.requester.toString() === userId.toString()
      ? f.recipient.toString()
      : f.requester.toString()
  );

  // Friends এর friends খুঁজি
  let friendsOfFriendsIds = [];
  if (myFriendIds.length > 0) {
    const fofRelations = await Friendship.find({
      $or: [
        { requester: { $in: myFriendIds } },
        { recipient: { $in: myFriendIds } },
      ],
      status: FRIENDSHIP_STATUS.ACCEPTED,
    }).select("requester recipient");

    fofRelations.forEach((rel) => {
      const id1 = rel.requester.toString();
      const id2 = rel.recipient.toString();
      if (!excludeUserIds.has(id1)) friendsOfFriendsIds.push(id1);
      if (!excludeUserIds.has(id2)) friendsOfFriendsIds.push(id2);
    });

    // Unique করি
    friendsOfFriendsIds = [...new Set(friendsOfFriendsIds)];
  }

  // ৪. Suggestions query বানাই
  // Note: MongoDB query তে string ID ব্যবহার করলেও কাজ করে, ObjectId convert করার দরকার নেই
  const excludeIdsArray = Array.from(excludeUserIds);

  const matchConditions = [];

  // Same Institution
  if (currentUser.institution) {
    matchConditions.push({ institution: currentUser.institution });
  }

  // Same Department
  if (currentUser.academicInfo?.department) {
    matchConditions.push({
      "academicInfo.department": currentUser.academicInfo.department,
    });
  }

  // Friends of Friends
  if (friendsOfFriendsIds.length > 0) {
    matchConditions.push({
      _id: { $in: friendsOfFriendsIds },
    });
  }

  // যদি কোনো condition না থাকে, empty return করি
  if (matchConditions.length === 0) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        totalDocs: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  // ৫. Final query
  const queryCondition = {
    $and: [
      { _id: { $nin: excludeIdsArray } }, // Exclude existing relations
      { $or: matchConditions }, // Match any of the conditions
    ],
  };

  // Total count for pagination
  const totalDocs = await User.countDocuments(queryCondition);

  const suggestions = await User.find(queryCondition)
    .select("fullName userName avatar institution academicInfo.department")
    .populate("institution", "name")
    .populate("academicInfo.department", "name")
    .skip(skip)
    .limit(limit)
    .lean();

  // Return with pagination info
  const totalPages = Math.ceil(totalDocs / limit);
  return {
    data: suggestions,
    pagination: {
      page,
      limit,
      totalDocs,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
