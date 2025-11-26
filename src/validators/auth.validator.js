import Joi from "joi";
import { USER_TYPES } from "../constants/index.js";

// ১. রেজিস্ট্রেশন স্কিমা
const userRegisterSchema = Joi.object({
  fullName: Joi.string().trim().min(3).max(50).required().messages({
    "string.empty": "Full name is required",
    "string.min": "Full name must be at least 3 characters",
  }),

  email: Joi.string().email().trim().lowercase().required(),

  // পাসওয়ার্ড পলিসি (স্ট্রং)
  password: Joi.string()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])"))
    .min(8)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one lowercase, one uppercase letter and one number",
      "string.min": "Password must be at least 8 characters long",
    }),

  userName: Joi.string()
    .trim()
    .min(3)
    .max(30)
    // ✅ NEW: Regular expression to allow only letters, numbers, and underscores
    .pattern(new RegExp("^[a-zA-Z0-9_]+$"))
    .required()
    .messages({
      "string.pattern.base":
        "Username can only contain letters, numbers, and underscores.",
      "string.min": "Username must be at least 3 characters long.",
      "string.empty": "Username is required.",
    }),

  // 🔥 CRITICAL SECURITY FIX 🔥
  // এখানে আমরা whitelist করে দিচ্ছি। এর বাইরে কিছু পাঠালেই Error খাবে।
  userType: Joi.string()
    .valid(USER_TYPES.STUDENT, USER_TYPES.TEACHER) // ONLY THESE TWO ALLOWED
    .required()
    .messages({
      "any.only":
        "Security Alert: You can only register as STUDENT or TEACHER.",
    }),
});

// ... userOnboardingSchema যা ছিল তাই থাকবে ...
const userOnboardingSchema = Joi.object({
  institution: Joi.string().hex().length(24).required(),
  department: Joi.string().hex().length(24).required(),
  session: Joi.string().optional(),
  section: Joi.string().optional().allow(""),
  studentId: Joi.string().optional().allow(""),
  teacherId: Joi.string().optional().allow(""),
  rank: Joi.string().optional(),
  officeHours: Joi.array().optional(),
});

export { userRegisterSchema, userOnboardingSchema };
