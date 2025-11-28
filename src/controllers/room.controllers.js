import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  createRoomService,
  joinRoomByCodeService,
  updateRoomMemberRoleService,
  removeRoomMemberService,
} from "../services/room.service.js";

// 1. Create
export const createRoom = asyncHandler(async (req, res) => {
  // req.user পাস করছি যাতে userType চেক করা যায়
  const room = await createRoomService(req.user, req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, room, "Classroom created successfully"));
});

// 2. Join
export const joinRoom = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const result = await joinRoomByCodeService(req.user._id, code);
  return res.status(200).json(new ApiResponse(200, result, result.message));
});

// 3. Update Role
export const updateRole = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { userId, role } = req.body;
  const result = await updateRoomMemberRoleService(
    req.user._id,
    roomId,
    userId,
    role
  );
  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// 4. Kick Member
export const kickMember = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  const result = await removeRoomMemberService(req.user._id, roomId, userId);
  return res.status(200).json(new ApiResponse(200, {}, result.message));
});
