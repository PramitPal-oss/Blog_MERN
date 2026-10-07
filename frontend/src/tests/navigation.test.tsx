import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "../components/Header";
import { AdminLayout } from "../layouts/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../context/NotificationContext", () => ({
  useNotifications: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseNotifications = vi.mocked(useNotifications);

describe("Header and Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      meta: null,
      loading: false,
      error: null,
      socketStatus: "connected",
      page: 1,
      latestAnnouncement: "",
      setPage: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("renders public navigation links when unauthenticated", () => {
    mockedUseAuth.mockReturnValue({
      status: "anonymous",
      user: null,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("BlogSphere")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Stories" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Write" })).not.toBeInTheDocument();
  });

  it("renders authenticated user navigation and dropdown items", async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        id: "u1",
        name: "Jane Reader",
        email: "jane@inkstone.test",
        role: "USER",
        isActive: true,
        providers: [],
        hasPassword: true,
        isProtectedAdmin: false,
        createdAt: "",
        updatedAt: "",
      },
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "My posts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Write" })).toBeInTheDocument();

    const avatarBtn = screen.getByRole("button", { name: "User account menu" });
    expect(avatarBtn).toBeInTheDocument();
    await user.click(avatarBtn);

    expect(await screen.findByText("Jane Reader")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
    expect(screen.queryByText("Admin panel")).not.toBeInTheDocument();
  });

  it("displays admin panel link in dropdown when user is an ADMIN", async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        id: "admin1",
        name: "Admin User",
        email: "admin@inkstone.test",
        role: "ADMIN",
        isActive: true,
        providers: [],
        hasPassword: true,
        isProtectedAdmin: true,
        createdAt: "",
        updatedAt: "",
      },
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const avatarBtn = screen.getByRole("button", { name: "User account menu" });
    await user.click(avatarBtn);

    expect(await screen.findByText("Admin panel")).toBeInTheDocument();
  });

  it("renders admin sidebar navigation links in AdminLayout", () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );

    expect(screen.getAllByRole("link", { name: /overview/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /users/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /posts/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /comments/i })[0]).toBeInTheDocument();
  });
});
