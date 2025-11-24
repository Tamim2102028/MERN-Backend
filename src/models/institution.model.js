import mongoose, { Schema } from "mongoose";
import { INSTITUTION_TYPES } from "../constants/index.js";

const institutionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    // ✅ Using Constant
    type: {
      type: String,
      enum: Object.values(INSTITUTION_TYPES),
      default: INSTITUTION_TYPES.UNIVERSITY,
      required: true,
      index: true,
    },

    validDomains: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    moderators: [{ type: Schema.Types.ObjectId, ref: "User" }],

    location: { type: String, required: true },
    website: { type: String },
    logo: { type: String, required: true },
    coverImage: { type: String },

    contactEmails: [{ type: String, lowercase: true, trim: true }],
    contactPhones: [{ type: String, trim: true }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

institutionSchema.index({ validDomains: 1 });

export const Institution = mongoose.model("Institution", institutionSchema);
