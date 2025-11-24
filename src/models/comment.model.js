import mongoose, { Schema } from "mongoose";
import { Post } from "./post.model.js";

const commentSchema = new Schema(
  {
    content: { type: String, required: true, trim: true, maxLength: 1000 },
    attachment: { type: String },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Threading
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    repliesCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },

    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.post("save", async function (doc) {
  await Post.findByIdAndUpdate(doc.post, { $inc: { commentsCount: 1 } });
  if (doc.parentId) {
    await mongoose
      .model("Comment")
      .findByIdAndUpdate(doc.parentId, { $inc: { repliesCount: 1 } });
  }
});

export const Comment = mongoose.model("Comment", commentSchema);
