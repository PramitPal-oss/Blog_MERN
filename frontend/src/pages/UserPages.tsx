import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { authApi, postsApi } from "../api";
import { apiMessage } from "../api/client";
import type { Meta, Post } from "../types/api";
import { useAuth } from "../context/AuthContext";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Pagination } from "../components/Pagination";
import { PageHeading } from "../components/PageHeading";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { UserAvatar } from "../components/UserAvatar";
import { useMutation } from "../hooks/useMutation";
import { useOAuthProviders } from "../components/auth/SocialAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  PenSquare,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";

const schema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(160),
  content: z.string().trim().min(1, "Story content is required").max(50000),
});
type Input = z.infer<typeof schema>;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value)
  );

export function PostEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(id));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Input>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!id) return;
    void postsApi
      .get(id)
      .then((r) => {
        if (
          r.data.data.author.id !== auth.user?.id &&
          auth.user?.role !== "ADMIN"
        ) {
          navigate("/403", { replace: true });
          return;
        }
        reset({
          title: r.data.data.title,
          content: r.data.data.content || "",
        });
      })
      .catch((e) => setError(apiMessage(e)))
      .finally(() => setLoading(false));
  }, [id, auth.user, navigate, reset]);

  const submitMutation = useMutation(async (values: Input) => {
    const post = id
      ? (await postsApi.update(id, values)).data.data
      : (await postsApi.create(values)).data.data;
    navigate(`/posts/${post.slug}`);
  });

  const submit = handleSubmit((values) => submitMutation.mutate(values));

  if (loading) return <LoadingState label="Loading editor…" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeading
        title={id ? "Edit story" : "Write a new story"}
        description={
          id
            ? "Refine your narrative, clarify your thoughts, and save changes."
            : "Share insights, experiences, and lessons with the Inkstone community."
        }
      />

      {error && <ErrorState message={error} />}
      {submitMutation.error && <ErrorState message={submitMutation.error} />}

      <Card className="border-border shadow-sm">
        <form onSubmit={submit}>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="post-title" className="text-base font-semibold">
                Title
              </Label>
              <Input
                id="post-title"
                placeholder="Give your story a clear, compelling title..."
                className="text-lg font-medium"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "post-title-error" : undefined}
                {...register("title")}
              />
              {errors.title && (
                <p id="post-title-error" className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-content" className="text-base font-semibold">
                Content
              </Label>
              <Textarea
                id="post-content"
                placeholder="Write your story here... Plain text formatting with line breaks is preserved."
                className="min-h-[360px] sm:min-h-[460px] font-sans text-base leading-relaxed resize-y"
                aria-invalid={Boolean(errors.content)}
                aria-describedby={errors.content ? "post-content-error" : undefined}
                {...register("content")}
              />
              {errors.content && (
                <p id="post-content-error" className="text-xs text-destructive">
                  {errors.content.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSubmitting || submitMutation.isSubmitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting || submitMutation.isSubmitting}>
              {(isSubmitting || submitMutation.isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {id ? "Save changes" : "Publish post"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export function MyPostsPage() {
  const auth = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.user) return;
    setLoading(true);
    try {
      const r = await postsApi.list(page, auth.user.id);
      setPosts(r.data.data);
      setMeta(r.data.meta);
      setError("");
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setLoading(false);
    }
  }, [auth.user, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setDeleteError(null);
    
    setPosts((prev) => prev.filter((p) => p.id !== id));
    try {
      await postsApi.remove(id);
    } catch (e) {
      setDeleteError(apiMessage(e));
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="My stories"
        description="Manage, edit, or publish new stories written under your account."
        action={
          <Button asChild className="gap-2">
            <Link to="/posts/new">
              <Plus className="h-4 w-4" />
              Write a story
            </Link>
          </Button>
        }
      />

      {error && <ErrorState message={error} retry={load} />}

      {loading ? (
        <LoadingState label="Loading stories…" />
      ) : posts.length === 0 ? (
        <EmptyState>You have not published any stories yet.</EmptyState>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Title</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/posts/${post.slug}`}
                        className="hover:underline text-foreground"
                      >
                        {post.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(post.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/posts/${post.id}/edit`}>
                            <PenSquare className="h-4 w-4 mr-1" /> Edit
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
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base">
                      <Link
                        to={`/posts/${post.slug}`}
                        className="hover:underline text-foreground"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/posts/${post.id}/edit`}>
                        <PenSquare className="h-3.5 w-3.5 mr-1" /> Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteId(post.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Pagination meta={meta} onPage={setPage} />

      {/* Delete Confirmation Dialog */}
      <ConfirmActionDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete post?"
        description="It will be hidden from readers. There is no restore action in this interface."
        confirmLabel="Delete post"
        variant="destructive"
        isLoading={false}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export function AccountPage() {
  const auth = useAuth();
  const [search] = useSearchParams();
  const [error, setError] = useState(search.get("oauthError") || "");
  const { providers, status, load } = useOAuthProviders();

  const linkMutation = useMutation(async (provider: "google" | "facebook") => {
    window.location.href = (await authApi.link(provider)).data.data.authorizationUrl;
  });

  if (!auth.user) return null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeading
        title="Account Settings"
        description="Manage your profile information and connected authentication providers."
      />

      {search.get("linked") && (
        <Alert variant="success" className="py-3">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">Success</AlertTitle>
          <AlertDescription className="text-sm">
            {search.get("linked")} account connected successfully.
          </AlertDescription>
        </Alert>
      )}

      {error && <ErrorState message={error} />}
      {linkMutation.error && <ErrorState message={linkMutation.error} />}

      {/* Profile Card */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <UserAvatar name={auth.user.name} size="lg" />
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">{auth.user.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                {auth.user.role}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">Full Name</span>
            <span className="sm:col-span-2 text-sm font-medium text-foreground">
              {auth.user.name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">Email Address</span>
            <span className="sm:col-span-2 text-sm font-medium text-foreground">
              {auth.user.email ?? "Not provided"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">Account Role</span>
            <span className="sm:col-span-2 text-sm font-medium text-foreground">
              {auth.user.role}
            </span>
          </div>

          <Separator className="my-4" />

          {/* Connected Accounts */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Connected Accounts
            </h3>
            <p className="text-xs text-muted-foreground">
              Link external providers to log into Inkstone quickly.
            </p>

            <div className="space-y-2 pt-1">
              {status === "loading" && (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {status === "error" && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertDescription className="flex items-center justify-between text-sm">
                    Failed to load providers.
                    <Button variant="outline" size="sm" onClick={load} className="h-7 px-2">Retry</Button>
                  </AlertDescription>
                </Alert>
              )}
              {status === "ready" && (["google", "facebook"] as const).map((provider) => {
                const isConnected = auth.user!.providers.includes(provider);
                const isAvailable = providers[provider];
                const providerName =
                  provider.charAt(0).toUpperCase() + provider.slice(1);

                return (
                  <div
                    key={provider}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {providerName}
                    </span>
                    {isConnected ? (
                      <Badge variant="success" className="text-xs">
                        Connected
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        disabled={!isAvailable || linkMutation.isSubmitting}
                        onClick={() => linkMutation.mutate(provider)}
                      >
                        {linkMutation.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        {!isAvailable && !linkMutation.isSubmitting ? <><ExternalLink className="h-3.5 w-3.5 mr-1" /> Unavailable</> : <><ExternalLink className="h-3.5 w-3.5 mr-1" /> Connect</>}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
