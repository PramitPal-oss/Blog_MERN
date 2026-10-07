import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminRoute, ProtectedRoute } from "./Guards";
import { LoginPage, OAuthCallbackPage, RegisterPage } from "../pages/AuthPages";
import { BlogListPage, PostDetailsPage } from "../pages/BlogPages";
import { AccountPage, MyPostsPage, PostEditorPage } from "../pages/UserPages";
import { AdminCommentsPage, AdminDashboardPage, AdminPostsPage, AdminUserFormPage, AdminUsersPage } from "../pages/AdminPages";
import { ForbiddenPage, NotFoundPage } from "../pages/StatusPages";

const router = createBrowserRouter([{ path: "/", element: <MainLayout />, children: [
  { index: true, element: <BlogListPage /> }, { path: "posts", element: <BlogListPage /> }, { path: "login", element: <LoginPage /> }, { path: "register", element: <RegisterPage /> }, { path: "posts/:slug", element: <PostDetailsPage /> }, { path: "auth/callback", element: <OAuthCallbackPage /> }, { path: "403", element: <ForbiddenPage /> },
  { element: <ProtectedRoute />, children: [{ path: "dashboard", element: <MyPostsPage /> }, { path: "posts/new", element: <PostEditorPage /> }, { path: "posts/:id/edit", element: <PostEditorPage /> }, { path: "account", element: <AccountPage /> }] },
  { element: <AdminRoute />, children: [{ path: "admin", element: <AdminLayout />, children: [{ index: true, element: <AdminDashboardPage /> }, { path: "users", element: <AdminUsersPage /> }, { path: "users/new", element: <AdminUserFormPage /> }, { path: "users/:id/edit", element: <AdminUserFormPage /> }, { path: "posts", element: <AdminPostsPage /> }, { path: "comments", element: <AdminCommentsPage /> }] }] },
  { path: "*", element: <NotFoundPage /> }
]}]);
export function AppRouter() { return <RouterProvider router={router} />; }
