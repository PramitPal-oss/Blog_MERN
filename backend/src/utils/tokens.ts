import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";

export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("base64url");

type TokenPayload = JwtPayload & { sub: string; sid: string; ver: number; type: "access" | "refresh"; jti?: string };

export function signAccessToken(userId: string, sessionId: string, version: number) {
  return jwt.sign({ sid: sessionId, ver: version, type: "access" }, env.JWT_ACCESS_SECRET, {
    subject: userId, algorithm: "HS256", issuer: env.JWT_ISSUER, audience: env.JWT_ACCESS_AUDIENCE,
    expiresIn: env.JWT_ACCESS_TTL_SECONDS
  });
}

export function signRefreshToken(userId: string, sessionId: string, version: number, expiresIn: number) {
  return jwt.sign({ sid: sessionId, ver: version, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    subject: userId, jwtid: crypto.randomUUID(), algorithm: "HS256", issuer: env.JWT_ISSUER,
    audience: env.JWT_REFRESH_AUDIENCE, expiresIn
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"], issuer: env.JWT_ISSUER, audience: env.JWT_ACCESS_AUDIENCE }) as TokenPayload;
}
export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"], issuer: env.JWT_ISSUER, audience: env.JWT_REFRESH_AUDIENCE }) as TokenPayload;
}
