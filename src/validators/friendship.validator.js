import Joi from "joi";

export const friendIdSchema = Joi.object({
  userId: Joi.string().hex().length(24).required().messages({
    "string.length": "Invalid User ID format",
    "any.required": "User ID is required",
  }),
});

export const requestIdSchema = Joi.object({
  requestId: Joi.string().hex().length(24).required().messages({
    "string.length": "Invalid Request ID format",
    "any.required": "Request ID is required",
  }),
});

export const getListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20), // লিস্ট একটু বড় হতে পারে
});
