import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { AppError } from "../utils/app-error.js";
import { commentDto } from "../utils/serializers.js";
import { notifyCommentCreated, notifyReplyCreated } from "./notification.service.js";

async function requireActivePost(postId: string) {
  const post = await Post.exists({ _id: postId, deletedAt: null });
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post was not found");
}

export async function listComments(postId: string, page: number, limit: number, view = "flat", viewerId?: string) {
  await requireActivePost(postId);
  const filter: any = { post: postId };
  if (view === "threads") {
    filter.parentComment = null;
  } else {
    filter.deletedAt = null;
  }
  
  const [items, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).populate("author", "name").lean(),
    Comment.countDocuments(filter)
  ]);

  if (view === "threads" && items.length > 0) {
    const rootIds = items.map(i => i._id);
    const replyCounts = await Comment.aggregate([
      { $match: { parentComment: { $in: rootIds }, deletedAt: null } },
      { $group: { _id: "$parentComment", count: { $sum: 1 } } }
    ]);
    const countMap = new Map(replyCounts.map(r => [r._id.toString(), r.count]));
    items.forEach(item => {
      (item as any).replyCount = countMap.get(item._id.toString()) || 0;
    });
  }

  return { items: items.map(item => commentDto(item, false, viewerId)), total };
}

export async function createComment(postId: string, userId: string, content: string) {
  const post = await Post.findOne({ _id: postId, deletedAt: null }).select("author title slug").lean();
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post was not found");

  const created = await Comment.create({ post: postId, author: userId, content });
  const comment = await Comment.findById(created._id).populate("author", "name").lean();
  const dto = commentDto(comment);

  const actorName = (comment?.author as any)?.name ?? "Someone";
  try {
    await notifyCommentCreated({
      recipientId: post.author.toString(),
      actorId: userId,
      actorName,
      postTitle: post.title,
      postSlug: post.slug,
      postId: post._id.toString(),
      commentId: created._id.toString()
    });
  } catch {}

  return dto;
}

export async function listReplies(commentId: string, page: number, limit: number, viewerId?: string) {
  const filter = { parentComment: commentId, deletedAt: null };
  const [items, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).populate("author", "name").lean(),
    Comment.countDocuments(filter)
  ]);
  return { items: items.map(item => commentDto(item, false, viewerId)), total };
}

export async function createReply(commentId: string, userId: string, content: string) {
  const parent = await Comment.findOne({ _id: commentId, deletedAt: null, parentComment: null }).populate("post", "author title slug deletedAt").lean();
  if (!parent || (parent.post as any)?.deletedAt) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment was not found");

  const post = parent.post as any;
  const created = await Comment.create({ post: post._id, author: userId, content, parentComment: commentId });
  const comment = await Comment.findById(created._id).populate("author", "name").lean();
  const dto = commentDto(comment);

  const actorName = (comment?.author as any)?.name ?? "Someone";
  try {
    await notifyReplyCreated({
      recipientId: parent.author.toString(),
      actorId: userId,
      actorName,
      postTitle: post.title,
      postSlug: post.slug,
      postId: post._id.toString(),
      commentId: created._id.toString()
    });
  } catch {}

  return dto;
}

export async function getComment(id: string, isAdmin: boolean, viewerId?: string) {
  const comment = await Comment.findById(id).populate("author", "name").populate("post", "title slug deletedAt").lean();
  if (!comment || (!isAdmin && (comment.post as any)?.deletedAt)) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment was not found");
  return commentDto(comment, isAdmin, viewerId);
}

export async function updateComment(id: string, content: string, isAdmin: boolean) {
  const existing = await Comment.findOne({ _id: id, deletedAt: null }).lean();
  if (!existing) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment was not found");
  if (!isAdmin) await requireActivePost(existing.post.toString());
  const comment = await Comment.findByIdAndUpdate(id, { $set: { content } }, { new: true, runValidators: true }).populate("author", "name").lean();
  return commentDto(comment);
}

export async function deleteComment(id: string, isAdmin: boolean) {
  const existing = await Comment.findOne({ _id: id, deletedAt: null }).lean();
  if (!existing) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment was not found");
  if (!isAdmin) await requireActivePost(existing.post.toString());
  
  await Comment.updateOne({ _id: id }, { $set: { deletedAt: new Date(), content: "[deleted]", likedBy: [] } });
  return { id };
}

export async function listAdminComments(page: number, limit: number, postId?: string) {
  const filter = postId ? { post: postId } : {};
  const [items, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate("author", "name").populate("post", "title slug deletedAt").lean(),
    Comment.countDocuments(filter)
  ]);
  return { items: items.map(item => commentDto(item, true)), total };
}
