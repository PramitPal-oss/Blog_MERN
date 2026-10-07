import type { RequestHandler } from "express";
import type { Role } from "../constants/roles.js";
import { AppError } from "../utils/app-error.js";
export const authorizeRoles = (...roles: Role[]): RequestHandler => (req, _res, next) => req.auth && roles.includes(req.auth.role) ? next() : next(new AppError(403, "FORBIDDEN", "You do not have permission to perform this action"));
