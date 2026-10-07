import type { Response } from "express";

export const sendSuccess = (res: Response, status: number, message: string, data: unknown, meta: unknown = null) =>
  res.status(status).json({ success: true, message, data, meta });
