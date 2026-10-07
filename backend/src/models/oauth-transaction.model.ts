import { Schema, model } from "mongoose";

const oauthTransactionSchema = new Schema({
  stateHash: { type: String, required: true, unique: true },
  browserBindingHash: { type: String, required: true },
  provider: { type: String, enum: ["google", "facebook"], required: true },
  purpose: { type: String, enum: ["login", "link"], required: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  session: { type: Schema.Types.ObjectId, ref: "RefreshSession" },
  expiresAt: { type: Date, required: true }
}, { timestamps: true, strict: "throw" });
oauthTransactionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const OAuthTransaction = model("OAuthTransaction", oauthTransactionSchema);
