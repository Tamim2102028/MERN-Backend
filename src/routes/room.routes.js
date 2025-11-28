import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createRoomSchema,
  joinRoomSchema,
  updateRoomRoleSchema,
  actionMemberSchema,
} from "../validators/room.validator.js";
import {
  createRoom,
  joinRoom,
  updateRole,
  kickMember,
} from "../controllers/room.controllers.js";

const router = Router();
router.use(verifyJWT);

// Create (Only Teachers logic checked in service)
router.post("/", validate(createRoomSchema), createRoom);

// Join
router.post("/join", validate(joinRoomSchema), joinRoom);

// Management
router.patch("/:roomId/role", validate(updateRoomRoleSchema), updateRole);
router.delete("/:roomId/kick", validate(actionMemberSchema), kickMember);

export default router;
