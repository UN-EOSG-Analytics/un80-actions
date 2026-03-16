"use client";

import type { MilestoneVersion } from "@/features/milestones/queries";
import type { MilestoneUpdate } from "@/features/milestones/updates-queries";
import type { ActionMilestone } from "@/types";
import { MilestoneCard, type PublicProgressValue } from "./MilestoneCard";
import { MilestoneCommentForm } from "./MilestoneCommentForm";
import { MilestoneCommentThread } from "./MilestoneCommentThread";
import { MilestoneEditPanel, type MilestoneEditForm } from "./MilestoneEditPanel";
import { MilestoneVersionHistory } from "./MilestoneVersionHistory";

// ---------------------------------------------------------------------------
// Open panel discriminant — one panel open at a time per row
// ---------------------------------------------------------------------------
export type MilestonePanel = "edit" | "history" | "comments" | null;

interface MilestoneRowProps {
  milestone: ActionMilestone;
  updates: MilestoneUpdate[];
  versions: MilestoneVersion[];
  loadingVersions: boolean;
  openPanel: MilestonePanel;
  isAdmin: boolean;
  currentUserId: string | null;
  documentSubmitted: boolean;
  publicProgress: "completed" | "in_progress" | "delayed" | null | undefined;

  // edit
  editForm: MilestoneEditForm;
  editSaving: boolean;
  editError: string | null;
  onEditFormChange: (form: MilestoneEditForm) => void;
  onEditSave: () => void;

  // comments
  addingCommentId: string | null;
  replyingToId: string | null;
  commentText: string;
  commentIsLegal: boolean;
  commentIsInternal: boolean;
  commentSaving: boolean;
  commentError: string | null;
  editingUpdateId: string | null;
  editingContent: string;

  // panel toggles (parent controls which panel is open)
  onOpenEdit: () => void;
  onOpenHistory: () => void;
  onOpenComments: () => void;
  onClosePanel: () => void;

  // comment handlers
  onCommentTextChange: (text: string) => void;
  onIsLegalChange: (v: boolean) => void;
  onIsInternalChange: (v: boolean) => void;
  onSubmitComment: (milestoneId: string) => void;
  onReply: (milestoneId: string, updateId: string) => void;
  onCancelReply: () => void;
  onToggleResolved: (milestoneId: string, updateId: string) => void;
  onStartEditComment: (update: MilestoneUpdate) => void;
  onCancelEditComment: () => void;
  onEditingContentChange: (text: string) => void;
  onSaveEditComment: (milestoneId: string, updateId: string) => void;
  onDeleteComment: (milestoneId: string, updateId: string) => void;

  // milestone card callbacks
  onDelete?: () => void;
  onStatusChange?: (
    status:
      | "draft"
      | "approved"
      | "needs_attention"
      | "needs_ola_review"
      | "reviewed_by_ola"
      | "finalized"
      | "attention_to_timeline"
      | "confirmation_needed"
      | "no_submission",
  ) => void;
  onDocumentSubmittedChange?: (milestoneId: string, submitted: boolean) => void;
  onPublicProgressChange?: (value: PublicProgressValue) => void;
}

export function MilestoneRow({
  milestone,
  updates,
  versions,
  loadingVersions,
  openPanel,
  isAdmin,
  currentUserId,
  documentSubmitted,
  publicProgress,
  editForm,
  editSaving,
  editError,
  onEditFormChange,
  onEditSave,
  addingCommentId,
  replyingToId,
  commentText,
  commentIsLegal,
  commentIsInternal,
  commentSaving,
  commentError,
  editingUpdateId,
  editingContent,
  onOpenEdit,
  onOpenHistory,
  onOpenComments,
  onClosePanel,
  onCommentTextChange,
  onIsLegalChange,
  onIsInternalChange,
  onSubmitComment,
  onReply,
  onCancelReply,
  onToggleResolved,
  onStartEditComment,
  onCancelEditComment,
  onEditingContentChange,
  onSaveEditComment,
  onDeleteComment,
  onDelete,
  onStatusChange,
  onDocumentSubmittedChange,
  onPublicProgressChange,
}: MilestoneRowProps) {
  const isOpen = openPanel !== null;
  const showNewCommentForm = addingCommentId === milestone.id && !replyingToId;

  return (
    <div className={`rounded-xl border bg-white transition-all duration-150 ${isOpen ? "border-slate-200 shadow-[0_2px_12px_0_rgba(0,0,0,0.07)]" : "border-slate-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] hover:border-slate-200 hover:shadow-[0_2px_10px_0_rgba(0,0,0,0.07)]"}`}>
      <MilestoneCard
        milestone={milestone}
        updates={updates}
        activePanel={openPanel}
        isAdmin={isAdmin}
        documentSubmitted={documentSubmitted}
        publicProgress={publicProgress}
        onEdit={onOpenEdit}
        onDelete={onDelete}
        onComment={onOpenComments}
        onShowHistory={onOpenHistory}
        onStatusChange={onStatusChange}
        onDocumentSubmittedChange={onDocumentSubmittedChange}
        onPublicProgressChange={onPublicProgressChange}
      />

      {/* CSS grid-rows expansion — no height measurement, no layout jump on the card header */}
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
        <div className="border-t border-slate-100 px-4 py-4">
          {openPanel === "edit" && (
            <MilestoneEditPanel
              form={editForm}
              saving={editSaving}
              error={editError}
              onChange={onEditFormChange}
              onSave={onEditSave}
              onCancel={onClosePanel}
              onDelete={onDelete}
            />
          )}

          {openPanel === "history" && (
            <MilestoneVersionHistory
              versions={versions}
              loading={loadingVersions}
            />
          )}

          {openPanel === "comments" && (
            <div className="space-y-4">
              {/* Team updates (always visible) */}
              <MilestoneCommentThread
                variant="team"
                milestoneId={milestone.id}
                updates={updates}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                replyingToId={replyingToId}
                commentText={commentText}
                saving={commentSaving}
                editingUpdateId={editingUpdateId}
                editingContent={editingContent}
                onReply={onReply}
                onCancelReply={onCancelReply}
                onCommentTextChange={onCommentTextChange}
                onSubmitComment={onSubmitComment}
                onToggleResolved={onToggleResolved}
                onStartEditComment={onStartEditComment}
                onCancelEditComment={onCancelEditComment}
                onEditingContentChange={onEditingContentChange}
                onSaveEditComment={onSaveEditComment}
                onDeleteComment={onDeleteComment}
              />

              {/* Internal comments (private milestones, admin only) */}
              {!milestone.is_public && isAdmin && (
                <MilestoneCommentThread
                  variant="internal"
                  milestoneId={milestone.id}
                  updates={updates}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  replyingToId={replyingToId}
                  commentText={commentText}
                  saving={commentSaving}
                  editingUpdateId={editingUpdateId}
                  editingContent={editingContent}
                  onReply={onReply}
                  onCancelReply={onCancelReply}
                  onCommentTextChange={onCommentTextChange}
                  onSubmitComment={onSubmitComment}
                  onToggleResolved={onToggleResolved}
                  onStartEditComment={onStartEditComment}
                  onCancelEditComment={onCancelEditComment}
                  onEditingContentChange={onEditingContentChange}
                  onSaveEditComment={onSaveEditComment}
                  onDeleteComment={onDeleteComment}
                />
              )}

              {/* Legal comments (public milestones, admin only) */}
              {milestone.is_public && isAdmin && (
                <MilestoneCommentThread
                  variant="legal"
                  milestoneId={milestone.id}
                  updates={updates}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  replyingToId={replyingToId}
                  commentText={commentText}
                  saving={commentSaving}
                  editingUpdateId={editingUpdateId}
                  editingContent={editingContent}
                  onReply={onReply}
                  onCancelReply={onCancelReply}
                  onCommentTextChange={onCommentTextChange}
                  onSubmitComment={onSubmitComment}
                  onToggleResolved={onToggleResolved}
                  onStartEditComment={onStartEditComment}
                  onCancelEditComment={onCancelEditComment}
                  onEditingContentChange={onEditingContentChange}
                  onSaveEditComment={onSaveEditComment}
                  onDeleteComment={onDeleteComment}
                />
              )}

              {/* New top-level comment form */}
              {showNewCommentForm && (
                <MilestoneCommentForm
                  isPublic={milestone.is_public}
                  isAdmin={isAdmin}
                  commentText={commentText}
                  commentIsLegal={commentIsLegal}
                  commentIsInternal={commentIsInternal}
                  saving={commentSaving}
                  error={commentError}
                  onTextChange={onCommentTextChange}
                  onIsLegalChange={onIsLegalChange}
                  onIsInternalChange={onIsInternalChange}
                  onSubmit={() => onSubmitComment(milestone.id)}
                  onCancel={onCancelReply}
                />
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
