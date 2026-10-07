import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../utils/app-error.js";
import { logger } from "../config/logger.js";

export const notFound: RequestHandler = (req, _res, next) => next(new AppError(404, "ROUTE_NOT_FOUND", `Route ${req.method} ${req.path} was not found`));

export const errorHandler: ErrorRequestHandler = (error: any, req, res, _next) => {
  let appError = error instanceof AppError ? error : null;
  if (error?.code === 11000) appError = new AppError(409, error.keyPattern?.email ? "EMAIL_ALREADY_EXISTS" : "DUPLICATE_RESOURCE", "A resource with that value already exists");
  if (error instanceof SyntaxError && "body" in error) appError = new AppError(400, "INVALID_JSON", "Request body contains invalid JSON");
  if (!appError) {
    logger.error({ err: error, requestId: req.requestId }, "Unhandled request error");
    appError = new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred");
  }
  res.status(appError.statusCode).json({ success: false, message: appError.message, error: { code: appError.code, ...(appError.details ? { details: appError.details } : {}) }, requestId: req.requestId });
};
