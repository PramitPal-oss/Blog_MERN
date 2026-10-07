import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
export const trustedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.get("origin");
  if (!origin || origin !== env.FRONTEND_URL) return next(new AppError(403, "UNTRUSTED_ORIGIN", "Request origin is not allowed"));
  next();
};
