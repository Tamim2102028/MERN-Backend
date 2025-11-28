import { ApiError } from "../utils/ApiError.js";
import { Group } from "../models/group.model.js";
import { GroupMembership } from "../models/groupMembership.model.js";
import { createNotification } from "./notification.service.js"; // ✅
import {
  GROUP_ROLES,
  GROUP_MEMBERSHIP_STATUS,
  GROUP_PRIVACY,
  NOTIFICATION_TYPES,
} from "../constants/index.js";

// ==========================================
// 1. CREATE GROUP (Creator becomes Admin)
// ==========================================
export const createGroupService = async (userId, data) => {
  // ১. স্লাগ ইউনিক কিনা চেক
  const existingGroup = await Group.findOne({ slug: data.slug });
  if (existingGroup) {
    throw new ApiError(409, "Group URL (slug) is already taken.");
  }

  // ২. গ্রুপ তৈরি
  const group = await Group.create({
    ...data,
    creator: userId,
    membersCount: 1, // ক্রিয়েটর নিজেই প্রথম মেম্বার
  });

  // ৩. ক্রিয়েটরকে এডমিন হিসেবে মেম্বারশিপ টেবিলে যোগ করা
  await GroupMembership.create({
    group: group._id,
    user: userId,
    role: GROUP_ROLES.ADMIN, // সর্বোচ্চ ক্ষমতা
    status: GROUP_MEMBERSHIP_STATUS.JOINED,
  });

  return group;
};

// ==========================================
// 2. JOIN GROUP (Public vs Private Logic)
// ==========================================
export const joinGroupService = async (userId, groupId) => {
  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  // অলরেডি মেম্বার কিনা চেক
  const membership = await GroupMembership.findOne({
    group: groupId,
    user: userId,
  });
  if (membership) {
    if (membership.status === GROUP_MEMBERSHIP_STATUS.BANNED) {
      throw new ApiError(403, "You are banned from this group.");
    }
    if (membership.status === GROUP_MEMBERSHIP_STATUS.JOINED) {
      throw new ApiError(400, "Already a member.");
    }
    if (membership.status === GROUP_MEMBERSHIP_STATUS.PENDING) {
      throw new ApiError(400, "Join request already pending.");
    }
  }

  // প্রাইভেসি লজিক
  let status = GROUP_MEMBERSHIP_STATUS.PENDING; // ডিফল্ট পেন্ডিং

  if (group.privacy === GROUP_PRIVACY.PUBLIC) {
    status = GROUP_MEMBERSHIP_STATUS.JOINED; // পাবলিক হলে ডাইরেক্ট জয়েন
  }

  const newMember = await GroupMembership.create({
    group: groupId,
    user: userId,
    role: GROUP_ROLES.MEMBER,
    status: status,
  });

  return {
    status,
    message:
      status === "JOINED" ? "Joined successfully" : "Request sent for approval",
  };
};

// ==========================================
// 3. MANAGE JOIN REQUESTS (Accept/Reject)
// ==========================================
export const manageJoinRequestService = async (
  adminId,
  groupId,
  targetUserId,
  action
) => {
  // ১. যে একশন নিচ্ছে সে এডমিন কিনা চেক
  const adminMembership = await GroupMembership.findOne({
    group: groupId,
    user: adminId,
    role: { $in: [GROUP_ROLES.ADMIN, GROUP_ROLES.MODERATOR] },
    status: GROUP_MEMBERSHIP_STATUS.JOINED,
  });
  if (!adminMembership)
    throw new ApiError(403, "Access denied. Admins/Moderators only.");

  // ২. টার্গেট রিকোয়েস্ট খোঁজা
  const targetMembership = await GroupMembership.findOne({
    group: groupId,
    user: targetUserId,
    status: GROUP_MEMBERSHIP_STATUS.PENDING,
  });
  if (!targetMembership) throw new ApiError(404, "Request not found.");

  // ৩. একশন নেওয়া
  if (action === "ACCEPT") {
    targetMembership.status = GROUP_MEMBERSHIP_STATUS.JOINED;
    await targetMembership.save();
    await Group.findByIdAndUpdate(groupId, { $inc: { membersCount: 1 } }); // কাউন্ট বাড়ালাম

    // 🔥 NOTIFICATION
    createNotification({
      recipient: targetUserId,
      actor: adminId,
      type: NOTIFICATION_TYPES.SYSTEM, // অথবা নতুন টাইপ 'GROUP_APPROVE' বানাতে পারেন
      relatedId: groupId,
      relatedModel: "Group",
      message: "approved your join request.",
    }).catch(console.error);

    return { message: "Member approved." };
  } else {
    await GroupMembership.findByIdAndDelete(targetMembership._id);
    return { message: "Request rejected." };
  }
};

// ==========================================
// 4. UPDATE MEMBER ROLE (Promote/Demote)
// ==========================================
export const updateMemberRoleService = async (
  adminId,
  groupId,
  targetUserId,
  newRole
) => {
  const group = await Group.findById(groupId); // গ্রুপটা আনলাম চেক করার জন্য
  if (!group) throw new ApiError(404, "Group not found");

  // ১. আমি এডমিন কিনা?
  const adminMembership = await GroupMembership.findOne({
    group: groupId,
    user: adminId,
    role: GROUP_ROLES.ADMIN,
  });
  if (!adminMembership)
    throw new ApiError(403, "Only Admins can change roles.");

  // 🔥 PROTECTION: ক্রিয়েটরের রোল চেঞ্জ করা যাবে না
  if (targetUserId.toString() === group.creator.toString()) {
    throw new ApiError(403, "You cannot change the role of the Group Creator.");
  }

  // ২. টার্গেট মেম্বার আছে কিনা?
  const targetMember = await GroupMembership.findOne({
    group: groupId,
    user: targetUserId,
  });
  if (!targetMember) throw new ApiError(404, "Member not found.");

  // ৩. রোল আপডেট
  targetMember.role = newRole;
  await targetMember.save();

  // 🔥 NOTIFICATION
  createNotification({
    recipient: targetUserId,
    actor: adminId,
    type: NOTIFICATION_TYPES.SYSTEM,
    relatedId: groupId,
    relatedModel: "Group",
    message: `changed your role to ${newRole} in the group.`,
  }).catch(console.error);

  return { message: `User role updated to ${newRole}` };
};

// ==========================================
// 5. REMOVE / BAN MEMBER (Kick)
// ==========================================
export const removeMemberService = async (
  adminId,
  groupId,
  targetUserId,
  isBan = false
) => {
  const group = await Group.findById(groupId); // গ্রুপ আনলাম
  if (!group) throw new ApiError(404, "Group not found");

  // 🔥 PROTECTION: ক্রিয়েটরকে বের করা যাবে না
  if (targetUserId.toString() === group.creator.toString()) {
    throw new ApiError(403, "You cannot remove or ban the Group Creator.");
  }

  // ১. পারমিশন চেক (Admin or Moderator)
  const adminMembership = await GroupMembership.findOne({
    group: groupId,
    user: adminId,
    status: GROUP_MEMBERSHIP_STATUS.JOINED,
  });

  if (!adminMembership || adminMembership.role === GROUP_ROLES.MEMBER) {
    throw new ApiError(403, "Access denied.");
  }

  // ২. টার্গেট মেম্বার চেক
  const targetMember = await GroupMembership.findOne({
    group: groupId,
    user: targetUserId,
  });
  if (!targetMember) throw new ApiError(404, "Member not found.");

  // ৩. হায়ারার্কি চেক
  if (
    adminMembership.role === GROUP_ROLES.MODERATOR &&
    targetMember.role === GROUP_ROLES.ADMIN
  ) {
    throw new ApiError(403, "Moderators cannot remove Admins.");
  }

  // ৪. একশন
  if (isBan) {
    targetMember.status = GROUP_MEMBERSHIP_STATUS.BANNED;
    targetMember.role = GROUP_ROLES.MEMBER;
    await targetMember.save();
    await Group.findByIdAndUpdate(groupId, { $inc: { membersCount: -1 } });
    return { message: "User banned from group." };
  } else {
    await GroupMembership.findByIdAndDelete(targetMember._id);
    await Group.findByIdAndUpdate(groupId, { $inc: { membersCount: -1 } });
    return { message: "User removed from group." };
  }
};
