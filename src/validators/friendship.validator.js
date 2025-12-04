import Joi from "joi";

// 1. Friend ID Validation
export const friendIdSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
});

// 2. Request ID Validation
export const requestIdSchema = Joi.object({
  requestId: Joi.string().hex().length(24).required(),
});

// 3. ✅ FIX: শুধু URL Parameter (type) এর জন্য স্কিমা
export const getListParamSchema = Joi.object({
  type: Joi.string().valid("friends", "incoming", "sent", "blocked").required(),
});

// 4. ✅ FIX: শুধু Query Parameter (page, limit) এর জন্য স্কিমা
export const getListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

// 5. Suggestions Query Schema
export const getSuggestionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});
