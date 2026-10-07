import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { useAuth } from "./AuthContext";
import { notificationsApi } from "../api";
import { apiMessage, getAccessToken, getAuthGeneration, onTokenChange, refreshAccess } from "../api/client";
import { createNotificationSocket } from "../socket/client";
import type { Meta, NotificationItem } from "../types/api";
import type { Socket } from "socket.io-client";

export type SocketStatus = "connecting" | "connected" | "disconnected";

export interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  meta: Meta | null;
  loading: boolean;
  error: string | null;
  socketStatus: SocketStatus;
  page: number;
  latestAnnouncement: string | null;
  setPage: (page: number) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: (targetPage?: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("disconnected");
  const [page, setPage] = useState<number>(1);
  const [latestAnnouncement, setLatestAnnouncement] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);
  const currentFetchPageRef = useRef<number>(1);
  const activeUserRef = useRef<string | null>(null);
  const isRefreshingAuthRef = useRef<boolean>(false);
  const activePageRef = useRef<number>(1);

  activePageRef.current = page;

  const clearState = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    setMeta(null);
    setLoading(false);
    setError(null);
    setPage(1);
    setLatestAnnouncement(null);
  }, []);

  const fetchAuthoritative = useCallback(async (targetPage: number) => {
    if (auth.status !== "authenticated" || !auth.user) {
      return;
    }
    const currentUserId = auth.user.id;
    currentFetchPageRef.current = targetPage;

    if (isFetchingRef.current) {
      isDirtyRef.current = true;
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await notificationsApi.list(targetPage, 10);
      if (activeUserRef.current !== currentUserId || auth.status !== "authenticated") {
        return;
      }
      setNotifications(response.data.data.items);
      setUnreadCount(response.data.data.unreadCount);
      setMeta(response.data.meta);
    } catch (err: any) {
      if (activeUserRef.current === currentUserId && auth.status === "authenticated") {
        setError(apiMessage(err));
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      if (isDirtyRef.current && activeUserRef.current === currentUserId && auth.status === "authenticated") {
        isDirtyRef.current = false;
        void fetchAuthoritative(currentFetchPageRef.current);
      }
    }
  }, [auth.status, auth.user]);

  const refresh = useCallback((targetPage?: number) => {
    return fetchAuthoritative(targetPage ?? activePageRef.current);
  }, [fetchAuthoritative]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    void fetchAuthoritative(newPage);
  }, [fetchAuthoritative]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      void refresh();
    } catch (err) {
      setError(apiMessage(err));
      throw err;
    }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      void refresh();
    } catch (err) {
      setError(apiMessage(err));
      throw err;
    }
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => {
      if (auth.status === "authenticated") {
        void refresh();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [auth.status, refresh]);

  useEffect(() => {
    if (auth.status !== "authenticated" || !auth.user) {
      activeUserRef.current = null;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketStatus("disconnected");
      clearState();
      return;
    }

    const userId = auth.user.id;
    activeUserRef.current = userId;

    void fetchAuthoritative(1);

    const socket = createNotificationSocket();
    socketRef.current = socket;
    setSocketStatus("connecting");

    const tryTokenRefreshAndReconnect = async () => {
      if (isRefreshingAuthRef.current) return;
      isRefreshingAuthRef.current = true;
      try {
        await refreshAccess(getAuthGeneration());
        if (socketRef.current && activeUserRef.current === userId) {
          socketRef.current.auth = { accessToken: getAccessToken() };
          socketRef.current.connect();
        }
      } catch {
        setSocketStatus("disconnected");
      } finally {
        isRefreshingAuthRef.current = false;
      }
    };

    socket.on("connect", () => {
      setSocketStatus("connected");
      void fetchAuthoritative(activePageRef.current);
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
    });

    socket.on("connect_error", (err: any) => {
      setSocketStatus("disconnected");
      const code = err?.data?.code;
      if (code === "ACCESS_TOKEN_EXPIRED") {
        void tryTokenRefreshAndReconnect();
      }
    });

    socket.on("auth:error", (data: { code: string }) => {
      if (data?.code === "ACCESS_TOKEN_EXPIRED") {
        void tryTokenRefreshAndReconnect();
      } else if (data?.code === "SESSION_INVALID") {
        socket.disconnect();
        setSocketStatus("disconnected");
      }
    });

    socket.on("notification:new", (newNotif: NotificationItem) => {
      setLatestAnnouncement(`New notification: ${newNotif.message}`);

      if (activePageRef.current === 1) {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
      }
      setUnreadCount((prev) => prev + 1);
      void fetchAuthoritative(activePageRef.current);
    });

    socket.on("notifications:changed", () => {
      void fetchAuthoritative(activePageRef.current);
    });

    const unsubscribeToken = onTokenChange((newToken) => {
      if (socketRef.current && newToken && activeUserRef.current === userId) {
        socketRef.current.auth = { accessToken: newToken };
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
    });

    socket.auth = { accessToken: getAccessToken() };
    socket.connect();

    return () => {
      unsubscribeToken();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketStatus("disconnected");
    };
  }, [auth.status, auth.user?.id, clearState, fetchAuthoritative]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      meta,
      loading,
      error,
      socketStatus,
      page,
      latestAnnouncement,
      setPage: handlePageChange,
      markAsRead,
      markAllAsRead,
      refresh
    }),
    [
      notifications,
      unreadCount,
      meta,
      loading,
      error,
      socketStatus,
      page,
      latestAnnouncement,
      handlePageChange,
      markAsRead,
      markAllAsRead,
      refresh
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return context;
}
