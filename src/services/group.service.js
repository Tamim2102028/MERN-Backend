import { Group } from "../models/group.model.js";
import { GroupMembership } from "../models/groupMembership.model.js";
import { ApiError } from "../utils/ApiError.js";
import { createNotification } from "./notification.service.js";
import {
  RESOURCE_ROLES,
  GROUP_MEMBERSHIP_STATUS,
  GROUP_PRIVACY,
  NOTIFICATION_TYPES,
} from "../constants/index.js";

// --- Helper: Auto Slug Generator ---
const generateUniqueSlug = async (name) => {
  // ১. নামকে স্লাগ-এ কনভার্ট করা (e.g. "CSE Batch 24" -> "cse-batch-24")
  let baseSlug = name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // স্পেসকে হাইফেন দিয়ে রিপ্লেস
    .replace(/[^\w\-]+/g, "") // আলফানিউমেরিক ছাড়া বাকি সব বাদ
    .replace(/\-\-+/g, "-"); // ডাবল হাইফেন বাদ

  // ২. ইউনিকনেস চেক
  let slug = baseSlug;
  let isUnique = false;
  let attempt = 0;

  while (!isUnique) {
    const existingGroup = await Group.findOne({ slug });
    if (!existingGroup) {
      isUnique = true;
    } else {
      // যদি মিলে যায়, শেষে র‍্যান্ডম স্ট্রিং বা কাউন্টার যোগ করো
      attempt++;
      const uniqueSuffix = Math.floor(Math.random() * 10000); // অথবা Date.now() এর লাস্ট ৪ ডিজিট
      slug = `${baseSlug}-${uniqueSuffix}`;
    }
  }
  return slug;
};

// ==========================================
// 1. CREATE GROUP (With Auto Slug & Owner Role)
// ==========================================
export const createGroupService = async (userId, data) => {
  // ইউজার কোনো স্লাগ পাঠালেও আমরা সেটা ইগনোর করে নিজেরা জেনারেট করব (সেফটির জন্য)
  // অথবা ইউজার পাঠালে সেটা ট্রাই করব, ফেইল করলে অটো জেনারেট করব।
  // বেস্ট প্র্যাকটিস: ইউজারের থেকে স্লাগ ইনপুট না নেওয়া। নাম থেকেই বানানো।

  const slug = await generateUniqueSlug(data.name);

  const group = await Group.create({
    ...data,
    slug: slug, // ✅ Auto Generated Unique Slug
    creator: userId,
    membersCount: 1,
  });

  // Creator becomes OWNER
  await GroupMembership.create({
    group: group._id,
    user: userId,
    role: RESOURCE_ROLES.OWNER,
    status: GROUP_MEMBERSHIP_STATUS.JOINED,
  });

  return group;
};

// ==========================================
// 2. JOIN GROUP
// ==========================================
export const joinGroupService = async (userId, groupId) => {
  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  const membership = await GroupMembership.findOne({
    group: groupId,
    user: userId,
  });
  if (membership) {
    if (membership.status === GROUP_MEMBERSHIP_STATUS.BANNED)
      throw new ApiError(403, "You are banned from this group.");
    if (membership.status === GROUP_MEMBERSHIP_STATUS.JOINED)
      throw new ApiError(400, "Already a member.");
    if (membership.status === GROUP_MEMBERSHIP_STATUS.PENDING)
      throw new ApiError(400, "Join request already pending.");
  }

  let status = GROUP_MEMBERSHIP_STATUS.PENDING;
  if (group.privacy === GROUP_PRIVACY.PUBLIC) {
    status = GROUP_MEMBERSHIP_STATUS.JOINED;
  }

  await GroupMembership.create({
    group: groupId,
    user: userId,
    role: RESOURCE_ROLES.MEMBER,
    status: status,
  });

  return {
    status,
    message:
      status === "JOINED" ? "Joined successfully" : "Request sent for approval",
  };
};

// ==========================================
// 3. MANAGE JOIN REQUESTS
// ==========================================
export const manageJoinRequestService = async (
  adminId,
  groupId,
  targetUserId,
  action
) => {
  const adminMembership = await GroupMembership.findOne({
    group: groupId,
    user: adminId,
    role: {
      $in: [
        RESOURCE_ROLES.OWNER,
        RESOURCE_ROLES.ADMIN,
        RESOURCE_ROLES.MODERATOR,
      ],
    },
    status: GROUP_MEMBERSHIP_STATUS.JOINED,
  });
  if (!adminMembership) throw new ApiError(403, "Access denied.");

  const targetMembership = await GroupMembership.findOne({
    group: groupId,
    user: targetUserId,
    status: GROUP_MEMBERSHIP_STATUS.PENDING,
  });
  if (!targetMembership) throw new ApiError(404, "Request not found.");

  if (action === "ACCEPT") {
    targetMembership.status = GROUP_MEMBERSHIP_STATUS.JOINED;
    await targetMembership.save();
    await Group.findByIdAndUpdate(groupId, { $inc: { membersCount: 1 } });

    // Notification
    createNotification({
      recipient: targetUserId,
      actor: adminId,
      type: NOTIFICATION_TYPES.GROUP_APPROVE,
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
// 4. UPDATE MEMBER ROLE
// ==========================================
export const updateMemberRoleService = async (
  adminId,
  groupId,
  targetUserId,
  newRole
) => {
  const adminMembership = await GroupMembership.findOne({
    group: groupId,
    user: adminId,
    role: { $in: [RESOURCE_ROLES.OWNER, RESOURCE_ROLES.ADMIN] },
  });
  if (!adminMembership)
    throw new ApiError(403, "Access denied. Only Admins/Owner.");

  const targetMember = await GroupMembership.findOne({
    group: groupId,
    user: targetUserId,
  });
  if (!targetMember) throw new ApiError(404, "Member not found.");

  // Hierarchy Logic
  if (targetMember.role === RESOURCE_ROLES.OWNER) {
    throw new ApiError(403, "Cannot change role of the Owner.");
  }
  if (
    adminMembership.role === RESOURCE_ROLES.ADMIN &&
    targetMember.role === RESOURCE_ROLES.ADMIN
  ) {
    throw new ApiError(403, "Admins cannot demote/promote other Admins.");
  }

  targetMember.role = newRole;
  await targetMember.save();

  // Notification
  createNotification({
    recipient: targetUserId,
    actor: adminId,
    type: NOTIFICATION_TYPES.GROUP_ROLE_UPDATE,
    relatedId: groupId,
    relatedModel: "Group",
    message: `changed your role to ${newRole}.`,
  }).catch(console.error);

  return { message: `Role updated to ${newRole}` };
};

// ==========================================
// 5. REMOVE / BAN MEMBER
// ==========================================
export const removeMemberService = async (
  adminId,
  groupId,
  targetUserId,
  isBan = false
) => {
  const adminMembership = await GroupMembership.findOne({
    group: groupId,
    user: adminId,
    status: GROUP_MEMBERSHIP_STATUS.JOINED,
  });

  if (!adminMembership || adminMembership.role === RESOURCE_ROLES.MEMBER) {
    throw new ApiError(403, "Access denied.");
  }

  const targetMember = await GroupMembership.findOne({
    group: groupId,
    user: targetUserId,
  });
  if (!targetMember) throw new ApiError(404, "Member not found.");

  // Hierarchy
  if (targetMember.role === RESOURCE_ROLES.OWNER) {
    throw new ApiError(403, "Cannot remove the Owner.");
  }
  if (
    adminMembership.role === RESOURCE_ROLES.ADMIN &&
    targetMember.role === RESOURCE_ROLES.ADMIN
  ) {
    throw new ApiError(403, "Admins cannot remove other Admins.");
  }
  if (
    adminMembership.role === RESOURCE_ROLES.MODERATOR &&
    (targetMember.role === RESOURCE_ROLES.ADMIN ||
      targetMember.role === RESOURCE_ROLES.OWNER)
  ) {
    throw new ApiError(403, "Moderators cannot remove Admins/Owner.");
  }

  if (isBan) {
    targetMember.status = GROUP_MEMBERSHIP_STATUS.BANNED;
    targetMember.role = RESOURCE_ROLES.MEMBER;
    await targetMember.save();
    await Group.findByIdAndUpdate(groupId, { $inc: { membersCount: -1 } });
    return { message: "User banned from group." };
  } else {
    await GroupMembership.findByIdAndDelete(targetMember._id);
    await Group.findByIdAndUpdate(groupId, { $inc: { membersCount: -1 } });
    return { message: "User removed from group." };
  }
};
