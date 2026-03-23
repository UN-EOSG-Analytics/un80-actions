"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { formatShortDate } from "@/lib/format-date";
import type { ActionMilestone } from "@/types";
import type { MilestoneUpdate } from "@/features/milestones/updates-queries";

export type PublicProgressValue = "completed" | "in_progress" | "delayed";

interface MilestoneCardProps {
  milestone: ActionMilestone;
  updates: MilestoneUpdate[];
  activePanel?: "edit" | "history" | "comments" | null;
  onEdit: () => void;
  onDelete?: () => void;
  onComment: () => void;
  onShowHistory: () => void;
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
  documentSubmitted?: boolean;
  onPublicProgressChange?: (value: PublicProgressValue) => void;
  publicProgress?: "completed" | "in_progress" | "delayed" | null;
  isAdmin?: boolean;
  canEdit?: boolean;
}

export function MilestoneCard({
  milestone,
  updates,
  activePanel = null,
  onEdit,
  onDelete,
  onComment,
  onShowHistory,
  onStatusChange,
  onDocumentSubmittedChange,
  documentSubmitted = false,
  onPublicProgressChange,
  publicProgress = null,
  isAdmin = false,
  canEdit = false,
}: MilestoneCardProps) {
  // Determine display status
  // dot color + label text — consistent badge system
  const getDisplayStatus = () => {
    if (milestone.is_draft)
      return {
        label: "Draft",
        dot: "bg-slate-400",
        className: "border-slate-200  bg-slate-50   text-slate-600",
      };
    if (milestone.finalized)
      return {
        label: "Finalized",
        dot: "bg-emerald-500",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    if (milestone.confirmation_needed)
      return {
        label: "Confirmation needed",
        dot: "bg-orange-400",
        className: "border-orange-200  bg-orange-50   text-orange-700",
      };
    if (milestone.attention_to_timeline)
      return {
        label: "Attention to timeline",
        dot: "bg-yellow-400",
        className: "border-yellow-200  bg-yellow-50   text-yellow-700",
      };
    if (milestone.reviewed_by_ola)
      return {
        label: "Reviewed by OLA",
        dot: "bg-sky-500",
        className: "border-sky-200     bg-sky-50      text-sky-700",
      };
    if (milestone.is_approved)
      return {
        label: "Approved",
        dot: "bg-emerald-500",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    if (milestone.needs_attention)
      return {
        label: "Needs attention",
        dot: "bg-amber-400",
        className: "border-amber-200   bg-amber-50    text-amber-700",
      };
    if (milestone.needs_ola_review)
      return {
        label: "Needs OLA review",
        dot: "bg-violet-500",
        className: "border-violet-200  bg-violet-50   text-violet-700",
      };
    return {
      label: "In review",
      dot: "bg-blue-400",
      className: "border-blue-200    bg-blue-50     text-blue-700",
    };
  };

  const status = getDisplayStatus();

  // Determine current status (mutually exclusive)
  const getCurrentStatus = ():
    | "draft"
    | "approved"
    | "needs_attention"
    | "needs_ola_review"
    | "reviewed_by_ola"
    | "finalized"
    | "attention_to_timeline"
    | "confirmation_needed"
    | "in_review" => {
    if (milestone.is_draft) return "draft";
    if (milestone.finalized) return "finalized";
    if (milestone.confirmation_needed) return "confirmation_needed";
    if (milestone.attention_to_timeline) return "attention_to_timeline";
    if (milestone.reviewed_by_ola) return "reviewed_by_ola";
    if (milestone.is_approved) return "approved";
    if (milestone.needs_attention) return "needs_attention";
    if (milestone.needs_ola_review) return "needs_ola_review";
    return "in_review";
  };

  const currentStatus = getCurrentStatus();

  // Display label: "Public #1", "Public #2", "Internal #1", etc. with "Final" badge if is_final
  const trackLabel = milestone.is_public ? "Public" : "Internal";
  const milestoneLabel = `${trackLabel} #${milestone.serial_number}`;

  // Past due: deadline has passed (parse YYYY-MM-DD as local date to avoid timezone shift)
  const isPastDue =
    milestone.deadline &&
    (() => {
      const s = milestone.deadline.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const deadlineDate = new Date(milestone.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate < today;
      }
      const [y, m, d] = s.split("-").map(Number);
      const deadlineDate = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return deadlineDate < today;
    })();

  const publicProgress_ = (publicProgress ??
    "in_progress") as PublicProgressValue;
  const progressConfig = {
    completed: {
      style:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      dot: "bg-emerald-500",
      label: "Completed",
    },
    in_progress: {
      style:
        "border-blue-200    bg-blue-50    text-blue-700    hover:bg-blue-100",
      dot: "bg-blue-400",
      label: "In progress",
    },
    delayed: {
      style:
        "border-amber-200   bg-amber-50   text-amber-700   hover:bg-amber-100",
      dot: "bg-amber-400",
      label: "Delayed",
    },
  }[publicProgress_];
  const progressStyle = progressConfig.style;

  return (
    <div className="px-4 py-3">
      {/* 3-column grid: [label] [content] [actions] */}
      <div
        className="grid items-start gap-x-3"
        style={{ gridTemplateColumns: "auto 1fr auto" }}
      >
        {/* Col 1: Type label — original square chip */}
        <div className="flex flex-col items-start gap-1 pt-0.5">
          <span className="inline-block shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs leading-tight font-medium text-slate-500">
            {milestoneLabel}
          </span>
          {milestone.is_final && (
            <span className="inline-block shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs leading-tight font-medium text-amber-700">
              Final
            </span>
          )}
        </div>

        {/* Col 2: Description + meta row */}
        <div className="min-w-0 space-y-2">
          <p className="text-sm leading-snug font-medium text-slate-900">
            {milestone.description || (
              <span className="font-normal text-slate-400 italic">
                No description
              </span>
            )}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Date — plain text with icon */}
            <span
              className={`flex shrink-0 items-center gap-1 text-xs tabular-nums ${isPastDue && !documentSubmitted ? "font-medium text-red-600" : "text-slate-500"}`}
            >
              <Calendar className="h-3 w-3 shrink-0" />
              {milestone.deadline ? (
                formatShortDate(milestone.deadline)
              ) : (
                <span className="italic">No deadline</span>
              )}
            </span>

            {/* Status — always occupies this slot */}
            {isAdmin && onStatusChange ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border ${status.className} h-6 px-2.5 text-xs font-medium transition-opacity hover:opacity-75`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
                    />
                    {status.label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {milestone.is_public ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("draft")}
                        disabled={currentStatus === "draft"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Draft{" "}
                          {currentStatus === "draft" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("needs_ola_review")}
                        disabled={currentStatus === "needs_ola_review"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Needs OLA review{" "}
                          {currentStatus === "needs_ola_review" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("reviewed_by_ola")}
                        disabled={currentStatus === "reviewed_by_ola"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Reviewed by OLA{" "}
                          {currentStatus === "reviewed_by_ola" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("finalized")}
                        disabled={currentStatus === "finalized"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Finalized{" "}
                          {currentStatus === "finalized" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("draft")}
                        disabled={currentStatus === "draft"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Draft{" "}
                          {currentStatus === "draft" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("no_submission")}
                        disabled={currentStatus === "draft"}
                      >
                        <span className="flex w-full items-center justify-between">
                          No Submission{" "}
                          {currentStatus === "draft" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("needs_attention")}
                        disabled={currentStatus === "needs_attention"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Needs Attention{" "}
                          {currentStatus === "needs_attention" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("attention_to_timeline")}
                        disabled={currentStatus === "attention_to_timeline"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Attention to timeline{" "}
                          {currentStatus === "attention_to_timeline" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("confirmation_needed")}
                        disabled={currentStatus === "confirmation_needed"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Confirmation needed{" "}
                          {currentStatus === "confirmation_needed" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("approved")}
                        disabled={currentStatus === "approved"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Approved{" "}
                          {currentStatus === "approved" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("finalized")}
                        disabled={currentStatus === "finalized"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Finalized{" "}
                          {currentStatus === "finalized" && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isAdmin ? (
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border ${status.className} h-6 px-2.5 text-xs font-medium`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
                />
                {status.label}
              </span>
            ) : null}

            {/* Public progress selector (admin only, public milestones) */}
            {milestone.is_public && onPublicProgressChange != null && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-opacity hover:opacity-75 ${progressStyle}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${progressConfig.dot}`}
                    />
                    {progressConfig.label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-36">
                  {(
                    [
                      "completed",
                      "in_progress",
                      "delayed",
                    ] as PublicProgressValue[]
                  ).map((v) => {
                    const labels: Record<PublicProgressValue, string> = {
                      completed: "Completed",
                      in_progress: "In progress",
                      delayed: "Delayed",
                    };
                    return (
                      <DropdownMenuItem
                        key={v}
                        onClick={() => onPublicProgressChange(v)}
                        disabled={publicProgress_ === v}
                      >
                        <span className="flex w-full items-center justify-between">
                          {labels[v]}
                          {publicProgress_ === v && (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Non-admin public progress read-only pill */}
            {milestone.is_public && !isAdmin && publicProgress && (
              <span
                className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${progressConfig.style}`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${progressConfig.dot}`}
                />
                {progressConfig.label}
              </span>
            )}

            {/* Document submitted selector (admin only, internal milestones) */}
            {onDocumentSubmittedChange != null && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-opacity hover:opacity-75 ${
                      documentSubmitted
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${documentSubmitted ? "bg-emerald-500" : "bg-slate-300"}`}
                    />
                    {documentSubmitted ? "Submitted" : "Not submitted"}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem
                    onClick={() =>
                      onDocumentSubmittedChange(milestone.id, false)
                    }
                    disabled={!documentSubmitted}
                  >
                    <span className="flex w-full items-center justify-between">
                      Not submitted{" "}
                      {!documentSubmitted && <Check className="h-3 w-3" />}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onDocumentSubmittedChange(milestone.id, true)
                    }
                    disabled={documentSubmitted}
                  >
                    <span className="flex w-full items-center justify-between">
                      Submitted{" "}
                      {documentSubmitted && <Check className="h-3 w-3" />}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Col 2: Action buttons */}
        <div className="flex items-center gap-0.5 pt-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowHistory();
            }}
            className={`rounded p-1.5 transition-colors ${
              activePanel === "history"
                ? "bg-slate-200 text-slate-700"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
            title="Version history"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComment();
            }}
            className={`relative rounded p-1.5 transition-colors ${
              activePanel === "comments"
                ? "bg-un-blue/10 text-un-blue"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
            title="Comments"
          >
            <MessageSquare className="h-4 w-4" />
            {updates.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-un-blue text-xs font-semibold text-white">
                {updates.length}
              </span>
            )}
          </button>
          {(isAdmin || canEdit) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className={`rounded p-1.5 transition-colors ${
                activePanel === "edit"
                  ? "bg-slate-200 text-slate-700"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              }`}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
