import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error.js";
import { validateAccessToken } from "../services/access-session.service.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    const { identity } = await validateAccessToken(header.slice(7));
    req.auth = identity;
    next();
  } catch (error: any) {
    if (error instanceof AppError) return next(error);
    const code = error?.name === "TokenExpiredError" ? "ACCESS_TOKEN_EXPIRED" : "UNAUTHENTICATED";
    next(new AppError(401, code, code === "ACCESS_TOKEN_EXPIRED" ? "Access token expired" : "Invalid access token"));
  }
};

export const optionalAuthenticate: RequestHandler = (req, res, next) => {
  if (!req.get("authorization")) return next();
  return authenticate(req, res, next);
};
