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
import { Loader2, Plus, Scale, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  exportProps?: { onExport: (format: "word" | "pdf") => void; exporting: boolean };
}) {
  const router = useRouter();
  const [comments, setComments] = useState<ActionLegalComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tagsByCommentId, setTagsByCommentId] = useState<Record<string, Tag[]>>({});

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActionLegalComments(action.id, action.sub_id);
      setComments(data);
    } catch (err) {
      console.error("Failed to load legal comments:", err);
    } finally {
      setLoading(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

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
        router.refresh();
      } else {
        setError(result.error ?? "Failed to delete comment");
      }
    } finally {
      setDeletingId(null);
    }
  };

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
        />
      )}

      {/* Comments List */}
      {loading ? (
        <LoadingState />
      ) : comments.length === 0 ? (
        <EmptyState message="No legal comments have been added yet." />
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isApproved =
              comment.content_review_status === "approved";
            return (
              <div
                key={comment.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <Scale className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {(tagsByCommentId[comment.id] ?? []).length > 0 && (
                          <span className="flex flex-wrap gap-1.5">
                            {(tagsByCommentId[comment.id] ?? []).map((t) => (
                              <Badge
                                key={t.id}
                                variant="outline"
                                className={cn(
                                  "bg-slate-50 text-slate-600",
                                  isApproved && "line-through opacity-70",
                                )}
                              >
                                {t.name}
                              </Badge>
                            ))}
                          </span>
                        )}
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
                              if (result.success) {
                                await loadComments();
                                router.refresh();
                              }
                            } finally {
                              setApprovingId(null);
                            }
                          }}
                          approving={approvingId === comment.id}
                        />
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
                  <div className="shrink-0">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
