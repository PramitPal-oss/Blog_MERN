import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/app-error.js";

export const validate = (schemas: { body?: ZodType; query?: ZodType; params?: ZodType }): RequestHandler => (req, _res, next) => {
  const validated: Record<string, unknown> = {};
  for (const key of ["body", "query", "params"] as const) {
    const schema = schemas[key];
    if (!schema) continue;
    const result = schema.safeParse(req[key]);
    if (!result.success) return next(new AppError(400, "VALIDATION_ERROR", "Validation failed", result.error.issues.map(issue => ({ field: issue.path.join(".") || key, message: issue.message }))));
    validated[key] = result.data;
  }
  req.validated = validated;
  next();
};
