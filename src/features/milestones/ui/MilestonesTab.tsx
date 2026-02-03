"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  getActionMilestones,
  getMilestoneVersions,
  type MilestoneVersion,
} from "@/features/milestones/queries";
import { updateMilestone, approveMilestoneContent, createMilestone } from "@/features/milestones/commands";
import {
  getMilestoneUpdates,
  type MilestoneUpdate,
} from "@/features/milestones/updates-queries";
import {
  createMilestoneUpdate,
  deleteMilestoneUpdate,
  toggleMilestoneUpdateResolved,
} from "@/features/milestones/updates-commands";
import {
  getActionAttachments,
  getActionAttachmentCount,
} from "@/features/attachments/queries";
import {
  deleteActionAttachment,
  updateAttachmentMetadata,
} from "@/features/attachments/commands";
import { ReviewStatus } from "@/features/shared/ReviewStatus";

import type { Action, ActionMilestone, ActionAttachment, MilestoneType } from "@/types";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CornerDownRight,
  History,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Download,
  Trash2,
  FileText,
  ImageIcon,
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
  const [creatingNew, setCreatingNew] = useState(false);
  const [editForm, setEditForm] = useState({
    description: "",
    deadline: "",
  });
  const [newMilestoneForm, setNewMilestoneForm] = useState<{
    milestone_type: MilestoneType;
    is_public: boolean;
    description: string;
    deadline: string;
  }>({
    milestone_type: "first",
    is_public: false,
    description: "",
    deadline: "",
  });
  const [milestoneUpdates, setMilestoneUpdates] = useState<Record<string, MilestoneUpdate[]>>({});
  const [addingCommentId, setAddingCommentId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [showVersionHistoryId, setShowVersionHistoryId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      upcoming: "Public",
      final: "Final",
    };
    return labels[type] || type;
  };

  // Separate public and private milestones
  const publicMilestones = milestones.filter((m) => m.is_public);
  const privateMilestones = milestones.filter((m) => !m.is_public);
  
  // Sort each bucket by milestone order
  const milestoneOrder: MilestoneType[] = ["upcoming", "first", "second", "third", "final"];
  const sortedPublicMilestones = [...publicMilestones].sort(
    (a, b) =>
      milestoneOrder.indexOf(a.milestone_type as MilestoneType) -
      milestoneOrder.indexOf(b.milestone_type as MilestoneType),
  );
  const sortedPrivateMilestones = [...privateMilestones].sort(
    (a, b) =>
      milestoneOrder.indexOf(a.milestone_type as MilestoneType) -
      milestoneOrder.indexOf(b.milestone_type as MilestoneType),
  );

  const getAvailableMilestoneTypes = () => {
    // Exclude 'upcoming' - use is_public flag instead
    const allTypes: MilestoneType[] = ["first", "second", "third", "final"];
    const existingTypes = milestones.map(m => m.milestone_type);
    return allTypes.filter(type => !existingTypes.includes(type));
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
    });
    setError(null);
    // Load updates for this milestone
    loadMilestoneUpdates(milestone.id);
  };

  const startAddingComment = (milestoneId: string) => {
    setAddingCommentId(milestoneId);
    setReplyingToId(null);
    setCommentText("");
    setError(null);
    // Load updates if not already loaded
    if (!milestoneUpdates[milestoneId]) {
      loadMilestoneUpdates(milestoneId);
    }
  };

  const startReply = (milestoneId: string, updateId: string) => {
    setAddingCommentId(milestoneId);
    setReplyingToId(updateId);
    setCommentText("");
    setError(null);
  };

  const cancelAddingComment = () => {
    setAddingCommentId(null);
    setReplyingToId(null);
    setCommentText("");
    setError(null);
  };

  const loadMilestoneUpdates = async (milestoneId: string) => {
    try {
      const updates = await getMilestoneUpdates(milestoneId);
      setMilestoneUpdates(prev => ({ ...prev, [milestoneId]: updates }));
    } catch (err) {
      console.error("Failed to load milestone updates:", err);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ description: "", deadline: "" });
    setAddingCommentId(null);
    setReplyingToId(null);
    setCommentText("");
    setError(null);
  };

  const handleSave = async (milestoneId: string) => {
    setSaving(true);
    setError(null);

    try {
      const result = await updateMilestone(milestoneId, {
        description: editForm.description || null,
        deadline: editForm.deadline || null,
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

  const handleCreateMilestone = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await createMilestone({
        action_id: action.id,
        action_sub_id: action.sub_id,
        milestone_type: newMilestoneForm.milestone_type,
        is_public: newMilestoneForm.is_public,
        description: newMilestoneForm.description || null,
        deadline: newMilestoneForm.deadline || null,
      });

      if (result.success) {
        setCreatingNew(false);
        setNewMilestoneForm({
          milestone_type: "first",
          is_public: false,
          description: "",
          deadline: "",
        });
        await loadMilestones();
      } else {
        setError(result.error || "Failed to create milestone");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create milestone");
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (milestoneId: string) => {
    if (!commentText.trim()) return;
    
    setSaving(true);
    setError(null);

    try {
      const result = await createMilestoneUpdate({
        milestone_id: milestoneId,
        content: commentText.trim(),
        reply_to: replyingToId,
      });

      if (result.success) {
        setCommentText("");
        setAddingCommentId(null);
        setReplyingToId(null);
        await loadMilestoneUpdates(milestoneId);
      } else {
        setError(result.error || "Failed to add comment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleResolved = async (milestoneId: string, updateId: string) => {
    try {
      const result = await toggleMilestoneUpdateResolved(updateId);
      if (result.success) {
        await loadMilestoneUpdates(milestoneId);
      } else {
        setError(result.error || "Failed to toggle resolved status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle resolved");
    }
  };

  const handleDeleteComment = async (milestoneId: string, updateId: string) => {
    try {
      const result = await deleteMilestoneUpdate(updateId);
      if (result.success) {
        await loadMilestoneUpdates(milestoneId);
      } else {
        setError(result.error || "Failed to delete comment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    }
  };

  const toggleMilestone = (milestoneId: string) => {
    // Load updates if not already loaded
    if (!milestoneUpdates[milestoneId]) {
      loadMilestoneUpdates(milestoneId);
    }
  };

  const toggleVersionHistory = (milestoneId: string) => {
    if (showVersionHistoryId === milestoneId) {
      setShowVersionHistoryId(null);
    } else {
      setShowVersionHistoryId(milestoneId);
      if (!versions[milestoneId]) {
        loadVersionsForMilestone(milestoneId);
      }
    }
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

  const renderMilestone = (milestone: ActionMilestone) => {
    const updates = milestoneUpdates[milestone.id] || [];
    return (
        <Collapsible
          key={milestone.id}
          open={editingId === milestone.id || addingCommentId === milestone.id || showVersionHistoryId === milestone.id}
        >
          <div className="rounded-lg border border-slate-200 bg-white">
            {/* Collapsible Header - Always shows current version */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
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
                    {!milestone.description && (
                      <p className="text-sm text-slate-400 italic">
                        No description yet
                      </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVersionHistory(milestone.id);
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    title="Version history"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    History
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startAddingComment(milestone.id);
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-un-blue/20 bg-un-blue/5 px-2.5 py-1.5 text-xs font-medium text-un-blue transition-colors hover:bg-un-blue/10"
                    title="Add comment"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Comment
                    {updates.length > 0 && (
                      <span className="ml-0.5 rounded-full bg-un-blue/20 px-1.5 py-0.5 text-[10px] font-semibold">
                        {updates.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(milestone);
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    title="Edit milestone"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              </div>
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
                ) : showVersionHistoryId === milestone.id ? (
                  // Version History Mode
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Version History
                      </span>
                    </div>
                    {/* Version History */}
                    {loadingVersions[milestone.id] ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    ) : versions[milestone.id] &&
                      versions[milestone.id].length > 0 ? (
                      <div className="space-y-2">
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
                ) : (
                  // Comments Thread Mode
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Updates & Comments
                        {updates.length > 0 && (
                          <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold">
                            {updates.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comments List */}
                    {updates.length > 0 ? (
                      <div className="space-y-2">
                        {updates.filter(u => !u.reply_to).map((update) => {
                          const replies = updates.filter(r => r.reply_to === update.id);
                          const replyingTo = replyingToId === update.id;
                          
                          return (
                            <div key={update.id} className="space-y-2">
                              {/* Main Comment */}
                              <div className={`group relative rounded-lg border transition-all ${
                                update.is_resolved 
                                  ? 'border-green-200 bg-green-50/30' 
                                  : 'border-slate-200 bg-white hover:border-un-blue/30 hover:shadow-sm'
                              }`}>
                                <div className="p-3">
                                  {/* Header */}
                                  <div className="mb-2 flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-un-blue/10 text-[10px] font-semibold text-un-blue">
                                        {(update.user_email?.[0] || 'U').toUpperCase()}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-medium text-slate-700">
                                          {update.user_email?.split('@')[0] || "Unknown"}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {new Date(update.created_at).toLocaleDateString()} at {new Date(update.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      {update.is_resolved && (
                                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Resolved
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button
                                        onClick={() => startReply(milestone.id, update.id)}
                                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-un-blue"
                                        title="Reply"
                                      >
                                        <CornerDownRight className="h-3 w-3" />
                                      </button>
                                      {isAdmin && (
                                        <>
                                          <button
                                            onClick={() => handleToggleResolved(milestone.id, update.id)}
                                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                                            title={update.is_resolved ? "Mark as unresolved" : "Mark as resolved"}
                                          >
                                            <CheckCircle2 className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteComment(milestone.id, update.id)}
                                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600"
                                            title="Delete"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Content */}
                                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                                    {update.content}
                                  </p>
                                </div>

                                {/* Replies */}
                                {replies.length > 0 && (
                                  <div className="border-t border-slate-200 bg-slate-50/50 px-3 py-2">
                                    <div className="space-y-2">
                                      {replies.map((reply) => (
                                        <div key={reply.id} className="group/reply relative flex gap-2 rounded-md bg-white p-2 hover:bg-slate-50">
                                          <CornerDownRight className="mt-1 h-3 w-3 shrink-0 text-slate-300" />
                                          <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600">
                                                  {(reply.user_email?.[0] || 'U').toUpperCase()}
                                                </div>
                                                <span className="text-xs font-medium text-slate-600">
                                                  {reply.user_email?.split('@')[0] || "Unknown"}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                  {new Date(reply.created_at).toLocaleDateString()} at {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                              </div>
                                              {isAdmin && (
                                                <button
                                                  onClick={() => handleDeleteComment(milestone.id, reply.id)}
                                                  className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-red-600 group-hover/reply:opacity-100"
                                                  title="Delete reply"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              )}
                                            </div>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                              {reply.content}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Reply Form */}
                                {replyingTo && (
                                  <div className="border-t border-slate-200 bg-slate-50/50 p-3">
                                    <div className="flex gap-2">
                                      <CornerDownRight className="mt-2 h-3 w-3 shrink-0 text-slate-400" />
                                      <div className="flex-1 space-y-2">
                                        <textarea
                                          value={commentText}
                                          onChange={(e) => setCommentText(e.target.value)}
                                          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                                          rows={2}
                                          placeholder="Write a reply..."
                                          disabled={saving}
                                          autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={cancelAddingComment}
                                            disabled={saving}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => handleAddComment(milestone.id)}
                                            disabled={saving || !commentText.trim()}
                                            className="bg-un-blue hover:bg-un-blue/90"
                                          >
                                            {saving ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <CornerDownRight className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-8 text-center">
                        <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-400">No comments yet</p>
                      </div>
                    )}

                    {/* Add New Comment Form */}
                    {addingCommentId === milestone.id && !replyingToId && (
                      <div className="rounded-lg border border-un-blue/20 bg-un-blue/5 p-3">
                        <div className="space-y-2">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                            rows={3}
                            placeholder="Add a status update or comment..."
                            disabled={saving}
                            autoFocus
                          />
                          {error && <p className="text-sm text-red-600">{error}</p>}
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelAddingComment}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAddComment(milestone.id)}
                              disabled={saving || !commentText.trim()}
                              className="bg-un-blue hover:bg-un-blue/90"
                            >
                              {saving ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <MessageSquare className="mr-1 h-3 w-3" />
                              )}
                              Post
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
    );
  };

  return (
    <div className="space-y-3">
      {/* Public milestones section - always visible */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Public Milestones</h3>
        {sortedPublicMilestones.length === 0 && !creatingNew && (
          <p className="text-sm text-slate-400 italic">No public milestones yet</p>
        )}
        {sortedPublicMilestones.map((milestone) => renderMilestone(milestone))}
        
        {/* Add Public Milestone Button / Form */}
        {!creatingNew && getAvailableMilestoneTypes().length > 0 && (
          <button
            onClick={() => {
              const availableTypes = getAvailableMilestoneTypes();
              setNewMilestoneForm({
                milestone_type: availableTypes[0] || "first",
                is_public: true,
                description: "",
                deadline: "",
              });
              setCreatingNew(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-un-blue hover:bg-un-blue/5 hover:text-un-blue"
          >
            <Plus className="h-4 w-4" />
            Add Public Milestone
          </button>
        )}
        
        {/* Create Public Milestone Form */}
        {creatingNew && newMilestoneForm.is_public && (
          <div className="rounded-lg border border-un-blue/20 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Create New Public Milestone</h3>
              <button
                onClick={() => {
                  setCreatingNew(false);
                  setError(null);
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Description
              </label>
              <textarea
                value={newMilestoneForm.description}
                onChange={(e) =>
                  setNewMilestoneForm({
                    ...newMilestoneForm,
                    description: e.target.value,
                  })
                }
                className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                rows={3}
                placeholder="Describe this milestone..."
                disabled={saving}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Deadline
              </label>
              <input
                type="date"
                value={newMilestoneForm.deadline}
                onChange={(e) =>
                  setNewMilestoneForm({
                    ...newMilestoneForm,
                    deadline: e.target.value,
                  })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                disabled={saving}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreatingNew(false);
                  setError(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateMilestone}
                disabled={saving}
                className="bg-un-blue hover:bg-un-blue/90"
              >
                {saving ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-3 w-3" />
                )}
                Create Milestone
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Separator between sections */}
      <div className="my-4 border-t border-slate-300" aria-hidden />

      {/* Internal milestones section - always visible */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Internal Milestones</h3>
        {sortedPrivateMilestones.length === 0 && !creatingNew && (
          <p className="text-sm text-slate-400 italic">No internal milestones yet</p>
        )}
        {sortedPrivateMilestones.map((milestone) => renderMilestone(milestone))}
        
        {/* Add Internal Milestone Button / Form */}
        {!creatingNew && getAvailableMilestoneTypes().length > 0 && (
          <button
            onClick={() => {
              const availableTypes = getAvailableMilestoneTypes();
              setNewMilestoneForm({
                milestone_type: availableTypes[0] || "first",
                is_public: false,
                description: "",
                deadline: "",
              });
              setCreatingNew(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-600 hover:bg-slate-100 hover:text-slate-700"
          >
            <Plus className="h-4 w-4" />
            Add Internal Milestone
          </button>
        )}
        
        {/* Create Internal Milestone Form */}
        {creatingNew && !newMilestoneForm.is_public && (
          <div className="rounded-lg border border-slate-300 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Create New Internal Milestone</h3>
              <button
                onClick={() => {
                  setCreatingNew(false);
                  setError(null);
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Description
                </label>
                <textarea
                  value={newMilestoneForm.description}
                  onChange={(e) =>
                    setNewMilestoneForm({
                      ...newMilestoneForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                  rows={3}
                  placeholder="Describe this milestone..."
                  disabled={saving}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Deadline
                </label>
                <input
                  type="date"
                  value={newMilestoneForm.deadline}
                  onChange={(e) =>
                    setNewMilestoneForm({
                      ...newMilestoneForm,
                      deadline: e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                  disabled={saving}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreatingNew(false);
                    setError(null);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateMilestone}
                  disabled={saving}
                  className="bg-un-blue hover:bg-un-blue/90"
                >
                  {saving ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-3 w-3" />
                  )}
                  Create Milestone
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t-2 border-slate-200" />

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
