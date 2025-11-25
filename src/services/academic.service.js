import { Institution } from "../models/institution.model.js";
import { VERIFICATION_STATUS } from "../constants/index.js";

/**
 * সার্ভিস: ইউজারের ইমেইল এবং ইনস্টিটিউশন ডোমেইন চেক করা
 * @param {String} userEmail - ইউজারের ইমেইল (e.g. student@du.ac.bd)
 * @param {String} institutionId - ইনস্টিটিউশনের MongoDB ID
 * @returns {String} "VERIFIED" | "UNVERIFIED"
 */

export const verifyStudentDomain = async (userEmail, institutionId) => {
  try {
    if (!userEmail || !institutionId) {
      return VERIFICATION_STATUS.UNVERIFIED;
    }

    // ১. ডাটাবেস থেকে ইনস্টিটিউশন বের করা
    const institution = await Institution.findById(institutionId);

    // ইনস্টিটিউশন না পাওয়া গেলে বা ভ্যালিড ডোমেইন সেট করা না থাকলে
    if (
      !institution ||
      !institution.validDomains ||
      institution.validDomains.length === 0
    ) {
      return VERIFICATION_STATUS.UNVERIFIED;
    }

    // ২. ইমেইল থেকে ডোমেইন আলাদা করা (abc@du.ac.bd -> du.ac.bd)
    const emailParts = userEmail.split("@");
    if (emailParts.length !== 2) return VERIFICATION_STATUS.UNVERIFIED;

    const userDomain = emailParts[1].toLowerCase();

    // ৩. চেক করা ডোমেইন লিস্টে আছে কিনা
    const isMatch = institution.validDomains.includes(userDomain);

    return isMatch
      ? VERIFICATION_STATUS.VERIFIED
      : VERIFICATION_STATUS.UNVERIFIED;
  } catch (error) {
    console.error("Service Error (verifyStudentDomain):", error.message);
    // সার্ভিসে এরর হলে ডিফল্ট হিসেবে UNVERIFIED রিটার্ন করাই নিরাপদ
    return VERIFICATION_STATUS.UNVERIFIED;
  }
};
