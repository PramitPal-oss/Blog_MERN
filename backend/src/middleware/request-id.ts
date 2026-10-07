import crypto from "node:crypto";
import type { RequestHandler } from "express";
export const requestId: RequestHandler = (req, res, next) => { req.requestId = crypto.randomUUID(); res.setHeader("X-Request-Id", req.requestId); next(); };
