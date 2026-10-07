import http from "node:http";
import request from "supertest";
import jwt from "jsonwebtoken";
import { io as Client, type Socket as ClientSocket } from "socket.io-client";
import { app } from "../../app.js";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { RefreshSession } from "../../models/refresh-session.model.js";
import { Notification } from "../../models/notification.model.js";
import { initSocketServer, closeSocketServer } from "../../socket/socket.server.js";
import { signRefreshToken } from "../../utils/tokens.js";

const origin = "http://localhost:5173";
const mutate = (req: request.Test) => req.set("Origin", origin).set("Content-Type", "application/json");

let httpServer: http.Server;
let port: number;

async function register(email: string, name: string) {
  const response = await mutate(request(app).post("/api/v1/auth/register")).send({
    name,
    email,
    password: "StrongPass!123"
  });
  return { token: response.body.data.accessToken as string, user: response.body.data.user };
}

function createClientSocket(token?: string, clientOrigin: string = origin, extraAuth?: Record<string, any>): ClientSocket {
  return Client(`http://localhost:${port}`, {
    path: "/socket.io",
    transports: ["websocket"],
    autoConnect: false,
    extraHeaders: {
      Origin: clientOrigin
    },
    auth: {
      ...(token ? { accessToken: token } : {}),
      ...extraAuth
    }
  });
}

function waitForConnect(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
    socket.connect();
  });
}

function waitForEvent<T = any>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (data: T) => resolve(data));
  });
}

beforeAll(async () => {
  httpServer = http.createServer(app);
  initSocketServer(httpServer);
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      port = (httpServer.address() as any).port;
      resolve();
    });
  });
});

afterAll(async () => {
  await closeSocketServer();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe("real Socket.io integration", () => {
  it("authenticates a valid user connection and joins user room", async () => {
    const user = await register("sock_user1@example.test", "Socket User 1");
    const socket = createClientSocket(user.token);

    await expect(waitForConnect(socket)).resolves.toBeUndefined();
    expect(socket.connected).toBe(true);

    socket.disconnect();
  });

  it("rejects connection if token is missing, malformed, expired, or wrongly signed", async () => {
    // Missing token
    const socketNoToken = createClientSocket();
    await expect(waitForConnect(socketNoToken)).rejects.toThrow();
    socketNoToken.disconnect();

    // Malformed token
    const socketMalformed = createClientSocket("not-a-jwt");
    await expect(waitForConnect(socketMalformed)).rejects.toThrow();
    socketMalformed.disconnect();

    // Expired token
    const user = await register("sock_exp@example.test", "Exp User");
    const session = await RefreshSession.findOne({ user: user.user.id });
    const expiredToken = jwt.sign(
      { sid: session!._id.toString(), ver: user.user.authVersion, type: "access" },
      env.JWT_ACCESS_SECRET,
      { subject: user.user.id, expiresIn: -10, issuer: env.JWT_ISSUER, audience: env.JWT_ACCESS_AUDIENCE }
    );
    const socketExpired = createClientSocket(expiredToken);
    await expect(waitForConnect(socketExpired)).rejects.toThrow();
    socketExpired.disconnect();

    // Wrong secret
    const wrongSecretToken = jwt.sign(
      { sid: session!._id.toString(), ver: user.user.authVersion, type: "access" },
      "different-secret-that-is-at-least-32-chars",
      { subject: user.user.id, expiresIn: 900, issuer: env.JWT_ISSUER, audience: env.JWT_ACCESS_AUDIENCE }
    );
    const socketWrongSecret = createClientSocket(wrongSecretToken);
    await expect(waitForConnect(socketWrongSecret)).rejects.toThrow();
    socketWrongSecret.disconnect();

    // Refresh token passed instead of access token
    const refreshToken = signRefreshToken(user.user.id, session!._id.toString(), user.user.authVersion, 900);
    const socketRefresh = createClientSocket(refreshToken);
    await expect(waitForConnect(socketRefresh)).rejects.toThrow();
    socketRefresh.disconnect();
  });

  it("rejects untrusted or missing origins", async () => {
    const user = await register("sock_origin@example.test", "Origin User");

    const untrustedSocket = createClientSocket(user.token, "https://evil.test");
    await expect(waitForConnect(untrustedSocket)).rejects.toThrow();
    untrustedSocket.disconnect();
  });

  it("rejects connection when user is inactive, session is revoked, or authVersion mismatches", async () => {
    const user = await register("sock_status@example.test", "Status User");

    // Revoked session
    await RefreshSession.updateMany({ user: user.user.id }, { $set: { revokedAt: new Date() } });
    const revokedSocket = createClientSocket(user.token);
    await expect(waitForConnect(revokedSocket)).rejects.toThrow();
    revokedSocket.disconnect();

    // Inactive user
    const user2 = await register("sock_inactive@example.test", "Inactive User");
    await User.findByIdAndUpdate(user2.user.id, { $set: { isActive: false } });
    const inactiveSocket = createClientSocket(user2.token);
    await expect(waitForConnect(inactiveSocket)).rejects.toThrow();
    inactiveSocket.disconnect();

    // Auth version mismatch
    const user3 = await register("sock_ver@example.test", "Version User");
    await User.findByIdAndUpdate(user3.user.id, { $inc: { authVersion: 1 } });
    const mismatchSocket = createClientSocket(user3.token);
    await expect(waitForConnect(mismatchSocket)).rejects.toThrow();
    mismatchSocket.disconnect();
  });

  it("delivers notification:new to recipient and not to commenter or unrelated user", async () => {
    const userA = await register("alice_sock@example.test", "Alice");
    const userB = await register("bob_sock@example.test", "Bob");
    const userC = await register("charlie_sock@example.test", "Charlie");

    const socketA = createClientSocket(userA.token);
    const socketB = createClientSocket(userB.token);
    const socketC = createClientSocket(userC.token);

    await Promise.all([waitForConnect(socketA), waitForConnect(socketB), waitForConnect(socketC)]);

    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Bob's Realtime Post", content: "Exciting real-time content" });
    const postId = postRes.body.data.id;

    // Listeners for notification
    const bNotificationPromise = waitForEvent(socketB, "notification:new");

    let aReceived = false;
    let cReceived = false;
    socketA.on("notification:new", () => { aReceived = true; });
    socketC.on("notification:new", () => { cReceived = true; });

    // Alice comments on Bob's post
    const commentRes = await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "Live socket comment" });
    expect(commentRes.status).toBe(201);
    const commentId = commentRes.body.data.id;

    const receivedNotification = await bNotificationPromise;
    expect(receivedNotification.actorId).toBe(userA.user.id);
    expect(receivedNotification.postId).toBe(postId);
    expect(receivedNotification.commentId).toBe(commentId);
    expect(receivedNotification.message).toBe('Alice commented on "Bob\'s Realtime Post"');

    // Verify it exists in MongoDB before receipt
    const persisted = await Notification.findById(receivedNotification.id);
    expect(persisted).not.toBeNull();
    expect(persisted!.isRead).toBe(false);

    // Verify A and C received nothing
    expect(aReceived).toBe(false);
    expect(cReceived).toBe(false);

    socketA.disconnect();
    socketB.disconnect();
    socketC.disconnect();
  });

  it("prevents subsequent private delivery and disconnects if session is revoked after connection", async () => {
    const userA = await register("alice_rev@example.test", "Alice");
    const userB = await register("bob_rev@example.test", "Bob");

    const socketB = createClientSocket(userB.token);
    await waitForConnect(socketB);

    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Revocation Post", content: "Content" });
    const postId = postRes.body.data.id;

    // Now revoke Bob's session in the database
    await RefreshSession.updateMany({ user: userB.user.id }, { $set: { revokedAt: new Date() } });

    const authErrorPromise = waitForEvent(socketB, "auth:error");

    // Alice comments on Bob's post
    await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "Comment after Bob was revoked" });

    const authError = await authErrorPromise;
    expect(authError.code).toBe("SESSION_INVALID");
    expect(socketB.connected).toBe(false);
  });

  it("emits notifications:changed to recipient connections when marked as read", async () => {
    const userA = await register("alice_chg@example.test", "Alice");
    const userB = await register("bob_chg@example.test", "Bob");

    const socketB1 = createClientSocket(userB.token);
    const socketB2 = createClientSocket(userB.token);
    await Promise.all([waitForConnect(socketB1), waitForConnect(socketB2)]);

    const postRes = await mutate(request(app).post("/api/v1/posts"))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ title: "Sync Post", content: "Content" });
    const postId = postRes.body.data.id;

    await mutate(request(app).post(`/api/v1/posts/${postId}/comments`))
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "Comment to sync" });

    const notifs = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${userB.token}`);
    const notifId = notifs.body.data.items[0].id;

    const b2ChangedPromise = waitForEvent(socketB2, "notifications:changed");

    // Mark as read via REST
    await mutate(request(app).patch(`/api/v1/notifications/${notifId}/read`))
      .set("Authorization", `Bearer ${userB.token}`)
      .send({});

    await expect(b2ChangedPromise).resolves.toBeDefined();

    socketB1.disconnect();
    socketB2.disconnect();
  });
});
