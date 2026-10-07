import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { notifyLike } from "./notification.service.js";

export async function likePost(postId: string, userId: string) {
  const post = await Post.findOneAndUpdate(
    { _id: postId, deletedAt: null },
    { $addToSet: { likedBy: userId } },
    { new: true }
  ).lean();
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post was not found");
  
  const user = await User.findById(userId).lean();
  if (user) {
    notifyLike({
      recipientId: post.author.toString(),
      actorId: userId,
      actorName: user.name,
      postTitle: post.title,
      postSlug: post.slug,
      postId: post._id.toString()
    }).catch(console.error);
  }

  return { id: post._id.toString(), likeCount: post.likedBy?.length ?? 0, likedByMe: true };
}
export async function unlikePost(postId: string, userId: string) {
  const post = await Post.findOneAndUpdate(
    { _id: postId, deletedAt: null },
    { $pull: { likedBy: userId } },
    { new: true }
  ).lean();
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post was not found");
  return { id: post._id.toString(), likeCount: post.likedBy?.length ?? 0, likedByMe: false };
}

export async function likeComment(commentId: string, userId: string) {
  const comment = await Comment.findOne({ _id: commentId, deletedAt: null }).populate("post").lean();
  if (!comment || (comment.post as any)?.deletedAt) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment was not found");
  
  const updated = await Comment.findByIdAndUpdate(
    commentId,
    { $addToSet: { likedBy: userId } },
    { new: true }
  ).lean();
  
  const user = await User.findById(userId).lean();
  if (user && comment.post) {
    notifyLike({
      recipientId: comment.author.toString(),
      actorId: userId,
      actorName: user.name,
      postTitle: (comment.post as any).title,
      postSlug: (comment.post as any).slug,
      postId: (comment.post as any)._id.toString(),
      commentId: updated!._id.toString()
    }).catch(console.error);
  }

  return { id: updated!._id.toString(), likeCount: updated!.likedBy?.length ?? 0, likedByMe: true };
}

export async function unlikeComment(commentId: string, userId: string) {
  const comment = await Comment.findOne({ _id: commentId, deletedAt: null }).populate("post", "deletedAt").lean();
  if (!comment || (comment.post as any)?.deletedAt) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment was not found");
  
  const updated = await Comment.findByIdAndUpdate(
    commentId,
    { $pull: { likedBy: userId } },
    { new: true }
  ).lean();
  return { id: updated!._id.toString(), likeCount: updated!.likedBy?.length ?? 0, likedByMe: false };
}
