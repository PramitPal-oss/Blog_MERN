import { Types } from "mongoose";
import { Post } from "../models/post.model.js";
import { AppError } from "../utils/app-error.js";
import { slugBase } from "../utils/slug.js";
import { postDto } from "../utils/serializers.js";

import { Comment } from "../models/comment.model.js";

export async function listPosts(page: number, limit: number, authorId?: string, viewerId?: string) {
  const filter: any = { deletedAt: null };
  if (authorId) filter.author = authorId;
  const [items, total] = await Promise.all([
    Post.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate("author", "name").lean(),
    Post.countDocuments(filter)
  ]);
  return { items: items.map(item => postDto(item, true, false, viewerId)), total };
}

export async function getPost(identifier: string, bySlug = false, viewerId?: string) {
  const filter = bySlug ? { slug: identifier, deletedAt: null } : { _id: identifier, deletedAt: null };
  const post = await Post.findOne(filter).populate("author", "name").lean();
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post was not found");
  
  const commentCount = await Comment.countDocuments({ post: post._id, deletedAt: null });
  (post as any).commentCount = commentCount;

  return postDto(post, false, false, viewerId);
}

export async function createPost(userId: string, input: { title: string; content: string }) {
  const _id = new Types.ObjectId();
  const post = await Post.create({ _id, title: input.title, content: input.content, slug: `${slugBase(input.title)}-${_id.toString()}`, author: userId });
  const populated = await Post.findById(post._id).populate("author", "name").lean();
  return postDto(populated);
}

export async function updatePost(id: string, input: { title?: string; content?: string }) {
  const post = await Post.findOneAndUpdate({ _id: id, deletedAt: null }, { $set: input }, { new: true, runValidators: true }).populate("author", "name").lean();
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post was not found");
  return postDto(post);
}

export async function deletePost(id: string) {
  const post = await Post.findOneAndUpdate({ _id: id, deletedAt: null }, { $set: { deletedAt: new Date() } }, { new: true }).lean();
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post was not found");
  return { id: post._id.toString(), deletedAt: post.deletedAt!.toISOString() };
}

export async function listAdminPosts(page: number, limit: number, status: "active" | "deleted" | "all") {
  const filter = status === "all" ? {} : status === "deleted" ? { deletedAt: { $ne: null } } : { deletedAt: null };
  const [items, total] = await Promise.all([
    Post.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate("author", "name").lean(),
    Post.countDocuments(filter)
  ]);
  return { items: items.map(item => postDto(item, true, true)), total };
}
