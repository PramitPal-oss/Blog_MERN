import { Types } from "mongoose";
import { OAuthTransaction } from "../models/oauth-transaction.model.js";
import { User } from "../models/user.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { AppError } from "../utils/app-error.js";
import { randomToken, sha256 } from "../utils/tokens.js";
import { createSession } from "./auth.service.js";
import type { ProviderProfile } from "../config/passport.js";

export async function createOAuthTransaction(provider: "google" | "facebook", purpose: "login" | "link", userId?: string, sessionId?: string) {
  const state = randomToken();
  const binding = randomToken();
  await OAuthTransaction.create({ stateHash: sha256(state), browserBindingHash: sha256(binding), provider, purpose, ...(userId ? { user: userId, session: sessionId } : {}), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  return { state, binding };
}

export async function consumeOAuthTransaction(state: string, binding: string, provider: "google" | "facebook") {
  const transaction = await OAuthTransaction.findOneAndDelete({ stateHash: sha256(state), browserBindingHash: sha256(binding), provider, expiresAt: { $gt: new Date() } }).lean();
  if (!transaction) throw new AppError(401, "OAUTH_STATE_INVALID", "OAuth request is invalid or expired");
  return transaction;
}

export async function resolveOAuth(profile: ProviderProfile, transaction: any) {
  const providerField = profile.provider === "google" ? "googleId" : "facebookId";
  if (transaction.purpose === "link") {
    const session = await RefreshSession.findOne({ _id: transaction.session, user: transaction.user, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
    const owner = await User.findById(transaction.user).lean();
    if (!session || !owner?.isActive || session.authVersion !== owner.authVersion) throw new AppError(401, "SESSION_INVALID", "Linking session is no longer valid");
    const conflict = await User.exists({ [providerField]: profile.providerId, _id: { $ne: owner._id } });
    if (conflict) throw new AppError(409, "OAUTH_IDENTITY_IN_USE", "This social identity belongs to another account");
    await User.updateOne({ _id: owner._id }, { $set: { [providerField]: profile.providerId } });
    return { purpose: "link" as const };
  }
  let user = await User.findOne({ [providerField]: profile.providerId }).select("+passwordHash");
  if (!user && profile.email) {
    const matching = await User.exists({ email: profile.email });
    if (matching) throw new AppError(409, "OAUTH_ACCOUNT_EXISTS", "Sign in to the existing account and link this provider");
  }
  if (!user) {
    const data: any = { name: profile.name, [providerField]: profile.providerId };
    if (profile.email) data.email = profile.email;
    user = await User.create(data);
  }
  if (!user.isActive) throw new AppError(401, "SESSION_INVALID", "Account is inactive");
  return { purpose: "login" as const, auth: await createSession(user.toObject()) };
}
