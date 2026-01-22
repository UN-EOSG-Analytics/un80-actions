"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, CheckCircle } from "lucide-react";
import {
  parseDate,
  buildCleanQueryString,
  normalizeTeamMemberForDisplay,
} from "@/lib/utils";
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
export function ActionItem({ action }: ActionItemProps) {
  const searchParams = useSearchParams();
  const [showAllTeamMembers, setShowAllTeamMembers] = useState(false);

  // Parse team members from actionEntities
  const teamMembers = action.actionEntities
    ? action.actionEntities
        .split(";")
        .map((entity) => normalizeTeamMemberForDisplay(entity.trim()))
        .filter((entity) => entity && entity.trim().length > 0)
        .filter((entity, index, array) => array.indexOf(entity) === index)
    : [];

  const hasMoreThanFour = teamMembers.length > 4;
  const displayedTeamMembers = showAllTeamMembers
    ? teamMembers
    : teamMembers.slice(0, 4);

  const handleClick = () => {
    // Save current URL to sessionStorage before opening modal
    const currentUrl = searchParams.toString();
    if (currentUrl) {
      sessionStorage.setItem("previousUrl", currentUrl);
    } else {
      sessionStorage.removeItem("previousUrl");
    }

    // Build URL with query param: ?action=14 (preserving other params with clean encoding)
    const params: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((value, key) => {
      params[key] = value;
    });
    params.action = String(action.actionNumber);
    const url = `?${buildCleanQueryString(params)}`;

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
      className="cursor-pointer rounded-[6px] border border-slate-200 bg-white p-3 pr-6 transition-all hover:border-slate-300 hover:shadow-md sm:p-5 sm:pr-9"
    >
      {/* Action Number and Text */}
      <div className="mb-4">
        {/* Action Number and Decision Status */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-medium tracking-wider text-un-blue uppercase">
            Action {action.actionNumber || ""}
          </span>
          {action.decisionStatus && (
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                action.decisionStatus === "decision taken"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {action.decisionStatus === "decision taken" ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">
                {action.decisionStatus === "decision taken"
                  ? "Decision Taken"
                  : "Further Work Ongoing"}
              </span>
            </div>
          )}
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

      {/* Metadata section - team members */}
      {teamMembers.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {displayedTeamMembers.map((member, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-default border-0 bg-slate-200 text-xs text-slate-700 transition-all duration-150 hover:bg-slate-300"
              >
                {member}
              </Badge>
            ))}
            {/* Show all/less button */}
            {hasMoreThanFour && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTeamMembers(!showAllTeamMembers);
                }}
                className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
              >
                {showAllTeamMembers
                  ? "show less"
                  : `show ${teamMembers.length - 4} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
