"use client";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Check, ChevronDown, Clock, MessageSquare, Pencil, Send } from "lucide-react";
import type { ActionMilestone } from "@/types";
import type { MilestoneUpdate } from "@/features/milestones/updates-queries";

interface MilestoneCardProps {
  milestone: ActionMilestone;
  updates: MilestoneUpdate[];
  onEdit: () => void;
  onComment: () => void;
  onShowHistory: () => void;
  onStatusChange?: (status: "draft" | "approved" | "needs_attention" | "needs_ola_review" | "reviewed_by_ola" | "finalized" | "attention_to_timeline" | "confirmation_needed") => void;
  onDocumentSubmittedChange?: (milestoneId: string, submitted: boolean) => void;
  documentSubmitted?: boolean;
  isAdmin?: boolean;
}

export function MilestoneCard({
  milestone,
  updates,
  onEdit,
  onComment,
  onShowHistory,
  onStatusChange,
  onDocumentSubmittedChange,
  documentSubmitted = false,
  isAdmin = false,
}: MilestoneCardProps) {
  // Determine display status
  const getDisplayStatus = () => {
    if (milestone.is_draft) {
      return { label: "Draft", className: "bg-slate-100 text-slate-600" };
    }
    if (milestone.finalized) {
      return { label: "Finalized", className: "bg-green-100 text-green-700" };
    }
    if (milestone.confirmation_needed) {
      return { label: "Confirmation needed", className: "bg-orange-100 text-orange-700" };
    }
    if (milestone.attention_to_timeline) {
      return { label: "Attention to timeline", className: "bg-yellow-100 text-yellow-700" };
    }
    if (milestone.reviewed_by_ola) {
      return { label: "Reviewed by OLA", className: "bg-blue-100 text-blue-700" };
    }
    if (milestone.is_approved) {
      return { label: "Approved", className: "bg-green-100 text-green-700" };
    }
    if (milestone.needs_attention) {
      return { label: "Needs Attention", className: "bg-amber-100 text-amber-700" };
    }
    if (milestone.needs_ola_review) {
      return { label: "Needs OLA review", className: "bg-violet-100 text-violet-700" };
    }
    return { label: "In Review", className: "bg-blue-100 text-blue-700" };
  };

  const status = getDisplayStatus();

  // Determine current status (mutually exclusive)
  const getCurrentStatus = (): "draft" | "approved" | "needs_attention" | "needs_ola_review" | "reviewed_by_ola" | "finalized" | "attention_to_timeline" | "confirmation_needed" | "in_review" => {
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

  // Display label: Public, First, Second, Third, or Final (as before serial numbering)
  const milestoneLabel = milestone.is_public
    ? "Public"
    : milestone.milestone_type.charAt(0).toUpperCase() + milestone.milestone_type.slice(1);

  // Past due: deadline has passed
  const isPastDue =
    milestone.deadline &&
    (() => {
      const deadlineDate = new Date(milestone.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      deadlineDate.setHours(0, 0, 0, 0);
      return deadlineDate < today;
    })();

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-md">
      {/* Single row layout for consistency */}
      <div className="flex items-start gap-4">
        {/* Left: Content */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Title row with label */}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
              {milestoneLabel}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="font-medium leading-snug text-slate-900">
                {milestone.description || <span className="italic font-normal text-slate-400">No description</span>}
              </p>
              {/* Meta row: Badge + Deadline - aligned with title */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {isAdmin && onStatusChange ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`inline-flex items-center gap-1 rounded-full ${status.className} px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80`}>
                        {status.label}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      {milestone.is_public ? (
                        // Public milestones: draft, needs OLA review, reviewed by OLA, finalized
                        <>
                          <DropdownMenuItem
                            onClick={() => onStatusChange("draft")}
                            disabled={currentStatus === "draft"}
                          >
                            <span className="flex w-full items-center justify-between">
                              Draft
                              {currentStatus === "draft" && <Check className="h-3 w-3" />}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusChange("needs_ola_review")}
                            disabled={currentStatus === "needs_ola_review"}
                          >
                            <span className="flex w-full items-center justify-between">
                              Needs OLA review
                              {currentStatus === "needs_ola_review" && <Check className="h-3 w-3" />}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusChange("reviewed_by_ola")}
                            disabled={currentStatus === "reviewed_by_ola"}
                          >
                            <span className="flex w-full items-center justify-between">
                              Reviewed by OLA
                              {currentStatus === "reviewed_by_ola" && <Check className="h-3 w-3" />}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusChange("finalized")}
                            disabled={currentStatus === "finalized"}
                          >
                            <span className="flex w-full items-center justify-between">
                              Finalized
                              {currentStatus === "finalized" && <Check className="h-3 w-3" />}
                            </span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        // Internal milestones: draft, attention to timeline, confirmation needed, finalized
                        <>
                          <DropdownMenuItem
                            onClick={() => onStatusChange("draft")}
                            disabled={currentStatus === "draft"}
                          >
                            <span className="flex w-full items-center justify-between">
                              Draft
                              {currentStatus === "draft" && <Check className="h-3 w-3" />}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusChange("attention_to_timeline")}
                            disabled={currentStatus === "attention_to_timeline"}
                          >
                            <span className="flex w-full items-center justify-between">
                              Attention to timeline
                              {currentStatus === "attention_to_timeline" && <Check className="h-3 w-3" />}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusChange("confirmation_needed")}
                            disabled={currentStatus === "confirmation_needed"}
                          >
                            <span className="flex w-full items-center justify-between">
                              Confirmation needed
                              {currentStatus === "confirmation_needed" && <Check className="h-3 w-3" />}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusChange("finalized")}
                            disabled={currentStatus === "finalized"}
                          >
                            <span className="flex w-full items-center justify-between">
                              Finalized
                              {currentStatus === "finalized" && <Check className="h-3 w-3" />}
                            </span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge className={`${status.className} text-xs font-medium`}>{status.label}</Badge>
                )}
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="h-3 w-3" />
                  {milestone.deadline ? new Date(milestone.deadline).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric' 
                  }) : <span className="italic">No deadline</span>}
                </span>
                {isPastDue && (
                  <span
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700"
                    title="Past due"
                  >
                    !
                  </span>
                )}
                {onDocumentSubmittedChange != null && (
                  <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={documentSubmitted ? "submitted" : "not_submitted"}
                      onValueChange={(value: "submitted" | "not_submitted") => {
                        onDocumentSubmittedChange(milestone.id, value === "submitted");
                      }}
                    >
                      <SelectTrigger
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${
                          documentSubmitted
                            ? "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
                            : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        }`}
                      >
                        {documentSubmitted ? (
                          <Send className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <SelectValue className="text-xs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_submitted">Not submitted</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions - fixed width for alignment */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowHistory();
            }}
            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Version history"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComment();
            }}
            className="relative rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Comments"
          >
            <MessageSquare className="h-4 w-4" />
            {updates.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-un-blue text-[9px] font-semibold text-white">
                {updates.length}
              </span>
            )}
          </button>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
