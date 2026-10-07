import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { Pagination } from "./Pagination";
import { EmptyState, ErrorState, LoadingState } from "./States";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, MessageSquare, Check, WifiOff, Loader2, Heart } from "lucide-react";

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "just now";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    meta,
    loading,
    error,
    socketStatus,
    page,
    latestAnnouncement,
    setPage,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();

  const [isOpen, setIsOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [markingId, setMarkingId] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);
  const navigate = useNavigate();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setActionError(null);
      void refresh(page);
    }
  };

  const handleNotificationClick = async (notif: {
    id: string;
    postSlug: string;
    isRead: boolean;
  }) => {
    setActionError(null);
    if (!notif.isRead) {
      try {
        setMarkingId(notif.id);
        await markAsRead(notif.id);
      } catch {
        setActionError("Could not mark notification as read");
        return;
      } finally {
        setMarkingId(null);
      }
    }
    setIsOpen(false);
    navigate(`/posts/${notif.postSlug}`);
  };

  const handleMarkOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActionError(null);
    try {
      setMarkingId(id);
      await markAsRead(id);
    } catch {
      setActionError("Could not mark notification as read");
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAll = async () => {
    setActionError(null);
    try {
      setMarkingAll(true);
      await markAllAsRead();
    } catch {
      setActionError("Could not mark all notifications as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const badgeText = unreadCount > 99 ? "99+" : unreadCount;
  const label =
    unreadCount === 0
      ? "Notifications"
      : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`;

  return (
    <div className="relative inline-flex items-center">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full"
            aria-label={label}
          >
            <Bell className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
                {badgeText}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[360px] sm:w-[384px] max-w-[92vw] p-0 shadow-xl overflow-hidden rounded-xl border-border"
          id="notification-panel"
          role="region"
          aria-label="Notifications inbox"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                Notifications
              </span>
              {socketStatus === "disconnected" && (
                <Badge variant="destructive" className="h-5 text-[10px] px-1.5 gap-1 font-normal">
                  <WifiOff className="h-3 w-3" /> Offline
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                disabled={markingAll}
                onClick={handleMarkAll}
              >
                {markingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Mark all read
              </Button>
            )}
          </div>

          {/* Action error */}
          {actionError && (
            <div className="p-2 border-b border-border">
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="py-8">
                <LoadingState label="Loading notifications…" />
              </div>
            ) : error ? (
              <div className="p-4">
                <ErrorState message={error} retry={() => refresh(page)} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10">
                <EmptyState>No notifications yet.</EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-border" role="list">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left ${
                      notif.isRead
                        ? "bg-card hover:bg-muted/40"
                        : "bg-muted/20 hover:bg-muted/40"
                    }`}
                    onClick={() => void handleNotificationClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void handleNotificationClick(notif);
                      }
                    }}
                  >
                    <div className="mt-0.5 shrink-0 rounded-full p-1.5 bg-muted text-muted-foreground">
                      {notif.type === "NEW_LIKE" ? (
                        <Heart className="h-3.5 w-3.5 text-pink-500" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                      <p
                        className={`text-xs sm:text-sm leading-snug line-clamp-2 ${
                          notif.isRead
                            ? "text-muted-foreground"
                            : "font-semibold text-foreground"
                        }`}
                      >
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <time
                          className="text-[11px] text-muted-foreground"
                          dateTime={notif.createdAt}
                        >
                          {formatRelativeTime(notif.createdAt)}
                        </time>
                        {!notif.isRead && (
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                    </div>

                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 shrink-0 self-center text-muted-foreground hover:text-foreground"
                        disabled={markingId === notif.id}
                        onClick={(e) => void handleMarkOne(e, notif.id)}
                        aria-label="Mark notification as read"
                      >
                        {markingId === notif.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Mark read"
                        )}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="p-2 border-t border-border bg-card flex justify-center">
              <Pagination meta={meta} onPage={setPage} />
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Screen reader live announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {latestAnnouncement}
      </div>
    </div>
  );
}
