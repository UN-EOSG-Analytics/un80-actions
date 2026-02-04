"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActionLegalComments } from "@/features/legal-comments/queries";
import {
  createLegalComment,
  approveLegalComment,
  deleteLegalComment,
} from "@/features/legal-comments/commands";
import { ReviewStatus } from "@/features/shared/ReviewStatus";
import { TagSelector } from "@/features/shared/TagSelector";
import { VersionHistoryHeader } from "@/features/shared/VersionHistoryHeader";
import type { Tag } from "@/features/tags/queries";
import type { Action, ActionLegalComment } from "@/types";
import { formatUNDateTime } from "@/lib/format-date";
import { CornerDownRight, Loader2, MessageSquare, Plus, Scale, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// =========================================================
// HELPER COMPONENTS
// =========================================================

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <p className="text-sm text-slate-400">{message}</p>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-8">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-un-blue" />
  </div>
);

// =========================================================
// LEGAL TAB
// =========================================================

export default function LegalTab({
  action,
  isAdmin = false,
  exportProps,
}: {
  action: Action;
  isAdmin?: boolean;
  exportProps?: { onExport: (format: "word" | "pdf" | "markdown") => void; exporting: boolean };
}) {
  const [comments, setComments] = useState<ActionLegalComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [tagsByCommentId, setTagsByCommentId] = useState<Record<string, Tag[]>>({});

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getActionLegalComments(action.id, action.sub_id);
      setComments(data);
    } catch {
      // silently fail - UI handles empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createLegalComment({
        action_id: action.id,
        action_sub_id: action.sub_id,
        content: newComment.trim(),
      });

      if (result.success) {
        setNewComment("");
        await loadComments();
      } else {
        setError(result.error || "Failed to add comment");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add comment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const result = await deleteLegalComment(commentId);
      if (result.success) {
        await loadComments();
      } else {
        setError(result.error ?? "Failed to delete comment");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const startReply = (commentId: string) => {
    setReplyingToId(commentId);
    setReplyText("");
    setError(null);
  };

  const cancelReply = () => {
    setReplyingToId(null);
    setReplyText("");
    setError(null);
  };

  const handleReply = async (replyToCommentId: string) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createLegalComment({
        action_id: action.id,
        action_sub_id: action.sub_id,
        content: replyText.trim(),
        reply_to: replyToCommentId,
      });
      if (result.success) {
        setReplyText("");
        setReplyingToId(null);
        await loadComments();
      } else {
        setError(result.error || "Failed to add reply");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reply");
    } finally {
      setSubmitting(false);
    }
  };

  const topLevelComments = comments.filter(
    (c) => c.reply_to == null || c.reply_to === "",
  );
  const repliesByParent = comments.reduce<Record<string, ActionLegalComment[]>>(
    (acc, c) => {
      if (c.reply_to) {
        if (!acc[c.reply_to]) acc[c.reply_to] = [];
        acc[c.reply_to].push(c);
      }
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {/* Add Comment Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Add a comment
        </label>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write your comment..."
          rows={3}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
          disabled={submitting}
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="bg-un-blue hover:bg-un-blue/90"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Comment
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      {exportProps && (
        <VersionHistoryHeader
          title="All comments"
          onExport={exportProps.onExport}
          exporting={exportProps.exporting}
          hasData={comments.length > 0}
        />
      )}

      {/* Comments List (threaded) */}
      {loading ? (
        <LoadingState />
      ) : comments.length === 0 ? (
        <EmptyState message="No legal comments have been added yet." />
      ) : (
        <div className="space-y-3">
          {topLevelComments.map((comment) => {
            const isApproved =
              comment.content_review_status === "approved";
            const replies = repliesByParent[comment.id] ?? [];
            const replyingTo = replyingToId === comment.id;
            return (
              <div key={comment.id} className="space-y-2">
                {/* Main comment */}
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <Scale className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              "text-sm whitespace-pre-wrap text-slate-700",
                              isApproved && "line-through opacity-70",
                            )}
                          >
                            {comment.content}
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              "text-xs text-slate-400",
                              isApproved && "line-through opacity-70",
                            )}
                          >
                            {formatUNDateTime(comment.created_at)}
                            {comment.user_email && ` by ${comment.user_email}`}
                          </p>
                          <ReviewStatus
                            status={
                              comment.content_review_status ?? "approved"
                            }
                            reviewedByEmail={
                              comment.content_reviewed_by_email
                            }
                            reviewedAt={comment.content_reviewed_at}
                            isAdmin={isAdmin}
                            onApprove={async () => {
                              setApprovingId(comment.id);
                              try {
                                const result = await approveLegalComment(
                                  comment.id,
                                );
                                if (result.success) await loadComments();
                              } finally {
                                setApprovingId(null);
                              }
                            }}
                            approving={approvingId === comment.id}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-un-blue hover:bg-un-blue/10"
                            onClick={() => startReply(comment.id)}
                            aria-label="Reply"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Reply
                            {replies.length > 0 && (
                              <span className="ml-0.5 rounded-full bg-un-blue/20 px-1.5 py-0.5 text-[10px] font-semibold">
                                {replies.length}
                              </span>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            onClick={() => handleDelete(comment.id)}
                            disabled={deletingId === comment.id}
                            aria-label="Delete comment"
                          >
                            {deletingId === comment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {(tagsByCommentId[comment.id] ?? []).length > 0 && (
                        <span className="flex flex-wrap justify-end gap-1.5">
                          {(tagsByCommentId[comment.id] ?? []).map((t) => (
                            <Badge
                              key={t.id}
                              variant="outline"
                              className={cn(
                                "border-slate-400 bg-slate-100 text-slate-700",
                                isApproved && "line-through opacity-70",
                              )}
                            >
                              {t.name}
                            </Badge>
                          ))}
                        </span>
                      )}
                      <TagSelector
                        entityId={comment.id}
                        entityType="legal_comment"
                        isAdmin={isAdmin}
                        initialTags={[]}
                        onTagsChange={(tags) =>
                          setTagsByCommentId((prev) => ({
                            ...prev,
                            [comment.id]: tags,
                          }))
                        }
                        hideInlineTags
                      />
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="ml-4 border-l-2 border-slate-200 pl-4">
                    <div className="space-y-2">
                      {replies.map((reply) => {
                        const replyApproved =
                          reply.content_review_status === "approved";
                        return (
                          <div
                            key={reply.id}
                            className="group/reply flex gap-2 rounded-md bg-slate-50/80 p-3 hover:bg-slate-100/80"
                          >
                            <CornerDownRight className="mt-1 h-3 w-3 shrink-0 text-slate-300" />
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "text-sm whitespace-pre-wrap text-slate-700",
                                  replyApproved && "line-through opacity-70",
                                )}
                              >
                                {reply.content}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "text-xs text-slate-400",
                                    replyApproved && "line-through opacity-70",
                                  )}
                                >
                                  {formatUNDateTime(reply.created_at)}
                                  {reply.user_email &&
                                    ` by ${reply.user_email}`}
                                </span>
                                <ReviewStatus
                                  status={
                                    reply.content_review_status ?? "approved"
                                  }
                                  reviewedByEmail={
                                    reply.content_reviewed_by_email
                                  }
                                  reviewedAt={reply.content_reviewed_at}
                                  isAdmin={isAdmin}
                                  onApprove={async () => {
                                    setApprovingId(reply.id);
                                    try {
                                      const result =
                                        await approveLegalComment(reply.id);
                                      if (result.success) await loadComments();
                                    } finally {
                                      setApprovingId(null);
                                    }
                                  }}
                                  approving={approvingId === reply.id}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-400 opacity-0 hover:text-red-600 group-hover/reply:opacity-100"
                                  onClick={() => handleDelete(reply.id)}
                                  disabled={deletingId === reply.id}
                                  aria-label="Delete reply"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reply form */}
                {replyingTo && (
                  <div className="ml-4 border-l-2 border-un-blue/30 bg-un-blue/5 pl-4">
                    <div className="space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        rows={2}
                        className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                        disabled={submitting}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={cancelReply}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleReply(comment.id)}
                          disabled={submitting || !replyText.trim()}
                          className="bg-un-blue hover:bg-un-blue/90"
                        >
                          {submitting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CornerDownRight className="h-3 w-3" />
                          )}
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
