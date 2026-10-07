import { apiClient, rawClient } from "./client";
import type { ApiResponse, AuthPayload, Comment, Meta, NotificationItem, NotificationsData, Post, User } from "../types/api";
export const authApi = {
  register: (body: { name: string; email: string; password: string }) => rawClient.post<ApiResponse<AuthPayload>>("/auth/register", body),
  login: (body: { email: string; password: string }) => rawClient.post<ApiResponse<AuthPayload>>("/auth/login", body),
  logout: () => rawClient.post("/auth/logout", {}),
  providers: () => rawClient.get<ApiResponse<{ google: boolean; facebook: boolean }>>("/auth/providers"),
  link: (provider: "google" | "facebook") => apiClient.post<ApiResponse<{ authorizationUrl: string }>>(`/auth/${provider}/link`, {})
};
export const postsApi = {
  list: (page = 1, authorId?: string) => apiClient.get<ApiResponse<Post[]>>("/posts", { params: { page, limit: 10, ...(authorId ? { authorId } : {}) } }),
  getBySlug: (slug: string) => apiClient.get<ApiResponse<Post>>(`/posts/slug/${slug}`),
  get: (id: string) => apiClient.get<ApiResponse<Post>>(`/posts/${id}`),
  create: (body: { title: string; content: string }) => apiClient.post<ApiResponse<Post>>("/posts", body),
  update: (id: string, body: { title: string; content: string }) => apiClient.patch<ApiResponse<Post>>(`/posts/${id}`, body),
  remove: (id: string) => apiClient.delete(`/posts/${id}`, { data: {} }),
  like: (id: string) => apiClient.put<ApiResponse<{ id: string; likeCount: number; likedByMe: boolean }>>(`/posts/${id}/like`),
  unlike: (id: string) => apiClient.delete<ApiResponse<{ id: string; likeCount: number; likedByMe: boolean }>>(`/posts/${id}/like`)
};
export const commentsApi = {
  list: (postId: string, page = 1, view: "flat" | "threads" = "flat") => apiClient.get<ApiResponse<Comment[]>>(`/posts/${postId}/comments`, { params: { page, limit: 10, view } }),
  create: (postId: string, content: string) => apiClient.post<ApiResponse<Comment>>(`/posts/${postId}/comments`, { content }),
  listReplies: (id: string, page = 1) => apiClient.get<ApiResponse<Comment[]>>(`/comments/${id}/replies`, { params: { page, limit: 10 } }),
  createReply: (id: string, content: string) => apiClient.post<ApiResponse<Comment>>(`/comments/${id}/replies`, { content }),
  update: (id: string, content: string) => apiClient.patch<ApiResponse<Comment>>(`/comments/${id}`, { content }),
  remove: (id: string) => apiClient.delete(`/comments/${id}`, { data: {} }),
  like: (id: string) => apiClient.put<ApiResponse<{ id: string; likeCount: number; likedByMe: boolean }>>(`/comments/${id}/like`),
  unlike: (id: string) => apiClient.delete<ApiResponse<{ id: string; likeCount: number; likedByMe: boolean }>>(`/comments/${id}/like`)
};
export const notificationsApi = {
  list: (page = 1, limit = 10) => apiClient.get<ApiResponse<NotificationsData>>("/notifications", { params: { page, limit } }),
  markAsRead: (id: string) => apiClient.patch<ApiResponse<NotificationItem>>(`/notifications/${id}/read`, {}),
  markAllAsRead: () => apiClient.patch<ApiResponse<{ modifiedCount: number }>>("/notifications/read-all", {})
};
export const adminApi = {
  stats: () => apiClient.get<ApiResponse<{ totalUsers: number; totalPosts: number; totalComments: number }>>("/admin/stats"),
  users: (page = 1) => apiClient.get<ApiResponse<User[]>>("/users", { params: { page, limit: 10 } }),
  user: (id: string) => apiClient.get<ApiResponse<User>>(`/users/${id}`),
  createUser: (body: { name: string; email: string; password: string; role: string }) => apiClient.post<ApiResponse<User>>("/users", body),
  updateUser: (id: string, body: Partial<Pick<User, "name" | "email" | "role" | "isActive">>) => apiClient.patch<ApiResponse<User>>(`/users/${id}`, body),
  deactivateUser: (id: string) => apiClient.delete(`/users/${id}`, { data: {} }),
  posts: (page = 1, status = "active") => apiClient.get<ApiResponse<Post[]>>("/admin/posts", { params: { page, limit: 10, status } }),
  comments: (page = 1) => apiClient.get<ApiResponse<Comment[]>>("/admin/comments", { params: { page, limit: 10 } })
};
export type Paginated<T> = { items: T[]; meta: Meta | null };

