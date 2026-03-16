"use client";

import { Button } from "@/components/ui/button";
import type { MilestoneUpdate } from "@/features/milestones/updates-queries";
import {
  CheckCircle2,
  CornerDownRight,
  Loader2,
  MessageSquare,
  Pencil,
  Scale,
  Trash2,
  User,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Variant palette — drives colours for team / internal / legal sections
// ---------------------------------------------------------------------------

type Variant = "team" | "internal" | "legal";

interface VariantConfig {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  borderAccent: string;
  headerBg: string;
  headerBorder: string;
  countBadge: string;
  avatarBg: string;
  avatarText: string;
  threadBorder: string;
  threadBg: string;
  replyArrow: string;
  replyHoverBg: string;
  replyAvatarBg: string;
  replyAvatarText: string;
  replyFormBg: string;
  replyFormBorder: string;
  replyArrowColor: string;
  focusBorder: string;
  focusRing: string;
  hoverAccent: string;
  emptyText: string;
}

const VARIANTS: Record<Variant, VariantConfig> = {
  team: {
    icon: <User className="h-4 w-4 text-un-blue" />,
    label: "Team updates & comments",
    borderAccent: "border-l-un-blue",
    headerBg: "bg-white/80",
    headerBorder: "border-slate-200",
    countBadge: "bg-un-blue/15 text-un-blue",
    avatarBg: "bg-un-blue/10",
    avatarText: "text-un-blue",
    threadBorder: "border-slate-200",
    threadBg: "bg-white hover:border-un-blue/30 hover:shadow-sm",
    replyArrow: "text-slate-300",
    replyHoverBg: "hover:bg-slate-50",
    replyAvatarBg: "bg-slate-200",
    replyAvatarText: "text-slate-600",
    replyFormBg: "bg-slate-50/50",
    replyFormBorder: "border-slate-200",
    replyArrowColor: "text-slate-400",
    focusBorder: "focus:border-un-blue",
    focusRing: "focus:ring-un-blue",
    hoverAccent: "hover:text-un-blue",
    emptyText: "No team comments yet",
  },
  internal: {
    icon: <MessageSquare className="h-4 w-4 text-violet-600" />,
    label: "Internal comments",
    sublabel: "(admin only)",
    borderAccent: "border-l-violet-500",
    headerBg: "bg-white/80",
    headerBorder: "border-violet-200",
    countBadge: "bg-violet-200/80 text-violet-800",
    avatarBg: "bg-violet-100",
    avatarText: "text-violet-700",
    threadBorder: "border-violet-200",
    threadBg: "bg-white hover:border-violet-400/50 hover:shadow-sm",
    replyArrow: "text-violet-300",
    replyHoverBg: "hover:bg-violet-50/50",
    replyAvatarBg: "bg-violet-100",
    replyAvatarText: "text-violet-700",
    replyFormBg: "bg-violet-50/30",
    replyFormBorder: "border-violet-100",
    replyArrowColor: "text-violet-400",
    focusBorder: "focus:border-violet-500",
    focusRing: "focus:ring-violet-500",
    hoverAccent: "hover:text-violet-600",
    emptyText: "No internal comments yet",
  },
  legal: {
    icon: <Scale className="h-4 w-4 text-amber-600" />,
    label: "Legal updates & comments",
    borderAccent: "border-l-amber-500",
    headerBg: "bg-white/80",
    headerBorder: "border-amber-200",
    countBadge: "bg-amber-200/80 text-amber-800",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-700",
    threadBorder: "border-amber-200",
    threadBg: "bg-white hover:border-amber-400/50 hover:shadow-sm",
    replyArrow: "text-amber-300",
    replyHoverBg: "hover:bg-amber-50/50",
    replyAvatarBg: "bg-amber-100",
    replyAvatarText: "text-amber-700",
    replyFormBg: "bg-amber-50/30",
    replyFormBorder: "border-amber-100",
    replyArrowColor: "text-amber-400",
    focusBorder: "focus:border-amber-500",
    focusRing: "focus:ring-amber-500",
    hoverAccent: "hover:text-amber-600",
    emptyText: "No legal comments yet",
  },
};

// ---------------------------------------------------------------------------
// Filter predicates per variant
// ---------------------------------------------------------------------------

function filterTopLevel(updates: MilestoneUpdate[], variant: Variant) {
  return updates.filter((u) => {
    if (u.reply_to) return false;
    if (variant === "team") return !u.is_legal && !u.is_internal;
    if (variant === "internal") return !u.is_legal && u.is_internal;
    if (variant === "legal") return u.is_legal;
    return false;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function Avatar({
  email,
  bgClass,
  textClass,
  size = "md",
}: {
  email: string | null | undefined;
  bgClass: string;
  textClass: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-5 w-5 text-xs" : "h-6 w-6 text-xs";
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full ${bgClass} font-semibold ${textClass}`}
    >
      {(email?.[0] ?? "U").toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MilestoneCommentThreadProps {
  variant: Variant;
  milestoneId: string;
  updates: MilestoneUpdate[];
  currentUserId: string | null;
  isAdmin: boolean;
  replyingToId: string | null;
  commentText: string;
  saving: boolean;
  editingUpdateId: string | null;
  editingContent: string;
  onReply: (milestoneId: string, updateId: string) => void;
  onCancelReply: () => void;
  onCommentTextChange: (text: string) => void;
  onSubmitComment: (milestoneId: string) => void;
  onToggleResolved: (milestoneId: string, updateId: string) => void;
  onStartEditComment: (update: MilestoneUpdate) => void;
  onCancelEditComment: () => void;
  onEditingContentChange: (text: string) => void;
  onSaveEditComment: (milestoneId: string, updateId: string) => void;
  onDeleteComment: (milestoneId: string, updateId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MilestoneCommentThread({
  variant,
  milestoneId,
  updates,
  currentUserId,
  isAdmin,
  replyingToId,
  commentText,
  saving,
  editingUpdateId,
  editingContent,
  onReply,
  onCancelReply,
  onCommentTextChange,
  onSubmitComment,
  onToggleResolved,
  onStartEditComment,
  onCancelEditComment,
  onEditingContentChange,
  onSaveEditComment,
  onDeleteComment,
}: MilestoneCommentThreadProps) {
  const v = VARIANTS[variant];
  const topLevel = filterTopLevel(updates, variant);

  const containerBorder =
    variant === "team"
      ? "border border-l-4 border-slate-200"
      : variant === "internal"
        ? "border border-l-4 border-violet-200"
        : "border border-l-4 border-amber-200";

  return (
    <div
      className={`rounded-lg ${containerBorder} ${v.borderAccent} ${variant === "team" ? "bg-slate-50/30" : variant === "internal" ? "bg-violet-50/20" : "bg-amber-50/20"}`}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 border-b ${v.headerBorder} ${v.headerBg} px-3 py-2`}
      >
        {v.icon}
        <span
          className={`text-xs font-semibold tracking-wide uppercase ${variant === "team" ? "text-slate-600" : variant === "internal" ? "text-violet-800/90" : "text-amber-800/90"}`}
        >
          {v.label}
        </span>
        {v.sublabel && (
          <span
            className={`text-xs ${variant === "internal" ? "text-violet-600/80" : "text-amber-600/80"}`}
          >
            {v.sublabel}
          </span>
        )}
        {topLevel.length > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.countBadge}`}
          >
            {topLevel.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-2">
        {topLevel.length === 0 ? (
          <div className="py-4 text-center">
            <p
              className={`text-xs ${variant === "team" ? "text-slate-400" : variant === "internal" ? "text-violet-700/70" : "text-amber-700/70"}`}
            >
              {v.emptyText}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topLevel.map((update) => {
              const replies = updates.filter((r) => r.reply_to === update.id);
              const isReplying = replyingToId === update.id;
              const canModify =
                isAdmin || (currentUserId && update.user_id === currentUserId);

              return (
                <div key={update.id} className="space-y-2">
                  {/* Update bubble */}
                  <div
                    className={`group relative rounded-lg border transition-all ${
                      update.is_resolved
                        ? "border-green-200 bg-green-50/30"
                        : `${v.threadBorder} ${v.threadBg}`
                    }`}
                  >
                    <div className="p-3">
                      {/* Author row */}
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar
                            email={update.user_email}
                            bgClass={v.avatarBg}
                            textClass={v.avatarText}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-700">
                              {update.user_email ?? "Unknown"}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatTimestamp(update.created_at)}
                            </span>
                          </div>
                          {update.is_resolved && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolved
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => onReply(milestoneId, update.id)}
                            className={`rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 ${v.hoverAccent}`}
                            title="Reply"
                          >
                            <CornerDownRight className="h-3 w-3" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() =>
                                onToggleResolved(milestoneId, update.id)
                              }
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                              title={
                                update.is_resolved
                                  ? "Mark as unresolved"
                                  : "Mark as resolved"
                              }
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </button>
                          )}
                          {canModify && (
                            <>
                              <button
                                onClick={() => onStartEditComment(update)}
                                className={`rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 ${v.hoverAccent}`}
                                title="Edit"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() =>
                                  onDeleteComment(milestoneId, update.id)
                                }
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
                            onChange={(e) =>
                              onEditingContentChange(e.target.value)
                            }
                            className={`w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ${v.focusBorder} ${v.focusRing} focus:ring-1`}
                            rows={3}
                            disabled={saving}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={onCancelEditComment}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                onSaveEditComment(milestoneId, update.id)
                              }
                              disabled={saving || !editingContent.trim()}
                              className={
                                variant === "team"
                                  ? "bg-un-blue hover:bg-un-blue/90"
                                  : variant === "internal"
                                    ? "bg-violet-600 hover:bg-violet-700"
                                    : "bg-amber-600 hover:bg-amber-700"
                              }
                            >
                              {saving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                          {update.content}
                        </p>
                      )}
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div
                        className={`border-t ${v.replyFormBorder} ${v.replyFormBg} px-3 py-2`}
                      >
                        <div className="space-y-2">
                          {replies.map((reply) => {
                            const canModifyReply =
                              isAdmin ||
                              (currentUserId &&
                                reply.user_id === currentUserId);
                            return (
                              <div
                                key={reply.id}
                                className={`group/reply relative flex gap-2 rounded-md bg-white p-2 ${v.replyHoverBg}`}
                              >
                                <CornerDownRight
                                  className={`mt-1 h-3 w-3 shrink-0 ${v.replyArrow}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Avatar
                                        email={reply.user_email}
                                        bgClass={v.replyAvatarBg}
                                        textClass={v.replyAvatarText}
                                        size="sm"
                                      />
                                      <span className="text-xs font-medium text-slate-600">
                                        {reply.user_email ?? "Unknown"}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {formatTimestamp(reply.created_at)}
                                      </span>
                                    </div>
                                    {canModifyReply && (
                                      <button
                                        onClick={() =>
                                          onDeleteComment(milestoneId, reply.id)
                                        }
                                        className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition-all group-hover/reply:opacity-100 hover:bg-slate-100 hover:text-red-600"
                                        title="Delete reply"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap text-slate-700">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Inline reply form */}
                    {isReplying && (
                      <div
                        className={`border-t ${v.replyFormBorder} ${v.replyFormBg} p-3`}
                      >
                        <div className="flex gap-2">
                          <CornerDownRight
                            className={`mt-2 h-3 w-3 shrink-0 ${v.replyArrowColor}`}
                          />
                          <div className="flex-1 space-y-2">
                            <textarea
                              value={commentText}
                              onChange={(e) =>
                                onCommentTextChange(e.target.value)
                              }
                              className={`w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ${v.focusBorder} ${v.focusRing} focus:ring-1`}
                              rows={2}
                              placeholder="Write a reply..."
                              disabled={saving}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={onCancelReply}
                                disabled={saving}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => onSubmitComment(milestoneId)}
                                disabled={saving || !commentText.trim()}
                                className={
                                  variant === "team"
                                    ? "bg-un-blue hover:bg-un-blue/90"
                                    : variant === "internal"
                                      ? "bg-violet-600 hover:bg-violet-700"
                                      : "bg-amber-600 hover:bg-amber-700"
                                }
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
        )}
      </div>
    </div>
  );
}
