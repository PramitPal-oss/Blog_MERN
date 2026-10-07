const id = (value: unknown) => String(value ?? "");
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();

export function userDto(user: any) {
  return {
    id: id(user._id), name: user.name, email: user.email ?? null, role: user.role, isActive: user.isActive,
    providers: [user.googleId ? "google" : null, user.facebookId ? "facebook" : null].filter(Boolean),
    hasPassword: Boolean(user.passwordHash), isProtectedAdmin: Boolean(user.isProtectedAdmin),
    createdAt: iso(user.createdAt), updatedAt: iso(user.updatedAt)
  };
}

export function authorDto(author: any) {
  if (author && typeof author === "object" && author.name) return { id: id(author._id), name: author.name };
  return { id: id(author), name: "Unknown user" };
}

export function postDto(post: any, summary = false, admin = false, viewerId?: string) {
  const value: any = { id: id(post._id), title: post.title, slug: post.slug, author: authorDto(post.author), createdAt: iso(post.createdAt), updatedAt: iso(post.updatedAt) };
  if (summary) value.excerpt = Array.from(post.content).slice(0, 200).join(""); else value.content = post.content;
  if (admin) value.deletedAt = post.deletedAt ? iso(post.deletedAt) : null;
  value.likeCount = post.likedBy?.length ?? 0;
  value.likedByMe = viewerId ? (post.likedBy || []).some((u: any) => id(u) === viewerId) : false;
  if (!summary && post.commentCount !== undefined) value.commentCount = post.commentCount;
  return value;
}

export function commentDto(comment: any, admin = false, viewerId?: string) {
  const isDeleted = Boolean(comment.deletedAt);
  const value: any = { 
    id: id(comment._id), 
    content: isDeleted ? "[deleted]" : comment.content, 
    postId: id(comment.post?._id ?? comment.post), 
    author: isDeleted ? null : authorDto(comment.author), 
    createdAt: iso(comment.createdAt), 
    updatedAt: iso(comment.updatedAt) 
  };
  if (admin && comment.post && typeof comment.post === "object") value.post = { id: id(comment.post._id), title: comment.post.title, slug: comment.post.slug, deletedAt: comment.post.deletedAt ? iso(comment.post.deletedAt) : null };
  value.parentCommentId = comment.parentComment ? id(comment.parentComment) : null;
  value.deletedAt = isDeleted ? iso(comment.deletedAt) : null;
  value.likeCount = comment.likedBy?.length ?? 0;
  value.likedByMe = viewerId ? (comment.likedBy || []).some((u: any) => id(u) === viewerId) : false;
  if (comment.replyCount !== undefined) value.replyCount = comment.replyCount;
  return value;
}

export function notificationDto(notification: any) {
  return {
    id: id(notification._id),
    actorId: id(notification.actor?._id ?? notification.actor),
    type: notification.type,
    message: notification.message,
    postId: id(notification.post?._id ?? notification.post),
    postSlug: notification.postSlug,
    commentId: id(notification.comment?._id ?? notification.comment),
    isRead: Boolean(notification.isRead),
    createdAt: iso(notification.createdAt),
    updatedAt: iso(notification.updatedAt)
  };
}
