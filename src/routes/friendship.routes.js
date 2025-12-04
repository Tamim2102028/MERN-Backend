import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  friendIdSchema,
  requestIdSchema,
  getListSchema,
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

// ✅ Cancel / Reject API (Sent বা Incoming ট্যাব থেকে ডিলিট করার জন্য)
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

// Lists (type = friends | incoming | sent | blocked)
// Example: /api/v1/friendships/list/incoming
router.get("/list/:type", validate(getListSchema, "params"), getList);

// ✅ Suggestions Route
router.get(
  "/suggestions",
  validate(getSuggestionsSchema, "query"),
  getSuggestions
);

export default router;
