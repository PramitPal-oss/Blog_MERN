import { Types } from "mongoose";
import { Notification } from "../models/notification.model.js";
import { AppError } from "../utils/app-error.js";
import { notificationDto } from "../utils/serializers.js";
import { logger } from "../config/logger.js";
import { publishNotification, emitNotificationsChanged } from "../socket/socket.server.js";

export async function listNotifications(recipientId: string, page: number, limit: number) {
  const recipientObjectId = new Types.ObjectId(recipientId);
  const [facetResult] = await Notification.aggregate([
    { $match: { recipient: recipientObjectId } },
    {
      $facet: {
        items: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ],
        total: [{ $count: "count" }],
        unreadCount: [
          { $match: { isRead: false } },
          { $count: "count" }
        ]
      }
    }
  ]);

  const rawItems = facetResult?.items ?? [];
  const total = facetResult?.total?.[0]?.count ?? 0;
  const unreadCount = facetResult?.unreadCount?.[0]?.count ?? 0;

  return {
    items: rawItems.map((item: any) => notificationDto(item)),
    total,
    unreadCount
  };
}

export async function markNotificationAsRead(id: string, recipientId: string) {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: recipientId },
    { $set: { isRead: true } },
    { new: true }
  ).lean();

  if (!notification) {
    throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification was not found");
  }

  try {
    await emitNotificationsChanged(recipientId);
  } catch (err) {
    logger.error({ recipientId, err }, "Failed to emit notifications:changed");
  }

  return notificationDto(notification);
}

export async function markAllNotificationsAsRead(recipientId: string) {
  const cutoff = new Date();
  const result = await Notification.updateMany(
    { recipient: recipientId, isRead: false, createdAt: { $lte: cutoff } },
    { $set: { isRead: true } }
  );

  if (result.modifiedCount > 0) {
    try {
      await emitNotificationsChanged(recipientId);
    } catch (err) {
      logger.error({ recipientId, err }, "Failed to emit notifications:changed");
    }
  }

  return { modifiedCount: result.modifiedCount };
}

export async function notifyCommentCreated(params: {
  recipientId: string;
  actorId: string;
  actorName: string;
  postTitle: string;
  postSlug: string;
  postId: string;
  commentId: string;
}) {
  const { recipientId, actorId, actorName, postTitle, postSlug, postId, commentId } = params;
  if (recipientId === actorId) {
    return null;
  }

  const message = `${actorName} commented on "${postTitle}"`.slice(0, 320);

  let notification: any;
  try {
    notification = await Notification.create({
      recipient: recipientId,
      actor: actorId,
      type: "NEW_COMMENT",
      message,
      post: postId,
      postSlug: postSlug.slice(0, 200),
      comment: commentId,
      isRead: false
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await Notification.findOne({
        recipient: recipientId,
        type: "NEW_COMMENT",
        comment: commentId
      }).lean();
      return existing ? notificationDto(existing) : null;
    }
    logger.error(
      { recipientId, postId, commentId, err: error instanceof Error ? error.message : "Persistence failure" },
      "Notification write failed; preserving comment success"
    );
    return null;
  }

  const dto = notificationDto(notification);
  try {
    await publishNotification(recipientId, dto);
  } catch (error) {
    logger.error(
      { recipientId, postId, commentId, err: error instanceof Error ? error.message : "Publish failure" },
      "Notification emission failed; retained in database for REST recovery"
    );
  }

  return dto;
}

export async function notifyReplyCreated(params: {
  recipientId: string;
  actorId: string;
  actorName: string;
  postTitle: string;
  postSlug: string;
  postId: string;
  commentId: string;
}) {
  const { recipientId, actorId, actorName, postTitle, postSlug, postId, commentId } = params;
  if (recipientId === actorId) {
    return null;
  }

  const message = `${actorName} replied to your comment on "${postTitle}"`.slice(0, 320);

  let notification: any;
  try {
    notification = await Notification.create({
      recipient: recipientId,
      actor: actorId,
      type: "NEW_REPLY",
      message,
      post: postId,
      postSlug: postSlug.slice(0, 200),
      comment: commentId,
      isRead: false
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await Notification.findOne({
        recipient: recipientId,
        type: "NEW_REPLY",
        comment: commentId
      }).lean();
      return existing ? notificationDto(existing) : null;
    }
    logger.error(
      { recipientId, postId, commentId, err: error instanceof Error ? error.message : "Persistence failure" },
      "Notification write failed; preserving reply success"
    );
    return null;
  }

  const dto = notificationDto(notification);
  try {
    await publishNotification(recipientId, dto);
  } catch (error) {
    logger.error(
      { recipientId, postId, commentId, err: error instanceof Error ? error.message : "Publish failure" },
      "Notification emission failed; retained in database for REST recovery"
    );
  }

  return dto;
}

export async function notifyLike(params: {
  recipientId: string;
  actorId: string;
  actorName: string;
  postTitle: string;
  postSlug: string;
  postId: string;
  commentId?: string;
}) {
  const { recipientId, actorId, actorName, postTitle, postSlug, postId, commentId } = params;
  if (recipientId === actorId) {
    return null;
  }

  const target = commentId ? "your comment" : "your post";
  const message = `${actorName} liked ${target} on "${postTitle}"`.slice(0, 320);

  let notification: any;
  try {
    notification = await Notification.create({
      recipient: recipientId,
      actor: actorId,
      type: "NEW_LIKE",
      message,
      post: postId,
      postSlug: postSlug.slice(0, 200),
      comment: commentId || undefined,
      isRead: false
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await Notification.findOne({
        recipient: recipientId,
        type: "NEW_LIKE",
        actor: actorId,
        post: postId,
        comment: commentId || null
      }).lean();
      return existing ? notificationDto(existing) : null;
    }
    logger.error(
      { recipientId, postId, commentId, err: error instanceof Error ? error.message : "Persistence failure" },
      "Notification write failed; preserving like success"
    );
    return null;
  }

  const dto = notificationDto(notification);
  try {
    await publishNotification(recipientId, dto);
  } catch (error) {
    logger.error(
      { recipientId, postId, commentId, err: error instanceof Error ? error.message : "Publish failure" },
      "Notification emission failed; retained in database for REST recovery"
    );
  }

  return dto;
}
