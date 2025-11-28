import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createGroupSchema,
  updateRoleSchema,
  actionMemberSchema,
} from "../validators/group.validator.js";
import {
  createGroup,
  joinGroup,
  approveJoinRequest,
  updateMemberRole,
  kickMember,
  banMember,
} from "../controllers/group.controllers.js";

const router = Router();
router.use(verifyJWT);

// Create Group
router.post("/", validate(createGroupSchema), createGroup);

// Join Group
router.post("/:groupId/join", joinGroup);

// Admin Actions
router.post(
  "/:groupId/approve",
  validate(actionMemberSchema),
  approveJoinRequest
);
router.patch("/:groupId/role", validate(updateRoleSchema), updateMemberRole);
router.delete("/:groupId/kick", validate(actionMemberSchema), kickMember);
router.delete("/:groupId/ban", validate(actionMemberSchema), banMember); // ✅ ADDED

export default router;
