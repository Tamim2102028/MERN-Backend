import { ApiError } from "../utils/ApiError.js";

/**
 * @param {Object} schema - Joi Schema
 * @param {String} source - 'body' (default) or 'query' or 'params'
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    // ১. সোর্স অনুযায়ী ডাটা সিলেক্ট করা
    const data = source === "query" ? req.query : req.body;

    // ২. ভ্যালিডেশন চেক
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return next(new ApiError(422, "Validation Error", errorMessages));
    }

    // ৩. ভ্যালিডেট করা ডাটা আবার রিকোয়েস্টে সেট করে দেওয়া
    // (Joi অটোমেটিক টাইপ কনভার্সন করে, যেমন string "1" কে number 1 বানায়, সেটা আপডেট হওয়া জরুরি)
    if (source === "query") {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};
