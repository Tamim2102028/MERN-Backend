import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../db/index.js";
import { Institution } from "../models/institution.model.js";
import { Department } from "../models/department.model.js";
import { INSTITUTION_TYPES, INSTITUTION_CATEGORY } from "../constants/index.js";

dotenv.config({ path: "./.env" });

const sampleData = [
  // --- PUBLIC UNIVERSITIES ---
  {
    name: "Bangladesh University of Engineering and Technology",
    code: "BUET",
    domain: "buet.ac.bd",
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PUBLIC,
    depts: ["CSE", "EEE", "ME", "CIVIL", "IPE", "Architecture", "BME"],
  },
  {
    name: "University of Dhaka",
    code: "DU",
    domain: "du.ac.bd",
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PUBLIC,
    depts: [
      "CSE",
      "Physics",
      "Chemistry",
      "Mathematics",
      "Law",
      "English",
      "IBA",
    ],
  },
  {
    name: "Shahjalal University of Science and Technology",
    code: "SUST",
    domain: "sust.edu",
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PUBLIC,
    depts: ["CSE", "SWE", "EEE", "Physics"],
  },
  // ... বাকি ভার্সিটিগুলো একই ফরম্যাটে ...
];

const seedData = async () => {
  try {
    console.log("🌱 Seeding Started...");
    await connectDB();

    console.log("🧹 Cleaning old data...");
    await Institution.deleteMany({});
    await Department.deleteMany({});

    for (const uni of sampleData) {
      // ১. সাব-ডোমেইন লিস্ট তৈরি করা (Logic Fix)
      // ভার্সিটির মেইন ডোমেইন + সব ডিপার্টমেন্টের সাব-ডোমেইন একসাথে করা হচ্ছে
      const deptSubDomains = uni.depts.map(
        (dCode) => `${dCode.toLowerCase()}.${uni.domain}`
      );
      const allValidDomains = [uni.domain, ...deptSubDomains];

      // ২. ভার্সিটি তৈরি (এখন সব ডোমেইন এর মধ্যে থাকবে)
      const newInst = await Institution.create({
        name: uni.name,
        code: uni.code,
        type: uni.type || INSTITUTION_TYPES.UNIVERSITY,
        category: uni.category || INSTITUTION_CATEGORY.PUBLIC,

        // ✅ FIX: এখানে মেইন ডোমেইন + সব সাব-ডোমেইন ঢুকছে
        validDomains: allValidDomains,

        location: "Dhaka, Bangladesh",
        logo: `https://ui-avatars.com/api/?name=${uni.code}&background=random&size=200`,
        contactEmails: [`info@${uni.domain}`],
      });

      console.log(
        `🏫 Created Institution: ${uni.name} (Domains: ${allValidDomains.length})`
      );

      // ৩. ডিপার্টমেন্ট তৈরি
      const deptDocs = uni.depts.map((dCode) => {
        const subDomain = `${dCode.toLowerCase()}.${uni.domain}`;

        return {
          name: `${dCode} Department`,
          code: dCode,
          institution: newInst._id,

          // ডিপার্টমেন্টের কাছে শুধু তার স্পেসিফিক সাব-ডোমেইন থাকবে
          validDomains: [subDomain],

          logo: `https://ui-avatars.com/api/?name=${dCode}&background=random&size=200`,
          contactEmails: [`${dCode.toLowerCase()}@${uni.domain}`],
        };
      });

      await Department.insertMany(deptDocs);
      console.log(`   ↳ ✅ Added ${uni.depts.length} departments.`);
    }

    console.log("\n✅ All Data Seeded Successfully! Logic is now consistent.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Data Seeding Failed:", error);
    process.exit(1);
  }
};

seedData();

// node Backend/src/seed/dataSeed.js