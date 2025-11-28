import Joi from "joi";
import { RESOURCE_ROLES } from "../constants/index.js";

export const createRoomSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().max(500).allow("").optional(),

  settings: Joi.object({
    allowStudentPosting: Joi.boolean().default(true),
  }).optional(),

  // Optional Academic Info
  institution: Joi.string().hex().length(24).optional(),
  department: Joi.string().hex().length(24).optional(),
  session: Joi.string().optional(),
  section: Joi.string().optional(),
});

export const joinRoomSchema = Joi.object({
  code: Joi.string().trim().required(),
});

// ✅ Role Update Validation
export const updateRoomRoleSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  role: Joi.string()
    .valid(
      RESOURCE_ROLES.ADMIN,
      RESOURCE_ROLES.MODERATOR,
      RESOURCE_ROLES.MEMBER
    )
    .required(), // Owner ম্যানুয়ালি সেট করা যায় না
});

export const actionMemberSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
});
