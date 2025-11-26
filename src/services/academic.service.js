import { Institution } from "../models/institution.model.js";

/**
 * সার্ভিস: ইমেইল ডোমেইন ব্যবহার করে ডাটাবেস থেকে সংশ্লিষ্ট প্রতিষ্ঠান খুঁজে বের করে।
 * @param {String} email - ইউজারের ইমেইল (e.g. student@buet.ac.bd)
 * @returns {Promise<Object|null>} - প্রতিষ্ঠান পাওয়া গেলে তার ডকুমেন্ট, না পেলে null.
 */

export const findInstitutionByEmailDomain = async (email) => {
  try {
    if (!email || !email.includes("@")) {
      return null;
    }

    // 1. Extract domain from email
    const domain = email.split("@")[1].toLowerCase();

    // 2. Find the institution that has this domain in its validDomains array
    // We are returning the full document now, not just a boolean.
    const institution = await Institution.findOne({
      validDomains: domain,
    });

    // 3. Return the found institution object or null
    return institution;
  } catch (error) {
    console.error(
      "Service Error (findInstitutionByEmailDomain):",
      error.message
    );
    return null; // Return null in case of error for safety
  }
};
