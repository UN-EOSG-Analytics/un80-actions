"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getActionQuestions } from "@/features/questions/queries";
import {
  createQuestion,
  updateQuestion,
  approveQuestion,
  deleteQuestion,
} from "@/features/questions/commands";
import { getActionMilestones } from "@/features/milestones/queries";
import { ReviewStatus } from "@/features/shared/ReviewStatus";
import { TagSelector } from "@/features/shared/TagSelector";
import { VersionHistoryHeader } from "@/features/shared/VersionHistoryHeader";
import type { Tag } from "@/features/tags/queries";
import type { Action, ActionQuestion, ActionMilestone } from "@/types";
import { formatUNDateTime } from "@/lib/format-date";
import { Loader2, MessageCircle, Send, Trash2, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";

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
  exportProps?: { onExport: (format: "word" | "pdf" | "markdown") => void; exporting: boolean };
}) {
  const [questions, setQuestions] = useState<ActionQuestion[]>([]);
  const [milestones, setMilestones] = useState<ActionMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState({
    header: "",
    question_date: "",
    question: "• ",
    milestone_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState({
    header: "",
    question_date: "",
    question: "",
    milestone_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [tagsByQuestionId, setTagsByQuestionId] = useState<
    Record<string, Tag[]>
  >({});

  const HEADER_OPTIONS = ["Task Force", "Steering Committee", "Check-ins"];
  const MILESTONE_NONE_VALUE = "__none__";

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await getActionQuestions(action.id, action.sub_id);
      setQuestions(data);
    } catch {
      // silently fail - UI handles empty state
    } finally {
      setLoading(false);
    }
  };

  const loadMilestones = async () => {
    try {
      const data = await getActionMilestones(action.id, action.sub_id);
      setMilestones(data);
    } catch {
      // silently fail - milestones are optional
    }
  };

  useEffect(() => {
    loadQuestions();
    loadMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.header.trim() || !newQuestion.question_date || !newQuestion.question.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await createQuestion({
        action_id: action.id,
        action_sub_id: action.sub_id,
        header: newQuestion.header.trim(),
        question_date: newQuestion.question_date,
        question: newQuestion.question.trim(),
        milestone_id: newQuestion.milestone_id || null,
      });

      if (result.success) {
        setNewQuestion({
          header: "",
          question_date: "",
          question: "",
          milestone_id: "",
        });
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
      } else {
        setError(result.error ?? "Failed to delete question");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (q: ActionQuestion) => {
    setEditingId(q.id);
    // Ensure content starts with bullet point if it doesn't already
    const question = q.question.trim().startsWith("•") ? q.question : "• " + q.question;
    setEditingQuestion({
      header: q.header || "",
      question_date: q.question_date || "",
      question: question,
      milestone_id: q.milestone_id || "",
    });
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingQuestion({
      header: "",
      question_date: "",
      question: "• ",
      milestone_id: "",
    });
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editingQuestion.header.trim() || !editingQuestion.question_date || !editingQuestion.question.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await updateQuestion(editingId, {
        header: editingQuestion.header.trim(),
        question_date: editingQuestion.question_date,
        question: editingQuestion.question.trim(),
        milestone_id: editingQuestion.milestone_id || null,
      });

      if (result.success) {
        setEditingId(null);
        await loadQuestions();
      } else {
        setError(result.error || "Failed to update question");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Ask Question Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
      >
        <label className="block text-sm font-medium text-slate-700">
          Ask a question
        </label>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Header *
          </label>
          <Select
            value={newQuestion.header}
            onValueChange={(value) => setNewQuestion({ ...newQuestion, header: value })}
            disabled={submitting}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select header..." />
            </SelectTrigger>
            <SelectContent>
              {HEADER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Date *
          </label>
          <input
            type="date"
            value={newQuestion.question_date}
            onChange={(e) => setNewQuestion({ ...newQuestion, question_date: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
            disabled={submitting}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Milestone (optional)
          </label>
          <Select
            value={newQuestion.milestone_id || MILESTONE_NONE_VALUE}
            onValueChange={(value) => setNewQuestion({ ...newQuestion, milestone_id: value === MILESTONE_NONE_VALUE ? "" : value })}
            disabled={submitting}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select milestone..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MILESTONE_NONE_VALUE}>None</SelectItem>
              {milestones.map((milestone) => {
                const milestoneId = milestone.action_sub_id 
                  ? `${milestone.action_id}${milestone.action_sub_id}.${milestone.serial_number}` 
                  : `${milestone.action_id}.${milestone.serial_number}`;
                const label = milestone.description 
                  ? `${milestoneId}: ${milestone.description.substring(0, 50)}${milestone.description.length > 50 ? '...' : ''}`
                  : milestoneId;
                return (
                  <SelectItem key={milestone.id} value={milestone.id}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Question *
          </label>
          <textarea
            value={newQuestion.question}
            onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const textarea = e.currentTarget;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const value = textarea.value;
                
                // Insert bullet point at the start of the new line
                const beforeCursor = value.substring(0, start);
                const afterCursor = value.substring(end);
                const newValue = beforeCursor + "\n• " + afterCursor;
                
                setNewQuestion({ ...newQuestion, question: newValue });
                
                // Set cursor position after the bullet point
                setTimeout(() => {
                  textarea.selectionStart = textarea.selectionEnd = start + 3; // 3 = "\n• ".length
                }, 0);
                
                e.preventDefault();
              }
            }}
            placeholder="• "
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue resize-none"
            disabled={submitting}
            required
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !newQuestion.header.trim() || !newQuestion.question_date || !newQuestion.question.trim()}
            className="bg-un-blue hover:bg-un-blue/90"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Question
              </>
            )}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {exportProps && (
        <VersionHistoryHeader
          title="All questions"
          onExport={exportProps.onExport}
          exporting={exportProps.exporting}
          hasData={questions.length > 0}
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
            const isEditing = editingId === q.id;
            return (
              <div
                key={q.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Header *
                      </label>
                      <Select
                        value={editingQuestion.header}
                        onValueChange={(value) => setEditingQuestion({ ...editingQuestion, header: value })}
                        disabled={saving}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select header..." />
                        </SelectTrigger>
                        <SelectContent>
                          {HEADER_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={editingQuestion.question_date}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, question_date: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Milestone (optional)
                      </label>
                      <Select
                        value={editingQuestion.milestone_id || MILESTONE_NONE_VALUE}
                        onValueChange={(value) => setEditingQuestion({ ...editingQuestion, milestone_id: value === MILESTONE_NONE_VALUE ? "" : value })}
                        disabled={saving}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select milestone..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={MILESTONE_NONE_VALUE}>None</SelectItem>
                          {milestones.map((milestone) => {
                            const milestoneId = milestone.action_sub_id 
                              ? `${milestone.action_id}${milestone.action_sub_id}.${milestone.serial_number}` 
                              : `${milestone.action_id}.${milestone.serial_number}`;
                            const label = milestone.description 
                              ? `${milestoneId}: ${milestone.description.substring(0, 50)}${milestone.description.length > 50 ? '...' : ''}`
                              : milestoneId;
                            return (
                              <SelectItem key={milestone.id} value={milestone.id}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Question *
                      </label>
                      <textarea
                        value={editingQuestion.question}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                        placeholder="• "
                        rows={3}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue resize-none"
                        disabled={saving}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={saving || !editingQuestion.header.trim() || !editingQuestion.question_date || !editingQuestion.question.trim()}
                        className="bg-un-blue hover:bg-un-blue/90"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-3">
                        {q.header || q.question_date || q.milestone_id ? (
                          <div className="space-y-1">
                            {q.header && (
                              <div className="flex flex-wrap items-center gap-2">
                                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-un-blue" />
                                <h4 className="text-sm font-semibold text-slate-800">
                                  {q.header}
                                </h4>
                              </div>
                            )}
                            <div className={q.header ? "ml-6 space-y-1" : "space-y-1"}>
                              {q.question_date && (
                                <p className="text-xs text-slate-500">
                                  Date: {q.question_date}
                                </p>
                              )}
                              {q.milestone_id && (() => {
                                const milestone = milestones.find(m => m.id === q.milestone_id);
                                if (milestone) {
                                  const milestoneId = milestone.action_sub_id 
                                    ? `${milestone.action_id}${milestone.action_sub_id}.${milestone.serial_number}` 
                                    : `${milestone.action_id}.${milestone.serial_number}`;
                                  return (
                                    <p className="text-xs text-slate-500">
                                      Milestone: {milestoneId}
                                    </p>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-un-blue" />
                          </div>
                        )}
                        <div className={q.header || q.question_date || q.milestone_id ? "ml-6" : ""}>
                          <p className="text-sm text-slate-700">
                            {q.question}
                          </p>
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
                            }
                          } finally {
                            setApprovingId(null);
                          }
                        }}
                        approving={approvingId === q.id}
                      />
                      {!q.answer && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-un-blue"
                          onClick={() => startEditing(q)}
                          aria-label="Edit question"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
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
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {(tagsByQuestionId[q.id] ?? []).length > 0 && (
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {(tagsByQuestionId[q.id] ?? []).map((t) => (
                          <Badge
                            key={t.id}
                            variant="outline"
                            className="border-slate-400 bg-slate-100 text-slate-700"
                          >
                            {t.name}
                          </Badge>
                        ))}
                      </span>
                    )}
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
