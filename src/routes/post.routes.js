import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { uploadImage } from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createPostSchema,
  getFeedSchema,
} from "../validators/post.validator.js";
import {
  createPost,
  getNewsFeed,
  togglePostLike,
  getUserFeed,
  getSinglePost, // ✅ ADDED
  deletePost, // ✅ ADDED
  getTargetFeed,
} from "../controllers/post.controllers.js";

const router = Router();
router.use(verifyJWT);

router
  .route("/")
  .post(
    uploadImage.array("images", 5),
    validate(createPostSchema, "body"),
    createPost
  )
  .get(validate(getFeedSchema, "query"), getNewsFeed);

// লাইক টগল (Toggle)
router.post("/:postId/like", togglePostLike);
// অন্য ইউজারের পোস্ট দেখা (Profile Timeline)
router.get("/user/:username", getUserFeed);
router
  .route("/:postId")
  .get(getSinglePost) // নোটিফিকেশন থেকে এখানে আসবে
  .delete(deletePost); // পোস্ট ডিলিট করতে

router.get("/target/:targetModel/:targetId", getTargetFeed);

export default router;
