import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi, commentsApi, postsApi } from "../api";
import { apiMessage } from "../api/client";
import type { Comment, Meta, Post, Role, User } from "../types/api";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Pagination } from "../components/Pagination";
import { PageHeading } from "../components/PageHeading";
import { StatCard } from "../components/StatCard";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { EditCommentDialog } from "../components/EditCommentDialog";
import { UserAvatar } from "../components/UserAvatar";
import { DataGrid } from "../components/DataGrid";
import { useQuery } from "../hooks/useQuery";
import { useMutation } from "../hooks/useMutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  FileText,
  MessageSquare,
  ArrowRight,
  Plus,
  PenSquare,
  Trash2,
  ExternalLink,
  Shield,
  Loader2,
} from "lucide-react";

export function AdminDashboardPage() {
  const { data: stats, loading, error, refresh } = useQuery(async () => (await adminApi.stats()).data.data);

  return (
    <div className="space-y-8">
      <PageHeading
        title="Admin Overview"
        description="Monitor community activity, access metrics, and moderation queues."
      />

      {error ? (
        <ErrorState message={error} retry={refresh} />
      ) : loading || !stats ? (
        <LoadingState label="Loading admin statistics…" />
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              description="Including inactive accounts"
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              title="Active Posts"
              value={stats.totalPosts}
              description="Published community stories"
              icon={<FileText className="h-5 w-5" />}
            />
            <StatCard
              title="Comments"
              value={stats.totalComments}
              description="Discussions on active stories"
              icon={<MessageSquare className="h-5 w-5" />}
            />
          </div>

          {/* Quick Management Links */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Management Portals
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="hover:border-foreground/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="p-2 w-fit rounded-lg bg-secondary mb-2">
                    <Users className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle className="text-base">User Accounts</CardTitle>
                  <CardDescription className="text-xs">
                    Manage roles, activation status, and credentials.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-2">
                  <Button variant="ghost" size="sm" asChild className="gap-1 p-0 h-auto font-semibold">
                    <Link to="/admin/users">
                      Manage users <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="hover:border-foreground/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="p-2 w-fit rounded-lg bg-secondary mb-2">
                    <FileText className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle className="text-base">Story Management</CardTitle>
                  <CardDescription className="text-xs">
                    Inspect active and deleted posts across authors.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-2">
                  <Button variant="ghost" size="sm" asChild className="gap-1 p-0 h-auto font-semibold">
                    <Link to="/admin/posts">
                      Manage posts <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="hover:border-foreground/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="p-2 w-fit rounded-lg bg-secondary mb-2">
                    <MessageSquare className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle className="text-base">Comment Moderation</CardTitle>
                  <CardDescription className="text-xs">
                    Review, edit, or remove comments across discussions.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-2">
                  <Button variant="ghost" size="sm" asChild className="gap-1 p-0 h-auto font-semibold">
                    <Link to="/admin/comments">
                      Moderate comments <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UsersTable({ users, refresh, setData }: { users: User[], refresh: () => Promise<void>, setData: React.Dispatch<React.SetStateAction<User[]>> }) {
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const toggleUserStatus = async (user: User) => {
    if (user.isActive) {
      setStatusError(null);
      setDeactivatingUser(user);
    } else {
      setData((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: true } : u)));
      try {
        await adminApi.updateUser(user.id, { isActive: true });
      } catch (e) {
        setStatusError(apiMessage(e));
        setData((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: false } : u)));
      }
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivatingUser) return;
    const user = deactivatingUser;
    setDeactivatingUser(null);
    setStatusError(null);
    
    setData((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: false } : u)));
    try {
      await adminApi.updateUser(user.id, { isActive: false });
    } catch (e) {
      setStatusError(apiMessage(e));
      setData((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: true } : u)));
    }
  };

  return (
    <>
      {statusError && !deactivatingUser && (
        <ErrorState message={statusError} />
      )}
      <div className="hidden md:block rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} size="sm" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email ?? "No email"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "ADMIN" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.isActive ? "success" : "secondary"}
                    className="text-xs"
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/users/${user.id}/edit`}>
                        <PenSquare className="h-3.5 w-3.5 mr-1" /> Edit
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={user.isProtectedAdmin}
                      className={
                        user.isActive
                          ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                          : "text-foreground hover:bg-secondary"
                      }
                      onClick={() => void toggleUserStatus(user)}
                    >
                      {user.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserAvatar name={user.name} size="sm" />
                  <div>
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email ?? "No email"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {user.role}
                  </Badge>
                  <Badge
                    variant={user.isActive ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/users/${user.id}/edit`}>
                    <PenSquare className="h-3.5 w-3.5 mr-1" /> Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={user.isProtectedAdmin}
                  className={
                    user.isActive
                      ? "text-destructive border-destructive/30 hover:bg-destructive/10"
                      : ""
                  }
                  onClick={() => void toggleUserStatus(user)}
                >
                  {user.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmActionDialog
        open={Boolean(deactivatingUser)}
        onOpenChange={(open) => !open && setDeactivatingUser(null)}
        title="Deactivate user?"
        description="They will lose access to the application. You can reactivate their account later if needed."
        confirmLabel="Deactivate"
        variant="destructive"
        isLoading={false}
        error={statusError}
        onConfirm={confirmDeactivate}
      />
    </>
  );
}

export function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Users"
        description="Inspect registered members, adjust administrative roles, and manage access."
        action={
          <Button asChild className="gap-2">
            <Link to="/admin/users/new">
              <Plus className="h-4 w-4" />
              Create user
            </Link>
          </Button>
        }
      />

      <DataGrid<User>
        fetcher={async (page) => (await adminApi.users(page)).data}
        loadingLabel="Loading users…"
        emptyMessage="No user accounts found."
        render={(users, refresh, setData) => <UsersTable users={users} refresh={refresh} setData={setData} />}
      />
    </div>
  );
}

export function AdminUserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER" as Role,
    isActive: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    void adminApi
      .user(id)
      .then((r) => {
        const u = r.data.data;
        setForm({
          name: u.name,
          email: u.email || "",
          password: "",
          role: u.role,
          isActive: u.isActive,
        });
      })
      .catch((e) => setError(apiMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const submitMutation = useMutation(async () => {
    if (id) {
      await adminApi.updateUser(id, {
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: form.isActive,
      });
    } else {
      await adminApi.createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
    }
    navigate("/admin/users");
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitMutation.mutate();
  };

  if (loading) return <LoadingState label="Loading user details…" />;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeading
        title={id ? "Edit User" : "Create New User"}
        description={
          id
            ? "Update credentials, assigned role, or account accessibility."
            : "Provision a new user account with defined credentials and role."
        }
      />

      {error && <ErrorState message={error} />}
      {submitMutation.error && <ErrorState message={submitMutation.error} />}

      <Card className="border-border shadow-sm">
        <form onSubmit={submit}>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="admin-user-name">Full Name</Label>
              <Input
                id="admin-user-name"
                required
                minLength={2}
                maxLength={80}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-user-email">Email Address</Label>
              <Input
                id="admin-user-email"
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {!id && (
              <div className="space-y-2">
                <Label htmlFor="admin-user-password">Password</Label>
                <Input
                  id="admin-user-password"
                  required
                  type="password"
                  minLength={10}
                  placeholder="Minimum 10 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-user-role">Role</Label>
              <select
                id="admin-user-role"
                value={form.role}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as Role })
                }
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            {id && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="admin-user-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isActive: Boolean(checked) })
                  }
                />
                <Label htmlFor="admin-user-active" className="cursor-pointer">
                  Active account (uncheck to deactivate access)
                </Label>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={submitMutation.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitMutation.isSubmitting}>
              {submitMutation.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {id ? "Save user" : "Create user"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function PostsTable({ posts, refresh, setData }: { posts: Post[], refresh: () => Promise<void>, setData: React.Dispatch<React.SetStateAction<Post[]>> }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmRemove = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setDeleteError(null);
    
    setData((prev) => prev.map((p) => (p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p)));
    try {
      await postsApi.remove(id);
    } catch (e) {
      setDeleteError(apiMessage(e));
      setData((prev) => prev.map((p) => (p.id === id ? { ...p, deletedAt: null as any } : p)));
    }
  };

  return (
    <>
      <div className="hidden md:block rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Post</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium text-foreground">
                  {post.title}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {post.author.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={post.deletedAt ? "secondary" : "success"}
                    className="text-xs"
                  >
                    {post.deletedAt ? "Deleted" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!post.deletedAt && (
                      <>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/posts/${post.slug}`}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/posts/${post.id}/edit`}>
                            <PenSquare className="h-3.5 w-3.5 mr-1" /> Edit
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteId(post.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={post.deletedAt ? "secondary" : "success"}
                    className="text-[10px]"
                  >
                    {post.deletedAt ? "Deleted" : "Active"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {post.author.name}
                  </span>
                </div>
                <h3 className="font-semibold text-base">{post.title}</h3>
              </div>

              {!post.deletedAt && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/posts/${post.slug}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/posts/${post.id}/edit`}>
                      <PenSquare className="h-3.5 w-3.5 mr-1" /> Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteId(post.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmActionDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete post?"
        description="It will be hidden from readers. There is no restore action in this interface."
        confirmLabel="Delete post"
        variant="destructive"
        isLoading={false}
        error={deleteError}
        onConfirm={confirmRemove}
      />
    </>
  );
}

export function AdminPostsPage() {
  const [status, setStatus] = useState("active");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Story Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Filter and moderate posts created by community members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="post-status-filter" className="text-sm font-medium whitespace-nowrap">
            Filter status:
          </Label>
          <select
            id="post-status-filter"
            aria-label="Post status filter"
            value={status}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="deleted">Deleted</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <DataGrid<Post>
        dependencies={[status]}
        fetcher={async (page) => (await adminApi.posts(page, status)).data}
        loadingLabel="Loading stories…"
        emptyMessage="No stories found matching this status."
        render={(posts, refresh, setData) => <PostsTable posts={posts} refresh={refresh} setData={setData} />}
      />
    </div>
  );
}

function CommentsTable({ comments, refresh, setData }: { comments: Comment[], refresh: () => Promise<void>, setData: React.Dispatch<React.SetStateAction<Comment[]>> }) {
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setDeleteError(null);
    
    // Optimistically remove comment from the list
    setData((prev) => prev.filter((c) => c.id !== id));
    
    try {
      await commentsApi.remove(id);
    } catch (e) {
      setDeleteError(apiMessage(e));
      await refresh(); // Revert by refetching is safer for deletes if we don't store the deleted comment
    }
  };

  const handleSaveComment = async (newContent: string) => {
    if (!editingComment) return;
    const id = editingComment.id;
    const oldContent = editingComment.content;
    setEditingComment(null);
    
    setData((prev) => prev.map((c) => (c.id === id ? { ...c, content: newContent } : c)));
    try {
      await commentsApi.update(id, newContent);
    } catch (e) {
      setDeleteError(apiMessage(e));
      setData((prev) => prev.map((c) => (c.id === id ? { ...c, content: oldContent } : c)));
    }
  };

  return (
    <>
      <div className="hidden md:block rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Comment</TableHead>
              <TableHead className="w-[25%]">Story</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((comment) => (
              <TableRow key={comment.id}>
                <TableCell className="font-medium text-foreground">
                  <p className="line-clamp-2 text-sm">{comment.content}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <span className="line-clamp-1">
                    {comment.post?.title ?? comment.postId}
                  </span>
                  {comment.post?.deletedAt && (
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      Deleted post
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {comment.author?.name || "[deleted]"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingComment(comment)}
                    >
                      <PenSquare className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteId(comment.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {comments.map((comment) => (
          <Card key={comment.id} className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>By {comment.author?.name || "[deleted]"}</span>
                  {comment.post?.deletedAt && (
                    <Badge variant="secondary" className="text-[10px]">
                      Deleted post
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  On: {comment.post?.title ?? comment.postId}
                </p>
                <p className="text-sm text-foreground pt-1">
                  {comment.content}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingComment(comment)}
                >
                  <PenSquare className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteId(comment.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditCommentDialog
        open={Boolean(editingComment)}
        onOpenChange={(open) => !open && setEditingComment(null)}
        initialContent={editingComment?.content || ""}
        onSave={handleSaveComment}
      />

      <ConfirmActionDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete comment?"
        description="This permanently removes the comment. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={false}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export function AdminCommentsPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Comment Moderation"
        description="Review community feedback, edit inappropriate text, or remove comments."
      />

      <DataGrid<Comment>
        fetcher={async (page) => (await adminApi.comments(page)).data}
        loadingLabel="Loading comments…"
        emptyMessage="No comments found for moderation."
        render={(comments, refresh, setData) => <CommentsTable comments={comments} refresh={refresh} setData={setData} />}
      />
    </div>
  );
}
