import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app.js";
import { User } from "../../models/user.model.js";
import { Post } from "../../models/post.model.js";
import { Comment } from "../../models/comment.model.js";
import { Notification } from "../../models/notification.model.js";
import { hashPassword } from "../../utils/passwords.js";
import { notificationDto } from "../../utils/serializers.js";
import * as notificationService from "../../services/notification.service.js";
import * as socketServer from "../../socket/socket.server.js";

const origin = "http://localhost:5173";
const mutate = (req: request.Test) => req.set("Origin", origin).set("Content-Type", "application/json");

async function register(email: string, name: string) {
  const response = await mutate(request(app).post("/api/v1/auth/register")).send({
    name,
    email,
    password: "StrongPass!123"
  });
  return { token: response.body.data.accessToken as string, user: response.body.data.user };
}

async function admin() {
  await User.create({
    name: "Admin",
    email: "admin@example.test",
    passwordHash: await hashPassword("StrongPass!123"),
    role: "ADMIN",
    isProtectedAdmin: true
  });
  const response = await mutate(request(app).post("/api/v1/auth/login")).send({
    email: "admin@example.test",
    password: "StrongPass!123"
  });
  return { token: response.body.data.accessToken as string, user: response.body.data.user };
}

describe("notification service and REST endpoints", () => {
  it("creates a notification when a user comments on another user's post", async () => {
    const userA = await register("alice@example.test", "Alice");
    const userB = await register("bob@example.test", "Bob");

    // Bob creates a post
    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Bob's Post", content: "Great story here" });
    const postId = postRes.body.data.id;

    // Alice comments on Bob's post
    const commentRes = await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "Nice post Bob!" });
    expect(commentRes.status).toBe(201);
    const commentId = commentRes.body.data.id;

    // Check Bob's notifications
    const bNotifs = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userB.token}`);
    expect(bNotifs.status).toBe(200);
    expect(bNotifs.headers["cache-control"]).toBe("no-store");
    expect(bNotifs.body.data.unreadCount).toBe(1);
    expect(bNotifs.body.data.items).toHaveLength(1);

    const notif = bNotifs.body.data.items[0];
    expect(notif.actorId).toBe(userA.user.id);
    expect(notif.postId).toBe(postId);
    expect(notif.commentId).toBe(commentId);
    expect(notif.isRead).toBe(false);
    expect(notif.message).toBe('Alice commented on "Bob\'s Post"');

    // Alice has 0 notifications
    const aNotifs = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userA.token}`);
    expect(aNotifs.body.data.unreadCount).toBe(0);
    expect(aNotifs.body.data.items).toHaveLength(0);
  });

  it("does not create a notification for self-comments", async () => {
    const userB = await register("bob2@example.test", "Bob");
    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Bob's Solo Post", content: "Solitary thoughts" });
    const postId = postRes.body.data.id;

    // Bob comments on his own post
    const commentRes = await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ content: "Replying to myself" });
    expect(commentRes.status).toBe(201);

    const bNotifs = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userB.token}`);
    expect(bNotifs.body.data.unreadCount).toBe(0);
    expect(bNotifs.body.data.items).toHaveLength(0);
  });

  it("handles duplicate notifications idempotently without re-emitting or creating duplicates", async () => {
    const userA = await register("alice3@example.test", "Alice");
    const userB = await register("bob3@example.test", "Bob");

    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Idempotent Post", content: "Content" });
    const postId = postRes.body.data.id;

    const commentRes = await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "First comment" });
    const commentId = commentRes.body.data.id;

    // Directly call notifyCommentCreated again with the same comment ID
    const duplicateResult = await notificationService.notifyCommentCreated({
      recipientId: userB.user.id,
      actorId: userA.user.id,
      actorName: "Alice",
      postTitle: "Idempotent Post",
      postSlug: "idempotent-post",
      postId,
      commentId
    });

    expect(duplicateResult).not.toBeNull();
    const count = await Notification.countDocuments({ comment: commentId });
    expect(count).toBe(1);
  });

  it("supports pagination and global unread count", async () => {
    const userA = await register("alice4@example.test", "Alice");
    const userB = await register("bob4@example.test", "Bob");

    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Paging Post", content: "Content" });
    const postId = postRes.body.data.id;

    // Create 3 comments
    for (let i = 1; i <= 3; i++) {
      await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ content: `Comment ${i}` });
    }

    const page1 = await request(app)
      .get("/api/v1/notifications?page=1&limit=2")
      .set("Authorization", `Bearer ${userB.token}`);
    expect(page1.status).toBe(200);
    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.unreadCount).toBe(3);
    expect(page1.body.meta.total).toBe(3);
    expect(page1.body.meta.totalPages).toBe(2);

    const page2 = await request(app)
      .get("/api/v1/notifications?page=2&limit=2")
      .set("Authorization", `Bearer ${userB.token}`);
    expect(page2.status).toBe(200);
    expect(page2.body.data.items).toHaveLength(1);
    expect(page2.body.data.unreadCount).toBe(3);
  });

  it("marks individual notifications as read idempotently and prevents cross-user access", async () => {
    const userA = await register("alice5@example.test", "Alice");
    const userB = await register("bob5@example.test", "Bob");
    const adminUser = await admin();

    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Post For Read Test", content: "Content" });
    const postId = postRes.body.data.id;

    await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "Comment to mark read" });

    const notifs = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userB.token}`);
    const notifId = notifs.body.data.items[0].id;

    // User A cannot mark User B's notification read (returns 404)
    const unauthorized = await mutate(request(app).patch(`/api/v1/notifications/${notifId}/read`))
      .set("Authorization", `Bearer ${userA.token}`)
      .send({});
    expect(unauthorized.status).toBe(404);
    expect(unauthorized.body.error.code).toBe("NOTIFICATION_NOT_FOUND");

    // Admin cannot mark User B's notification read either (no ownership override)
    const adminAttempt = await mutate(request(app).patch(`/api/v1/notifications/${notifId}/read`))
      .set("Authorization", `Bearer ${adminUser.token}`)
      .send({});
    expect(adminAttempt.status).toBe(404);
    expect(adminAttempt.body.error.code).toBe("NOTIFICATION_NOT_FOUND");

    // Untrusted origin is rejected
    const untrusted = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set("Authorization", `Bearer ${userB.token}`)
      .set("Origin", "https://evil.test")
      .send({});
    expect(untrusted.status).toBe(403);

    // User B marks as read
    const marked = await mutate(request(app).patch(`/api/v1/notifications/${notifId}/read`))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({});
    expect(marked.status).toBe(200);
    expect(marked.body.data.isRead).toBe(true);

    // Repeat mark as read is idempotent
    const repeat = await mutate(request(app).patch(`/api/v1/notifications/${notifId}/read`))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({});
    expect(repeat.status).toBe(200);
    expect(repeat.body.data.isRead).toBe(true);

    // Unread count is now 0
    const updated = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userB.token}`);
    expect(updated.body.data.unreadCount).toBe(0);
  });

  it("marks all notifications as read up to the server-side cutoff", async () => {
    const userA = await register("alice6@example.test", "Alice");
    const userB = await register("bob6@example.test", "Bob");

    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Mark All Post", content: "Content" });
    const postId = postRes.body.data.id;

    for (let i = 1; i <= 2; i++) {
      await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ content: `Comment ${i}` });
    }

    const readAllRes = await mutate(request(app).patch("/api/v1/notifications/read-all"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({});
    expect(readAllRes.status).toBe(200);
    expect(readAllRes.body.data.modifiedCount).toBe(2);

    const check = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userB.token}`);
    expect(check.body.data.unreadCount).toBe(0);
  });

  it("preserves comment success when notification write fails", async () => {
    const userA = await register("alice7@example.test", "Alice");
    const userB = await register("bob7@example.test", "Bob");

    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Resilient Post", content: "Content" });
    const postId = postRes.body.data.id;

    // Spy on Notification.create to reject once
    const createSpy = jest.spyOn(Notification, "create").mockRejectedValueOnce(new Error("Simulated DB write failure"));

    const commentRes = await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "Comment despite notification error" });

    expect(commentRes.status).toBe(201);
    expect(commentRes.body.data.content).toBe("Comment despite notification error");

    createSpy.mockRestore();
  });

  it("retains persisted notification in DB when socket emission fails", async () => {
    const userA = await register("alice8@example.test", "Alice");
    const userB = await register("bob8@example.test", "Bob");

    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Emit Failure Post", content: "Content" });
    const postId = postRes.body.data.id;

    const publishSpy = jest.spyOn(socketServer, "publishNotification").mockImplementationOnce(() => {
      throw new Error("Simulated socket failure");
    });

    const commentRes = await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "Comment with socket fail" });

    expect(commentRes.status).toBe(201);

    const bNotifs = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userB.token}`);
    expect(bNotifs.body.data.unreadCount).toBe(1);

    publishSpy.mockRestore();
  });

  it("serializes safely even if referenced comment or post is deleted", () => {
    const dummyNotif = {
      _id: new mongoose.Types.ObjectId(),
      actor: new mongoose.Types.ObjectId(),
      type: "NEW_COMMENT",
      message: 'Someone commented on "A Post"',
      post: new mongoose.Types.ObjectId(),
      postSlug: "a-post",
      comment: new mongoose.Types.ObjectId(),
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const dto = notificationDto(dummyNotif);
    expect(dto.id).toBe(dummyNotif._id.toString());
    expect(dto.actorId).toBe(dummyNotif.actor.toString());
    expect(dto.postId).toBe(dummyNotif.post.toString());
    expect(dto.commentId).toBe(dummyNotif.comment.toString());
  });
});
