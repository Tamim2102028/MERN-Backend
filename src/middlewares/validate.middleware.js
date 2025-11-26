import { ApiError } from "../utils/ApiError.js";

const validate = (schema) => {
  return (req, res, next) => {
    // ১. ভ্যালিডেশন চেক
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      // ⚠️ ভ্যালিডেশন ফেইল করেছে!

      // আগে এখানে ফাইল ডিলিট করার লজিক ছিল।
      // এখন সেটা নেই, কারণ Global Error Handler এটা হ্যান্ডেল করবে।

      // ২. এরর মেসেজ সাজানো
      const errorMessages = error.details.map((detail) => detail.message);

      // ৩. এরর পাঠিয়ে দেওয়া (Global Handler ধরবে)
      return next(new ApiError(422, "Validation Error", errorMessages));
    }

    // সব ঠিক থাকলে সামনে যাও
    next();
  };
};

export { validate };
