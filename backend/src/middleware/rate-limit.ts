import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
const handler = (_req: any, res: any) => res.status(429).json({ success: false, message: "Too many requests", error: { code: "RATE_LIMITED" }, requestId: _req.requestId });
export const authLimiter = rateLimit({ windowMs: env.AUTH_RATE_WINDOW_MS, limit: env.AUTH_RATE_MAX, standardHeaders: true, legacyHeaders: false, handler });
export const loginLimiter = rateLimit({ windowMs: env.LOGIN_RATE_WINDOW_MS, limit: env.LOGIN_RATE_MAX, standardHeaders: true, legacyHeaders: false, handler });
export const registerLimiter = rateLimit({ windowMs: env.REGISTER_RATE_WINDOW_MS, limit: env.REGISTER_RATE_MAX, standardHeaders: true, legacyHeaders: false, handler });
export const oauthLimiter = rateLimit({ windowMs: env.OAUTH_RATE_WINDOW_MS, limit: env.OAUTH_RATE_MAX, standardHeaders: true, legacyHeaders: false, handler });
