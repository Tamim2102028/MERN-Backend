import Joi from "joi";
import { GROUP_TYPES, GROUP_PRIVACY, GROUP_ROLES } from "../constants/index.js";

export const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required(),

  // Slug হবে ইউনিক URL এর জন্য (e.g. facebook.com/groups/cse-24)
  slug: Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Slug must only contain lowercase letters, numbers, and hyphens.",
    }),

  description: Joi.string().trim().max(500).optional(),

  type: Joi.string()
    .valid(...Object.values(GROUP_TYPES))
    .required(),
  privacy: Joi.string()
    .valid(...Object.values(GROUP_PRIVACY))
    .default(GROUP_PRIVACY.PUBLIC),

  // Settings
  settings: Joi.object({
    allowMemberPosting: Joi.boolean().default(true),
    requirePostApproval: Joi.boolean().default(false),
  }).optional(),
});

export const updateRoleSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  role: Joi.string()
    .valid(...Object.values(GROUP_ROLES))
    .required(),
});

export const actionMemberSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
});
