import type { RequestHandler } from "express";
import * as service from "../services/notification.service.js";
import { sendSuccess } from "../utils/responses.js";

const meta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: total ? Math.ceil(total / limit) : 0
});

export const list: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { page, limit } = req.validated!.query;
  const result = await service.listNotifications(req.auth!.userId, page, limit);
  sendSuccess(
    res,
    200,
    "Notifications retrieved",
    { items: result.items, unreadCount: result.unreadCount },
    meta(page, limit, result.total)
  );
};

export const readOne: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const item = await service.markNotificationAsRead(req.validated!.params.id, req.auth!.userId);
  sendSuccess(res, 200, "Notification marked as read", item);
};

export const readAll: RequestHandler = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const result = await service.markAllNotificationsAsRead(req.auth!.userId);
  sendSuccess(res, 200, "Notifications marked as read", result);
};
