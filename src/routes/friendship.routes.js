import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  friendIdSchema,
  requestIdSchema,
  paginationSchema, // ✅ Common pagination schema
} from "../validators/friendship.validator.js";
import * as FriendshipController from "../controllers/friendship.controllers.js";

const router = Router();
router.use(verifyJWT);

// --- Actions (POST / DELETE) ---
router.post(
  "/request/:userId",
  validate(friendIdSchema, "params"),
  FriendshipController.sendRequest
);
router.post(
  "/accept/:requestId",
  validate(requestIdSchema, "params"),
  FriendshipController.acceptRequest
);
router.delete(
  "/cancel/:requestId",
  validate(requestIdSchema, "params"),
  FriendshipController.cancelRequest
); // For Reject/Cancel
router.delete(
  "/unfriend/:userId",
  validate(friendIdSchema, "params"),
  FriendshipController.unfriend
);

router.post(
  "/block/:userId",
  validate(friendIdSchema, "params"),
  FriendshipController.blockUser
);
router.post(
  "/unblock/:userId",
  validate(friendIdSchema, "params"),
  FriendshipController.unblockUser
);

// --- Lists (GET) - Completely Separated ---
router.get(
  "/friends",
  validate(paginationSchema, "query"),
  FriendshipController.getFriends
);
router.get(
  "/requests/incoming",
  validate(paginationSchema, "query"),
  FriendshipController.getIncomingRequests
);
router.get(
  "/requests/sent",
  validate(paginationSchema, "query"),
  FriendshipController.getSentRequests
);
router.get(
  "/blocked",
  validate(paginationSchema, "query"),
  FriendshipController.getBlockedUsers
);
router.get(
  "/suggestions",
  validate(paginationSchema, "query"),
  FriendshipController.getSuggestions
);

export default router;
