"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getActionMilestones,
  getMilestoneVersions,
  type MilestoneVersion,
} from "@/features/milestones/queries";
import { updateMilestone, createMilestone, approveMilestoneContent, requestMilestoneChanges, setMilestoneToDraft, setMilestoneNoSubmission, setMilestoneNeedsOlaReview, setMilestoneReviewedByOla, setMilestoneFinalized, setMilestoneAttentionToTimeline, setMilestoneConfirmationNeeded, updateMilestoneDocumentSubmitted } from "@/features/milestones/commands";
import { MilestoneCard } from "./MilestoneCard";
import {
  getMilestoneUpdates,
  type MilestoneUpdate,
} from "@/features/milestones/updates-queries";
import {
  createMilestoneUpdate,
  deleteMilestoneUpdate,
  toggleMilestoneUpdateResolved,
  updateMilestoneUpdate,
} from "@/features/milestones/updates-commands";
import { getCurrentUserIdForClient } from "@/features/auth/commands";
import {
  getActionAttachments,
  getActionAttachmentCount,
  getAttachmentComments,
} from "@/features/attachments/queries";
import {
  deleteActionAttachment,
  updateAttachmentMetadata,
  createAttachmentComment,
} from "@/features/attachments/commands";

import type { Action, ActionMilestone, ActionAttachment, AttachmentComment, MilestoneType } from "@/types";
import {
  Check,
  CheckCircle2,
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
  Send,
  Clock,
  Scale,
} from "lucide-react";
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
  const [commentIsLegal, setCommentIsLegal] = useState(false);
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
  const [editingAttachment, setEditingAttachment] = useState<string | null>(null);
  const [attachmentForm, setAttachmentForm] = useState({ title: "", description: "" });
  const [fileSelected, setFileSelected] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    milestoneId: string | null;
    status: "draft" | "no_submission" | "approved" | "needs_attention" | "needs_ola_review" | "reviewed_by_ola" | "finalized" | "attention_to_timeline" | "confirmation_needed" | null;
  }>({ open: false, milestoneId: null, status: null });
  const [milestoneDocumentSubmitted, setMilestoneDocumentSubmitted] = useState<Record<string, boolean>>({});
  const [attachmentComments, setAttachmentComments] = useState<Record<string, AttachmentComment[]>>({});
  const [showCommentsAttachmentId, setShowCommentsAttachmentId] = useState<string | null>(null);
  const [loadingCommentsForAttachmentId, setLoadingCommentsForAttachmentId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingCommentForAttachmentId, setSubmittingCommentForAttachmentId] = useState<string | null>(null);
  const [commentErrorByAttachmentId, setCommentErrorByAttachmentId] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  useEffect(() => {
    getCurrentUserIdForClient().then(({ userId }) => setCurrentUserId(userId));
  }, []);

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

  /** Display label for milestone: Public, First, Second, Third, or Final */
  const formatMilestoneLabel = (milestone: ActionMilestone) => {
    return milestone.is_public
      ? "Public"
      : milestone.milestone_type.charAt(0).toUpperCase() + milestone.milestone_type.slice(1);
  };

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActionMilestones(action.id, action.sub_id);
      setMilestones(data);
    } catch {
      // silently fail - UI handles empty state
    } finally {
      setLoading(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  // Preload milestone updates for all users (comment on public and internal milestones)
  const milestoneIds = milestones.map((m) => m.id).join(",");
  useEffect(() => {
    if (milestones.length === 0) return;
    milestones.forEach((m) => {
      loadMilestoneUpdates(m.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMilestoneUpdates is stable; we want to run when milestone ids change
  }, [milestoneIds]);

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

  const startEditing = (milestone: ActionMilestone) => {
    if (editingId === milestone.id) {
      // Close if clicking same button again
      setEditingId(null);
    } else {
    setEditingId(milestone.id);
    setEditForm({
      description: milestone.description || "",
      deadline: milestone.deadline || "",
    });
    setError(null);
      // Load updates for this milestone
      loadMilestoneUpdates(milestone.id);
    }
  };

  const startAddingComment = (milestoneId: string, isPublic?: boolean, userIsAdmin?: boolean) => {
    if (addingCommentId === milestoneId) {
      // Close if clicking same button again
      setAddingCommentId(null);
    } else {
      setAddingCommentId(milestoneId);
      setReplyingToId(null);
      setCommentText("");
      setError(null);
      if (isPublic === false || userIsAdmin === false) setCommentIsLegal(false);
      // Load updates if not already loaded
      if (!milestoneUpdates[milestoneId]) {
        loadMilestoneUpdates(milestoneId);
      }
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
    setCommentIsLegal(false);
    setCommentText("");
    setError(null);
  };

  const loadMilestoneUpdates = async (milestoneId: string) => {
    try {
      const updates = await getMilestoneUpdates(milestoneId);
      setMilestoneUpdates(prev => ({ ...prev, [milestoneId]: updates }));
    } catch {
      // silently fail
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ description: "", deadline: "" });
    setAddingCommentId(null);
    setReplyingToId(null);
    setCommentIsLegal(false);
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

  const handleStatusChange = (milestoneId: string, status: "draft" | "no_submission" | "approved" | "needs_attention" | "needs_ola_review" | "reviewed_by_ola" | "finalized" | "attention_to_timeline" | "confirmation_needed") => {
    setConfirmDialog({ open: true, milestoneId, status });
  };

  const confirmStatusChange = async () => {
    if (!confirmDialog.milestoneId || !confirmDialog.status) return;

    const { milestoneId, status } = confirmDialog;
    setConfirmDialog({ open: false, milestoneId: null, status: null });

    setSaving(true);
    setError(null);

    try {
      let result;
      
      if (status === "approved") {
        result = await approveMilestoneContent(milestoneId);
      } else if (status === "needs_attention") {
        result = await requestMilestoneChanges(milestoneId);
      } else if (status === "needs_ola_review") {
        result = await setMilestoneNeedsOlaReview(milestoneId);
      } else if (status === "reviewed_by_ola") {
        result = await setMilestoneReviewedByOla(milestoneId);
      } else if (status === "finalized") {
        result = await setMilestoneFinalized(milestoneId);
      } else if (status === "attention_to_timeline") {
        result = await setMilestoneAttentionToTimeline(milestoneId);
      } else if (status === "confirmation_needed") {
        result = await setMilestoneConfirmationNeeded(milestoneId);
      } else {
        result = await setMilestoneToDraft(milestoneId);
      }

      if (result.success) {
        await loadMilestones();
        // Reload versions for this milestone
        await loadVersionsForMilestone(milestoneId);
      } else {
        setError(result.error || "Failed to change status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change status");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMilestone = async () => {
    // Validate required fields
    if (!newMilestoneForm.description?.trim()) {
      setError("Description is required");
      return;
    }
    if (!newMilestoneForm.deadline) {
      setError("Deadline is required");
      return;
    }

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
    
    const updates = milestoneUpdates[milestoneId] || [];
    const parentUpdate = replyingToId ? updates.find((u) => u.id === replyingToId) : null;
    const isLegal = parentUpdate ? parentUpdate.is_legal : commentIsLegal;

    setSaving(true);
    setError(null);

    try {
      const result = await createMilestoneUpdate({
        milestone_id: milestoneId,
        content: commentText.trim(),
        reply_to: replyingToId,
        is_legal: isLegal,
      });

      if (result.success) {
        setCommentText("");
        setReplyingToId(null);
        if (!replyingToId) setCommentIsLegal(false);
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

  const startEditComment = (update: MilestoneUpdate) => {
    setEditingUpdateId(update.id);
    setEditingContent(update.content);
  };

  const cancelEditComment = () => {
    setEditingUpdateId(null);
    setEditingContent("");
  };

  const handleSaveEditComment = async (milestoneId: string, updateId: string) => {
    if (!editingContent.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateMilestoneUpdate(updateId, editingContent.trim());
      if (result.success) {
        setEditingUpdateId(null);
        setEditingContent("");
        await loadMilestoneUpdates(milestoneId);
      } else {
        setError(result.error || "Failed to update comment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update comment");
    } finally {
      setSaving(false);
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
    } catch {
      // silently fail
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
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileSelected(!!e.target.files && e.target.files.length > 0);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      const result = await deleteActionAttachment(attachmentId);
      if (result.success) {
        await loadAttachments();
      }
    } catch {
      // silently fail
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
    } catch {
      // silently fail
    }
  };

  const toggleAttachmentComments = async (attachmentId: string) => {
    const next = showCommentsAttachmentId === attachmentId ? null : attachmentId;
    setShowCommentsAttachmentId(next);
    if (next) {
      setLoadingCommentsForAttachmentId(next);
      try {
        const comments = await getAttachmentComments(next);
        setAttachmentComments((prev) => ({ ...prev, [next]: comments }));
      } catch {
        setAttachmentComments((prev) => ({ ...prev, [attachmentId]: [] }));
      } finally {
        setLoadingCommentsForAttachmentId(null);
      }
    }
  };

  const handleAddAttachmentComment = async (attachmentId: string) => {
    const text = (newCommentText[attachmentId] ?? "").trim();
    if (!text) return;
    setCommentErrorByAttachmentId((prev) => ({ ...prev, [attachmentId]: "" }));
    setSubmittingCommentForAttachmentId(attachmentId);
    try {
      const result = await createAttachmentComment(attachmentId, text);
      if (result?.success && result.comment) {
        const comment = result.comment;
        setAttachmentComments((prev) => ({
          ...prev,
          [attachmentId]: [
            ...(prev[attachmentId] ?? []),
            {
              ...comment,
              is_legal: comment.is_legal ?? false, // Ensure is_legal is present
              created_at: typeof comment.created_at === "string" ? new Date(comment.created_at) : comment.created_at,
            },
          ],
        }));
        setNewCommentText((prev) => ({ ...prev, [attachmentId]: "" }));
      } else if (result && !result.success) {
        setCommentErrorByAttachmentId((prev) => ({ ...prev, [attachmentId]: result.error ?? "Failed to post comment" }));
      }
    } catch {
      setCommentErrorByAttachmentId((prev) => ({ ...prev, [attachmentId]: "Failed to post comment. Please try again." }));
    } finally {
      setSubmittingCommentForAttachmentId(null);
    }
  };

  const loadVersionsForMilestone = async (milestoneId: string) => {
    setLoadingVersions((prev) => ({ ...prev, [milestoneId]: true }));
    try {
      const data = await getMilestoneVersions(milestoneId);
      setVersions((prev) => ({ ...prev, [milestoneId]: data }));
    } catch {
      // silently fail
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
          {/* Milestone Card - Collapsed State */}
          <MilestoneCard
            milestone={milestone}
            updates={updates}
            onEdit={() => startEditing(milestone)}
            onComment={() => startAddingComment(milestone.id, milestone.is_public, isAdmin)}
            onShowHistory={() => toggleVersionHistory(milestone.id)}
            onStatusChange={isAdmin ? (status) => handleStatusChange(milestone.id, status) : undefined}
            isAdmin={isAdmin}
            onDocumentSubmittedChange={
              isAdmin && !milestone.is_public
                ? async (milestoneId, submitted) => {
                    setMilestoneDocumentSubmitted((prev) => ({ ...prev, [milestoneId]: submitted }));
                    // Persist to database
                    await updateMilestoneDocumentSubmitted(milestoneId, submitted);
                    // Reload milestones to refresh the table
                    await loadMilestones();
                  }
                : undefined
            }
            documentSubmitted={
              !milestone.is_public
                ? milestoneDocumentSubmitted[milestone.id] ?? milestone.milestone_document_submitted ?? false
                : undefined
            }
          />

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
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex flex-col gap-0.5">
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
                                  {version.changed_by && (
                                    <span className="text-[11px] text-slate-500">
                                      by {version.changed_by}
                                    </span>
                                  )}
                                </div>
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
                  // Comments Thread Mode – Team vs Legal
                  <div className="space-y-4">
                    {/* Section: Team updates & comments */}
                    <div className="rounded-lg border border-slate-200 border-l-4 border-l-un-blue bg-slate-50/30">
                      <div className="flex items-center gap-2 border-b border-slate-200 bg-white/80 px-3 py-2">
                        <User className="h-4 w-4 text-un-blue" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Team updates & comments
                        </span>
                        {(() => {
                          const teamTop = updates.filter(u => !u.reply_to && !u.is_legal);
                          return teamTop.length > 0 ? (
                            <span className="rounded-full bg-un-blue/15 px-2 py-0.5 text-[10px] font-semibold text-un-blue">
                              {teamTop.length}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <div className="p-2">
                        {updates.filter(u => !u.reply_to && !u.is_legal).length > 0 ? (
                          <div className="space-y-2">
                            {updates.filter(u => !u.reply_to && !u.is_legal).map((update) => {
                              const replies = updates.filter(r => r.reply_to === update.id);
                              const replyingTo = replyingToId === update.id;
                              return (
                                <div key={update.id} className="space-y-2">
                                  <div className={`group relative rounded-lg border transition-all ${
                                    update.is_resolved ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-white hover:border-un-blue/30 hover:shadow-sm'
                                  }`}>
                                    <div className="p-3">
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
                                    
                                    {/* Actions: Reply for all; Resolve for admin; Edit/Delete for author or admin */}
                                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button
                                        onClick={() => startReply(milestone.id, update.id)}
                                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-un-blue"
                                        title="Reply"
                                      >
                                        <CornerDownRight className="h-3 w-3" />
                                      </button>
                                      {isAdmin && (
                                        <button
                                          onClick={() => handleToggleResolved(milestone.id, update.id)}
                                          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                                          title={update.is_resolved ? "Mark as unresolved" : "Mark as resolved"}
                                        >
                                          <CheckCircle2 className="h-3 w-3" />
                                        </button>
                                      )}
                                      {(isAdmin || (currentUserId && update.user_id === currentUserId)) && (
                                        <>
                                          <button
                                            onClick={() => startEditComment(update)}
                                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-un-blue"
                                            title="Edit"
                                          >
                                            <Pencil className="h-3 w-3" />
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
                                  
                                  {/* Content or edit form */}
                                  {editingUpdateId === update.id ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={editingContent}
                                        onChange={(e) => setEditingContent(e.target.value)}
                                        className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                                        rows={3}
                                        disabled={saving}
                                        autoFocus
                                      />
                                      <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={cancelEditComment} disabled={saving}>
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveEditComment(milestone.id, update.id)}
                                          disabled={saving || !editingContent.trim()}
                                          className="bg-un-blue hover:bg-un-blue/90"
                                        >
                                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                                      {update.content}
                                    </p>
                                  )}
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
                                              {(isAdmin || (currentUserId && reply.user_id === currentUserId)) && (
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
                          <div className="py-4 text-center">
                            <p className="text-xs text-slate-400">No team comments yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section: Legal updates & comments (public milestones, admin only) */}
                    {milestone.is_public && isAdmin && (
                    <div className="rounded-lg border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50/20">
                      <div className="flex items-center gap-2 border-b border-amber-200 bg-white/80 px-3 py-2">
                        <Scale className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-amber-800/90">
                          Legal updates & comments
                        </span>
                        {(() => {
                          const legalTop = updates.filter(u => !u.reply_to && u.is_legal);
                          return legalTop.length > 0 ? (
                            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              {legalTop.length}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <div className="p-2">
                        {updates.filter(u => !u.reply_to && u.is_legal).length > 0 ? (
                          <div className="space-y-2">
                            {updates.filter(u => !u.reply_to && u.is_legal).map((update) => {
                              const replies = updates.filter(r => r.reply_to === update.id);
                              const replyingTo = replyingToId === update.id;
                              return (
                                <div key={update.id} className="space-y-2">
                                  <div className={`group relative rounded-lg border transition-all ${
                                    update.is_resolved ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-white hover:border-amber-400/50 hover:shadow-sm'
                                  }`}>
                                    <div className="p-3">
                                      <div className="mb-2 flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700">
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
                                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                          <button onClick={() => startReply(milestone.id, update.id)} className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-600" title="Reply">
                                            <CornerDownRight className="h-3 w-3" />
                                          </button>
                                          {isAdmin && (
                                            <button onClick={() => handleToggleResolved(milestone.id, update.id)} className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600" title={update.is_resolved ? "Mark as unresolved" : "Mark as resolved"}>
                                              <CheckCircle2 className="h-3 w-3" />
                                            </button>
                                          )}
                                          {(isAdmin || (currentUserId && update.user_id === currentUserId)) && (
                                            <>
                                              <button onClick={() => startEditComment(update)} className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-600" title="Edit">
                                                <Pencil className="h-3 w-3" />
                                              </button>
                                              <button onClick={() => handleDeleteComment(milestone.id, update.id)} className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600" title="Delete">
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      {editingUpdateId === update.id ? (
                                        <div className="space-y-2">
                                          <textarea
                                            value={editingContent}
                                            onChange={(e) => setEditingContent(e.target.value)}
                                            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                            rows={3}
                                            disabled={saving}
                                            autoFocus
                                          />
                                          <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={cancelEditComment} disabled={saving}>Cancel</Button>
                                            <Button size="sm" onClick={() => handleSaveEditComment(milestone.id, update.id)} disabled={saving || !editingContent.trim()} className="bg-amber-600 hover:bg-amber-700">
                                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{update.content}</p>
                                      )}
                                    </div>
                                    {replies.length > 0 && (
                                      <div className="border-t border-amber-100 bg-amber-50/30 px-3 py-2">
                                        <div className="space-y-2">
                                          {replies.map((reply) => (
                                            <div key={reply.id} className="group/reply relative flex gap-2 rounded-md bg-white p-2 hover:bg-amber-50/50">
                                              <CornerDownRight className="mt-1 h-3 w-3 shrink-0 text-amber-300" />
                                              <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2">
                                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[9px] font-semibold text-amber-700">
                                                      {(reply.user_email?.[0] || 'U').toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600">{reply.user_email?.split('@')[0] || "Unknown"}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(reply.created_at).toLocaleDateString()} at {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                  </div>
                                                  {(isAdmin || (currentUserId && reply.user_id === currentUserId)) && (
                                                    <button onClick={() => handleDeleteComment(milestone.id, reply.id)} className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-red-600 group-hover/reply:opacity-100" title="Delete reply">
                                                      <Trash2 className="h-3 w-3" />
                                                    </button>
                                                  )}
                                                </div>
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{reply.content}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {replyingTo && (
                                      <div className="border-t border-amber-100 bg-amber-50/30 p-3">
                                        <div className="flex gap-2">
                                          <CornerDownRight className="mt-2 h-3 w-3 shrink-0 text-amber-400" />
                                          <div className="flex-1 space-y-2">
                                            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" rows={2} placeholder="Write a reply..." disabled={saving} autoFocus />
                                            <div className="flex justify-end gap-2">
                                              <Button variant="outline" size="sm" onClick={cancelAddingComment} disabled={saving}>Cancel</Button>
                                              <Button size="sm" onClick={() => handleAddComment(milestone.id)} disabled={saving || !commentText.trim()} className="bg-amber-600 hover:bg-amber-700">{(saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CornerDownRight className="h-3 w-3" />)}</Button>
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
                          <div className="py-4 text-center">
                            <p className="text-xs text-amber-700/70">No legal comments yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Add New Comment Form - all users */}
                    {addingCommentId === milestone.id && !replyingToId && (
                      <div className="rounded-lg border border-un-blue/20 bg-un-blue/5 p-3">
                        <div className="space-y-2">
                          {milestone.is_public && isAdmin && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600">Post to:</span>
                            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                              <button
                                type="button"
                                onClick={() => setCommentIsLegal(false)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                  !commentIsLegal
                                    ? "bg-un-blue text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                Team updates & comments
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommentIsLegal(true)}
                                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                  commentIsLegal
                                    ? "bg-amber-600 text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                <Scale className="h-3 w-3" />
                                Legal updates & comments
                              </button>
                            </div>
                          </div>
                          )}
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
        </Collapsible>
    );
  };

  return (
    <div className="space-y-8">
      {/* Public milestones section */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Public Milestones</h3>
        {sortedPublicMilestones.length === 0 && !creatingNew && (
          <p className="text-sm text-slate-400 italic">No public milestones yet</p>
        )}
        {sortedPublicMilestones.map((milestone) => renderMilestone(milestone))}
        
        {/* Add Public Milestone Button / Form */}
        {isAdmin && !creatingNew && getAvailableMilestoneTypes().length > 0 && (
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
        {isAdmin && creatingNew && newMilestoneForm.is_public && (
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
                Description <span className="text-red-500">*</span>
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
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Deadline <span className="text-red-500">*</span>
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
                required
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
      </section>

      {/* Divider */}
      <hr className="border-slate-200" />

      {/* Internal milestones section */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Internal Milestones</h3>
        {sortedPrivateMilestones.length === 0 && !creatingNew && (
          <p className="text-sm text-slate-400 italic">No internal milestones yet</p>
        )}
        {sortedPrivateMilestones.map((milestone) => renderMilestone(milestone))}
        
        {/* Add Internal Milestone Button / Form */}
        {isAdmin && !creatingNew && getAvailableMilestoneTypes().length > 0 && (
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
        {isAdmin && creatingNew && !newMilestoneForm.is_public && (
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
                  Description <span className="text-red-500">*</span>
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
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Deadline <span className="text-red-500">*</span>
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
                  required
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
      </section>

      {/* Divider */}
      <hr className="border-slate-200" />

      {/* Documents section */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Paperclip className="h-4 w-4" />
          Documents {attachmentCount > 0 && <span className="font-normal text-slate-500">({attachmentCount})</span>}
        </h3>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
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
                      {/* File Icon/Preview - clickable download for admins only */}
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
                              {att.title || att.original_filename}
                            </h4>
                            {att.title && (
                              <p className="text-xs text-slate-400">{att.original_filename}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {isAdmin && (
                            <button
                              type="button"
                              onClick={() => toggleAttachmentComments(att.id)}
                              className={`rounded p-1.5 transition-all ${
                                showCommentsAttachmentId === att.id
                                  ? "bg-un-blue/10 text-un-blue"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              }`}
                              title="Comments"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            )}
                            {isAdmin && (
                            <a
                              href={`/api/attachments/${att.id}/download`}
                              download={att.original_filename}
                              className="rounded p-1.5 text-slate-400 opacity-0 transition-all hover:bg-un-blue/10 hover:text-un-blue group-hover:opacity-100"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            )}
                            {isAdmin && (
                              <>
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
                              </>
                            )}
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
                              {formatMilestoneLabel(milestone)}
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

                  {/* Comments for this document – team only */}
                  {showCommentsAttachmentId === att.id && (
                    <div className="mt-4 border-t border-slate-200 pt-4 space-y-4">
                      {loadingCommentsForAttachmentId === att.id ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          <span className="text-sm text-slate-500">Loading…</span>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const comments = attachmentComments[att.id] ?? [];
                            const teamComments = comments.filter((c) => !c.is_legal);
                            return (
                              <div className="rounded-lg border border-slate-200 border-l-4 border-l-un-blue bg-slate-50/30">
                                <div className="flex items-center gap-2 border-b border-slate-200 bg-white/80 px-3 py-2">
                                  <User className="h-4 w-4 text-un-blue" />
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Team comments
                                  </span>
                                  {teamComments.length > 0 && (
                                    <span className="rounded-full bg-un-blue/15 px-2 py-0.5 text-[10px] font-semibold text-un-blue">
                                      {teamComments.length}
                                    </span>
                                  )}
                                </div>
                                <div className="p-2">
                                  {teamComments.length === 0 ? (
                                    <p className="py-3 text-center text-xs text-slate-400">No team comments yet.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {teamComments.map((c) => (
                                        <div
                                          key={c.id}
                                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                        >
                                          <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-un-blue/10 text-[9px] font-semibold text-un-blue">
                                              {(c.user_email?.[0] ?? "U").toUpperCase()}
                                            </div>
                                            {c.user_email ? (
                                              <span className="font-medium text-slate-600">{c.user_email}</span>
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
                                          <p className="text-slate-700 whitespace-pre-wrap">{c.comment}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          {isAdmin && (
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <textarea
                                value={newCommentText[att.id] ?? ""}
                                onChange={(e) => {
                                  setNewCommentText((prev) => ({ ...prev, [att.id]: e.target.value }));
                                  if (commentErrorByAttachmentId[att.id]) {
                                    setCommentErrorByAttachmentId((prev) => {
                                      const next = { ...prev };
                                      delete next[att.id];
                                      return next;
                                    });
                                  }
                                }}
                                placeholder="Add a comment…"
                                className="min-h-[72px] w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                                rows={2}
                                disabled={submittingCommentForAttachmentId === att.id}
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleAddAttachmentComment(att.id)}
                                disabled={
                                  submittingCommentForAttachmentId === att.id ||
                                  !(newCommentText[att.id] ?? "").trim()
                                }
                                className="shrink-0 bg-un-blue hover:bg-un-blue/90"
                              >
                                {submittingCommentForAttachmentId === att.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="mr-1 h-3.5 w-3.5" />
                                    Post
                                  </>
                                )}
                              </Button>
                            </div>
                            {commentErrorByAttachmentId[att.id] && (
                              <p className="text-sm text-red-600">{commentErrorByAttachmentId[att.id]}</p>
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
        ) : (
          <p className="mb-4 text-sm italic text-slate-400">No documents yet</p>
        )}

        {isAdmin && (
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
                        {formatMilestoneLabel(m)}
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
        )}
      </div>
      </section>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, milestoneId: null, status: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Milestone Status</DialogTitle>
            <DialogDescription>
              {confirmDialog.status === "draft" && "Change this milestone to Draft? It will no longer be approved."}
              {confirmDialog.status === "no_submission" && "Mark this milestone as No Submission?"}
              {confirmDialog.status === "approved" && "Approve this milestone? This will mark it as approved and no longer a draft."}
              {confirmDialog.status === "needs_attention" && "Mark this milestone as needing attention? This will notify the team to make changes."}
              {confirmDialog.status === "needs_ola_review" && "Mark this milestone as needing OLA (Office of Legal Affairs) review?"}
              {confirmDialog.status === "reviewed_by_ola" && "Mark this milestone as reviewed by OLA (Office of Legal Affairs)?"}
              {confirmDialog.status === "finalized" && "Finalize this milestone? This marks it as complete."}
              {confirmDialog.status === "attention_to_timeline" && "Mark this milestone as needing attention to timeline?"}
              {confirmDialog.status === "confirmation_needed" && "Mark this milestone as needing confirmation?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, milestoneId: null, status: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              className="bg-un-blue hover:bg-un-blue/90"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
