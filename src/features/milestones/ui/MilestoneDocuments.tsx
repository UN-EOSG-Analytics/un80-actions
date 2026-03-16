"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionAttachment, AttachmentComment } from "@/types";
import type { ActionMilestone } from "@/types";
import {
  Check,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileIcon(contentType: string, filename: string) {
  if (contentType.startsWith("image/")) {
    return <ImageIcon className="h-5 w-5 text-purple-500" />;
  }
  if (contentType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-600">
        PDF
      </div>
    );
  }
  if (contentType.includes("word") || filename.toLowerCase().match(/\.(doc|docx)$/)) {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-600">
        DOC
      </div>
    );
  }
  return <FileText className="h-5 w-5 text-slate-400" />;
}

function formatUploadDate(date: Date) {
  const diffDays = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatMilestoneLabel(milestone: ActionMilestone) {
  return milestone.is_public
    ? "Public"
    : milestone.milestone_type.charAt(0).toUpperCase() + milestone.milestone_type.slice(1);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MilestoneDocumentsProps {
  actionId: number;
  actionSubId: string | null;
  milestones: ActionMilestone[];
  attachments: ActionAttachment[];
  attachmentCount: number;
  loading: boolean;
  uploading: boolean;
  uploadError: string | null;
  isAdmin: boolean;
  onUpload: (e: React.FormEvent<HTMLFormElement>) => void;
  onDeleteAttachment: (id: string) => void;
  onSaveAttachment: (id: string, title: string | null, description: string | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MilestoneDocuments({
  milestones,
  attachments,
  attachmentCount,
  loading,
  uploading,
  uploadError,
  isAdmin,
  onUpload,
  onDeleteAttachment,
  onSaveAttachment,
}: MilestoneDocumentsProps) {
  // Local state: per-attachment edit form and comments
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [fileSelected, setFileSelected] = useState(false);

  const [showCommentsId, setShowCommentsId] = useState<string | null>(null);
  const [loadingCommentsId, setLoadingCommentsId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, AttachmentComment[]>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<Record<string, string>>({});

  const startEdit = (att: ActionAttachment) => {
    setEditingId(att.id);
    setEditForm({ title: att.title ?? "", description: att.description ?? "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: "", description: "" });
  };

  const toggleComments = async (attachmentId: string) => {
    const next = showCommentsId === attachmentId ? null : attachmentId;
    setShowCommentsId(next);
    if (!next || comments[attachmentId]) return;

    setLoadingCommentsId(attachmentId);
    try {
      const { getAttachmentComments } = await import("@/features/attachments/queries");
      const data = await getAttachmentComments(attachmentId);
      setComments((prev) => ({ ...prev, [attachmentId]: data }));
    } catch {
      setComments((prev) => ({ ...prev, [attachmentId]: [] }));
    } finally {
      setLoadingCommentsId(null);
    }
  };

  const submitComment = async (attachmentId: string) => {
    const text = (newCommentText[attachmentId] ?? "").trim();
    if (!text) return;
    setCommentError((prev) => ({ ...prev, [attachmentId]: "" }));
    setSubmittingId(attachmentId);
    try {
      const { createAttachmentComment } = await import("@/features/attachments/commands");
      const result = await createAttachmentComment(attachmentId, text);
      if (result?.success && result.comment) {
        const c = result.comment;
        setComments((prev) => ({
          ...prev,
          [attachmentId]: [
            ...(prev[attachmentId] ?? []),
            {
              ...c,
              is_legal: c.is_legal ?? false,
              created_at: typeof c.created_at === "string" ? new Date(c.created_at) : c.created_at,
            },
          ],
        }));
        setNewCommentText((prev) => ({ ...prev, [attachmentId]: "" }));
      } else if (result && !result.success) {
        setCommentError((prev) => ({
          ...prev,
          [attachmentId]: result.error ?? "Failed to post comment",
        }));
      }
    } catch {
      setCommentError((prev) => ({
        ...prev,
        [attachmentId]: "Failed to post comment. Please try again.",
      }));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
        <Paperclip className="h-4 w-4" />
        Documents{" "}
        {attachmentCount > 0 && (
          <span className="font-normal text-slate-500">({attachmentCount})</span>
        )}
      </h3>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {loading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span className="text-sm text-slate-500">Loading…</span>
          </div>
        ) : attachments.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400 italic">No documents yet</p>
        ) : (
          <div className="mb-4 space-y-3">
            {attachments.map((att) => {
              const linkedMilestone = milestones.find((m) => m.id === att.milestone_id);
              const isEditing = editingId === att.id;

              return (
                <div
                  key={att.id}
                  className="group relative rounded-lg border border-slate-200 bg-linear-to-br from-white to-slate-50/50 p-4 transition-all hover:border-un-blue hover:shadow-sm"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          placeholder={att.original_filename}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Add a description..."
                          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            onSaveAttachment(att.id, editForm.title || null, editForm.description || null);
                            cancelEdit();
                          }}
                          className="bg-un-blue hover:bg-un-blue/90"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      {/* Icon / download */}
                      {isAdmin ? (
                        <a
                          href={`/api/attachments/${att.id}/download`}
                          download={att.original_filename}
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 transition-colors hover:bg-un-blue/10"
                        >
                          {getFileIcon(att.content_type, att.original_filename)}
                        </a>
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          {getFileIcon(att.content_type, att.original_filename)}
                        </div>
                      )}

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-800">
                              {att.title ?? att.original_filename}
                            </h4>
                            {att.title && (
                              <p className="text-xs text-slate-400">{att.original_filename}</p>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => toggleComments(att.id)}
                                className={`rounded p-1.5 transition-all ${
                                  showCommentsId === att.id
                                    ? "bg-un-blue/10 text-un-blue"
                                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                }`}
                                title="Comments"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                              <a
                                href={`/api/attachments/${att.id}/download`}
                                download={att.original_filename}
                                className="rounded p-1.5 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-un-blue/10 hover:text-un-blue"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => startEdit(att)}
                                className="rounded p-1.5 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAttachment(att.id)}
                                className="rounded p-1.5 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {att.description && (
                          <p className="mb-2 text-sm text-slate-600">{att.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <div>{formatUploadDate(att.uploaded_at)}</div>
                          {att.uploaded_by_email?.trim() ? (
                            <>
                              <span className="text-slate-300">•</span>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span>{att.uploaded_by_email}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400">Unknown uploader</span>
                            </>
                          )}
                          <span className="text-slate-300">•</span>
                          <Badge variant="outline" className="text-[10px]">
                            {linkedMilestone ? formatMilestoneLabel(linkedMilestone) : "General"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Per-attachment comments */}
                  {showCommentsId === att.id && (
                    <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                      {loadingCommentsId === att.id ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          <span className="text-sm text-slate-500">Loading…</span>
                        </div>
                      ) : (
                        <>
                          {/* Team comments panel */}
                          <div className="rounded-lg border border-l-4 border-slate-200 border-l-un-blue bg-slate-50/30">
                            <div className="flex items-center gap-2 border-b border-slate-200 bg-white/80 px-3 py-2">
                              <User className="h-4 w-4 text-un-blue" />
                              <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                                Team comments
                              </span>
                              {(comments[att.id] ?? []).filter((c) => !c.is_legal).length > 0 && (
                                <span className="rounded-full bg-un-blue/15 px-2 py-0.5 text-[10px] font-semibold text-un-blue">
                                  {(comments[att.id] ?? []).filter((c) => !c.is_legal).length}
                                </span>
                              )}
                            </div>
                            <div className="p-2">
                              {(comments[att.id] ?? []).filter((c) => !c.is_legal).length === 0 ? (
                                <p className="py-3 text-center text-xs text-slate-400">
                                  No team comments yet.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {(comments[att.id] ?? [])
                                    .filter((c) => !c.is_legal)
                                    .map((c) => (
                                      <div
                                        key={c.id}
                                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                      >
                                        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-un-blue/10 text-[9px] font-semibold text-un-blue">
                                            {(c.user_email?.[0] ?? "U").toUpperCase()}
                                          </div>
                                          {c.user_email ? (
                                            <span className="font-medium text-slate-600">
                                              {c.user_email}
                                            </span>
                                          ) : (
                                            <span className="italic">Unknown user</span>
                                          )}
                                          <span>
                                            {new Date(c.created_at).toLocaleString(undefined, {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                            })}
                                          </span>
                                        </div>
                                        <p className="whitespace-pre-wrap text-slate-700">
                                          {c.comment}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Comment compose */}
                          {isAdmin && (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <textarea
                                  value={newCommentText[att.id] ?? ""}
                                  onChange={(e) => {
                                    setNewCommentText((prev) => ({
                                      ...prev,
                                      [att.id]: e.target.value,
                                    }));
                                    if (commentError[att.id]) {
                                      setCommentError((prev) => {
                                        const next = { ...prev };
                                        delete next[att.id];
                                        return next;
                                      });
                                    }
                                  }}
                                  placeholder="Add a comment…"
                                  className="min-h-18 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                                  rows={2}
                                  disabled={submittingId === att.id}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => submitComment(att.id)}
                                  disabled={
                                    submittingId === att.id ||
                                    !(newCommentText[att.id] ?? "").trim()
                                  }
                                  className="shrink-0 bg-un-blue hover:bg-un-blue/90"
                                >
                                  {submittingId === att.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="mr-1 h-3.5 w-3.5" />
                                      Post
                                    </>
                                  )}
                                </Button>
                              </div>
                              {commentError[att.id] && (
                                <p className="text-sm text-red-600">{commentError[att.id]}</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Upload form (admin only) */}
        {isAdmin && (
          <form className="mt-3" onSubmit={onUpload}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                {milestones.length > 0 && (
                  <div className="min-w-35">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Attach to
                    </label>
                    <select
                      name="milestone_id"
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                      disabled={uploading}
                    >
                      <option value="">General</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>
                          {formatMilestoneLabel(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <label className="min-w-30 flex-1">
                  <span className="mb-1 block text-xs font-medium text-slate-600">File</span>
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.doc,.docx,image/*,.txt,.csv"
                    required
                    onChange={(e) => setFileSelected(!!e.target.files?.length)}
                    className="block w-full text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-un-blue/10 file:px-3 file:py-1.5 file:text-sm file:text-un-blue file:hover:bg-un-blue/20"
                    disabled={uploading}
                  />
                </label>
              </div>

              {fileSelected && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      name="title"
                      placeholder="Document title..."
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                      disabled={uploading}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      name="description"
                      placeholder="Brief description..."
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                      disabled={uploading}
                    />
                  </div>
                </div>
              )}

              {fileSelected && (
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="default"
                    disabled={uploading}
                    className="bg-un-blue hover:bg-un-blue/90"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Paperclip className="mr-2 h-4 w-4" />
                        Upload Document
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            {uploadError && (
              <p className="mt-2 text-sm text-red-600">{uploadError}</p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
