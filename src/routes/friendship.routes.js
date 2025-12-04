import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  friendIdSchema,
  requestIdSchema,
  getListParamSchema, // ✅ Updated Import
  getListQuerySchema, // ✅ Updated Import
  getSuggestionsSchema,
} from "../validators/friendship.validator.js";
import {
  sendRequest,
  acceptRequest,
  cancelRequest,
  unfriend,
  getList,
  getSuggestions,
} from "../controllers/friendship.controllers.js";

const router = Router();
router.use(verifyJWT);

// Actions
router.post(
  "/request/:userId",
  validate(friendIdSchema, "params"),
  sendRequest
);
router.post(
  "/accept/:requestId",
  validate(requestIdSchema, "params"),
  acceptRequest
);
router.delete(
  "/cancel/:requestId",
  validate(requestIdSchema, "params"),
  cancelRequest
);
router.delete(
  "/unfriend/:userId",
  validate(friendIdSchema, "params"),
  unfriend
);

// Lists
// ✅ FIX: এখানে দুইবার validate কল করা হয়েছে দুই ভিন্ন স্কিমা দিয়ে
router.get(
  "/list/:type",
  validate(getListParamSchema, "params"), // টাইপ চেক করবে
  validate(getListQuerySchema, "query"), // পেজ ও লিমিট চেক করবে
  getList
);

// Suggestions
router.get(
  "/suggestions",
  validate(getSuggestionsSchema, "query"),
  getSuggestions
);

export default router;
