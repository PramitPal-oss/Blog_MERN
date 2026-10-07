import type { Socket } from "socket.io";
import { validateAccessToken } from "../services/access-session.service.js";
import { AppError } from "../utils/app-error.js";

export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth?.accessToken;
    if (!token || typeof token !== "string" || token.length > 4096) {
      const err: any = new Error("Authentication required");
      err.data = { code: "UNAUTHENTICATED" };
      return next(err);
    }

    const { identity, expiresAt } = await validateAccessToken(token);
    socket.data.identity = identity;
    socket.data.expiresAt = expiresAt;
    next();
  } catch (error: any) {
    const code =
      error instanceof AppError
        ? error.code
        : error?.name === "TokenExpiredError"
          ? "ACCESS_TOKEN_EXPIRED"
          : "UNAUTHENTICATED";
    const err: any = new Error("Authentication failed");
    err.data = { code };
    next(err);
  }
}
