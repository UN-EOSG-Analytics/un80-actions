"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LeadsBadge } from "@/components/LeadsBadge";
import { CheckCircle2, Clock, CheckCircle } from "lucide-react";
import { parseDate } from "@/lib/utils";
import type { WorkPackageAction } from "@/types";

/**
 * Props for the ActionItem component (component-specific)
 */
interface ActionItemProps {
  /** The action data to display */
  action: WorkPackageAction;
  /** The work package number (e.g., "31") for document reference formatting */
  workPackageNumber: number | "";
}

/**
 * Displays a single action item within a work package.
 * Shows the action text, leads, document references, and optional doc text.
 */
export function ActionItem({ action, workPackageNumber }: ActionItemProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = () => {
    // Save current URL to sessionStorage before opening modal
    const currentUrl = searchParams.toString();
    if (currentUrl) {
      sessionStorage.setItem("previousUrl", currentUrl);
    } else {
      sessionStorage.removeItem("previousUrl");
    }

    // Build human-readable URL: /action-14
    const url = `/action-${action.actionNumber}`;

    // Update URL without navigating (for static export compatibility)
    window.history.pushState({}, "", url);
    // Trigger a popstate event to notify ModalHandler
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Calculate progress to determine if action is completed
  // Icon only appears when progress reaches 100% based on elapsed time calculation
  const isCompleted = (() => {
    if (!action.finalMilestoneDeadline || !action.firstMilestone) return false;

    const deadlineDate = parseDate(action.finalMilestoneDeadline);
    const startDate = parseDate(action.firstMilestone);
    const now = new Date();

    // Both dates must be valid and startDate must be before deadlineDate
    if (!deadlineDate || !startDate) return false;
    if (isNaN(deadlineDate.getTime()) || isNaN(startDate.getTime()))
      return false;
    if (startDate >= deadlineDate) return false;

    const totalDuration = deadlineDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const progress = Math.min(
      Math.max((elapsed / totalDuration) * 100, 0),
      100,
    );

    return progress >= 100;
  })();

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer rounded-[6px] border border-slate-200 bg-white p-5 pr-9 transition-all hover:border-slate-300 hover:shadow-md"
    >
      {/* Action Number and Text */}
      <div className="mb-4">
        {/* Action Number */}
        <div className="mb-2 text-sm font-medium tracking-wider text-un-blue uppercase">
          Action {action.actionNumber || ""}
        </div>
        {/* Action description text */}
        <div className="flex items-start gap-2">
          {isCompleted && (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-un-blue" />
          )}
          <p className="leading-normal font-medium text-slate-900">
            {action.text}
            {action.subActionDetails && (
              <>
                {" "}
                <span className="font-bold text-slate-600">
                  – {action.subActionDetails}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Metadata section - shown when there are leads */}
      {action.leads.length > 0 && (
        <div className="border-t border-slate-100 pt-3 mt-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Display lead organizations in muted style */}
            <LeadsBadge leads={action.leads} variant="muted" />
            {/* Decision status */}
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 ${
              action.decisionStatus === "decision taken"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {action.decisionStatus === "decision taken" ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">
                {action.decisionStatus === "decision taken" ? "Decision Taken" : "Further Work Ongoing"}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Metadata section - shown when there are no leads but decision status exists */}
      {action.leads.length === 0 && action.decisionStatus && (
        <div className="border-t border-slate-100 pt-3 mt-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 ${
              action.decisionStatus === "decision taken"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {action.decisionStatus === "decision taken" ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">
                {action.decisionStatus === "decision taken" ? "Decision Taken" : "Further Work Ongoing"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
