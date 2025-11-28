export const DB_NAME = "edusocial";

// Account Status
export const ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  BANNED: "BANNED",
  DELETED: "DELETED",
};

export const REACTION_TARGET_MODELS = {
  POST: "Post",
  COMMENT: "Comment",
};

export const PROFILE_VISIBILITY = {
  PUBLIC: "PUBLIC", // সবাই দেখবে
  CONNECTIONS: "CONNECTIONS", // শুধু ফ্রেন্ডরা দেখবে
  ONLY_ME: "ONLY_ME", // কেউ দেখবে না
};

export const RESOURCE_ROLES = {
  OWNER: "OWNER", // মালিক (সবার বাপ)
  ADMIN: "ADMIN", // ম্যানেজার (মালিক বাদে সবার বস)
  MODERATOR: "MODERATOR", // সহকারী (লিমিটেড পাওয়ার)
  MEMBER: "MEMBER", // আম জনতা
};
