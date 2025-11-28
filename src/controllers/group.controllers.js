import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  createGroupService,
  joinGroupService,
  manageJoinRequestService,
  updateMemberRoleService,
  removeMemberService,
} from "../services/group.service.js";

// 1. Create Group
export const createGroup = asyncHandler(async (req, res) => {
  const group = await createGroupService(req.user._id, req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, group, "Group created successfully"));
});

// 2. Join Group
export const joinGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const result = await joinGroupService(req.user._id, groupId);
  return res.status(200).json(new ApiResponse(200, result, result.message));
});

// 3. Approve Member
export const approveJoinRequest = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body; // যাকে এপ্রুভ করব

  const result = await manageJoinRequestService(
    req.user._id,
    groupId,
    userId,
    "ACCEPT"
  );
  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// 4. Update Role (Promote/Demote)
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId, role } = req.body;

  const result = await updateMemberRoleService(
    req.user._id,
    groupId,
    userId,
    role
  );
  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// 5. Remove/Kick Member
export const kickMember = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  // isBan = false পাঠাচ্ছি
  const result = await removeMemberService(
    req.user._id,
    groupId,
    userId,
    false
  );
  return res.status(200).json(new ApiResponse(200, {}, result.message));
});

// 6. Ban Member (✅ NEW)
export const banMember = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  // isBan = true পাঠাচ্ছি
  const result = await removeMemberService(req.user._id, groupId, userId, true);
  return res.status(200).json(new ApiResponse(200, {}, result.message));
});
