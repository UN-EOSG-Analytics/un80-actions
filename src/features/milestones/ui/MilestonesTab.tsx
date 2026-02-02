"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getActionMilestones,
  getMilestoneVersions,
  type MilestoneVersion,
} from "@/features/milestones/queries";
import { updateMilestone, approveMilestoneContent } from "@/features/milestones/commands";
import {
  getActionAttachments,
  getActionAttachmentCount,
} from "@/features/attachments/queries";
import {
  deleteActionAttachment,
  updateAttachmentMetadata,
} from "@/features/attachments/commands";
import { ReviewStatus } from "@/features/shared/ReviewStatus";

import type { Action, ActionMilestone, ActionAttachment } from "@/types";
import {
  Calendar,
  Check,
  ChevronDown,
  History,
  Loader2,
  Paperclip,
  Pencil,
  Download,
  Trash2,
  FileText,
  ImageIcon,
  File,
  User,
} from "lucide-react";
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
// MILESTONES TAB
// =========================================================

export default function MilestonesTab({
  action,
  isAdmin = false,
}: {
  action: Action;
  isAdmin?: boolean;
}) {
  const [milestones, setMilestones] = useState<ActionMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: "",
    deadline: "",
    updates: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMilestones, setOpenMilestones] = useState<Set<string>>(new Set());
  const [versions, setVersions] = useState<Record<string, MilestoneVersion[]>>(
    {},
  );
  const [loadingVersions, setLoadingVersions] = useState<
    Record<string, boolean>
  >({});
  const [attachments, setAttachments] = useState<ActionAttachment[]>([]);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingAttachment, setEditingAttachment] = useState<string | null>(null);
  const [attachmentForm, setAttachmentForm] = useState({ title: "", description: "" });
  const [fileSelected, setFileSelected] = useState(false);
  const router = useRouter();

  const getFileIcon = (contentType: string, filename: string) => {
    if (contentType.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-purple-500" />;
    }
    if (
      contentType === "application/pdf" ||
      filename.toLowerCase().endsWith(".pdf")
    ) {
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-600">
          PDF
        </div>
      );
    }
    if (
      contentType.includes("word") ||
      filename.toLowerCase().match(/\.(doc|docx)$/)
    ) {
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-600">
          DOC
        </div>
      );
    }
    return <FileText className="h-5 w-5 text-slate-400" />;
  };

  const formatUploadDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" });
  };

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActionMilestones(action.id, action.sub_id);
      setMilestones(data);
    } catch (err) {
      console.error("Failed to load milestones:", err);
    } finally {
      setLoading(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const getMilestoneTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      first: "First Milestone",
      second: "Second Milestone",
      third: "Third Milestone",
      upcoming: "Upcoming",
      final: "Final",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-slate-100 text-slate-600",
      submitted: "bg-blue-100 text-blue-700",
      under_review: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-slate-100 text-slate-600";
  };

  const startEditing = (milestone: ActionMilestone) => {
    setEditingId(milestone.id);
    setEditForm({
      description: milestone.description || "",
      deadline: milestone.deadline || "",
      updates: milestone.updates || "",
    });
    setError(null);
    // Ensure the collapsible is open so the edit form is visible
    setOpenMilestones(prev => new Set([...prev, milestone.id]));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ description: "", deadline: "", updates: "" });
    setError(null);
  };

  const handleSave = async (milestoneId: string) => {
    setSaving(true);
    setError(null);

    try {
      const result = await updateMilestone(milestoneId, {
        description: editForm.description || null,
        deadline: editForm.deadline || null,
        updates: editForm.updates || null,
      });

      if (result.success) {
        setEditingId(null);
        await loadMilestones();
        // Reload versions for this milestone
        await loadVersionsForMilestone(milestoneId);
      } else {
        setError(result.error || "Failed to save milestone");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save milestone");
    } finally {
      setSaving(false);
    }
  };

  const toggleMilestone = (milestoneId: string) => {
    const newOpen = new Set(openMilestones);
    if (newOpen.has(milestoneId)) {
      newOpen.delete(milestoneId);
    } else {
      newOpen.add(milestoneId);
      if (!versions[milestoneId]) {
        loadVersionsForMilestone(milestoneId);
      }
    }
    setOpenMilestones(newOpen);
  };

  const loadAttachments = useCallback(async () => {
    setLoadingAttachments(true);
    try {
      const [count, data] = await Promise.all([
        getActionAttachmentCount(action.id, action.sub_id),
        getActionAttachments(action.id, action.sub_id),
      ]);
      setAttachmentCount(count);
      setAttachments(data);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setLoadingAttachments(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Confirmation before upload (users cannot delete)
    const confirmed = window.confirm(
      "Are you sure you want to upload this file? Once uploaded, only administrators can delete attachments.",
    );

    if (!confirmed) {
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // Add action info to form data
      formData.set("action_id", action.id.toString());
      if (action.sub_id) {
        formData.set("action_sub_id", action.sub_id);
      }

      // Convert empty milestone_id to null (remove it from formData)
      const milestoneId = formData.get("milestone_id");
      if (!milestoneId || milestoneId === "") {
        formData.delete("milestone_id");
      }

      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        await loadAttachments();
        form.reset();
        setFileSelected(false);
      } else {
        setUploadError(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileSelected(!!e.target.files && e.target.files.length > 0);
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    setApprovingId(milestoneId);
    try {
      const result = await approveMilestoneContent(milestoneId);
      if (result.success) {
        await loadMilestones();
        router.refresh();
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      const result = await deleteActionAttachment(attachmentId);
      if (result.success) {
        await loadAttachments();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const startEditingAttachment = (att: ActionAttachment) => {
    setEditingAttachment(att.id);
    setAttachmentForm({
      title: att.title || "",
      description: att.description || "",
    });
  };

  const cancelEditingAttachment = () => {
    setEditingAttachment(null);
    setAttachmentForm({ title: "", description: "" });
  };

  const handleSaveAttachment = async (attachmentId: string) => {
    try {
      const result = await updateAttachmentMetadata(
        attachmentId,
        attachmentForm.title || null,
        attachmentForm.description || null,
      );
      if (result.success) {
        await loadAttachments();
        setEditingAttachment(null);
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const loadVersionsForMilestone = async (milestoneId: string) => {
    setLoadingVersions((prev) => ({ ...prev, [milestoneId]: true }));
    try {
      const data = await getMilestoneVersions(milestoneId);
      setVersions((prev) => ({ ...prev, [milestoneId]: data }));
    } catch (err) {
      console.error("Failed to load versions:", err);
    } finally {
      setLoadingVersions((prev) => ({ ...prev, [milestoneId]: false }));
    }
  };

  if (loading) return <LoadingState />;

  if (milestones.length === 0) {
    return <EmptyState message="No milestones have been added yet." />;
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone) => (
        <Collapsible
          key={milestone.id}
          open={openMilestones.has(milestone.id)}
          onOpenChange={() => toggleMilestone(milestone.id)}
        >
          <div className="rounded-lg border border-slate-200 bg-white">
            {/* Collapsible Header - Always shows current version */}
            <div className="p-4">
              <CollapsibleTrigger className="w-full">
                <div className="-m-2 flex items-start justify-between gap-3 rounded p-2 transition-colors hover:bg-slate-50">
                  <div className="flex flex-1 items-start gap-3">
                    <ChevronDown
                      className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        openMilestones.has(milestone.id)
                          ? "rotate-0"
                          : "-rotate-90"
                      }`}
                    />
                    <div className="flex-1 space-y-2 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getMilestoneTypeLabel(milestone.milestone_type)}
                        </Badge>
                        <Badge className={getStatusBadge(milestone.status)}>
                          {milestone.status.replace("_", " ")}
                        </Badge>
                        <ReviewStatus
                          status={
                            (milestone as { content_review_status?: "approved" | "needs_review" })
                              .content_review_status ?? "approved"
                          }
                          reviewedByEmail={
                            (milestone as { content_reviewed_by_email?: string | null })
                              .content_reviewed_by_email ?? null
                          }
                          reviewedAt={
                            (milestone as { content_reviewed_at?: Date | null })
                              .content_reviewed_at ?? null
                          }
                          isAdmin={isAdmin}
                          onApprove={() => handleApproveMilestone(milestone.id)}
                          approving={approvingId === milestone.id}
                        />
                        {milestone.deadline && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Calendar className="h-4 w-4" />
                            {new Date(milestone.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-slate-700">
                          {milestone.description}
                        </p>
                      )}
                      {milestone.updates && (
                        <p className="text-sm text-slate-500 italic">
                          {milestone.updates}
                        </p>
                      )}
                      {!milestone.description && !milestone.updates && (
                        <p className="text-sm text-slate-400 italic">
                          No content yet
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(milestone);
                    }}
                    className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    title="Edit milestone"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </CollapsibleTrigger>
            </div>

            {/* Collapsible Content */}
            <CollapsibleContent>
              <div className="border-t border-slate-200 p-4">
                {editingId === milestone.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Description
                      </label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                        rows={3}
                        disabled={saving}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Deadline
                        </label>
                        <input
                          type="date"
                          value={editForm.deadline}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              deadline: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Updates
                        </label>
                        <input
                          type="text"
                          value={editForm.updates}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              updates: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                          placeholder="Status update..."
                          disabled={saving}
                        />
                      </div>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(milestone.id)}
                        disabled={saving}
                        className="bg-un-blue hover:bg-un-blue/90"
                      >
                        {saving ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-3 w-3" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode - Version History Only (current version shown above)
                  <div>
                    {/* Version History */}
                    {loadingVersions[milestone.id] ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    ) : versions[milestone.id] &&
                      versions[milestone.id].length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                          <History className="h-3.5 w-3.5" />
                          Version History
                        </div>
                        <div className="space-y-2 rounded-md bg-slate-50 p-3">
                          {versions[milestone.id].map((version) => (
                            <div
                              key={version.id}
                              className="rounded border border-slate-200 bg-white p-3 text-xs"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="font-medium text-slate-600">
                                  {new Date(
                                    version.changed_at,
                                  ).toLocaleDateString(undefined, {
                                    dateStyle: "medium",
                                  })}{" "}
                                  at{" "}
                                  {new Date(
                                    version.changed_at,
                                  ).toLocaleTimeString(undefined, {
                                    timeStyle: "short",
                                  })}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {version.change_type}
                                </Badge>
                              </div>
                              {version.description && (
                                <p className="mb-1 text-slate-700">
                                  {version.description}
                                </p>
                              )}
                              {version.updates && (
                                <p className="text-slate-500 italic">
                                  {version.updates}
                                </p>
                              )}
                              {version.deadline && (
                                <p className="mt-1 text-slate-500">
                                  Deadline:{" "}
                                  {new Date(
                                    version.deadline,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-slate-400 italic">
                        No version history yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}

      {/* Attachments - single section below all milestones */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Paperclip className="h-3.5 w-3.5" />
          Documents {attachmentCount > 0 && `(${attachmentCount})`}
        </div>

        {loadingAttachments ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span className="text-sm text-slate-500">Loading…</span>
          </div>
        ) : attachments.length > 0 ? (
          <div className="mb-4 space-y-3">
            {attachments.map((att) => {
              const milestone = milestones.find((m) => m.id === att.milestone_id);
              const isEditing = editingAttachment === att.id;

              return (
                <div
                  key={att.id}
                  className="group relative rounded-lg border border-slate-200 bg-linear-to-br from-white to-slate-50/50 p-4 transition-all hover:border-un-blue hover:shadow-sm"
                >
                  {isEditing ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Title
                        </label>
                        <input
                          type="text"
                          value={attachmentForm.title}
                          onChange={(e) =>
                            setAttachmentForm({ ...attachmentForm, title: e.target.value })
                          }
                          placeholder={att.original_filename}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Description
                        </label>
                        <textarea
                          value={attachmentForm.description}
                          onChange={(e) =>
                            setAttachmentForm({ ...attachmentForm, description: e.target.value })
                          }
                          placeholder="Add a description..."
                          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditingAttachment}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveAttachment(att.id)}
                          className="bg-un-blue hover:bg-un-blue/90"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex gap-4">
                      {/* File Icon/Preview */}
                      <a
                        href={`/api/attachments/${att.id}/download`}
                        download={att.original_filename}
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 transition-colors hover:bg-un-blue/10"
                      >
                        {getFileIcon(att.content_type, att.original_filename)}
                      </a>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-800">
                              {att.title || att.original_filename}
                            </h4>
                            {att.title && (
                              <p className="text-xs text-slate-400">{att.original_filename}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <a
                              href={`/api/attachments/${att.id}/download`}
                              download={att.original_filename}
                              className="rounded p-1.5 text-slate-400 opacity-0 transition-all hover:bg-un-blue/10 hover:text-un-blue group-hover:opacity-100"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => startEditingAttachment(att)}
                              className="rounded p-1.5 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="rounded p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {att.description && (
                          <p className="mb-2 text-sm text-slate-600">{att.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <div>{formatUploadDate(att.uploaded_at)}</div>
                          {att.uploaded_by_email && att.uploaded_by_email.trim() !== "" ? (
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
                          {milestone ? (
                            <Badge variant="outline" className="text-[10px]">
                              {getMilestoneTypeLabel(milestone.milestone_type)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              General
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mb-4 text-sm italic text-slate-400">No documents yet</p>
        )}

        <form className="mt-3" onSubmit={handleUpload}>
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
                        {getMilestoneTypeLabel(m.milestone_type)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="min-w-30 flex-1">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  File
                </span>
                <input
                  type="file"
                  name="file"
                  accept=".pdf,.doc,.docx,image/*,.txt,.csv"
                  required
                  onChange={handleFileChange}
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
      </div>
    </div>
  );
}
