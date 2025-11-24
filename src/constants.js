/**
 * @file constants.js
 * @description Central configuration file for EduSocial App.
 * [FINAL STATUS]: Updated Room constants, removed Room Types.
 */

export const DB_NAME = "edusocial";

// --- Institution Types ---
export const INSTITUTION_TYPES = {
  UNIVERSITY: "UNIVERSITY",
};

// --- User Roles ---
export const USER_TYPES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
};

// --- Teacher Ranks ---
export const TEACHER_RANKS = {
  PROFESSOR: "Professor",
  ASSOCIATE_PROFESSOR: "Associate Professor",
  ASSISTANT_PROFESSOR: "Assistant Professor",
  LECTURER: "Lecturer",
  INSTRUCTOR: "Instructor",
};

// --- Account Status ---
export const VERIFICATION_STATUS = {
  VERIFIED: "VERIFIED",
  UNVERIFIED: "UNVERIFIED",
};

export const ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  BANNED: "BANNED",
  DELETED: "DELETED",
};

export const GENDERS = {
  MALE: "MALE",
  FEMALE: "FEMALE",
};

export const RELIGIONS = {
  ISLAM: "Islam",
  HINDU: "Hindu",
  CHRISTIAN: "Christian",
  OTHERS: "Others",
};

// --- Group Configuration ---
export const GROUP_TYPES = {
  OFFICIAL_UNIVERSITY: "OFFICIAL_UNIVERSITY",
  OFFICIAL_SESSION: "OFFICIAL_SESSION",
  OFFICIAL_DEPT: "OFFICIAL_DEPT",
  OFFICIAL_DEPT_SESSION: "OFFICIAL_DEPT_SESSION",

  JOBS_CAREERS: "JOBS_CAREERS",
  GENERAL: "GENERAL",
};

export const GROUP_PRIVACY = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
  CLOSED: "CLOSED",
};

export const GROUP_ROLES = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  MEMBER: "MEMBER",
};

export const GROUP_MEMBERSHIP_STATUS = {
  JOINED: "JOINED",
  PENDING: "PENDING",
  INVITED: "INVITED",
  REJECTED: "REJECTED",
  BANNED: "BANNED",
  LEFT: "LEFT",
};

export const GROUP_JOIN_METHOD = {
  SYSTEM_AUTO: "SYSTEM_AUTO",
  DIRECT_JOIN: "DIRECT_JOIN",
  REQUEST_APPROVAL: "REQUEST_APPROVAL",
  INVITE: "INVITE",
};

// --- Post Configuration ---
export const POST_TYPES = {
  GENERAL: "GENERAL",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  RESOURCE: "RESOURCE",
  POLL: "POLL",
  QUESTION: "QUESTION",
};

export const ATTACHMENT_TYPES = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  PDF: "PDF",
  DOC: "DOC",
  LINK: "LINK",
};

export const POST_TARGET_MODELS = {
  GROUP: "Group",
  ROOM: "Room",
  PAGE: "Page",
  USER: "User",
  INSTITUTION: "Institution",
  DEPARTMENT: "Department",
};

export const POST_VISIBILITY = {
  PUBLIC: "PUBLIC",
  INTERNAL: "INTERNAL",
  CONNECTIONS: "CONNECTIONS",
  ONLY_ME: "ONLY_ME",
};

export const FOLLOW_TARGET_MODELS = {
  USER: "User",
  INSTITUTION: "Institution",
  DEPARTMENT: "Department",
};

// --- Room Configuration ---
export const ROOM_ROLES = {
  TEACHER: "TEACHER", // Creator/Owner
  CR: "CR", // Moderator
  STUDENT: "STUDENT", // Member
};

export const ROOM_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED", // Teacher archived it
};
