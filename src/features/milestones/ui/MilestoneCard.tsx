"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, Check, Clock, MessageSquare, Pencil } from "lucide-react";
import type { ActionMilestone } from "@/types";
import type { MilestoneUpdate } from "@/features/milestones/updates-queries";

interface MilestoneCardProps {
  milestone: ActionMilestone;
  updates: MilestoneUpdate[];
  onEdit: () => void;
  onComment: () => void;
  onShowHistory: () => void;
  onApprove?: () => void;
}

export function MilestoneCard({
  milestone,
  updates,
  onEdit,
  onComment,
  onShowHistory,
  onApprove,
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
  const canApprove = !milestone.is_approved && !milestone.is_draft && onApprove;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-md">
      {/* Single row layout for consistency */}
      <div className="flex items-start gap-4">
        {/* Left: Content */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Title */}
          <p className="text-sm leading-snug text-slate-800">
            {milestone.description || <span className="italic text-slate-400">No description</span>}
          </p>
          
          {/* Meta row: Badge + Deadline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Badge className={`${status.className} text-xs font-medium`}>{status.label}</Badge>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3 w-3" />
              Deadline: {milestone.deadline ? new Date(milestone.deadline).toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric' 
              }) : <span className="italic">Not set</span>}
            </span>
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
          {canApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              className="ml-1 flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
              title="Approve"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
