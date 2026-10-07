import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { setAccessToken, getAccessToken, onTokenChange } from "../api/client";
import * as clientModule from "../api/client";
import { authApi } from "../api";

describe("auth generation guards and token subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("notifies token subscribers when setAccessToken is called", () => {
    const subscriber = vi.fn();
    const unsubscribe = onTokenChange(subscriber);

    setAccessToken("new-token");
    expect(subscriber).toHaveBeenCalledWith("new-token");
    expect(getAccessToken()).toBe("new-token");

    unsubscribe();
    setAccessToken(null);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it("ignores stale refresh completion after logout occurs", async () => {
    let resolveRefresh: (val: any) => void;
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });

    vi.spyOn(clientModule, "refreshAccess").mockReturnValue(refreshPromise as any);
    vi.spyOn(authApi, "logout").mockResolvedValue({} as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
    });

    let refreshTask: Promise<void> | undefined;
    act(() => {
      refreshTask = result.current.refreshSession();
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.status).toBe("anonymous");
    expect(result.current.user).toBeNull();

    await act(async () => {
      resolveRefresh!({
        user: {
          id: "old-user",
          name: "Old",
          email: "old@test",
          role: "USER",
          isActive: true,
          providers: [],
          hasPassword: true,
          isProtectedAdmin: false,
          createdAt: "",
          updatedAt: ""
        },
        accessToken: "stale-token",
        expiresIn: 900
      });
      await refreshTask?.catch(() => {});
    });

    expect(result.current.status).toBe("anonymous");
    expect(result.current.user).toBeNull();
  });
});
