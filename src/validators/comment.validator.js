import Joi from "joi";

// শুধু বডির ডাটা চেক করব
export const addCommentSchema = Joi.object({
  content: Joi.string().trim().max(1000).required(),

  // parentId অপশনাল (শুধু রিপ্লাই দেওয়ার সময় লাগবে)
  parentId: Joi.string().hex().length(24).optional().allow(null),
});

export const getCommentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  parentId: Joi.string().hex().length(24).optional().allow(null),
});
