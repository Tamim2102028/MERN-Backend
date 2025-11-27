import Joi from "joi";

export const getNotificationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

export const markReadSchema = Joi.object({
  notificationId: Joi.string().hex().length(24).required(),
});
