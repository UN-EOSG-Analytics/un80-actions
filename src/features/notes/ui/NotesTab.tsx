"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActionNotes } from "@/features/notes/queries";
import { createNote, approveNote, deleteNote } from "@/features/notes/commands";
import { ReviewStatus } from "@/features/shared/ReviewStatus";
import { TagSelector } from "@/features/shared/TagSelector";
import { VersionHistoryHeader } from "@/features/shared/VersionHistoryHeader";
import type { Tag } from "@/features/tags/queries";
import type { Action, ActionNote } from "@/types";
import { formatUNDateTime } from "@/lib/format-date";
import { Loader2, Plus, StickyNote, Trash2 } from "lucide-react";
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
  const [notes, setNotes] = useState<ActionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tagsByNoteId, setTagsByNoteId] = useState<Record<string, Tag[]>>({});

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await getActionNotes(action.id, action.sub_id);
      setNotes(data);
    } catch (err) {
      console.error("Failed to load notes:", err);
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
    if (!newNote.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createNote({
        action_id: action.id,
        action_sub_id: action.sub_id,
        content: newNote.trim(),
      });

      if (result.success) {
        setNewNote("");
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

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Add a note
        </label>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write your note..."
          rows={3}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
          disabled={submitting}
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !newNote.trim()}
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
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
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
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
