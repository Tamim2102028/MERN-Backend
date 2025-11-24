import { ApiError } from "../utils/ApiError";

const validate = (schema) => {
  return (req, res, next) => {
    // req.body এর সাথে স্কিমা মিলছে কিনা চেক করা
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      // Joi এররগুলো সুন্দর করে সাজিয়ে ফ্রন্টএন্ডে পাঠানো
      // e.g. ["Email is invalid", "Password too short"]
      const errorMessages = error.details.map((detail) => detail.message);

      // 422 Unprocessable Entity
      return next(new ApiError(422, "Validation Error", errorMessages));
    }

    // সব ঠিক থাকলে পরের ধাপে (Controller) যাও
    next();
  };
};

export { validate };
