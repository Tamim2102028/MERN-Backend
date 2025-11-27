import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  friendIdSchema,
  requestIdSchema,
  getListSchema,
} from "../validators/friendship.validator.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  deleteRequest,
  unfriendUser,
  blockUser,
  unblockUser,
  getIncomingRequests,
  getSentRequests,
  getFriendsList,
  getBlockedList,
} from "../controllers/friendship.controllers.js";

const router = Router();
router.use(verifyJWT); // সব রাউট সুরক্ষিত

// --- Request Management ---
router.post(
  "/request/:userId",
  validate(friendIdSchema, "params"),
  sendFriendRequest
);
router.post(
  "/accept/:requestId",
  validate(requestIdSchema, "params"),
  acceptFriendRequest
);
router.delete(
  "/reject/:requestId",
  validate(requestIdSchema, "params"),
  deleteRequest
); // Reject/Cancel একই API

// --- Friendship Management ---
router.delete(
  "/unfriend/:userId",
  validate(friendIdSchema, "params"),
  unfriendUser
);

// --- Blocking ---
router.post("/block/:userId", validate(friendIdSchema, "params"), blockUser);
router.post(
  "/unblock/:userId",
  validate(friendIdSchema, "params"),
  unblockUser
);

// --- Lists ---
router.get(
  "/requests/incoming",
  validate(getListSchema, "query"),
  getIncomingRequests
);
router.get("/requests/sent", validate(getListSchema, "query"), getSentRequests);
router.get("/list/:userId", validate(getListSchema, "query"), getFriendsList); // Friend list
router.get("/blocked-users", validate(getListSchema, "query"), getBlockedList);

export default router;
