import mongoose, { Schema } from "mongoose";
// ✅ Imports from Constants
import { GROUP_TYPES, GROUP_PRIVACY } from "../constants/index.js";

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxLength: 500 },
    avatar: { type: String },
    coverImage: { type: String },

    institution: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },

    // ✅ Using Constants
    type: {
      type: String,
      enum: Object.values(GROUP_TYPES),
      required: true,
      index: true,
    },
    privacy: {
      type: String,
      enum: Object.values(GROUP_PRIVACY),
      default: GROUP_PRIVACY.PUBLIC,
      index: true,
    },

    academicCriteria: {
      session: { type: String },
    },

    settings: {
      allowMemberPosting: { type: Boolean, default: true },
      requirePostApproval: { type: Boolean, default: false },
    },
    membersCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },

    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

groupSchema.index({ institution: 1, slug: 1 }, { unique: true });

groupSchema.index({
  institution: 1,
  department: 1,
  type: 1,
  "academicCriteria.session": 1,
});

export const Group = mongoose.model("Group", groupSchema);
