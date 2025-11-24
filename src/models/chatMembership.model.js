import mongoose, { Schema } from "mongoose";

const chatMembershipSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isMuted: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
    role: {
      type: String,
      enum: ["ADMIN", "MEMBER"],
      default: "MEMBER",
    },
  },
  { timestamps: true }
);

chatMembershipSchema.index({ conversation: 1, user: 1 }, { unique: true });
chatMembershipSchema.index({ user: 1, updatedAt: -1 });

export const ChatMembership = mongoose.model(
  "ChatMembership",
  chatMembershipSchema
);
