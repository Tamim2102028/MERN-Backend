import { Institution } from "../models/institution.model.js";
import { Department } from "../models/department.model.js";

export const findAcademicInfoByEmail = async (email) => {
  if (!email || !email.includes("@")) {
    return { institution: null, department: null };
  }

  const domain = email.split("@")[1].toLowerCase();

  // প্যারালালি দুই টেবিলেই চেক করছি
  const [institution, department] = await Promise.all([
    Institution.findOne({ validDomains: domain }),
    Department.findOne({ validDomains: domain }),
  ]);

  return {
    institution: institution || null,
    department: department || null,
  };
};
