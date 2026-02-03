"use client";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Check, ChevronDown, Clock, MessageSquare, Pencil } from "lucide-react";
import type { ActionMilestone } from "@/types";
import type { MilestoneUpdate } from "@/features/milestones/updates-queries";

interface MilestoneCardProps {
  milestone: ActionMilestone;
  updates: MilestoneUpdate[];
  onEdit: () => void;
  onComment: () => void;
  onShowHistory: () => void;
  onStatusChange?: (status: "draft" | "approved" | "needs_attention") => void;
  isAdmin?: boolean;
}

export function MilestoneCard({
  milestone,
  updates,
  onEdit,
  onComment,
  onShowHistory,
  onStatusChange,
  isAdmin = false,
}: MilestoneCardProps) {
  // Determine display status
  const getDisplayStatus = () => {
    if (milestone.is_draft) {
      return { label: "Draft", className: "bg-slate-100 text-slate-600" };
    }
    if (milestone.is_approved) {
      return { label: "Approved", className: "bg-green-100 text-green-700" };
    }
    if (milestone.needs_attention) {
      return { label: "Needs Attention", className: "bg-amber-100 text-amber-700" };
    }
    return { label: "In Review", className: "bg-blue-100 text-blue-700" };
  };

  const status = getDisplayStatus();

  // Determine current status (mutually exclusive)
  const getCurrentStatus = (): "draft" | "approved" | "needs_attention" | "in_review" => {
    if (milestone.is_draft) return "draft";
    if (milestone.is_approved) return "approved";
    if (milestone.needs_attention) return "needs_attention";
    return "in_review";
  };

  const currentStatus = getCurrentStatus();

  // Format milestone ID nicely
  const milestoneId = milestone.action_sub_id 
    ? `${milestone.action_id}${milestone.action_sub_id}.${milestone.serial_number}` 
    : `${milestone.action_id}.${milestone.serial_number}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-md">
      {/* Single row layout for consistency */}
      <div className="flex items-start gap-4">
        {/* Left: Content */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Title row with ID */}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-500">
              {milestoneId}
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
                        onClick={() => onStatusChange("approved")}
                        disabled={currentStatus === "approved"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Approved
                          {currentStatus === "approved" && <Check className="h-3 w-3" />}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange("needs_attention")}
                        disabled={currentStatus === "needs_attention"}
                      >
                        <span className="flex w-full items-center justify-between">
                          Needs Attention
                          {currentStatus === "needs_attention" && <Check className="h-3 w-3" />}
                        </span>
                      </DropdownMenuItem>
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
        </div>
      </div>
    </div>
  );
}
