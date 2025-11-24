import mongoose, { Schema } from "mongoose";
import { ROOM_ROLES } from "../constants/index.js";
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

    // Role: TEACHER, CR, STUDENT
    role: {
      type: String,
      enum: Object.values(ROOM_ROLES),
      default: ROOM_ROLES.STUDENT,
    },

    // ✅ [NEW] Personal Preference: Hide Room
    // স্টুডেন্ট চাইলে রুম হাইড করে রাখতে পারে (e.g. Course Finished)
    isHidden: {
      type: Boolean,
      default: false,
      index: true, // কুয়েরি ফাস্ট করার জন্য
    },

    // Analytics: অটো জয়েন নাকি ম্যানুয়াল
    isAutoJoined: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique Constraint
roomMembershipSchema.index({ room: 1, user: 1 }, { unique: true });
roomMembershipSchema.index({ user: 1, isHidden: 1 }); // Active vs Hidden লিস্ট বের করার জন্য

// --- Hooks (Member Count) ---
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
