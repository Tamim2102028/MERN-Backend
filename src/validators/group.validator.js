import Joi from "joi";
import {
  GROUP_TYPES,
  GROUP_PRIVACY,
  RESOURCE_ROLES,
} from "../constants/index.js";

// createGroupSchema থেকে slug ফিল্ড বাদ দিন
export const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required(),
  // slug: ... (REMOVE THIS LINE)
  description: Joi.string().trim().max(500).optional(),
  type: Joi.string()
    .valid(...Object.values(GROUP_TYPES))
    .required(),
  privacy: Joi.string()
    .valid(...Object.values(GROUP_PRIVACY))
    .default(GROUP_PRIVACY.PUBLIC),
  settings: Joi.object({
    allowMemberPosting: Joi.boolean().default(true),
    requirePostApproval: Joi.boolean().default(false),
  }).optional(),
});

export const updateRoleSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  // ✅ UPDATED
  role: Joi.string()
    .valid(
      RESOURCE_ROLES.ADMIN,
      RESOURCE_ROLES.MODERATOR,
      RESOURCE_ROLES.MEMBER
    )
    .required(),
});

export const actionMemberSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
});
