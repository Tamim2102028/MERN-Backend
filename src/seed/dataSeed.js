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
    domain: "student.sust.edu", // বা sust.edu
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PUBLIC,
    depts: ["CSE", "SWE", "EEE", "Physics"],
  },
  {
    name: "Jahangirnagar University",
    code: "JU",
    domain: "juniv.edu",
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PUBLIC,
    depts: ["CSE", "IIT", "Physics", "Economics"],
  },

  // --- PRIVATE UNIVERSITIES ---
  {
    name: "North South University",
    code: "NSU",
    domain: "northsouth.edu",
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PRIVATE,
    depts: ["CSE", "EEE", "BBA", "Architecture", "Pharmacy"],
  },
  {
    name: "BRAC University",
    code: "BRACU",
    domain: "bracu.ac.bd",
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PRIVATE,
    depts: ["CSE", "EEE", "BBA", "Pharmacy", "English"],
  },
  {
    name: "Ahsanullah University of Science and Technology",
    code: "AUST",
    domain: "aust.edu",
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PRIVATE,
    depts: ["CSE", "EEE", "ME", "CIVIL", "Textile"],
  },
  {
    name: "American International University-Bangladesh",
    code: "AIUB",
    domain: "aiub.edu",
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PRIVATE,
    depts: ["CSE", "EEE", "BBA", "Architecture"],
  },
  {
    name: "Daffodil International University",
    code: "DIU",
    domain: "diu.edu.bd",
    type: INSTITUTION_TYPES.UNIVERSITY,
    category: INSTITUTION_CATEGORY.PRIVATE,
    depts: ["CSE", "SWE", "EEE", "Textile"],
  },
];

const seedData = async () => {
  try {
    await connectDB();

    // আগের ডাটা ক্লিয়ার করা (Testing এর জন্য)
    await Institution.deleteMany({});
    await Department.deleteMany({});

    for (const uni of sampleData) {
      // ১. ভার্সিটি তৈরি
      const newInst = await Institution.create({
        name: uni.name,
        code: uni.code,
        type: uni.type || INSTITUTION_TYPES.UNIVERSITY,
        category: uni.category || INSTITUTION_CATEGORY.PUBLIC,
        validDomains: [uni.domain], // এই ডোমেইন ম্যাচ হলে অটো ভেরিফাইড হবে
        location: "Dhaka, Bangladesh",
        logo: "https://placehold.co/200", // ডামি লোগো
      });

      console.log(`🏫 Created: ${uni.name}`);

      // ২. ডিপার্টমেন্ট তৈরি এবং লিংক করা
      const deptDocs = uni.depts.map((dCode) => ({
        name: dCode + " Department",
        code: dCode,
        institution: newInst._id, // লিংকিং
      }));

      await Department.insertMany(deptDocs);
      console.log(`   ↳ Added ${uni.depts.length} departments.`);
    }

    console.log("✅ All Data Seeded Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Data Seeding Failed:", error);
    process.exit(1);
  }
};

seedData();

// node src/seed/dataSeed.js
