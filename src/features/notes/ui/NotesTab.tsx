"use client";

import { Button } from "@/components/ui/button";
import { getActionNotes } from "@/features/notes/queries";
import { createNote } from "@/features/notes/commands";
import type { Action, ActionNote } from "@/types";
import { formatUNDateTime } from "@/lib/format-date";
import { Loader2, Plus, StickyNote } from "lucide-react";
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
// NOTES TAB
// =========================================================

export default function NotesTab({ action }: { action: Action }) {
  const [notes, setNotes] = useState<ActionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActionNotes(action.id, action.sub_id);
      setNotes(data);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoading(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

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
      setError("Failed to add note");
    } finally {
      setSubmitting(false);
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
              <div className="flex items-start gap-2">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap text-slate-700">
                    {note.content}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {formatUNDateTime(note.created_at)}
                    {note.user_email && ` by ${note.user_email}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
