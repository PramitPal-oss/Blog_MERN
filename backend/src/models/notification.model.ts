import { Schema, model, type InferSchemaType } from "mongoose";

export const NOTIFICATION_TYPES = ["NEW_COMMENT", "NEW_REPLY", "NEW_LIKE"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const notificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  actor: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true, immutable: true },
  message: { type: String, required: true, immutable: true, maxlength: 320, trim: true },
  post: { type: Schema.Types.ObjectId, ref: "Post", required: true, immutable: true },
  postSlug: { type: String, required: true, immutable: true, maxlength: 200, trim: true },
  comment: { type: Schema.Types.ObjectId, ref: "Comment", required: false, immutable: true },
  isRead: { type: Boolean, required: true, default: false }
}, { timestamps: true, strict: "throw" });

notificationSchema.index({ recipient: 1, createdAt: -1, _id: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1, actor: 1, post: 1, comment: 1 }, { unique: true });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & {
  _id: import("mongoose").Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Notification = model("Notification", notificationSchema);
