import { User } from "../models/user.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/tokens.js";
import type { Role } from "../constants/roles.js";

export interface AuthenticatedIdentity {
  userId: string;
  sessionId: string;
  role: Role;
  authVersion: number;
}

export interface ValidatedSession {
  identity: AuthenticatedIdentity;
  expiresAt: Date;
}

export async function validateAccessToken(token: string): Promise<ValidatedSession> {
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch (error: any) {
    if (error?.name === "TokenExpiredError") {
      throw new AppError(401, "ACCESS_TOKEN_EXPIRED", "Access token expired");
    }
    throw new AppError(401, "UNAUTHENTICATED", "Invalid access token");
  }

  if (payload.type !== "access" || !payload.sub || !payload.sid) {
    throw new AppError(401, "UNAUTHENTICATED", "Invalid access token");
  }

  const [user, session] = await Promise.all([
    User.findById(payload.sub).lean(),
    RefreshSession.findById(payload.sid).lean()
  ]);

  if (
    !user?.isActive ||
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.toString() !== user._id.toString() ||
    payload.ver !== user.authVersion ||
    session.authVersion !== user.authVersion
  ) {
    throw new AppError(401, "SESSION_INVALID", "Session is no longer valid");
  }

  const expiresAt = payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 900 * 1000);

  return {
    identity: {
      userId: user._id.toString(),
      sessionId: session._id.toString(),
      role: user.role,
      authVersion: user.authVersion
    },
    expiresAt
  };
}

export async function validateSessionRecord(
  userId: string,
  sessionId: string,
  authVersion: number
): Promise<boolean> {
  const [user, session] = await Promise.all([
    User.findById(userId).lean(),
    RefreshSession.findById(sessionId).lean()
  ]);

  if (
    !user?.isActive ||
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.toString() !== user._id.toString() ||
    user.authVersion !== authVersion ||
    session.authVersion !== authVersion
  ) {
    return false;
  }

  return true;
}
