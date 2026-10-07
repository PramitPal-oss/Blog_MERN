import type { RequestHandler } from "express";
import { logger } from "../config/logger.js";
export const activityLog: RequestHandler = (req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    if (!req.activity) return;
    logger.info({ timestamp: new Date().toISOString(), requestId: req.requestId, action: req.activity.action, actorId: req.auth?.userId ?? null, actorRole: req.auth?.role ?? null, resourceType: req.activity.resourceType ?? null, resourceId: req.activity.resourceId ?? null, statusCode: res.statusCode, outcome: res.statusCode < 400 ? "success" : "failure", durationMs: Date.now() - started }, "activity");
  });
  next();
};
