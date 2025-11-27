import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  addCommentSchema,
  getCommentsSchema,
} from "../validators/comment.validator.js";
import {
  addComment,
  getPostComments,
  deleteComment,
} from "../controllers/comment.controllers.js";

const router = Router();
router.use(verifyJWT);

// Route: /api/v1/comments/:postId
// এখানে postId ডাইনামিক।
router
  .route("/:postId")
  .get(
    validate(getCommentsSchema, "query"), // পেজিনেশন চেক
    getPostComments
  )
  .post(
    validate(addCommentSchema, "body"), // কন্টেন্ট চেক
    addComment
  );

// Route: /api/v1/comments/:commentId
router.delete("/:commentId", deleteComment);

export default router;
