import { describe, expect, it, vi } from "vitest";
import { createNotificationSocket } from "../socket/client";
import * as clientModule from "../api/client";

vi.mock("socket.io-client", () => ({
  io: vi.fn((url, options) => ({
    url,
    options,
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }))
}));

describe("socket client factory", () => {
  it("creates socket with autoConnect false and correct path", () => {
    vi.spyOn(clientModule, "getAccessToken").mockReturnValue("test-token-123");
    const socket = createNotificationSocket();

    expect(socket).toBeDefined();
    expect((socket as any).options.path).toBe("/socket.io");
    expect((socket as any).options.autoConnect).toBe(false);
    expect((socket as any).options.transports).toEqual(["polling", "websocket"]);
    expect((socket as any).options.auth.accessToken).toBe("test-token-123");
  });
});
