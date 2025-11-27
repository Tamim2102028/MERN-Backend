import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { ApiError } from "../utils/ApiError.js";
import { createNotification } from "./notification.service.js"; // ✅ ADDED
import { NOTIFICATION_TYPES } from "../constants/index.js"; // ✅ ADDED

// --- ADD COMMENT ---
export const addCommentService = async (userId, postId, bodyData) => {
  const { content, parentId } = bodyData;

  // ১. পোস্ট চেক
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");

  // ২. প্যারেন্ট কমেন্ট চেক
  let parentComment = null;
  if (parentId) {
    parentComment = await Comment.findById(parentId);
    if (!parentComment) throw new ApiError(404, "Parent comment not found");
  }

  // ৩. কমেন্ট তৈরি
  const comment = await Comment.create({
    content,
    post: postId,
    author: userId,
    parentId: parentId || null,
  });

  // 🔥 NOTIFICATION TRIGGER START 🔥

  // Case A: যদি এটা রিপ্লাই হয় -> প্যারেন্ট কমেন্টারকে জানাও
  if (parentId && parentComment) {
    createNotification({
      recipient: parentComment.author,
      actor: userId,
      type: NOTIFICATION_TYPES.REPLY,
      relatedId: postId, // ক্লিক করলে পোস্টে যাবে
      relatedModel: "Post",
      message: "replied to your comment.",
    }).catch((err) => console.error("Notif Error:", err));
  }

  // Case B: পোস্টের মালিককে জানাও (যদি সে নিজে কমেন্ট না করে থাকে)
  // (নিজের পোস্টে নিজে রিপ্লাই দিলেও নোটিফিকেশন পাওয়ার দরকার নেই)
  if (post.author.toString() !== userId.toString()) {
    createNotification({
      recipient: post.author,
      actor: userId,
      type: NOTIFICATION_TYPES.COMMENT,
      relatedId: postId,
      relatedModel: "Post",
      message: "commented on your post.",
    }).catch((err) => console.error("Notif Error:", err));
  }

  // 🔥 NOTIFICATION TRIGGER END 🔥

  return comment;
};

// --- GET COMMENTS ---
export const getCommentsService = async (postId, queryData) => {
  const { page, limit, parentId } = queryData;
  const skip = (page - 1) * limit;

  const query = {
    post: postId,
    parentId: parentId || null, // null হলে মেইন কমেন্ট, আইডি থাকলে রিপ্লাই
    isDeleted: false,
  };

  const comments = await Comment.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("author", "fullName userName avatar")
    .lean();

  return comments;
};

// --- DELETE COMMENT ---
export const deleteCommentService = async (userId, commentId) => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const post = await Post.findById(comment.post);

  // ডিলিট করার অধিকার: ১. যে কমেন্ট করেছে ২. যে পোস্টের মালিক
  const isAuthor = comment.author.toString() === userId.toString();
  const isPostOwner = post && post.author.toString() === userId.toString();

  if (!isAuthor && !isPostOwner) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  await Comment.findByIdAndDelete(commentId);
  return { success: true };
};
