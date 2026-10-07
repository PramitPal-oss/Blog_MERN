export type Role = "ADMIN" | "USER";
export interface User { id: string; name: string; email: string | null; role: Role; isActive: boolean; providers: ("google" | "facebook")[]; hasPassword: boolean; isProtectedAdmin: boolean; createdAt: string; updatedAt: string }
export interface Author { id: string; name: string }
export interface Post { id: string; title: string; slug: string; content?: string; excerpt?: string; author: Author; createdAt: string; updatedAt: string; deletedAt?: string | null; likeCount?: number; likedByMe?: boolean; commentCount?: number; }
export interface Comment { id: string; content: string; postId: string; author: Author | null; createdAt: string; updatedAt: string; post?: { id: string; title: string; slug: string; deletedAt: string | null }; parentCommentId?: string | null; deletedAt?: string | null; likeCount?: number; likedByMe?: boolean; replyCount?: number; }
export interface Meta { page: number; limit: number; total: number; totalPages: number }
export interface ApiResponse<T> { success: true; message: string; data: T; meta: Meta | null }
export interface ApiError { success: false; message: string; error: { code: string; details?: { field: string; message: string }[] }; requestId?: string }
export interface AuthPayload { user: User; accessToken: string; expiresIn: number }
export interface NotificationItem {
  id: string;
  actorId: string;
  type: "NEW_COMMENT" | "NEW_REPLY" | "NEW_LIKE";
  message: string;
  postId: string;
  postSlug: string;
  commentId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface NotificationsData {
  items: NotificationItem[];
  unreadCount: number;
}

