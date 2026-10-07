import { io, type Socket } from "socket.io-client";
import { baseURL, getAccessToken } from "../api/client";

export function createNotificationSocket(): Socket {
  const socketOrigin = new URL(baseURL, window.location.origin).origin;
  return io(socketOrigin, {
    path: "/socket.io",
    autoConnect: false,
    withCredentials: true,
    auth: {
      accessToken: getAccessToken()
    },
    transports: ["polling", "websocket"]
  });
}
