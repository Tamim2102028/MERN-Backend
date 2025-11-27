import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  addCommentService,
  getCommentsService,
  deleteCommentService,
} from "../services/comment.service.js";

// 1. ADD COMMENT
export const addComment = asyncHandler(async (req, res) => {
  const { postId } = req.params; // ✅ URL থেকে ID নিচ্ছি

  const comment = await addCommentService(req.user._id, postId, req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

// 2. GET COMMENTS
export const getPostComments = asyncHandler(async (req, res) => {
  const { postId } = req.params; // ✅ URL থেকে ID নিচ্ছি

  // req.query তে page, limit, parentId আছে (মিডলওয়্যার ভ্যালিডেট করে দিয়েছে)
  const comments = await getCommentsService(postId, req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

// 3. DELETE COMMENT
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  await deleteCommentService(req.user._id, commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});
