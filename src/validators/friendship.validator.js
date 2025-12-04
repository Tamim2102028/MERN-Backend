import Joi from "joi";

export const friendIdSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
});

export const requestIdSchema = Joi.object({
  requestId: Joi.string().hex().length(24).required(),
});

export const getListSchema = Joi.object({
  type: Joi.string().valid("friends", "incoming", "sent", "blocked").required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

export const getSuggestionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});
