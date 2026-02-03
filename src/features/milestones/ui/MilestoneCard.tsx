import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MessageSquare, Pencil } from "lucide-react";
import type { ActionMilestone } from "@/types";
import type { MilestoneUpdate } from "@/features/milestones/updates-queries";

interface MilestoneCardProps {
  milestone: ActionMilestone;
  updates: MilestoneUpdate[];
  onEdit: () => void;
  onComment: () => void;
  onShowHistory: () => void;
}

export function MilestoneCard({
  milestone,
  updates,
  onEdit,
  onComment,
  onShowHistory,
}: MilestoneCardProps) {
  // Determine display status: draft takes precedence, then approved
  const getDisplayStatus = () => {
    if (milestone.is_draft) {
      return { label: "draft", className: "bg-slate-100 text-slate-600" };
    }
    if (milestone.is_approved) {
      return { label: "approved", className: "bg-green-100 text-green-700" };
    }
    if (milestone.needs_attention) {
      return { label: "needs attention", className: "bg-amber-100 text-amber-700" };
    }
    return { label: "in review", className: "bg-blue-100 text-blue-700" };
  };

  const status = getDisplayStatus();

  return (
    <div className="rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <div className="p-4">
        {/* Header with status and deadline */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={status.className}>{status.label}</Badge>
            {milestone.deadline && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(milestone.deadline).toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric' 
                })}
              </div>
            )}
          </div>

          {/* Action buttons - icon only */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowHistory();
              }}
              className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
              title="Version history"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComment();
              }}
              className="relative rounded-md border border-un-blue/20 bg-un-blue/5 p-2 text-un-blue transition-colors hover:bg-un-blue/10"
              title="Add comment"
            >
              <MessageSquare className="h-4 w-4" />
              {updates.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-un-blue text-[10px] font-semibold text-white">
                  {updates.length}
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
              title="Edit milestone"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        {milestone.description ? (
          <p className="text-sm leading-relaxed text-slate-700">
            {milestone.description}
          </p>
        ) : (
          <p className="text-sm italic text-slate-400">No description yet</p>
        )}

        {/* Footer with submitted by info */}
        {milestone.submitted_by_entity && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              Submitted by <span className="font-medium text-slate-600">{milestone.submitted_by_entity}</span>
              {milestone.submitted_at && (
                <> · {new Date(milestone.submitted_at).toLocaleDateString(undefined, { 
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
