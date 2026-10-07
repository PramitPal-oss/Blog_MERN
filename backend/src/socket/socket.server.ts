import type http from "node:http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { env } from "../config/env.js";
import { socketAuthMiddleware } from "./socket.auth.js";
import { validateSessionRecord } from "../services/access-session.service.js";

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: http.Server): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true
    },
    maxHttpBufferSize: 16 * 1024,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      if (!origin || origin !== env.FRONTEND_URL) {
        return callback("Origin not allowed", false);
      }
      callback(null, true);
    }
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket: Socket) => {
    const identity = socket.data.identity;
    if (!identity) {
      socket.disconnect(true);
      return;
    }

    const room = `user:${identity.userId}`;
    socket.join(room);

    // 1. Disconnect at access token expiration
    const msUntilExpiry = Math.max(0, (socket.data.expiresAt?.getTime() ?? 0) - Date.now());
    const expiryTimer = setTimeout(() => {
      socket.emit("auth:error", { code: "ACCESS_TOKEN_EXPIRED" });
      socket.disconnect(true);
    }, msUntilExpiry);

    // 2. Periodic revalidation every 30 seconds
    const revalInterval = setInterval(async () => {
      try {
        const valid = await validateSessionRecord(identity.userId, identity.sessionId, identity.authVersion);
        if (!valid) {
          socket.emit("auth:error", { code: "SESSION_INVALID" });
          socket.disconnect(true);
        }
      } catch {
        socket.emit("auth:error", { code: "SERVICE_UNAVAILABLE" });
        socket.disconnect(true);
      }
    }, 30000);

    socket.on("disconnect", () => {
      clearTimeout(expiryTimer);
      clearInterval(revalInterval);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export async function publishNotification(recipientId: string, notification: any): Promise<void> {
  if (!io) return;
  const sockets = await io.in(`user:${recipientId}`).fetchSockets();
  for (const socket of sockets) {
    const identity = socket.data.identity;
    if (!identity) {
      socket.disconnect(true);
      continue;
    }
    try {
      const valid = await validateSessionRecord(identity.userId, identity.sessionId, identity.authVersion);
      if (!valid) {
        socket.emit("auth:error", { code: "SESSION_INVALID" });
        socket.disconnect(true);
        continue;
      }
      socket.emit("notification:new", notification);
    } catch {
      socket.emit("auth:error", { code: "SERVICE_UNAVAILABLE" });
      socket.disconnect(true);
    }
  }
}

export async function emitNotificationsChanged(recipientId: string): Promise<void> {
  if (!io) return;
  const sockets = await io.in(`user:${recipientId}`).fetchSockets();
  for (const socket of sockets) {
    const identity = socket.data.identity;
    if (!identity) {
      socket.disconnect(true);
      continue;
    }
    try {
      const valid = await validateSessionRecord(identity.userId, identity.sessionId, identity.authVersion);
      if (!valid) {
        socket.emit("auth:error", { code: "SESSION_INVALID" });
        socket.disconnect(true);
        continue;
      }
      socket.emit("notifications:changed", {});
    } catch {
      socket.emit("auth:error", { code: "SERVICE_UNAVAILABLE" });
      socket.disconnect(true);
    }
  }
}

export async function closeSocketServer(): Promise<void> {
  if (!io) return;
  io.disconnectSockets(true);
  await new Promise<void>((resolve) => {
    io!.close(() => resolve());
  });
  io = null;
}
