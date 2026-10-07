import { Schema, model, type InferSchemaType } from "mongoose";
import { ROLES } from "../constants/roles.js";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, select: false },
  googleId: { type: String },
  facebookId: { type: String },
  role: { type: String, enum: ROLES, default: "USER", required: true },
  isActive: { type: Boolean, default: true, required: true },
  authVersion: { type: Number, default: 0, min: 0, required: true },
  isProtectedAdmin: { type: Boolean, default: false, required: true }
}, { timestamps: true, strict: "throw" });

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
userSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } });
userSchema.index({ facebookId: 1 }, { unique: true, partialFilterExpression: { facebookId: { $type: "string" } } });
userSchema.index({ createdAt: -1, _id: -1 });
userSchema.index({ isProtectedAdmin: 1 }, { unique: true, partialFilterExpression: { isProtectedAdmin: true } });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: import("mongoose").Types.ObjectId; createdAt: Date; updatedAt: Date };
export const User = model("User", userSchema);
