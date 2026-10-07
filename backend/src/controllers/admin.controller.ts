import type { RequestHandler } from "express";
import { getStats } from "../services/admin.service.js";
import { listAdminPosts } from "../services/posts.service.js";
import { listAdminComments } from "../services/comments.service.js";
import { sendSuccess } from "../utils/responses.js";
const meta = (page: number, limit: number, total: number) => ({ page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0 });
export const stats: RequestHandler = async (_req, res) => sendSuccess(res, 200, "Dashboard statistics retrieved", await getStats());
export const posts: RequestHandler = async (req, res) => { const { page, limit, status } = req.validated!.query; const result = await listAdminPosts(page, limit, status); sendSuccess(res, 200, "Admin posts retrieved", result.items, meta(page, limit, result.total)); };
export const comments: RequestHandler = async (req, res) => { const { page, limit, postId } = req.validated!.query; const result = await listAdminComments(page, limit, postId); sendSuccess(res, 200, "Admin comments retrieved", result.items, meta(page, limit, result.total)); };
