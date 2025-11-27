import Joi from "joi";
import {
  POST_TYPES,
  POST_VISIBILITY,
  POST_TARGET_MODELS,
} from "../constants/index.js";

const createPostSchema = Joi.object({
  content: Joi.string().trim().max(5000).allow("").optional(), // টেক্সট ছাড়াও পোস্ট হতে পারে (শুধু ছবি)

  type: Joi.string()
    .valid(...Object.values(POST_TYPES))
    .default(POST_TYPES.GENERAL),

  visibility: Joi.string()
    .valid(...Object.values(POST_VISIBILITY))
    .default(POST_VISIBILITY.PUBLIC),

  // পোস্ট কোথায় হচ্ছে? (Group, Timeline, etc.)
  postOnModel: Joi.string()
    .valid(...Object.values(POST_TARGET_MODELS))
    .required(),

  // কোথায় পোস্ট হচ্ছে তার ID (Group ID বা User ID)
  postOnId: Joi.string().hex().length(24).required(),

  // Shared Post ID (Optional)
  sharedPost: Joi.string().hex().length(24).optional(),
});

const getFeedSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10), // একবারে সর্বোচ্চ ৫০টা পোস্ট
});

export { createPostSchema, getFeedSchema };
