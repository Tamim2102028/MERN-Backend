import mongoose, { Schema } from "mongoose";
import { FRIENDSHIP_STATUS } from "../constants/index.js";
import { User } from "./user.model.js";

const friendshipSchema = new Schema(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(FRIENDSHIP_STATUS),
      default: FRIENDSHIP_STATUS.PENDING,
      index: true,
    },
  },
  { timestamps: true }
);

friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendshipSchema.index({ requester: 1, status: 1 });
friendshipSchema.index({ recipient: 1, status: 1 });

friendshipSchema.post("save", async function (doc) {
  if (doc.status === FRIENDSHIP_STATUS.ACCEPTED) {
    await User.findByIdAndUpdate(doc.requester, {
      $inc: { connectionsCount: 1 },
    });
    await User.findByIdAndUpdate(doc.recipient, {
      $inc: { connectionsCount: 1 },
    });
  }
});

friendshipSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.status === FRIENDSHIP_STATUS.ACCEPTED) {
    await User.findByIdAndUpdate(doc.requester, {
      $inc: { connectionsCount: -1 },
    });
    await User.findByIdAndUpdate(doc.recipient, {
      $inc: { connectionsCount: -1 },
    });
  }
});

export const Friendship = mongoose.model("Friendship", friendshipSchema);
