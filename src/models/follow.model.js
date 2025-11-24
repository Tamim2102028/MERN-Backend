import mongoose, { Schema } from "mongoose";
import { FOLLOW_TARGET_MODELS } from "../constants/index.js";
import { User } from "./user.model.js";

const followSchema = new Schema(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "followingModel",
      index: true,
    },
    followingModel: {
      type: String,
      required: true,
      enum: Object.values(FOLLOW_TARGET_MODELS),
    },
  },
  { timestamps: true }
);

followSchema.index(
  { follower: 1, followingId: 1, followingModel: 1 },
  { unique: true }
);

followSchema.post("save", async function (doc) {
  await User.findByIdAndUpdate(doc.follower, { $inc: { followingCount: 1 } });
});

followSchema.post("findOneAndDelete", async function (doc) {
  await User.findByIdAndUpdate(doc.follower, { $inc: { followingCount: -1 } });
});

export const Follow = mongoose.model("Follow", followSchema);
