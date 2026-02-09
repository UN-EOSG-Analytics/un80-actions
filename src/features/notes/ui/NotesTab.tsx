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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getActionNotes } from "@/features/notes/queries";
import { getActionQuestions } from "@/features/questions/queries";
import { createNote, approveNote, deleteNote } from "@/features/notes/commands";
import { ReviewStatus } from "@/features/shared/ReviewStatus";
import { TagSelector } from "@/features/shared/TagSelector";
import { VersionHistoryHeader } from "@/features/shared/VersionHistoryHeader";
import type { Tag } from "@/features/tags/queries";
import type { Action, ActionNote, ActionQuestion } from "@/types";
import { formatUNDate, formatUNDateTime } from "@/lib/format-date";
import { BoldText } from "@/features/shared/markdown-bold";
import { NoteEditor, isNoteContentEmpty } from "@/features/notes/ui/NoteEditor";
import { Loader2, Plus, StickyNote, Trash2, Pencil, X, Send, MessageCircle, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { updateNote } from "@/features/notes/commands";

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
// NOTES TAB
// =========================================================

export default function NotesTab({
  action,
  isAdmin = false,
  exportProps,
}: {
  action: Action;
  isAdmin?: boolean;
  exportProps?: { onExport: (format: "word" | "pdf" | "markdown") => void; exporting: boolean };
}) {
  const HEADER_OPTIONS = ["Task Force", "Steering Committee", "Check-ins"];
  const [notes, setNotes] = useState<ActionNote[]>([]);
  const [questions, setQuestions] = useState<ActionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [newNote, setNewNote] = useState({
    header: "",
    note_date: "",
    content: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState({
    header: "",
    note_date: "",
    content: "",
  });
  const [saving, setSaving] = useState(false);
  const [tagsByNoteId, setTagsByNoteId] = useState<Record<string, Tag[]>>({});

  const loadNotes = async () => {
    if (!isAdmin) return; // Notes are admin-only
    setLoading(true);
    try {
      const data = await getActionNotes(action.id, action.sub_id);
      setNotes(data);
    } catch {
      // silently fail - UI handles empty state
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    if (!isAdmin) return; // Questions are admin-only
    setLoadingQuestions(true);
    try {
      const data = await getActionQuestions(action.id, action.sub_id);
      setQuestions(data);
    } catch {
      // silently fail - questions are optional
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    loadNotes();
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.header.trim() || !newNote.note_date || isNoteContentEmpty(newNote.content)) {
      setError("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await createNote({
        action_id: action.id,
        action_sub_id: action.sub_id || "",
        header: newNote.header.trim(),
        note_date: newNote.note_date,
        content: newNote.content.trim(),
      });

      if (result.success) {
        setNewNote({
          header: "",
          note_date: "",
          content: "",
        });
        await loadNotes();
      } else {
        setError(result.error || "Failed to add note");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      const result = await deleteNote(noteId);
      if (result.success) {
        await loadNotes();
      } else {
        setError(result.error ?? "Failed to delete note");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (note: ActionNote) => {
    setEditingId(note.id);
    setEditingNote({
      header: note.header || "",
      note_date: note.note_date || "",
      content: note.content || "",
    });
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingNote({
      header: "",
      note_date: "",
      content: "",
    });
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editingNote.header.trim() || !editingNote.note_date || isNoteContentEmpty(editingNote.content)) {
      setError("Please fill in all fields");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await updateNote(editingId, {
        header: editingNote.header.trim(),
        note_date: editingNote.note_date,
        content: editingNote.content.trim(),
      });

      if (result.success) {
        setEditingId(null);
        setEditingNote({
          header: "",
          note_date: "",
          content: "",
        });
        await loadNotes();
      } else {
        setError(result.error || "Failed to update note");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* View Questions Collapsible Section */}
      {isAdmin && questions.length > 0 && (
        <Collapsible open={showQuestions} onOpenChange={setShowQuestions}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-un-blue" />
                <span className="text-sm font-medium text-slate-700">
                  View Questions ({questions.length})
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform ${
                  showQuestions ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="rounded-md border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    {question.header && (
                      <span className="text-xs font-semibold text-slate-700">
                        {question.header}
                      </span>
                    )}
                    {question.question_date && (
                      <span className="text-xs text-slate-500">
                        {formatUNDate(question.question_date)}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-600 line-clamp-3">
                    <BoldText>{question.question}</BoldText>
                  </p>
                  {question.answer && (
                    <div className="mt-2 rounded border-l-2 border-green-300 bg-green-50/50 pl-2">
                      <p className="whitespace-pre-wrap text-xs text-slate-600 line-clamp-2">
                        <BoldText>{question.answer}</BoldText>
                      </p>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatUNDateTime(question.created_at)} · {question.user_email}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Add Note Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
      >
        <label className="block text-base font-semibold text-slate-800">
          Add a note
        </label>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Header *
          </label>
          <Select
            value={newNote.header}
            onValueChange={(value) => setNewNote({ ...newNote, header: value })}
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
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Date *
          </label>
          <input
            type="date"
            value={newNote.note_date}
            onChange={(e) => setNewNote({ ...newNote, note_date: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
            disabled={submitting}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Note *
          </label>
          <NoteEditor
            key="new-note"
            value={newNote.content}
            onChange={(html) => setNewNote({ ...newNote, content: html })}
            placeholder="• "
            disabled={submitting}
            minRows={3}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !newNote.header.trim() || !newNote.note_date || isNoteContentEmpty(newNote.content)}
            className="bg-un-blue hover:bg-un-blue/90"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Note
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {exportProps && (
        <VersionHistoryHeader
          title="All notes"
          onExport={exportProps.onExport}
          exporting={exportProps.exporting}
          hasData={notes.length > 0}
        />
      )}

      {/* Notes List */}
      {loading ? (
        <LoadingState />
      ) : notes.length === 0 ? (
        <EmptyState message="No notes have been added yet." />
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const isEditing = editingId === note.id;
            return (
              <div
                key={note.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {isEditing ? (
                  <div className="space-y-4 p-5">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Header *
                      </label>
                      <Select
                        value={editingNote.header}
                        onValueChange={(value) => setEditingNote({ ...editingNote, header: value })}
                        disabled={saving}
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
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={editingNote.note_date}
                        onChange={(e) => setEditingNote({ ...editingNote, note_date: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                        disabled={saving}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Note *
                      </label>
                      <NoteEditor
                        key={editingId}
                        value={editingNote.content}
                        onChange={(html) => setEditingNote({ ...editingNote, content: html })}
                        placeholder=""
                        disabled={saving}
                        minRows={4}
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
                        disabled={saving || !editingNote.header.trim() || !editingNote.note_date || isNoteContentEmpty(editingNote.content)}
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
                    <div className="flex items-start justify-between gap-4 p-5">
                      <div className="min-w-0 flex-1 space-y-4">
                        {/* Header: category + date */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          {note.header && (
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 items-center justify-center rounded-lg bg-amber-100 px-2.5">
                                <StickyNote className="h-4 w-4 text-amber-600" />
                              </span>
                              <h4 className="text-base font-semibold tracking-tight text-slate-800">
                                {note.header}
                              </h4>
                            </div>
                          )}
                          {note.note_date && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {formatUNDate(note.note_date)}
                            </span>
                          )}
                        </div>
                        {/* Note body */}
                        <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
                          {note.content.trim().startsWith("<") ? (
                            <div
                              className="prose prose-sm max-w-none text-[15px] leading-relaxed text-slate-700 [&_p]:whitespace-pre-wrap [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-0.5"
                              dangerouslySetInnerHTML={{ __html: note.content }}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
                              <BoldText>{note.content}</BoldText>
                            </p>
                          )}
                        </div>
                        {/* Footer: meta + actions */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-600">{formatUNDateTime(note.created_at)}</span>
                            <span className="mx-1.5">·</span>
                            <span>{note.user_email}</span>
                          </p>
                          <ReviewStatus
                            status={note.content_review_status ?? "approved"}
                            reviewedByEmail={note.content_reviewed_by_email}
                            reviewedAt={note.content_reviewed_at}
                            isAdmin={isAdmin}
                            onApprove={async () => {
                              setApprovingId(note.id);
                              try {
                                const result = await approveNote(note.id);
                                if (result.success) {
                                  await loadNotes();
                                }
                              } finally {
                                setApprovingId(null);
                              }
                            }}
                            approving={approvingId === note.id}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-slate-500 hover:bg-slate-100 hover:text-un-blue"
                            onClick={() => startEditing(note)}
                            aria-label="Edit note"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDelete(note.id)}
                            disabled={deletingId === note.id}
                            aria-label="Delete note"
                          >
                            {deletingId === note.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {(tagsByNoteId[note.id] ?? []).length > 0 && (
                          <span className="flex flex-wrap justify-end gap-1.5">
                            {(tagsByNoteId[note.id] ?? []).map((t) => (
                              <Badge
                                key={t.id}
                                variant="secondary"
                                className="border-0 bg-amber-100 text-amber-800 hover:bg-amber-200/80"
                              >
                                {t.name}
                              </Badge>
                            ))}
                          </span>
                        )}
                        <TagSelector
                          entityId={note.id}
                          entityType="note"
                          isAdmin={isAdmin}
                          initialTags={[]}
                          onTagsChange={(tags) =>
                            setTagsByNoteId((prev) => ({ ...prev, [note.id]: tags }))
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
