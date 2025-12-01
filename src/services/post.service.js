import { Post } from "../models/post.model.js";
import { Friendship } from "../models/friendship.model.js";
import { Follow } from "../models/follow.model.js";
import { GroupMembership } from "../models/groupMembership.model.js";
import { RoomMembership } from "../models/roomMembership.model.js";
import { Group } from "../models/group.model.js";
import { Reaction } from "../models/reaction.model.js"; // ✅ ADDED
import { uploadFile } from "../utils/fileUpload.js";
import { ApiError } from "../utils/ApiError.js";
import {
  FRIENDSHIP_STATUS,
  POST_VISIBILITY,
  POST_TARGET_MODELS,
  REACTION_TARGET_MODELS, // ✅ ADDED
  GROUP_MEMBERSHIP_STATUS,
  RESOURCE_ROLES,
  GROUP_PRIVACY,
} from "../constants/index.js";

// ================================================================
// 1. CREATE POST SERVICE
// ================================================================
export const createPostService = async (currentUser, postData, localFiles) => {
  const { content, postOnModel, postOnId } = postData;

  // --- 🔥 GROUP SECURITY CHECK START ---
  if (postOnModel === POST_TARGET_MODELS.GROUP) {
    // ১. গ্রুপটি আদৌ আছে কিনা?
    const group = await Group.findById(postOnId);
    if (!group) throw new ApiError(404, "Group not found");

    // ২. মেম্বারশিপ চেক
    const membership = await GroupMembership.findOne({
      group: postOnId,
      user: currentUser._id,
    });

    if (!membership) {
      throw new ApiError(403, "You must be a member to post in this group.");
    }

    // ৩. ব্যান চেক
    if (membership.status === GROUP_MEMBERSHIP_STATUS.BANNED) {
      throw new ApiError(403, "You are banned from posting in this group.");
    }

    // ৪. পেন্ডিং মেম্বার চেক
    if (membership.status === GROUP_MEMBERSHIP_STATUS.PENDING) {
      throw new ApiError(403, "Your join request is still pending.");
    }

    // ৫. পারমিশন সেটিংস চেক (Only Admin Posting)
    if (
      !group.settings.allowMemberPosting &&
      membership.role === RESOURCE_ROLES.MEMBER
    ) {
      throw new ApiError(403, "Only Admins allows posting in this group.");
    }

    // ৬. (Optional) Post Approval Logic
    // যদি group.settings.requirePostApproval = true হয়, তাহলে পোস্টের স্ট্যাটাস 'PENDING' করতে হবে।
    // আপাতত আমরা পোস্ট মডেলে 'isApproved' ফিল্ড রাখিনি, তাই এটা ফিউচারে হবে।
  }
  // --- GROUP SECURITY CHECK END ---

  if (
    (!content || content.trim() === "") &&
    (!localFiles || localFiles.length === 0)
  ) {
    if (!postData.sharedPost) {
      throw new ApiError(400, "Post must have some content or an image.");
    }
  }

  let attachments = [];
  if (localFiles && localFiles.length > 0) {
    const uploadPromises = localFiles.map(async (file) => {
      const uploaded = await uploadFile(file.path);
      return uploaded
        ? {
            type: "IMAGE",
            url: uploaded.url,
            name: file.originalname,
            size: file.size,
          }
        : null;
    });
    const results = await Promise.all(uploadPromises);
    attachments = results.filter((item) => item !== null);
  }

  return await Post.create({
    ...postData,
    author: currentUser._id,
    attachments,
  });
};

// ================================================================
// 2. GET NEWS FEED SERVICE (Updated with isLikedByMe)
// ================================================================
export const getNewsFeedService = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  // ১. কানেকশন বের করা
  const [friends, following, groups, rooms] = await Promise.all([
    Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: FRIENDSHIP_STATUS.ACCEPTED,
    }).select("requester recipient"),
    Follow.find({ follower: userId }).select("followingId"),
    GroupMembership.find({ user: userId, status: "JOINED" }).select("group"),
    RoomMembership.find({ user: userId }).select("room"),
  ]);

  const friendIds = friends.map((f) =>
    f.requester.toString() === userId.toString() ? f.recipient : f.requester
  );
  const followingIds = following.map((f) => f.followingId);
  const groupIds = groups.map((g) => g.group);
  const roomIds = rooms.map((r) => r.room);

  // ২. মেইন কুয়েরি
  const query = {
    $or: [
      {
        author: { $in: friendIds },
        postOnModel: POST_TARGET_MODELS.USER,
        visibility: {
          $in: [POST_VISIBILITY.PUBLIC, POST_VISIBILITY.CONNECTIONS],
        },
      },
      {
        postOnId: { $in: followingIds },
        postOnModel: {
          $in: [
            POST_TARGET_MODELS.INSTITUTION,
            POST_TARGET_MODELS.DEPARTMENT,
            POST_TARGET_MODELS.PAGE,
          ],
        },
      },
      { postOnId: { $in: groupIds }, postOnModel: POST_TARGET_MODELS.GROUP },
      { postOnId: { $in: roomIds }, postOnModel: POST_TARGET_MODELS.ROOM },
      { author: userId },
    ],
    isArchived: false,
  };

  // ৩. পোস্ট ডাটা আনা
  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("author", "fullName userName avatar userType")
    .populate("postOnId", "name title avatar logo code")
    .populate({
      path: "sharedPost",
      populate: { path: "author", select: "fullName userName avatar" },
    })
    .lean();

  // ================================================================
  // 🔥 4. CALCULATED FIELDS LOGIC (IS LIKED BY ME?)
  // ================================================================

  if (posts.length === 0) return [];

  // A. এই পেজের সব পোস্টের ID বের করা
  const postIds = posts.map((p) => p._id);

  // B. Reaction টেবিলে চেক করা: আমি এই পোস্টগুলোতে লাইক দিয়েছি কিনা
  const myReactions = await Reaction.find({
    user: userId,
    targetModel: REACTION_TARGET_MODELS.POST,
    targetId: { $in: postIds },
  }).select("targetId");

  // C. ফাস্ট সার্চের জন্য Set ব্যবহার করা
  const likedPostIds = new Set(myReactions.map((r) => r.targetId.toString()));

  // D. প্রতিটি পোস্টের সাথে isLikedByMe যুক্ত করা
  const enrichedPosts = posts.map((post) => ({
    ...post,
    isLikedByMe: likedPostIds.has(post._id.toString()),
  }));

  return enrichedPosts;
};

// ================================================================
// 3. GET SPECIFIC TARGET FEED (Group / Room / Page Feed)
// ================================================================
export const getTargetFeedService = async (
  userId,
  targetModel,
  targetId,
  page,
  limit
) => {
  const skip = (page - 1) * limit;

  // 🛡️ SECURITY & PRIVACY CHECK 🛡️

  // A. ROOM (Classroom) -> Must be a member
  if (targetModel === POST_TARGET_MODELS.ROOM) {
    const isMember = await RoomMembership.findOne({
      room: targetId,
      user: userId,
    });
    if (!isMember) {
      throw new ApiError(
        403,
        "Access Denied. You are not a member of this Classroom."
      );
    }
  }

  // B. GROUP -> Check Privacy
  else if (targetModel === POST_TARGET_MODELS.GROUP) {
    const group = await Group.findById(targetId).select("privacy");
    if (!group) throw new ApiError(404, "Group not found.");

    // প্রাইভেট গ্রুপ হলে মেম্বারশিপ চেক বাধ্যতামূলক
    if (group.privacy === GROUP_PRIVACY.PRIVATE) {
      const isMember = await GroupMembership.findOne({
        group: targetId,
        user: userId,
        status: GROUP_MEMBERSHIP_STATUS.JOINED,
      });
      if (!isMember) {
        throw new ApiError(403, "This is a Private Group. Join to view posts.");
      }
    }
    // পাবলিক গ্রুপ হলে সবাই দেখতে পারবে (No Check Needed)
  }

  // C. INSTITUTION / DEPARTMENT -> (Usually Public, No Check Needed for MVP)

  // 🔍 FETCH POSTS
  const posts = await Post.find({
    postOnModel: targetModel, // e.g. "Group"
    postOnId: targetId, // e.g. GroupId
    isArchived: false,
  })
    .sort({ isPinned: -1, createdAt: -1 }) // পিন পোস্ট আগে, তারপর লেটেস্ট
    .skip(skip)
    .limit(limit)
    .populate("author", "fullName userName avatar")
    .populate("postOnId", "name title")
    .populate({
      path: "sharedPost",
      populate: { path: "author", select: "fullName userName avatar" },
    })
    .lean();

  // ❤️ CALCULATE: isLikedByMe
  if (posts.length > 0) {
    const postIds = posts.map((p) => p._id);
    const myReactions = await Reaction.find({
      user: userId,
      targetModel: REACTION_TARGET_MODELS.POST,
      targetId: { $in: postIds },
    }).select("targetId");

    const likedPostIds = new Set(myReactions.map((r) => r.targetId.toString()));

    posts.forEach((post) => {
      post.isLikedByMe = likedPostIds.has(post._id.toString());
    });
  }

  return posts;
};
