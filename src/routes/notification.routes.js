import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getNotificationSchema,
  markReadSchema,
} from "../validators/notification.validator.js";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
} from "../controllers/notification.controllers.js";

const router = Router();
router.use(verifyJWT);

// Base Route: /api/v1/notifications

router.get("/", validate(getNotificationSchema, "query"), getNotifications);
router.get("/unread-count", getUnreadCount);

// Mark Read Routes
router.patch("/mark-all-read", markAllRead);
router.patch(
  "/:notificationId/read",
  validate(markReadSchema, "params"),
  markNotificationRead
);

export default router;
