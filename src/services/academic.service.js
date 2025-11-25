import { Institution } from "../models/institution.model.js";

/**
 * সার্ভিস: চেক করে ইমেইলটি কোনো স্টুডেন্ট/ইন্সটিটিউশন ইমেইল কিনা।
 * @param {String} email - ইউজারের ইমেইল (e.g. student@buet.ac.bd)
 * @returns {Boolean} true if valid domain found, else false
 */
export const checkStudentEmail = async (email) => {
  try {
    if (!email || !email.includes("@")) {
      return false;
    }

    // ১. ইমেইল থেকে ডোমেইন বের করা (abc@buet.ac.bd -> buet.ac.bd)
    const domain = email.split("@")[1].toLowerCase();

    // ২. ডাটাবেসে চেক করা কোনো ইনস্টিটিউশনের validDomains এ এই ডোমেইন আছে কিনা
    // findOne ব্যবহার করছি কারণ একটা পেলেই আমাদের চলবে।
    const institution = await Institution.findOne({
      validDomains: domain,
    }).select("_id"); // শুধু আইডি আনলেই হবে, পুরো অবজেক্ট দরকার নেই

    // ৩. যদি ইনস্টিটিউশন পাওয়া যায়, তার মানে এটা স্টুডেন্ট মেইল
    return !!institution; // Found = true, Not Found = false
  } catch (error) {
    console.error("Service Error (checkStudentEmail):", error.message);
    return false; // সেফ সাইড
  }
};
