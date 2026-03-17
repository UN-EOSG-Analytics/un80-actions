"use client";

import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  deleteActionAttachment,
  updateAttachmentMetadata,
} from "@/features/attachments/commands";
import {
  getActionAttachmentCount,
  getActionAttachments,
} from "@/features/attachments/queries";
import { getCurrentUserIdForClient } from "@/features/auth/commands";
import {
  approveMilestoneContent,
  createMilestone,
  deleteMilestone,
  requestMilestoneChanges,
  setMilestoneAttentionToTimeline,
  setMilestoneConfirmationNeeded,
  setMilestoneFinalized,
  setMilestoneNeedsOlaReview,
  setMilestoneReviewedByOla,
  setMilestoneToDraft,
  updateMilestone,
  updateMilestoneDocumentSubmitted,
  updateMilestonePublicProgress,
} from "@/features/milestones/commands";
import {
  getActionMilestones,
  getMilestoneVersions,
  type MilestoneVersion,
} from "@/features/milestones/queries";
import {
  createMilestoneUpdate,
  deleteMilestoneUpdate,
  toggleMilestoneUpdateResolved,
  updateMilestoneUpdate,
} from "@/features/milestones/updates-commands";
import {
  getMilestoneUpdates,
  type MilestoneUpdate,
} from "@/features/milestones/updates-queries";
import type {
  Action,
  ActionAttachment,
  ActionMilestone,
} from "@/types";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  MilestoneCreateForm,
  type NewMilestoneForm,
} from "./MilestoneCreateForm";
import { MilestoneDocuments } from "./MilestoneDocuments";
import { MilestoneRow, type MilestonePanel } from "./MilestoneRow";
import type { MilestoneEditForm } from "./MilestoneEditPanel";
import type { PublicProgressValue } from "./MilestoneCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MilestoneStatus =
  | "draft"
  | "approved"
  | "needs_attention"
  | "needs_ola_review"
  | "reviewed_by_ola"
  | "finalized"
  | "attention_to_timeline"
  | "confirmation_needed"
  | "no_submission";

const STATUS_CONFIRM_MESSAGES: Record<MilestoneStatus, string> = {
  draft: "Change this milestone to Draft? It will no longer be approved.",
  no_submission:
    "Mark this milestone as No Submission? This will set it to draft status.",
  approved:
    "Approve this milestone? This will mark it as approved and no longer a draft.",
  needs_attention:
    "Mark this milestone as needing attention? This will notify the team to make changes.",
  needs_ola_review:
    "Mark this milestone as needing OLA (Office of Legal Affairs) review?",
  reviewed_by_ola:
    "Mark this milestone as reviewed by OLA (Office of Legal Affairs)?",
  finalized: "Finalize this milestone? This marks it as complete.",
  attention_to_timeline:
    "Mark this milestone as needing attention to timeline?",
  confirmation_needed: "Mark this milestone as needing confirmation?",
};

// ---------------------------------------------------------------------------
// Shared loading / empty states
// ---------------------------------------------------------------------------

const LoadingState = () => (
  <div className="flex items-center justify-center py-8">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-un-blue" />
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <p className="text-sm text-slate-400">{message}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MilestonesTab({
  action,
  isAdmin = false,
}: {
  action: Action;
  isAdmin?: boolean;
}) {
  // ── Milestones ────────────────────────────────────────────────────────────
  const [milestones, setMilestones] = useState<ActionMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Per-milestone open panel (edit | history | comments | null) ───────────
  const [openPanels, setOpenPanels] = useState<Record<string, MilestonePanel>>(
    {},
  );

  // ── Edit form ─────────────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState<MilestoneEditForm>({
    description: "",
    deadline: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Create form ───────────────────────────────────────────────────────────
  const [creatingNew, setCreatingNew] = useState(false);
  const [newMilestoneForm, setNewMilestoneForm] = useState<NewMilestoneForm>({
    is_public: false,
    is_final: false,
    description: "",
    deadline: "",
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Comments ──────────────────────────────────────────────────────────────
  const [milestoneUpdates, setMilestoneUpdates] = useState<
    Record<string, MilestoneUpdate[]>
  >({});
  const [addingCommentId, setAddingCommentId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentIsLegal, setCommentIsLegal] = useState(false);
  const [commentIsInternal, setCommentIsInternal] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // ── Version history ───────────────────────────────────────────────────────
  const [versions, setVersions] = useState<Record<string, MilestoneVersion[]>>(
    {},
  );
  const [loadingVersions, setLoadingVersions] = useState<
    Record<string, boolean>
  >({});

  // ── Document submitted state ──────────────────────────────────────────────
  const [milestoneDocumentSubmitted, setMilestoneDocumentSubmitted] = useState<
    Record<string, boolean>
  >({});

  // ── Attachments ───────────────────────────────────────────────────────────
  const [attachments, setAttachments] = useState<ActionAttachment[]>([]);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Confirm dialogs ───────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    milestoneId: string | null;
    status: MilestoneStatus | null;
  }>({ open: false, milestoneId: null, status: null });
  const [pendingDeleteComment, setPendingDeleteComment] = useState<{
    milestoneId: string;
    updateId: string;
  } | null>(null);
  const [pendingDeleteMilestoneId, setPendingDeleteMilestoneId] = useState<
    string | null
  >(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserIdForClient().then(({ userId }) => setCurrentUserId(userId));
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActionMilestones(action.id, action.sub_id);
      setMilestones(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const milestoneIds = milestones.map((m) => m.id).join(",");
  useEffect(() => {
    if (milestones.length === 0) return;
    milestones.forEach((m) => loadMilestoneUpdates(m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestoneIds]);

  const loadMilestoneUpdates = async (milestoneId: string) => {
    try {
      const updates = await getMilestoneUpdates(milestoneId);
      setMilestoneUpdates((prev) => ({ ...prev, [milestoneId]: updates }));
    } catch {
      // silently fail
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

  // ── Panel management ──────────────────────────────────────────────────────

  const openPanel = (milestoneId: string, panel: MilestonePanel) => {
    setOpenPanels((prev) => ({ ...prev, [milestoneId]: panel }));
  };

  const closePanel = (milestoneId: string) => {
    setOpenPanels((prev) => ({ ...prev, [milestoneId]: null }));
    setEditError(null);
  };

  const handleOpenEdit = (milestone: ActionMilestone) => {
    const current = openPanels[milestone.id];
    if (current === "edit") {
      closePanel(milestone.id);
      return;
    }
    setEditForm({
      description: milestone.description ?? "",
      deadline: milestone.deadline ?? "",
    });
    setEditError(null);
    openPanel(milestone.id, "edit");
  };

  const handleOpenComments = (milestone: ActionMilestone) => {
    const current = openPanels[milestone.id];
    if (current === "comments") {
      closePanel(milestone.id);
      setAddingCommentId(null);
      setReplyingToId(null);
      setCommentText("");
      setCommentIsLegal(false);
      setCommentIsInternal(false);
      return;
    }
    setAddingCommentId(milestone.id);
    setReplyingToId(null);
    setCommentText("");
    setCommentError(null);
    if (milestone.is_public === false || !isAdmin) setCommentIsLegal(false);
    if (!milestoneUpdates[milestone.id]) loadMilestoneUpdates(milestone.id);
    openPanel(milestone.id, "comments");
  };

  const handleOpenHistory = (milestone: ActionMilestone) => {
    const current = openPanels[milestone.id];
    if (current === "history") {
      closePanel(milestone.id);
      return;
    }
    if (!versions[milestone.id]) loadVersionsForMilestone(milestone.id);
    openPanel(milestone.id, "history");
  };

  // ── Edit handlers ─────────────────────────────────────────────────────────

  const handleEditSave = async (milestoneId: string) => {
    setEditSaving(true);
    setEditError(null);
    try {
      const result = await updateMilestone(milestoneId, {
        description: editForm.description || null,
        deadline: editForm.deadline || null,
      });
      if (result.success) {
        closePanel(milestoneId);
        await loadMilestones();
        await loadVersionsForMilestone(milestoneId);
      } else {
        setEditError(result.error ?? "Failed to save milestone");
      }
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to save milestone",
      );
    } finally {
      setEditSaving(false);
    }
  };

  // ── Status change handlers ────────────────────────────────────────────────

  const handleStatusChange = (milestoneId: string, status: MilestoneStatus) => {
    setConfirmDialog({ open: true, milestoneId, status });
  };

  const confirmStatusChange = async () => {
    if (!confirmDialog.milestoneId || !confirmDialog.status) return;
    const { milestoneId, status } = confirmDialog;
    setConfirmDialog({ open: false, milestoneId: null, status: null });

    setEditSaving(true);
    try {
      const handlers: Record<
        MilestoneStatus,
        () => Promise<{ success: boolean; error?: string }>
      > = {
        approved: () => approveMilestoneContent(milestoneId),
        needs_attention: () => requestMilestoneChanges(milestoneId),
        needs_ola_review: () => setMilestoneNeedsOlaReview(milestoneId),
        reviewed_by_ola: () => setMilestoneReviewedByOla(milestoneId),
        finalized: () => setMilestoneFinalized(milestoneId),
        attention_to_timeline: () =>
          setMilestoneAttentionToTimeline(milestoneId),
        confirmation_needed: () => setMilestoneConfirmationNeeded(milestoneId),
        draft: () => setMilestoneToDraft(milestoneId),
        no_submission: () => setMilestoneToDraft(milestoneId),
      };
      const result = await handlers[status]();
      if (result.success) {
        await loadMilestones();
        await loadVersionsForMilestone(milestoneId);
      }
    } catch {
      // silently fail
    } finally {
      setEditSaving(false);
    }
  };

  // ── Create milestone ──────────────────────────────────────────────────────

  const handleCreateMilestone = async () => {
    if (!newMilestoneForm.description?.trim()) {
      setCreateError("Description is required");
      return;
    }
    if (!newMilestoneForm.deadline) {
      setCreateError("Deadline is required");
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
    try {
      const result = await createMilestone({
        action_id: action.id,
        action_sub_id: action.sub_id,
        is_public: newMilestoneForm.is_public,
        is_final: newMilestoneForm.is_final,
        description: newMilestoneForm.description || null,
        deadline: newMilestoneForm.deadline || null,
      });
      if (result.success) {
        setCreatingNew(false);
        setNewMilestoneForm({
          is_public: false,
          is_final: false,
          description: "",
          deadline: "",
        });
        await loadMilestones();
      } else {
        setCreateError(result.error ?? "Failed to create milestone");
      }
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create milestone",
      );
    } finally {
      setCreateSaving(false);
    }
  };

  // ── Delete milestone ──────────────────────────────────────────────────────

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      const result = await deleteMilestone(milestoneId);
      if (result.success) await loadMilestones();
    } catch {
      // silently fail
    }
  };

  // ── Comment handlers ──────────────────────────────────────────────────────

  const handleAddComment = async (milestoneId: string) => {
    if (!commentText.trim()) return;
    const updates = milestoneUpdates[milestoneId] ?? [];
    const parentUpdate = replyingToId
      ? updates.find((u) => u.id === replyingToId)
      : null;
    const isLegal = parentUpdate ? parentUpdate.is_legal : commentIsLegal;
    const isInternal = parentUpdate
      ? parentUpdate.is_internal
      : commentIsInternal;

    setCommentSaving(true);
    setCommentError(null);
    try {
      const result = await createMilestoneUpdate({
        milestone_id: milestoneId,
        content: commentText.trim(),
        reply_to: replyingToId,
        is_legal: isLegal,
        is_internal: isInternal,
      });
      if (result.success) {
        setCommentText("");
        setReplyingToId(null);
        if (!replyingToId) {
          setCommentIsLegal(false);
          setCommentIsInternal(false);
        }
        await loadMilestoneUpdates(milestoneId);
      } else {
        setCommentError(result.error ?? "Failed to add comment");
      }
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : "Failed to add comment",
      );
    } finally {
      setCommentSaving(false);
    }
  };

  const handleToggleResolved = async (
    milestoneId: string,
    updateId: string,
  ) => {
    try {
      const result = await toggleMilestoneUpdateResolved(updateId);
      if (result.success) await loadMilestoneUpdates(milestoneId);
    } catch {
      // silently fail
    }
  };

  const handleDeleteComment = async (milestoneId: string, updateId: string) => {
    try {
      const result = await deleteMilestoneUpdate(updateId);
      if (result.success) await loadMilestoneUpdates(milestoneId);
    } catch {
      // silently fail
    }
  };

  const handleSaveEditComment = async (
    milestoneId: string,
    updateId: string,
  ) => {
    if (!editingContent.trim()) return;
    setCommentSaving(true);
    setCommentError(null);
    try {
      const result = await updateMilestoneUpdate(
        updateId,
        editingContent.trim(),
      );
      if (result.success) {
        setEditingUpdateId(null);
        setEditingContent("");
        await loadMilestoneUpdates(milestoneId);
      } else {
        setCommentError(result.error ?? "Failed to update comment");
      }
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : "Failed to update comment",
      );
    } finally {
      setCommentSaving(false);
    }
  };

  const startReply = (milestoneId: string, updateId: string) => {
    setAddingCommentId(milestoneId);
    setReplyingToId(updateId);
    setCommentText("");
    setCommentError(null);
  };

  const cancelReply = () => {
    setAddingCommentId(null);
    setReplyingToId(null);
    setCommentIsLegal(false);
    setCommentText("");
    setCommentError(null);
  };

  // ── Attachment handlers ───────────────────────────────────────────────────

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !window.confirm(
        "Are you sure you want to upload this file? Once uploaded, only administrators can delete attachments.",
      )
    )
      return;

    setUploading(true);
    setUploadError(null);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.set("action_id", action.id.toString());
      if (action.sub_id) formData.set("action_sub_id", action.sub_id);
      const milestoneId = formData.get("milestone_id");
      if (!milestoneId || milestoneId === "") formData.delete("milestone_id");

      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        await loadAttachments();
        form.reset();
      } else {
        setUploadError(result.error ?? "Upload failed");
      }
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      const result = await deleteActionAttachment(attachmentId);
      if (result.success) await loadAttachments();
    } catch {
      // silently fail
    }
  };

  const handleSaveAttachment = async (
    attachmentId: string,
    title: string | null,
    description: string | null,
  ) => {
    try {
      const result = await updateAttachmentMetadata(
        attachmentId,
        title,
        description,
      );
      if (result.success) await loadAttachments();
    } catch {
      // silently fail
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const sortedBySerial = (list: ActionMilestone[]) =>
    [...list].sort((a, b) => a.serial_number - b.serial_number);

  const publicMilestones = sortedBySerial(milestones.filter((m) => m.is_public));
  const privateMilestones = sortedBySerial(
    milestones.filter((m) => !m.is_public),
  );

  // ── Shared row props builder ───────────────────────────────────────────────

  const rowProps = (milestone: ActionMilestone) => ({
    milestone,
    updates: milestoneUpdates[milestone.id] ?? [],
    versions: versions[milestone.id] ?? [],
    loadingVersions: loadingVersions[milestone.id] ?? false,
    openPanel: openPanels[milestone.id] ?? null,
    isAdmin,
    currentUserId,
    documentSubmitted: !milestone.is_public
      ? (milestoneDocumentSubmitted[milestone.id] ??
        milestone.milestone_document_submitted ??
        false)
      : false,
    publicProgress: milestone.is_public ? milestone.public_progress : undefined,

    editForm,
    editSaving,
    editError,
    onEditFormChange: setEditForm,
    onEditSave: () => handleEditSave(milestone.id),

    addingCommentId,
    replyingToId,
    commentText,
    commentIsLegal,
    commentIsInternal,
    commentSaving,
    commentError,
    editingUpdateId,
    editingContent,

    onOpenEdit: () => handleOpenEdit(milestone),
    onOpenHistory: () => handleOpenHistory(milestone),
    onOpenComments: () => handleOpenComments(milestone),
    onClosePanel: () => closePanel(milestone.id),

    onCommentTextChange: setCommentText,
    onIsLegalChange: setCommentIsLegal,
    onIsInternalChange: setCommentIsInternal,
    onSubmitComment: handleAddComment,
    onReply: startReply,
    onCancelReply: cancelReply,
    onToggleResolved: handleToggleResolved,
    onStartEditComment: (u: MilestoneUpdate) => {
      setEditingUpdateId(u.id);
      setEditingContent(u.content);
    },
    onCancelEditComment: () => {
      setEditingUpdateId(null);
      setEditingContent("");
    },
    onEditingContentChange: setEditingContent,
    onSaveEditComment: handleSaveEditComment,
    onDeleteComment: (milestoneId: string, updateId: string) =>
      setPendingDeleteComment({ milestoneId, updateId }),

    onDelete: isAdmin
      ? () => setPendingDeleteMilestoneId(milestone.id)
      : undefined,
    onStatusChange: isAdmin
      ? (status: MilestoneStatus) => handleStatusChange(milestone.id, status)
      : undefined,
    onDocumentSubmittedChange:
      isAdmin && !milestone.is_public
        ? async (milestoneId: string, submitted: boolean) => {
            setMilestoneDocumentSubmitted((prev) => ({
              ...prev,
              [milestoneId]: submitted,
            }));
            await updateMilestoneDocumentSubmitted(milestoneId, submitted);
            await loadMilestones();
          }
        : undefined,
    onPublicProgressChange:
      isAdmin && milestone.is_public
        ? async (value: PublicProgressValue) => {
            const result = await updateMilestonePublicProgress(
              milestone.id,
              value,
            );
            if (result.success) await loadMilestones();
          }
        : undefined,
  });

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState />;
  if (milestones.length === 0)
    return <EmptyState message="No milestones have been added yet." />;

  return (
    <div className="space-y-8">
      {/* ── Public milestones ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Public Milestones
        </h3>
        {publicMilestones.length === 0 && !creatingNew && (
          <p className="text-sm text-slate-400 italic">
            No public milestones yet
          </p>
        )}
        {publicMilestones.map((m) => (
          <MilestoneRow key={m.id} {...rowProps(m)} />
        ))}

        {isAdmin && !creatingNew && (
          <button
            onClick={() => {
              setNewMilestoneForm({
                is_public: true,
                is_final: false,
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

        {isAdmin && creatingNew && newMilestoneForm.is_public && (
          <MilestoneCreateForm
            form={newMilestoneForm}
            saving={createSaving}
            error={createError}
            onChange={setNewMilestoneForm}
            onSave={handleCreateMilestone}
            onCancel={() => {
              setCreatingNew(false);
              setCreateError(null);
            }}
          />
        )}
      </section>

      <hr className="border-slate-200" />

      {/* ── Internal milestones ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Internal Milestones
        </h3>
        {privateMilestones.length === 0 && !creatingNew && (
          <p className="text-sm text-slate-400 italic">
            No internal milestones yet
          </p>
        )}
        {privateMilestones.map((m) => (
          <MilestoneRow key={m.id} {...rowProps(m)} />
        ))}

        {isAdmin && !creatingNew && (
          <button
            onClick={() => {
              setNewMilestoneForm({
                is_public: false,
                is_final: false,
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

        {isAdmin && creatingNew && !newMilestoneForm.is_public && (
          <MilestoneCreateForm
            form={newMilestoneForm}
            saving={createSaving}
            error={createError}
            onChange={setNewMilestoneForm}
            onSave={handleCreateMilestone}
            onCancel={() => {
              setCreatingNew(false);
              setCreateError(null);
            }}
          />
        )}
      </section>

      <hr className="border-slate-200" />

      {/* ── Documents ── */}
      <MilestoneDocuments
        actionId={action.id}
        actionSubId={action.sub_id}
        milestones={milestones}
        attachments={attachments}
        attachmentCount={attachmentCount}
        loading={loadingAttachments}
        uploading={uploading}
        uploadError={uploadError}
        isAdmin={isAdmin}
        onUpload={handleUpload}
        onDeleteAttachment={handleDeleteAttachment}
        onSaveAttachment={handleSaveAttachment}
      />

      {/* ── Status change confirm dialog ── */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmDialog({ open: false, milestoneId: null, status: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Milestone Status</DialogTitle>
            <DialogDescription>
              {confirmDialog.status &&
                STATUS_CONFIRM_MESSAGES[confirmDialog.status]}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({
                  open: false,
                  milestoneId: null,
                  status: null,
                })
              }
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

      {/* ── Delete comment confirm ── */}
      <DeleteConfirmDialog
        open={pendingDeleteComment !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteComment(null);
        }}
        onConfirm={() => {
          if (pendingDeleteComment) {
            handleDeleteComment(
              pendingDeleteComment.milestoneId,
              pendingDeleteComment.updateId,
            );
            setPendingDeleteComment(null);
          }
        }}
        description="This comment will be permanently deleted."
      />

      {/* ── Delete milestone confirm ── */}
      <DeleteConfirmDialog
        open={pendingDeleteMilestoneId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteMilestoneId(null);
        }}
        onConfirm={() => {
          if (pendingDeleteMilestoneId) {
            handleDeleteMilestone(pendingDeleteMilestoneId);
            setPendingDeleteMilestoneId(null);
          }
        }}
        description="This milestone and all its comments will be permanently deleted."
      />
    </div>
  );
}
