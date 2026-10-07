import type { RequestHandler } from "express";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { AppError } from "../utils/app-error.js";

export const requirePostOwnershipOrAdmin: RequestHandler = async (req, res, next) => {
  const id = req.validated?.params?.id ?? req.params.id;
  const post = await Post.findOne({ _id: id, deletedAt: null }).lean();
  if (!post) return next(new AppError(404, "POST_NOT_FOUND", "Post was not found"));
  if (req.auth?.role !== "ADMIN" && post.author.toString() !== req.auth?.userId) return next(new AppError(403, "FORBIDDEN", "You do not own this post"));
  res.locals.post = post;
  next();
};

export const requireCommentOwnershipOrAdmin: RequestHandler = async (req, res, next) => {
  const id = req.validated?.params?.id ?? req.params.id;
  const comment = await Comment.findById(id).lean();
  if (!comment) return next(new AppError(404, "COMMENT_NOT_FOUND", "Comment was not found"));
  if (req.auth?.role !== "ADMIN" && comment.author.toString() !== req.auth?.userId) return next(new AppError(403, "FORBIDDEN", "You do not own this comment"));
  res.locals.comment = comment;
  next();
};
