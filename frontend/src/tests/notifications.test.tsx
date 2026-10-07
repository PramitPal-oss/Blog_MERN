import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "../components/NotificationBell";
import { NotificationProvider } from "../context/NotificationContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { notificationsApi } from "../api";
import * as socketModule from "../socket/client";

vi.mock("../context/AuthContext", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAuth: vi.fn()
  };
});

const mockedUseAuth = vi.mocked(useAuth);

describe("NotificationBell and UI interactions", () => {
  let fakeSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const listeners: Record<string, ((...args: any[]) => void)[]> = {};
    fakeSocket = {
      connected: true,
      auth: {},
      connect: vi.fn(() => {
        fakeSocket.connected = true;
        listeners["connect"]?.forEach((cb) => cb());
      }),
      disconnect: vi.fn(() => {
        fakeSocket.connected = false;
        listeners["disconnect"]?.forEach((cb) => cb());
      }),
      on: vi.fn((event: string, cb: (...args: any[]) => void) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      }),
      off: vi.fn(),
      removeAllListeners: vi.fn(() => {
        Object.keys(listeners).forEach((k) => delete listeners[k]);
      }),
      _trigger: (event: string, ...args: any[]) => {
        listeners[event]?.forEach((cb) => cb(...args));
      }
    };

    vi.spyOn(socketModule, "createNotificationSocket").mockReturnValue(fakeSocket);

    mockedUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        id: "user-1",
        name: "Test User",
        email: "user@test",
        role: "USER",
        isActive: true,
        providers: [],
        hasPassword: true,
        isProtectedAdmin: false,
        createdAt: "",
        updatedAt: ""
      },
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn()
    });
  });

  it("renders notification bell with unread badge and accessible label", async () => {
    vi.spyOn(notificationsApi, "list").mockResolvedValue({
      data: {
        success: true,
        message: "OK",
        data: {
          items: [
            {
              id: "n-1",
              actorId: "actor-1",
              type: "NEW_COMMENT",
              message: 'Alice commented on "Post One"',
              postId: "p-1",
              postSlug: "post-one",
              commentId: "c-1",
              isRead: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          unreadCount: 1
        },
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
      }
    } as any);

    render(
      <MemoryRouter>
        <NotificationProvider>
          <NotificationBell />
        </NotificationProvider>
      </MemoryRouter>
    );

    const bell = await screen.findByRole("button", { name: "1 unread notification" });
    expect(bell).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("caps visual badge at 99+ while keeping exact count in accessible label", async () => {
    vi.spyOn(notificationsApi, "list").mockResolvedValue({
      data: {
        success: true,
        message: "OK",
        data: {
          items: [],
          unreadCount: 125
        },
        meta: { page: 1, limit: 10, total: 125, totalPages: 13 }
      }
    } as any);

    render(
      <MemoryRouter>
        <NotificationProvider>
          <NotificationBell />
        </NotificationProvider>
      </MemoryRouter>
    );

    const bell = await screen.findByRole("button", { name: "125 unread notifications" });
    expect(bell).toBeInTheDocument();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("opens dropdown on click, displays notifications, and closes on Escape", async () => {
    const user = userEvent.setup();
    vi.spyOn(notificationsApi, "list").mockResolvedValue({
      data: {
        success: true,
        message: "OK",
        data: {
          items: [
            {
              id: "n-1",
              actorId: "actor-1",
              type: "NEW_COMMENT",
              message: 'Bob commented on "My Story"',
              postId: "p-1",
              postSlug: "my-story",
              commentId: "c-1",
              isRead: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          unreadCount: 1
        },
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
      }
    } as any);

    render(
      <MemoryRouter>
        <NotificationProvider>
          <NotificationBell />
        </NotificationProvider>
      </MemoryRouter>
    );

    const bell = await screen.findByRole("button", { name: "1 unread notification" });
    await user.click(bell);

    expect(screen.getByRole("region", { name: "Notifications inbox" })).toBeInTheDocument();
    expect(screen.getByText('Bob commented on "My Story"')).toBeInTheDocument();

    // Press Escape to close
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Notifications inbox" })).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });

  it("updates state in real-time when socket receives notification:new and deduplicates", async () => {
    let serverNotifications: any[] = [];
    vi.spyOn(notificationsApi, "list").mockImplementation(async () => ({
      data: {
        success: true,
        message: "OK",
        data: { items: serverNotifications, unreadCount: serverNotifications.length },
        meta: { page: 1, limit: 10, total: serverNotifications.length, totalPages: 1 }
      }
    } as any));

    render(
      <MemoryRouter>
        <NotificationProvider>
          <NotificationBell />
        </NotificationProvider>
      </MemoryRouter>
    );

    await screen.findByRole("button", { name: "Notifications" });

    const newNotif = {
      id: "n-socket-1",
      actorId: "actor-2",
      type: "NEW_COMMENT" as const,
      message: 'Eve commented on "Security 101"',
      postId: "p-2",
      postSlug: "security-101",
      commentId: "c-2",
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    serverNotifications = [newNotif];

    // Emit via fake socket
    act(() => {
      fakeSocket._trigger("notification:new", newNotif);
    });

    const bell = await screen.findByRole("button", { name: "1 unread notification" });
    expect(bell).toBeInTheDocument();

    // Emit duplicate
    act(() => {
      fakeSocket._trigger("notification:new", newNotif);
    });

    // Open dropdown to check list has exactly 1 entry
    const user = userEvent.setup();
    await user.click(bell);
    const items = await screen.findAllByText('Eve commented on "Security 101"');
    expect(items).toHaveLength(1);
  });
});
