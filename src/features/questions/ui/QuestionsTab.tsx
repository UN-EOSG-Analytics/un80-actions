"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActionQuestions } from "@/features/questions/queries";
import {
  createQuestion,
  approveQuestion,
  deleteQuestion,
} from "@/features/questions/commands";
import { ReviewStatus } from "@/features/shared/ReviewStatus";
import { TagSelector } from "@/features/shared/TagSelector";
import { VersionHistoryHeader } from "@/features/shared/VersionHistoryHeader";
import type { Tag } from "@/features/tags/queries";
import type { Action, ActionQuestion } from "@/types";
import { formatUNDateTime } from "@/lib/format-date";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
// QUESTIONS TAB
// =========================================================

export default function QuestionsTab({
  action,
  isAdmin = false,
  exportProps,
}: {
  action: Action;
  isAdmin?: boolean;
  exportProps?: { onExport: (format: "word" | "pdf") => void; exporting: boolean };
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<ActionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tagsByQuestionId, setTagsByQuestionId] = useState<
    Record<string, Tag[]>
  >({});

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActionQuestions(action.id, action.sub_id);
      setQuestions(data);
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setLoading(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createQuestion({
        action_id: action.id,
        action_sub_id: action.sub_id,
        question: newQuestion.trim(),
      });

      if (result.success) {
        setNewQuestion("");
        await loadQuestions();
      } else {
        setError(result.error || "Failed to submit question");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit question");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    setDeletingId(questionId);
    setError(null);
    try {
      const result = await deleteQuestion(questionId);
      if (result.success) {
        await loadQuestions();
        router.refresh();
      } else {
        setError(result.error ?? "Failed to delete question");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Ask Question Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Ask a question
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
            disabled={submitting}
          />
          <Button
            type="submit"
            disabled={submitting || !newQuestion.trim()}
            className="bg-un-blue hover:bg-un-blue/90"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      {exportProps && (
        <VersionHistoryHeader
          title="All questions"
          onExport={exportProps.onExport}
          exporting={exportProps.exporting}
        />
      )}

      {/* Questions List */}
      {loading ? (
        <LoadingState />
      ) : questions.length === 0 ? (
        <EmptyState message="No questions have been asked yet." />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            return (
              <div
                key={q.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-un-blue" />
                      <p className="text-sm font-medium text-slate-700">
                        {q.question}
                      </p>
                      {(tagsByQuestionId[q.id] ?? []).length > 0 && (
                        <span className="flex flex-wrap gap-1.5">
                          {(tagsByQuestionId[q.id] ?? []).map((t) => (
                            <Badge
                              key={t.id}
                              variant="outline"
                              className="bg-slate-50 text-slate-600"
                            >
                              {t.name}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </div>
                    {q.answer && (
                      <div className="ml-6 border-l-2 border-green-200 bg-green-50 py-2 pr-2 pl-3">
                        <p className="text-sm text-slate-600">{q.answer}</p>
                        {q.answered_at && (
                          <p className="mt-1 text-xs text-slate-400">
                            Answered {formatUNDateTime(q.answered_at)}
                            {q.answered_by_email && ` by ${q.answered_by_email}`}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-slate-400">
                        {formatUNDateTime(q.created_at)} by {q.user_email}
                      </p>
                      <ReviewStatus
                        status={q.content_review_status ?? "approved"}
                        reviewedByEmail={q.content_reviewed_by_email}
                        reviewedAt={q.content_reviewed_at}
                        isAdmin={isAdmin}
                        onApprove={async () => {
                          setApprovingId(q.id);
                          try {
                            const result = await approveQuestion(q.id);
                            if (result.success) {
                              await loadQuestions();
                              router.refresh();
                            }
                          } finally {
                            setApprovingId(null);
                          }
                        }}
                        approving={approvingId === q.id}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                        onClick={() => handleDelete(q.id)}
                        disabled={deletingId === q.id}
                        aria-label="Delete question"
                      >
                        {deletingId === q.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <TagSelector
                      entityId={q.id}
                      entityType="question"
                      isAdmin={isAdmin}
                      initialTags={[]}
                      onTagsChange={(tags) =>
                        setTagsByQuestionId((prev) => ({
                          ...prev,
                          [q.id]: tags,
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
