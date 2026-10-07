import { Types } from "mongoose";
import { User } from "../models/user.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { AppError } from "../utils/app-error.js";
import { comparePassword, DUMMY_HASH, hashPassword } from "../utils/passwords.js";
import { sha256, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { env } from "../config/env.js";
import { userDto } from "../utils/serializers.js";

export type AuthResult = { user: ReturnType<typeof userDto>; accessToken: string; refreshToken: string; expiresIn: number };

export async function createSession(user: any): Promise<AuthResult> {
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000);
  const session = await RefreshSession.create({ user: user._id, currentTokenHash: sha256("pending"), authVersion: user.authVersion, expiresAt });
  const refreshToken = signRefreshToken(user._id.toString(), session._id.toString(), user.authVersion, env.JWT_REFRESH_TTL_SECONDS);
  session.currentTokenHash = sha256(refreshToken);
  await session.save();
  return { user: userDto(user), accessToken: signAccessToken(user._id.toString(), session._id.toString(), user.authVersion), refreshToken, expiresIn: env.JWT_ACCESS_TTL_SECONDS };
}

export async function register(input: { name: string; email: string; password: string }) {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await User.create({ name: input.name, email: input.email, passwordHash });
    return createSession(user.toObject());
  } catch (error: any) {
    if (error?.code === 11000) throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
    throw error;
  }
}

export async function login(input: { email: string; password: string }) {
  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  const valid = await comparePassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.isActive || !user.passwordHash) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  return createSession(user.toObject());
}

export async function rotateRefreshToken(token: string): Promise<AuthResult> {
  let payload;
  try { payload = verifyRefreshToken(token); } catch { throw new AppError(401, "SESSION_INVALID", "Refresh session is invalid or expired"); }
  if (payload.type !== "refresh" || !payload.sub || !payload.sid) throw new AppError(401, "SESSION_INVALID", "Refresh session is invalid");

  const session = await RefreshSession.findById(payload.sid).select("+currentTokenHash");
  const user = await User.findById(payload.sub).select("+passwordHash");
  if (!session || !user || !user.isActive || session.revokedAt || session.expiresAt <= new Date() || session.user.toString() !== user._id.toString() || payload.ver !== user.authVersion || session.authVersion !== user.authVersion) {
    throw new AppError(401, "SESSION_INVALID", "Refresh session is no longer valid");
  }
  if (session.currentTokenHash !== sha256(token)) {
    session.revokedAt = new Date();
    await session.save();
    throw new AppError(401, "REFRESH_TOKEN_REUSED", "Refresh token reuse was detected");
  }
  const remaining = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
  if (remaining <= 0) throw new AppError(401, "SESSION_INVALID", "Refresh session expired");
  const refreshToken = signRefreshToken(user._id.toString(), session._id.toString(), user.authVersion, remaining);
  const updated = await RefreshSession.findOneAndUpdate(
    { _id: session._id, currentTokenHash: sha256(token), revokedAt: null },
    { $set: { currentTokenHash: sha256(refreshToken) } }, { new: true }
  );
  if (!updated) {
    await RefreshSession.updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } });
    throw new AppError(401, "REFRESH_TOKEN_REUSED", "Refresh token reuse was detected");
  }
  return { user: userDto(user.toObject()), accessToken: signAccessToken(user._id.toString(), session._id.toString(), user.authVersion), refreshToken, expiresIn: env.JWT_ACCESS_TTL_SECONDS };
}

export async function logout(token?: string) {
  if (!token) return;
  try {
    const payload = verifyRefreshToken(token);
    if (payload.sid && Types.ObjectId.isValid(payload.sid)) await RefreshSession.updateOne({ _id: payload.sid }, { $set: { revokedAt: new Date() } });
  } catch { /* Logout is idempotent for absent/invalid cookies. */ }
}
