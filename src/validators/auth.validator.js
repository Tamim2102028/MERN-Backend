import Joi from "joi";
import { USER_TYPES } from "../constants/index.js";

// ১. রেজিস্ট্রেশন স্কিমা (Basic Info Only)
// এখানে আমরা Institution/Dept চাইব না, কারণ সেটা ২য় ধাপে আসবে।
const userRegisterSchema = Joi.object({
  fullName: Joi.string().trim().min(3).max(50).required().messages({
    "string.empty": "Full name is required",
    "string.min": "Full name must be at least 3 characters",
  }),

  email: Joi.string().email().trim().lowercase().required().messages({
    "string.email": "Please provide a valid email address",
  }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
  }),

  nickName: Joi.string().trim().optional(),

  userType: Joi.string()
    .valid(...Object.values(USER_TYPES)) // STUDENT or TEACHER
    .required(),
});

// ২. অনবোর্ডিং স্কিমা (Academic Info Update)
// এটা আমরা পরে প্রোফাইল আপডেট কন্ট্রোলারে ব্যবহার করব
const userOnboardingSchema = Joi.object({
  institution: Joi.string().hex().length(24).required(),
  department: Joi.string().hex().length(24).required(),

  // একাডেমিক ইনফো
  session: Joi.string().required(), // e.g. "2023-24"
  section: Joi.string().optional().allow(""),
  studentId: Joi.string().optional().allow(""),
});

export { userRegisterSchema, userOnboardingSchema };
