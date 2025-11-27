import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Reaction } from "../models/reaction.model.js";
import { Friendship } from "../models/friendship.model.js";
import {
  createPostService,
  getNewsFeedService,
} from "../services/post.service.js";
import {
  REACTION_TARGET_MODELS,
  POST_VISIBILITY,
  FRIENDSHIP_STATUS,
} from "../constants/index.js";
import { createNotification } from "../services/notification.service.js"; // ✅ ADDED
import { NOTIFICATION_TYPES } from "../constants/index.js"; // ✅ ADDED

// ==========================================
// 🚀 1. CREATE POST
// ==========================================
export const createPost = asyncHandler(async (req, res) => {
  const post = await createPostService(req.user, req.body, req.files);
  return res
    .status(201)
    .json(new ApiResponse(201, post, "Post created successfully"));
});

// ==========================================
// 🚀 2. GET NEWS FEED (With isLikedByMe)
// ==========================================
export const getNewsFeed = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  // সার্ভিস লেয়ারেই এখন isLikedByMe ক্যালকুলেট হচ্ছে
  const posts = await getNewsFeedService(
    req.user._id,
    parseInt(page) || 1,
    parseInt(limit) || 10
  );
  return res
    .status(200)
    .json(new ApiResponse(200, posts, "News feed fetched successfully"));
});

// ==========================================
// 🚀 3. TOGGLE POST LIKE
// ==========================================
export const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");

  const existingReaction = await Reaction.findOne({
    targetId: postId,
    targetModel: REACTION_TARGET_MODELS.POST,
    user: userId,
  });

  if (existingReaction) {
    // Unlike Logic
    await Reaction.findByIdAndDelete(existingReaction._id);
    return res
      .status(200)
      .json(new ApiResponse(200, { isLiked: false }, "Unliked successfully"));
  } else {
    // Like Logic
    await Reaction.create({
      targetId: postId,
      targetModel: REACTION_TARGET_MODELS.POST,
      user: userId,
    });

    // 🔥 NOTIFICATION TRIGGER (Fire & Forget)
    // আমরা await দিচ্ছি না যাতে রেসপন্স ফাস্ট হয়, তবে এরর হ্যান্ডলিংয়ের জন্য catch ব্লক রাখা ভালো
    createNotification({
      recipient: post.author, // পোস্টের মালিক পাবে
      actor: userId, // যে লাইক দিল
      type: NOTIFICATION_TYPES.LIKE,
      relatedId: post._id,
      relatedModel: "Post",
      message: "liked your post.",
    }).catch((err) => console.error("Notification Error:", err.message));

    return res
      .status(200)
      .json(new ApiResponse(200, { isLiked: true }, "Liked successfully"));
  }
});

// ==========================================
// 🚀 4. GET SPECIFIC USER'S FEED (With isLikedByMe)
// ==========================================
export const getUserFeed = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page, limit } = req.query;
  const skip = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 10);
  const viewerId = req.user._id;

  // ১. ইউজার ফাইন্ড
  const targetUser = await User.findOne({ userName: username });
  if (!targetUser) throw new ApiError(404, "User not found");

  const targetUserId = targetUser._id;
  const isMe = viewerId.toString() === targetUserId.toString();

  // ২. ভিজিবিলিটি
  let visibilityCondition = [POST_VISIBILITY.PUBLIC];
  if (isMe) {
    visibilityCondition = Object.values(POST_VISIBILITY);
  } else {
    const isFriend = await Friendship.findOne({
      $or: [
        { requester: viewerId, recipient: targetUserId },
        { requester: targetUserId, recipient: viewerId },
      ],
      status: FRIENDSHIP_STATUS.ACCEPTED,
    });
    if (isFriend) visibilityCondition.push(POST_VISIBILITY.CONNECTIONS);
  }

  // ৩. পোস্ট আনা
  const posts = await Post.find({
    author: targetUserId,
    postOnModel: "User",
    visibility: { $in: visibilityCondition },
    isArchived: false,
  })
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit) || 10)
    .populate("author", "fullName userName avatar")
    .populate("postOnId", "name")
    .lean();

  // 🔥 4. CALCULATED FIELDS: isLikedByMe 🔥
  if (posts.length > 0) {
    const postIds = posts.map((p) => p._id);

    const myReactions = await Reaction.find({
      user: viewerId,
      targetModel: REACTION_TARGET_MODELS.POST,
      targetId: { $in: postIds },
    }).select("targetId");

    const likedPostIds = new Set(myReactions.map((r) => r.targetId.toString()));

    // মডিফাই করা অ্যারে রিটার্ন করছি না, বরং posts অ্যারেটাই মিউটেট (enrich) করছি
    // যেহেতু .lean() দিয়েছি, তাই এটা প্লেইন অবজেক্ট, মডিফাই করা সেইফ
    posts.forEach((post) => {
      post.isLikedByMe = likedPostIds.has(post._id.toString());
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "User timeline fetched successfully"));
});
