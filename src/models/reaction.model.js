import mongoose, { Schema } from "mongoose";
import { REACTION_TARGET_MODELS } from "../constants/index.js";
import { Post } from "./post.model.js";

const reactionSchema = new Schema(
  {
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "targetModel",
      index: true,
    },
    targetModel: {
      type: String,
      required: true,
      enum: Object.values(REACTION_TARGET_MODELS),
      default: REACTION_TARGET_MODELS.POST,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

reactionSchema.index(
  { targetId: 1, targetModel: 1, user: 1 },
  { unique: true }
);

reactionSchema.post("save", async function (doc) {
  if (doc.targetModel === REACTION_TARGET_MODELS.POST) {
    await Post.findByIdAndUpdate(doc.targetId, { $inc: { likesCount: 1 } });
  } else if (doc.targetModel === REACTION_TARGET_MODELS.COMMENT) {
    await mongoose
      .model("Comment")
      .findByIdAndUpdate(doc.targetId, { $inc: { likesCount: 1 } });
  }
});

reactionSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.targetModel === REACTION_TARGET_MODELS.POST) {
    await Post.findByIdAndUpdate(doc.targetId, { $inc: { likesCount: -1 } });
  } else if (doc && doc.targetModel === REACTION_TARGET_MODELS.COMMENT) {
    await mongoose
      .model("Comment")
      .findByIdAndUpdate(doc.targetId, { $inc: { likesCount: -1 } });
  }
});

export const Reaction = mongoose.model("Reaction", reactionSchema);
