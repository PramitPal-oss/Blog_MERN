import { Schema, model, type InferSchemaType } from "mongoose";

const postSchema = new Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
  content: { type: String, required: true, trim: true, minlength: 1, maxlength: 50000 },
  slug: { type: String, required: true, lowercase: true, maxlength: 200, unique: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  deletedAt: { type: Date, default: null },
  likedBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] }
}, { timestamps: true, strict: "throw" });

postSchema.index({ deletedAt: 1, createdAt: -1, _id: -1 });
postSchema.index({ author: 1, deletedAt: 1, createdAt: -1, _id: -1 });
export type PostDocument = InferSchemaType<typeof postSchema> & { _id: import("mongoose").Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Post = model("Post", postSchema);
