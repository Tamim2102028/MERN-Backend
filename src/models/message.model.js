import mongoose, { Schema } from "mongoose";
import { MESSAGE_SENDER_TYPE, ATTACHMENT_TYPES } from "../constants/index.js";
import { Conversation } from "./conversation.model.js";

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    content: { type: String, trim: true },
    attachments: [
      {
        type: { type: String, enum: Object.values(ATTACHMENT_TYPES) },
        url: { type: String },
        name: { type: String },
      },
    ],
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderMode: {
      type: String,
      enum: Object.values(MESSAGE_SENDER_TYPE),
      default: MESSAGE_SENDER_TYPE.USER,
    },
    seenBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.post("save", async function (doc) {
  await Conversation.findByIdAndUpdate(doc.conversation, {
    lastMessage: {
      text: doc.content || "Sent an attachment",
      sender: doc.sender,
      createdAt: doc.createdAt,
    },
    updatedAt: new Date(),
  });
});

export const Message = mongoose.model("Message", messageSchema);
