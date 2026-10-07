import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { commentsApi } from "../api";
import { apiMessage } from "../api/client";
import type { Comment, Meta, Post } from "../types/api";
import { EmptyState, ErrorState } from "./States";
import { Pagination } from "./Pagination";
import { useAuth } from "../context/AuthContext";
import { useMutation } from "../hooks/useMutation";
import { UserAvatar } from "./UserAvatar";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MessageSquare, Pencil, Trash2, Reply } from "lucide-react";
import { LikeButton } from "./LikeButton";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value)
  );

function ReplyList({ parentId, auth }: { parentId: string, auth: any }) {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await commentsApi.listReplies(parentId, 1);
      setReplies(r.data.data);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="text-sm text-muted-foreground p-4">Loading replies...</div>;
  if (error) return <div className="text-sm text-destructive p-4">{error}</div>;

  return (
    <div className="pl-6 border-l-2 border-border mt-4 space-y-4">
      {replies.map(reply => (
        <CommentItem key={reply.id} comment={reply} isReply auth={auth} onRefresh={load} />
      ))}
    </div>
  );
}

function CommentItem({ comment, isReply = false, auth, onRefresh }: { comment: Comment, isReply?: boolean, auth: any, onRefresh: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [error, setError] = useState("");

  const saveMutation = useMutation(async () => {
    await commentsApi.update(comment.id, editText);
    setIsEditing(false);
    onRefresh();
  });

  const replyMutation = useMutation(async () => {
    await commentsApi.createReply(comment.id, replyText);
    setIsReplying(false);
    setReplyText("");
    onRefresh();
  });

  const deleteMutation = useMutation(async () => {
    await commentsApi.remove(comment.id);
    setDeleteDialog(false);
    onRefresh();
  });

  const canEdit = auth.user?.id === comment.author?.id || auth.user?.role === "ADMIN";
  const isDeleted = !!comment.deletedAt;

  return (
    <Card className={`border-border ${isReply ? "shadow-none border-none bg-transparent" : ""}`}>
      <CardContent className={isReply ? "p-0" : "p-4 sm:p-5"}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <UserAvatar name={comment.author?.name || "[deleted]"} size="sm" />
            <span className="text-sm font-semibold text-foreground">
              {comment.author?.name || "[deleted]"}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
              {formatDate(comment.createdAt)}
            </time>
          </div>

          {!isDeleted && canEdit && !isEditing && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteDialog(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3 pt-2">
            <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[90px] resize-y" maxLength={2000} required />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={saveMutation.isSubmitting} onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="button" size="sm" disabled={saveMutation.isSubmitting || !editText.trim()} onClick={() => saveMutation.mutate()}>
                {saveMutation.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isDeleted ? "text-muted-foreground italic" : "text-foreground"}`}>
            {comment.content}
          </p>
        )}

        {!isDeleted && (
          <div className="flex items-center gap-4 mt-3">
            <LikeButton id={comment.id} type="comment" initialLikeCount={comment.likeCount} initialLikedByMe={comment.likedByMe} />
            {!isReply && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => setIsReplying(!isReplying)}>
                <Reply className="h-4 w-4 mr-1.5" />
                Reply
              </Button>
            )}
          </div>
        )}

        {isReplying && (
          <div className="mt-4 pl-6 border-l-2 border-border space-y-3">
            <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." className="min-h-[80px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsReplying(false)}>Cancel</Button>
              <Button size="sm" disabled={!replyText.trim() || replyMutation.isSubmitting} onClick={() => replyMutation.mutate()}>
                {replyMutation.isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Post Reply
              </Button>
            </div>
          </div>
        )}

        {error && <ErrorState message={error} />}

        {!isReply && (comment.replyCount || 0) > 0 && (
          <ReplyList parentId={comment.id} auth={auth} />
        )}
      </CardContent>

      <ConfirmActionDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete comment?"
        description="This removes the comment content. Replies will remain."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isSubmitting}
        error={deleteMutation.error}
        onConfirm={() => deleteMutation.mutate()}
      />
    </Card>
  );
}

export function CommentSection({ post }: { post: Post }) {
  const auth = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await commentsApi.list(post.id, page, "threads");
      setComments(r.data.data);
      setMeta(r.data.meta);
    } catch (e) {
      setError(apiMessage(e));
    }
  }, [post.id, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const createMutation = useMutation(async (text: string) => {
    await commentsApi.create(post.id, text);
    setContent("");
    setPage(1);
    await load();
  });

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    await createMutation.mutate(content.trim());
  };

  return (
    <section className="max-w-[720px] mx-auto mt-12 pt-8 border-t border-border space-y-6" id="comments">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Discussion ({post.commentCount || 0})
        </h2>
      </div>

      {error && <ErrorState message={error} />}
      {createMutation.error && <ErrorState message={createMutation.error} />}

      {auth.status === "authenticated" ? (
        <Card className="border-border">
          <CardContent className="pt-6">
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-comment" className="text-sm font-semibold">
                  Add to the conversation
                </Label>
                <Textarea id="new-comment" value={content} maxLength={2000} required placeholder="Share your thoughts respectfully..." className="min-h-[100px] resize-y" onChange={(e) => setContent(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={createMutation.isSubmitting || !content.trim()}>
                  {createMutation.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post comment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="p-4 rounded-lg bg-muted/40 border border-border text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">Log in</Link> to join the discussion.
        </div>
      )}

      {comments.length === 0 ? (
        <EmptyState>No comments yet. Be the first to start the conversation.</EmptyState>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} auth={auth} onRefresh={load} />
          ))}
        </div>
      )}

      <Pagination meta={meta} onPage={setPage} />
    </section>
  );
}
