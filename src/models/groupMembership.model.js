import mongoose, { Schema } from "mongoose";
import {
  RESOURCE_ROLES,
  GROUP_MEMBERSHIP_STATUS,
  GROUP_JOIN_METHOD,
} from "../constants/index.js";
import { Group } from "./group.model.js";

const groupMembershipSchema = new Schema(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ UPDATED: Using Universal Roles
    role: {
      type: String,
      enum: Object.values(RESOURCE_ROLES),
      default: RESOURCE_ROLES.MEMBER,
    },

    status: {
      type: String,
      enum: Object.values(GROUP_MEMBERSHIP_STATUS),
      default: GROUP_MEMBERSHIP_STATUS.JOINED,
      index: true,
    },

    joinMethod: {
      type: String,
      enum: Object.values(GROUP_JOIN_METHOD),
      default: GROUP_JOIN_METHOD.DIRECT_JOIN,
    },

    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

groupMembershipSchema.index({ group: 1, user: 1 }, { unique: true });
groupMembershipSchema.index({ group: 1, status: 1 });
groupMembershipSchema.index({ user: 1, status: 1 });

// Hooks
groupMembershipSchema.post("save", async function (doc) {
  if (doc.status === GROUP_MEMBERSHIP_STATUS.JOINED) {
    await Group.findByIdAndUpdate(doc.group, { $inc: { membersCount: 1 } });
  }
});

groupMembershipSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.status === GROUP_MEMBERSHIP_STATUS.JOINED) {
    await Group.findByIdAndUpdate(doc.group, { $inc: { membersCount: -1 } });
  }
});

export const GroupMembership = mongoose.model(
  "GroupMembership",
  groupMembershipSchema
);
