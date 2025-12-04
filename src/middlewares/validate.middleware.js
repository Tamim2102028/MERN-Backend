import { ApiError } from "../utils/ApiError.js";

/**
 * @param {Object} schema - Joi Schema
 * @param {String} source - 'body' (default) | 'query' | 'params'
 */

export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    // ১. সোর্স অনুযায়ী ডাটা সিলেক্ট করা (এখন params সহ)
    let data;
    if (source === "body") {
      data = req.body;
    } else if (source === "query") {
      data = req.query;
    } else if (source === "params") {
      data = req.params; //
    } else {
      // যদি ভুল সোর্স দেওয়া হয় (ডেভেলপার এরর)
      return next(new ApiError(500, `Invalid validation source: ${source}`));
    }

    // ২. ভ্যালিডেশন চেক
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return next(new ApiError(422, "Validation Error", errorMessages));
    }

    // ৩. ভ্যালিডেট করা ডাটা আবার রিকোয়েস্টে সেট করে দেওয়া
    if (source === "body") {
      req.body = value;
    } else if (source === "query") {
      req.query = value;
    } else if (source === "params") {
      req.params = value;
    }

    next();
  };
};
