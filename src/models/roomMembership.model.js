import mongoose, { Schema } from "mongoose";
import { RESOURCE_ROLES } from "../constants/index.js"; // ✅ Updated Import
import { Room } from "./room.model.js";

const roomMembershipSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ UNIVERSAL ROLE
    role: {
      type: String,
      enum: Object.values(RESOURCE_ROLES),
      default: RESOURCE_ROLES.MEMBER,
    },

    isHidden: { type: Boolean, default: false, index: true },
    isAutoJoined: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roomMembershipSchema.index({ room: 1, user: 1 }, { unique: true });

// Hooks (Member Count)
roomMembershipSchema.post("save", async function (doc) {
  await Room.findByIdAndUpdate(doc.room, { $inc: { membersCount: 1 } });
});

roomMembershipSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await Room.findByIdAndUpdate(doc.room, { $inc: { membersCount: -1 } });
  }
});

export const RoomMembership = mongoose.model(
  "RoomMembership",
  roomMembershipSchema
);
