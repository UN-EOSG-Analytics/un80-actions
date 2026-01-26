"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ActionLeadsBadge,
  DecisionStatusBadge,
  TeamBadge,
  ShowMoreBadge,
} from "@/components/Badges";
import { CheckCircle2 } from "lucide-react";
import {
  buildCleanQueryString,
  normalizeTeamMemberForDisplay,
} from "@/lib/utils";
import { isDecisionTaken } from "@/constants/actionStatus";
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
export function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
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
export function ActionItem({ action, searchQuery = "" }: ActionItemProps) {
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
    const currentUrl = window.location.search || "/";
    sessionStorage.setItem("actionModalReturnUrl", currentUrl);
    // Mark that modal is open (for useFilters to freeze state)
    sessionStorage.setItem("actionModalOpen", "true");

    // Navigate to clean URL with only action param
    const cleanUrl = `?action=${action.actionNumber}`;
    window.history.pushState({}, "", cleanUrl);
    // Trigger a popstate event to notify ModalHandler
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // On mobile: prevent chip clicks from opening the modal (so tooltips can be used)
  const stopPropagationOnMobile = (e: React.MouseEvent) => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches
    ) {
      e.stopPropagation();
    }
  };

  // Completion status is based on action status, not time-based calculation
  const isCompleted = isDecisionTaken(action.actionStatus);

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-un-blue/30 hover:shadow-lg sm:p-5"
    >
      {/* Header row: Action Number + Decision Status */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="rounded bg-un-blue/8 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-un-blue uppercase sm:text-xs">
          Action {action.actionNumber || ""}
        </span>
        <span onClick={stopPropagationOnMobile} className="inline-flex">
          <DecisionStatusBadge status={action.actionStatus} size="sm" />
        </span>
      </div>

      {/* Action description text - primary focus */}
      <div className="flex items-start gap-2">
        {isCompleted && (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-un-blue" />
        )}
        <p className="text-sm leading-snug font-medium text-slate-900 sm:text-[15px]">
          <HighlightedText text={action.text} query={searchQuery} />
          {action.subActionDetails && (
            <>
              {" "}
              <span className="font-semibold text-slate-600">
                –{" "}
                <HighlightedText
                  text={action.subActionDetails}
                  query={searchQuery}
                />
              </span>
            </>
          )}
        </p>
      </div>

      {/* Metadata section - Action Leads and Team Members */}
      {(action.leads.length > 0 || teamMembers.length > 0) && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div
            className="flex flex-wrap items-center gap-1"
            onClick={stopPropagationOnMobile}
          >
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
              <ShowMoreBadge
                showAll={showAllTeamMembers}
                hiddenCount={teamMembers.length - 4}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTeamMembers(!showAllTeamMembers);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
