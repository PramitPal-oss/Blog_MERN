import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute, AdminRoute } from "../routes/Guards";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
const mockedAuth = vi.mocked(useAuth);
const base = { error: null, login: vi.fn(), register: vi.fn(), logout: vi.fn(), refreshSession: vi.fn() };

describe("route guards", () => {
  beforeEach(() => vi.clearAllMocks());
  it("redirects anonymous visitors to login", () => {
    mockedAuth.mockReturnValue({ ...base, status: "anonymous", user: null });
    render(<MemoryRouter initialEntries={["/private"]}><Routes><Route element={<ProtectedRoute />}><Route path="/private" element={<div>Private page</div>} /></Route><Route path="/login" element={<div>Login page</div>} /></Routes></MemoryRouter>);
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
  it("allows an authenticated user through protected routes", () => {
    mockedAuth.mockReturnValue({ ...base, status: "authenticated", user: { id: "1", name: "User", email: "u@example.test", role: "USER", isActive: true, providers: [], hasPassword: true, isProtectedAdmin: false, createdAt: "", updatedAt: "" } });
    render(<MemoryRouter initialEntries={["/private"]}><Routes><Route element={<ProtectedRoute />}><Route path="/private" element={<div>Private page</div>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText("Private page")).toBeInTheDocument();
  });
  it("sends regular users away from admin routes", () => {
    mockedAuth.mockReturnValue({ ...base, status: "authenticated", user: { id: "1", name: "User", email: null, role: "USER", isActive: true, providers: [], hasPassword: true, isProtectedAdmin: false, createdAt: "", updatedAt: "" } });
    render(<MemoryRouter initialEntries={["/admin"]}><Routes><Route element={<AdminRoute />}><Route path="/admin" element={<div>Admin page</div>} /></Route><Route path="/403" element={<div>Forbidden page</div>} /></Routes></MemoryRouter>);
    expect(screen.getByText("Forbidden page")).toBeInTheDocument();
  });
});
