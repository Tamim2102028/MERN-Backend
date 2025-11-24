import mongoose, { Schema } from "mongoose";
import {
  POST_TYPES,
  ATTACHMENT_TYPES,
  POST_TARGET_MODELS,
  POST_VISIBILITY,
} from "../constants/index.js";

const postSchema = new Schema(
  {
    content: { type: String, trim: true },
    attachments: [
      {
        type: {
          type: String,
          enum: Object.values(ATTACHMENT_TYPES),
          required: true,
        },
        url: { type: String, required: true },
        name: { type: String },
        size: { type: Number },
      },
    ],
    type: {
      type: String,
      enum: Object.values(POST_TYPES),
      default: POST_TYPES.GENERAL,
      required: true,
      index: true,
    },

    // Context
    postOnId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "postOnModel",
      index: true,
    },
    postOnModel: {
      type: String,
      required: true,
      enum: Object.values(POST_TARGET_MODELS),
      default: POST_TARGET_MODELS.GROUP,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(POST_VISIBILITY),
      default: POST_VISIBILITY.PUBLIC,
      index: true,
    },

    pollOptions: [
      {
        text: { type: String },
        votes: { type: Number, default: 0 },
        voters: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
    tags: [{ type: String, trim: true }],

    // ✅ Stats (Updated: Removed viewsCount)
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },

    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

postSchema.index({ postOnId: 1, postOnModel: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

export const Post = mongoose.model("Post", postSchema);
