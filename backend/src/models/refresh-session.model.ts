import { Schema, model } from "mongoose";

const refreshSessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  currentTokenHash: { type: String, required: true, select: false },
  authVersion: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null }
}, { timestamps: true, strict: "throw" });
refreshSessionSchema.index({ user: 1 });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RefreshSession = model("RefreshSession", refreshSessionSchema);
