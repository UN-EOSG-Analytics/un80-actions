"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ActionLeadsBadge,
  DecisionStatusBadge,
  TeamBadge,
} from "@/components/Badges";
import { CheckCircle2 } from "lucide-react";
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
  /** Search query to highlight in the action text */
  searchQuery?: string;
  /** Whether this action matches the search query */
  isSearchMatch?: boolean;
}

/**
 * Highlights matching text in a string with a faint UN blue background
 */
export function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return isMatch ? (
          <mark
            key={i}
            className="rounded-sm bg-un-blue/25 px-0.5 text-inherit"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

/**
 * Displays a single action item within a work package.
 * Shows the action text, leads, document references, and optional doc text.
 */
export function ActionItem({ action, searchQuery = "", isSearchMatch }: ActionItemProps) {
  const searchParams = useSearchParams();
  const [showAllTeamMembers, setShowAllTeamMembers] = useState(false);

  // Parse team members from actionEntities (sorting handled by TeamBadge)
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

  // On mobile: prevent chip clicks from opening the modal (so tooltips can be used)
  const stopPropagationOnMobile = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches) {
      e.stopPropagation();
    }
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
      className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-un-blue/30 hover:shadow-lg sm:p-5"
    >
      {/* Header row: Action Number + Decision Status */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="rounded bg-un-blue/8 px-2 py-0.5 text-xs font-semibold tracking-wide text-un-blue uppercase">
          Action {action.actionNumber || ""}
        </span>
        <span onClick={stopPropagationOnMobile} className="inline-flex">
          <DecisionStatusBadge status={action.decisionStatus} size="sm" />
        </span>
      </div>

      {/* Action description text - primary focus */}
      <div className="flex items-start gap-2">
        {isCompleted && (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-un-blue" />
        )}
        <p className="text-[15px] leading-snug font-medium text-slate-900">
          <HighlightedText text={action.text} query={searchQuery} />
          {action.subActionDetails && (
            <>
              {" "}
              <span className="font-semibold text-slate-600">
                – <HighlightedText text={action.subActionDetails} query={searchQuery} />
              </span>
            </>
          )}
        </p>
      </div>

      {/* Metadata section - Action Leads and Team Members */}
      {(action.leads.length > 0 || teamMembers.length > 0) && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-1" onClick={stopPropagationOnMobile}>
            {/* Action Leads - uses centralized sorting */}
            <ActionLeadsBadge leads={action.leads} inline />
            {/* Separator */}
            {action.leads.length > 0 && teamMembers.length > 0 && (
              <span className="text-slate-300">•</span>
            )}
            {/* Team Members - uses centralized sorting */}
            <TeamBadge leads={displayedTeamMembers} inline />
            {/* Show all/less button - inline with badges */}
            {hasMoreThanFour && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTeamMembers(!showAllTeamMembers);
                }}
                className="inline-flex h-5 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white px-2 text-[11px] font-medium leading-none text-slate-500 transition-all duration-150 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                {showAllTeamMembers
                  ? "show less"
                  : `+${teamMembers.length - 4} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
