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
import { getActionNotes } from "@/features/notes/queries";
import { createNote, approveNote, deleteNote } from "@/features/notes/commands";
import { ReviewStatus } from "@/features/shared/ReviewStatus";
import { TagSelector } from "@/features/shared/TagSelector";
import { VersionHistoryHeader } from "@/features/shared/VersionHistoryHeader";
import type { Tag } from "@/features/tags/queries";
import type { Action, ActionNote } from "@/types";
import { formatUNDateTime } from "@/lib/format-date";
import { Loader2, Plus, StickyNote, Trash2, Pencil, X, Send } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState({
    header: "",
    note_date: "",
    content: "• ",
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

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.header.trim() || !newNote.note_date || !newNote.content.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await createNote({
        action_id: action.id,
        action_sub_id: action.sub_id,
        header: newNote.header.trim(),
        note_date: newNote.note_date,
        content: newNote.content.trim(),
      });

      if (result.success) {
        setNewNote({
          header: "",
          note_date: "",
          content: "• ",
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
    // Ensure content starts with bullet point if it doesn't already
    const content = note.content.trim().startsWith("•") ? note.content : "• " + note.content;
    setEditingNote({
      header: note.header || "",
      note_date: note.note_date || "",
      content: content,
    });
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingNote({
      header: "",
      note_date: "",
      content: "• ",
    });
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editingNote.header.trim() || !editingNote.note_date || !editingNote.content.trim()) {
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
      {/* Add Note Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
      >
        <label className="block text-sm font-medium text-slate-700">
          Add a note
        </label>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
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
          <label className="mb-1 block text-xs font-medium text-slate-600">
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
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Note *
          </label>
          <textarea
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
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
                
                setNewNote({ ...newNote, content: newValue });
                
                // Set cursor position after the bullet point
                setTimeout(() => {
                  textarea.selectionStart = textarea.selectionEnd = start + 3; // 3 = "\n• ".length
                }, 0);
                
                e.preventDefault();
              }
            }}
            placeholder="• "
            rows={3}
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
            disabled={submitting}
            required
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !newNote.header.trim() || !newNote.note_date || !newNote.content.trim()}
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
        <div className="space-y-3">
          {notes.map((note) => {
            const isEditing = editingId === note.id;
            return (
              <div
                key={note.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
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
                      <label className="mb-1 block text-xs font-medium text-slate-600">
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
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Note *
                      </label>
                      <textarea
                        value={editingNote.content}
                        onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
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
                            
                            setEditingNote({ ...editingNote, content: newValue });
                            
                            // Set cursor position after the bullet point
                            setTimeout(() => {
                              textarea.selectionStart = textarea.selectionEnd = start + 3; // 3 = "\n• ".length
                            }, 0);
                            
                            e.preventDefault();
                          }
                        }}
                        placeholder="• "
                        rows={4}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue resize-none"
                        disabled={saving}
                        required
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
                        disabled={saving || !editingNote.header.trim() || !editingNote.note_date || !editingNote.content.trim()}
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
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div className="min-w-0 flex-1">
                          {(note.header || note.note_date) && (
                            <div className="mb-2 space-y-1">
                              {note.header && (
                                <h4 className="text-sm font-semibold text-slate-800">
                                  {note.header}
                                </h4>
                              )}
                              {note.note_date && (
                                <p className={`text-xs text-slate-500 ${note.header ? "" : ""}`}>
                                  Date: {note.note_date}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm whitespace-pre-wrap text-slate-700">
                              {note.content}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-slate-400">
                              {formatUNDateTime(note.created_at)}
                              {note.user_email && ` by ${note.user_email}`}
                            </p>
                            <ReviewStatus
                              status={
                                note.content_review_status ?? "approved"
                              }
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
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-un-blue"
                              onClick={() => startEditing(note)}
                              aria-label="Edit note"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-600"
                              onClick={() => handleDelete(note.id)}
                              disabled={deletingId === note.id}
                              aria-label="Delete note"
                            >
                              {deletingId === note.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {(tagsByNoteId[note.id] ?? []).length > 0 && (
                          <span className="flex flex-wrap justify-end gap-1.5">
                            {(tagsByNoteId[note.id] ?? []).map((t) => (
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
