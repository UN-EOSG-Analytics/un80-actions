"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActionQuestions } from "@/features/questions/queries";
import { createQuestion } from "@/features/questions/commands";
import type { Action, ActionQuestion } from "@/types";
import { formatUNDateTime } from "@/lib/format-date";
import { Loader2, MessageCircle, Send } from "lucide-react";
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

export default function QuestionsTab({ action }: { action: Action }) {
  const [questions, setQuestions] = useState<ActionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("Failed to submit question");
    } finally {
      setSubmitting(false);
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

      {/* Questions List */}
      {loading ? (
        <LoadingState />
      ) : questions.length === 0 ? (
        <EmptyState message="No questions have been asked yet." />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-un-blue" />
                  <p className="text-sm font-medium text-slate-700">
                    {q.question}
                  </p>
                </div>
                {q.answer ? (
                  <div className="ml-6 border-l-2 border-green-200 bg-green-50 py-2 pr-2 pl-3">
                    <p className="text-sm text-slate-600">{q.answer}</p>
                    {q.answered_at && (
                      <p className="mt-1 text-xs text-slate-400">
                        Answered {formatUNDateTime(q.answered_at)}
                        {q.answered_by_email && ` by ${q.answered_by_email}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="ml-6">
                    <Badge className="border border-amber-200 bg-amber-100 text-amber-700">
                      Awaiting answer
                    </Badge>
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  {formatUNDateTime(q.created_at)} by {q.user_email}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
