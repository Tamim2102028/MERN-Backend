import { Room } from "../models/room.model.js";
import { RoomMembership } from "../models/roomMembership.model.js";
import { ApiError } from "../utils/ApiError.js";
import { RESOURCE_ROLES, USER_TYPES } from "../constants/index.js";

// Helper: Code Generator
const generateRoomCode = async () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let isUnique = false;
  let code = "";
  while (!isUnique) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const existing = await Room.findOne({ joinCode: code });
    if (!existing) isUnique = true;
  }
  return code;
};

// ==========================================
// 1. CREATE ROOM (Only Teachers -> Become OWNER)
// ==========================================
export const createRoomService = async (user, data) => {
  // ✅ CHECK: Only Teachers can create rooms
  if (user.userType !== USER_TYPES.TEACHER) {
    throw new ApiError(403, "Only verified teachers can create classrooms.");
  }

  const joinCode = await generateRoomCode();

  const room = await Room.create({
    ...data,
    creator: user._id,
    joinCode: joinCode,
    membersCount: 1,
  });

  // ✅ Creator becomes OWNER
  await RoomMembership.create({
    room: room._id,
    user: user._id,
    role: RESOURCE_ROLES.OWNER,
  });

  return room;
};

// ==========================================
// 2. JOIN ROOM (Normal Users -> Become MEMBER)
// ==========================================
export const joinRoomByCodeService = async (userId, code) => {
  const room = await Room.findOne({ joinCode: code });
  if (!room) throw new ApiError(404, "Invalid room code.");

  const existingMember = await RoomMembership.findOne({
    room: room._id,
    user: userId,
  });
  if (existingMember) throw new ApiError(400, "Already a member.");

  await RoomMembership.create({
    room: room._id,
    user: userId,
    role: RESOURCE_ROLES.MEMBER,
  });

  return { message: "Joined successfully!", roomId: room._id };
};

// ==========================================
// 3. UPDATE MEMBER ROLE (Hierarchy Logic)
// ==========================================
export const updateRoomMemberRoleService = async (
  adminId,
  roomId,
  targetUserId,
  newRole
) => {
  // ১. যে রিকোয়েস্ট করছে (Actor) তার পাওয়ার চেক
  const actorMembership = await RoomMembership.findOne({
    room: roomId,
    user: adminId,
  });

  if (
    !actorMembership ||
    (actorMembership.role !== RESOURCE_ROLES.OWNER &&
      actorMembership.role !== RESOURCE_ROLES.ADMIN)
  ) {
    throw new ApiError(403, "Access denied. Admins/Owners only.");
  }

  // ২. যার রোল চেঞ্জ হবে (Target) তাকে খোঁজা
  const targetMember = await RoomMembership.findOne({
    room: roomId,
    user: targetUserId,
  });
  if (!targetMember) throw new ApiError(404, "Member not found.");

  // 🔥 HIERARCHY CHECKS 🔥

  // Rule A: OWNER কে কেউ টাচ করতে পারবে না
  if (targetMember.role === RESOURCE_ROLES.OWNER) {
    throw new ApiError(403, "You cannot change the role of the Room Owner.");
  }

  // Rule B: ADMIN আরেক ADMIN কে চেঞ্জ করতে পারবে না (শুধুমাত্র OWNER পারবে)
  if (
    actorMembership.role === RESOURCE_ROLES.ADMIN &&
    targetMember.role === RESOURCE_ROLES.ADMIN
  ) {
    throw new ApiError(403, "Admins cannot demote/promote other Admins.");
  }

  // ৩. আপডেট
  targetMember.role = newRole;
  await targetMember.save();

  // (Optional: Notification logic here)

  return { message: `Role updated to ${newRole}` };
};

// ==========================================
// 4. REMOVE MEMBER (Kick)
// ==========================================
export const removeRoomMemberService = async (
  adminId,
  roomId,
  targetUserId
) => {
  const actorMembership = await RoomMembership.findOne({
    room: roomId,
    user: adminId,
  });

  // ১. পারমিশন চেক (Admin/Owner/Moderator)
  // মডারেটর শুধু মেম্বারদের বের করতে পারে
  if (!actorMembership || actorMembership.role === RESOURCE_ROLES.MEMBER) {
    throw new ApiError(403, "Access denied.");
  }

  const targetMember = await RoomMembership.findOne({
    room: roomId,
    user: targetUserId,
  });
  if (!targetMember) throw new ApiError(404, "Member not found.");

  // 🔥 HIERARCHY CHECKS 🔥

  // Rule A: OWNER কে বের করা যাবে না
  if (targetMember.role === RESOURCE_ROLES.OWNER) {
    throw new ApiError(403, "Cannot remove the Room Owner.");
  }

  // Rule B: ADMIN আরেক ADMIN কে বের করতে পারবে না
  if (
    actorMembership.role === RESOURCE_ROLES.ADMIN &&
    targetMember.role === RESOURCE_ROLES.ADMIN
  ) {
    throw new ApiError(403, "Admins cannot remove other Admins.");
  }

  // Rule C: MODERATOR কোনো ADMIN বা OWNER কে বের করতে পারবে না
  if (
    actorMembership.role === RESOURCE_ROLES.MODERATOR &&
    (targetMember.role === RESOURCE_ROLES.ADMIN ||
      targetMember.role === RESOURCE_ROLES.OWNER)
  ) {
    throw new ApiError(403, "Moderators cannot remove Admins or Owner.");
  }

  // ২. ডিলিট
  await RoomMembership.findByIdAndDelete(targetMember._id);

  return { message: "User removed from room." };
};
