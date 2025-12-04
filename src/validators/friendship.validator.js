import Joi from "joi";

// 1. Friend ID Validation (Action: Send, Unfriend, Block)
export const friendIdSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
});

// 2. Request ID Validation (Action: Accept, Cancel)
export const requestIdSchema = Joi.object({
  requestId: Joi.string().hex().length(24).required(),
});

// 3. Pagination Schema (Re-used for all list endpoints)
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});