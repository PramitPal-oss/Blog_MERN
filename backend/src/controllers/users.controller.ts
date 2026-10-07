import type { RequestHandler } from "express";
import * as service from "../services/users.service.js";
import { sendSuccess } from "../utils/responses.js";
const meta = (page: number, limit: number, total: number) => ({ page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0 });
export const list: RequestHandler = async (req, res) => { const { page, limit } = req.validated!.query; const result = await service.listUsers(page, limit); sendSuccess(res, 200, "Users retrieved", result.items, meta(page, limit, result.total)); };
export const get: RequestHandler = async (req, res) => sendSuccess(res, 200, "User retrieved", await service.getUser(req.validated!.params.id));
export const create: RequestHandler = async (req, res) => { req.activity = { action: "ADMIN_USER_CREATE", resourceType: "user" }; sendSuccess(res, 201, "User created", await service.createUser(req.validated!.body)); };
export const update: RequestHandler = async (req, res) => { req.activity = { action: "ADMIN_USER_UPDATE", resourceType: "user", resourceId: req.validated!.params.id }; sendSuccess(res, 200, "User updated", await service.updateUser(req.validated!.params.id, req.auth!.userId, req.validated!.body)); };
export const remove: RequestHandler = async (req, res) => { req.activity = { action: "ADMIN_USER_DEACTIVATE", resourceType: "user", resourceId: req.validated!.params.id }; const user = await service.deactivateUser(req.validated!.params.id, req.auth!.userId); sendSuccess(res, 200, "User deactivated", { id: user.id, isActive: user.isActive }); };
