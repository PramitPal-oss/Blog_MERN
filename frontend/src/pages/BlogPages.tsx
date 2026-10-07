import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { commentsApi, postsApi } from "../api";
import { apiMessage } from "../api/client";
import type { Comment, Meta, Post } from "../types/api";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../context/AuthContext";
import { useMutation } from "../hooks/useMutation";
import { SafeText } from "../components/SafeText";
import { PostCard } from "../components/PostCard";
import { UserAvatar } from "../components/UserAvatar";
import { LikeButton } from "../components/LikeButton";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare, Pencil, Trash2, ArrowRight } from "lucide-react";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value)
  );

export function BlogListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isHome = location.pathname === "/";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await postsApi.list(page);
      let fetchedPosts = r.data.data;
      if (isHome && page === 1) {
        fetchedPosts = fetchedPosts.slice(0, 3);
      }
      setPosts(fetchedPosts);
      setMeta(r.data.meta);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, isHome]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-12">
      {isHome && (
        <section className="py-12 sm:py-20 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-border">
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              Ideas, carefully considered. <span className="text-primary">Stories that stay with you.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              A thoughtful community for long-form writing, technical explorations, and honest conversation. Join us to share your perspective.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Button size="lg" asChild>
                <Link to="/register">Start writing</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/posts">Explore latest <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:flex flex-1 justify-end">
            <div className="w-72 h-72 rounded-full bg-gradient-to-br from-primary/20 to-secondary/60 flex items-center justify-center relative shadow-inner">
              <MessageSquare className="h-24 w-24 text-primary opacity-80" />
            </div>
          </div>
        </section>
      )}

      {!isHome && (
        <section className="py-6 border-b border-border">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Latest stories
          </h1>
          <p className="text-muted-foreground mt-2">Explore writing from the community.</p>
        </section>
      )}

      {loading ? (
        <LoadingState label="Loading stories…" />
      ) : error ? (
        <ErrorState message={error} retry={load} />
      ) : posts.length === 0 ? (
        <EmptyState>No stories have been published yet.</EmptyState>
      ) : (
        <div className="flex flex-col space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {(!isHome || posts.length > 0) && (
        isHome ? (
          <div className="flex justify-center mt-8 pt-8 border-t border-border">
            <Button variant="ghost" asChild>
              <Link to="/posts">View all stories</Link>
            </Button>
          </div>
        ) : (
          <Pagination meta={meta} onPage={setPage} />
        )
      )}
    </div>
  );
}

import { CommentSection } from "../components/CommentSection";

export function PostDetailsPage() {
  const { slug = "" } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void postsApi
      .getBySlug(slug)
      .then((r) => setPost(r.data.data))
      .catch((e) => setError(apiMessage(e)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingState label="Loading story…" />;
  if (error || !post) return <ErrorState message={error || "Post not found"} />;

  return (
    <div className="space-y-8">
      <article className="max-w-[720px] mx-auto space-y-6">
        {/* Author / Metadata */}
        <div className="flex items-center gap-3">
          <UserAvatar name={post.author.name} size="md" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {post.author.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Published on {formatDate(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Story Title */}
        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-extrabold tracking-tight text-foreground leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 py-2 border-y border-border my-6">
          <LikeButton id={post.id} type="post" initialLikeCount={post.likeCount} initialLikedByMe={post.likedByMe} />
          <div className="flex items-center gap-1.5 h-8 px-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium">{post.commentCount || 0}</span>
          </div>
        </div>

        {/* Story Content with Serif Reading Typography */}
        <div className="font-serif text-lg leading-relaxed text-foreground whitespace-pre-wrap selection:bg-muted">
          <SafeText>{post.content || ""}</SafeText>
        </div>
      </article>

      <CommentSection post={post} />
    </div>
  );
}
