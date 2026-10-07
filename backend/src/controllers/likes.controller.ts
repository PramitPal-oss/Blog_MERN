import type { RequestHandler } from "express";
import * as service from "../services/likes.service.js";
import { sendSuccess } from "../utils/responses.js";

export const likePost: RequestHandler = async (req, res) => sendSuccess(res, 200, "Post liked", await service.likePost(req.validated!.params.id, req.auth!.userId));
export const unlikePost: RequestHandler = async (req, res) => sendSuccess(res, 200, "Post unliked", await service.unlikePost(req.validated!.params.id, req.auth!.userId));
export const likeComment: RequestHandler = async (req, res) => sendSuccess(res, 200, "Comment liked", await service.likeComment(req.validated!.params.id, req.auth!.userId));
export const unlikeComment: RequestHandler = async (req, res) => sendSuccess(res, 200, "Comment unliked", await service.unlikeComment(req.validated!.params.id, req.auth!.userId));
