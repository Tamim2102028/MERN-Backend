import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// --- Models ---
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Reaction } from "../models/reaction.model.js";
import { Friendship } from "../models/friendship.model.js";
import { Follow } from "../models/follow.model.js";
import { GroupMembership } from "../models/groupMembership.model.js"; // গ্রুপ সিকিউরিটি চেকের জন্য
import { RoomMembership } from "../models/roomMembership.model.js"; // ক্লাসরুম সিকিউরিটি চেকের জন্য

// --- Services ---
import {
  createPostService,
  getNewsFeedService,
} from "../services/post.service.js";

// --- Constants ---
import {
  REACTION_TARGET_MODELS,
  POST_VISIBILITY,
  FRIENDSHIP_STATUS,
  POST_TARGET_MODELS,
  GROUP_MEMBERSHIP_STATUS,
} from "../constants/index.js";

// ==========================================
// 🚀 1. CREATE POST
// ==========================================
export const createPost = asyncHandler(async (req, res) => {
  // সার্ভিস লেয়ারে সব লজিক (ইমেজ আপলোড, গ্রুপ পারমিশন চেক) হ্যান্ডেল করা হয়েছে
  const post = await createPostService(req.user, req.body, req.files);

  return res
    .status(201)
    .json(new ApiResponse(201, post, "Post created successfully"));
});

// ==========================================
// 🚀 2. GET NEWS FEED (Main Feed)
// ==========================================
export const getNewsFeed = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  // অ্যালগরিদম অনুযায়ী (Friends + Groups + Following) মিক্সড পোস্ট আসবে
  // সার্ভিস লেয়ারেই 'isLikedByMe' ক্যালকুলেট করা হচ্ছে
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
// 🚀 3. TOGGLE POST LIKE (No Notification)
// ==========================================
export const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  // ১. পোস্ট আছে কিনা চেক
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");

  // ২. ইউজার কি অলরেডি লাইক দিয়েছে?
  const existingReaction = await Reaction.findOne({
    targetId: postId,
    targetModel: REACTION_TARGET_MODELS.POST,
    user: userId,
  });

  if (existingReaction) {
    // A. যদি লাইক থাকে -> আনলাইক করো (Delete)
    await Reaction.findByIdAndDelete(existingReaction._id);
    return res
      .status(200)
      .json(new ApiResponse(200, { isLiked: false }, "Unliked successfully"));
  } else {
    // B. লাইক না থাকলে -> লাইক দাও (Create)
    await Reaction.create({
      targetId: postId,
      targetModel: REACTION_TARGET_MODELS.POST,
      user: userId,
    });
    // নোট: লাইকের জন্য কোনো নোটিফিকেশন পাঠানো হচ্ছে না (Database Load কমানোর জন্য)
    return res
      .status(200)
      .json(new ApiResponse(200, { isLiked: true }, "Liked successfully"));
  }
});

// ==========================================
// 🚀 4. GET SPECIFIC USER'S FEED (Profile Timeline)
// ==========================================
export const getUserFeed = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page, limit } = req.query;
  const skip = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 10);
  const viewerId = req.user._id;

  // ১. টার্গেট ইউজার খোঁজা
  const targetUser = await User.findOne({ userName: username });
  if (!targetUser) throw new ApiError(404, "User not found");

  const targetUserId = targetUser._id;
  const isMe = viewerId.toString() === targetUserId.toString();

  // ২. ভিজিবিলিটি ফিল্টার (Privacy Check)
  // ডিফল্ট: পাবলিক পোস্ট সবাই দেখবে
  let visibilityCondition = [POST_VISIBILITY.PUBLIC];

  if (isMe) {
    // নিজের প্রোফাইল হলে সব দেখব (Only Me, Connections, Public)
    visibilityCondition = Object.values(POST_VISIBILITY);
  } else {
    // অন্য কেউ হলে চেক করি ফ্রেন্ড কিনা
    const isFriend = await Friendship.findOne({
      $or: [
        { requester: viewerId, recipient: targetUserId },
        { requester: targetUserId, recipient: viewerId },
      ],
      status: FRIENDSHIP_STATUS.ACCEPTED,
    });

    // ফ্রেন্ড হলে 'CONNECTIONS' পোস্টগুলোও দেখাব
    if (isFriend) {
      visibilityCondition.push(POST_VISIBILITY.CONNECTIONS);
    }
  }

  // ৩. পোস্ট নিয়ে আসা
  const posts = await Post.find({
    author: targetUserId,
    postOnModel: "User", // শুধুমাত্র তার ওয়ালের পোস্ট (গ্রুপের পোস্ট প্রোফাইলে দেখাব না)
    visibility: { $in: visibilityCondition },
    isArchived: false,
  })
    .sort({ isPinned: -1, createdAt: -1 }) // পিন পোস্ট সবার উপরে
    .skip(skip)
    .limit(parseInt(limit) || 10)
    .populate("author", "fullName userName avatar")
    .populate("postOnId", "name")
    .lean();

  // 🔥 ৪. Calculated Field: isLikedByMe 🔥
  // লুপের ভেতর কুয়েরি না চালিয়ে Batch Query করা হচ্ছে (Performance Optimization)
  if (posts.length > 0) {
    const postIds = posts.map((p) => p._id);

    const myReactions = await Reaction.find({
      user: viewerId,
      targetModel: REACTION_TARGET_MODELS.POST,
      targetId: { $in: postIds },
    }).select("targetId");

    // Set ব্যবহার করছি O(1) লুকআপের জন্য
    const likedPostIds = new Set(myReactions.map((r) => r.targetId.toString()));

    posts.forEach((post) => {
      post.isLikedByMe = likedPostIds.has(post._id.toString());
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "User timeline fetched successfully"));
});

// ==========================================
// 🚀 5. GET SINGLE POST (Secure & Detailed)
// ==========================================
export const getSinglePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  // ১. পোস্ট ফেচ করা (সব ডিটেইলস সহ)
  const post = await Post.findById(postId)
    .populate("author", "fullName userName avatar")
    .populate("postOnId", "name title avatar logo code") // Group/Room/Inst info
    .populate({
      path: "sharedPost",
      populate: { path: "author", select: "fullName userName avatar" },
    })
    .lean();

  if (!post) throw new ApiError(404, "Post not found or deleted");

  // ============================================================
  // 🔥 ২. সিকিউরিটি চেক ম্যাট্রিক্স (Strict Security Check)
  // ============================================================
  const isAuthor = post.author._id.toString() === userId.toString();

  // আমি অথর না হলে সিকিউরিটি চেক করব
  if (!isAuthor) {
    // A. Only Me চেক
    if (post.visibility === POST_VISIBILITY.ONLY_ME) {
      throw new ApiError(403, "This content is private.");
    }

    // B. Context Specific Checks (কোথায় পোস্ট হয়েছে?)

    // --- CASE 1: ROOM / CLASSROOM (Always Restricted) ---
    if (post.postOnModel === POST_TARGET_MODELS.ROOM) {
      const isRoomMember = await RoomMembership.findOne({
        room: post.postOnId._id,
        user: userId,
      });
      if (!isRoomMember)
        throw new ApiError(403, "Access Denied. Classroom only.");
    }

    // --- CASE 2: USER PROFILE ---
    else if (
      post.postOnModel === POST_TARGET_MODELS.USER &&
      post.visibility === POST_VISIBILITY.CONNECTIONS
    ) {
      const isFriend = await Friendship.findOne({
        $or: [
          { requester: userId, recipient: post.author._id },
          { requester: post.author._id, recipient: userId },
        ],
        status: FRIENDSHIP_STATUS.ACCEPTED,
      });
      if (!isFriend) throw new ApiError(403, "Friends only post.");
    }

    // --- CASE 3: GROUP POST ---
    else if (
      post.postOnModel === POST_TARGET_MODELS.GROUP &&
      post.visibility === POST_VISIBILITY.CONNECTIONS
    ) {
      // পাবলিক গ্রুপের কানেকশন পোস্ট দেখতে হলেও মেম্বার হতে হবে
      const isGroupMember = await GroupMembership.findOne({
        group: post.postOnId._id,
        user: userId,
        status: GROUP_MEMBERSHIP_STATUS.JOINED,
      });
      if (!isGroupMember) throw new ApiError(403, "Group members only post.");
    }

    // --- CASE 4: INSTITUTION / DEPARTMENT ---
    else if (
      [POST_TARGET_MODELS.INSTITUTION, POST_TARGET_MODELS.DEPARTMENT].includes(
        post.postOnModel
      ) &&
      post.visibility === POST_VISIBILITY.CONNECTIONS
    ) {
      const isFollower = await Follow.findOne({
        follower: userId,
        followingId: post.postOnId._id,
      });
      if (!isFollower) throw new ApiError(403, "Followers only post.");
    }
  }

  // ৩. লাইক চেক
  const reaction = await Reaction.findOne({
    targetId: postId,
    targetModel: REACTION_TARGET_MODELS.POST,
    user: userId,
  });
  // Double Bang (!!) ব্যবহার করে Boolean এ কনভার্ট করা হয়েছে
  post.isLikedByMe = !!reaction;

  return res
    .status(200)
    .json(new ApiResponse(200, post, "Post fetched successfully"));
});

// ==========================================
// 🚀 6. DELETE POST
// ==========================================
export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");

  // শুধুমাত্র অথর পোস্ট ডিলিট করতে পারবে (ফিউচারে গ্রুপ এডমিনও পারবে)
  if (post.author.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this post");
  }

  await Post.findByIdAndDelete(postId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Post deleted successfully"));
});
