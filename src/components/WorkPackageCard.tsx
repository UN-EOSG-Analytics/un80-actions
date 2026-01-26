import { useState } from "react";
import { ActionItem, HighlightedText } from "@/components/ActionCard";
import { WorkstreamLabels, WPLeadsBadge } from "@/components/Badges";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { formatGoalText } from "@/lib/utils";
import type { WorkPackage, WorkPackageAction } from "@/types";
import { ChevronDown, Menu } from "lucide-react";

interface WorkPackageActionsProps {
  actions: WorkPackageAction[];
  workPackageNumber: number | "";
  searchQuery?: string;
  selectedActionStatus?: string[];
  selectedMilestoneMonth?: string[];
}

/**
 * Helper to check if an action matches the search query
 */
function actionMatchesSearch(
  action: WorkPackageAction,
  query: string,
): boolean {
  if (!query.trim()) return true;
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/);
  return (
    action.text.toLowerCase().includes(lowerQuery) ||
    (action.subActionDetails?.toLowerCase().includes(lowerQuery) ?? false) ||
    queryWords.some((w) => w === String(action.actionNumber))
  );
}

/**
 * Helper to check if an action matches the status filter
 */
function actionMatchesStatus(
  action: WorkPackageAction,
  selectedStatuses: string[],
): boolean {
  if (selectedStatuses.length === 0) return true;
  const actionStatusLower = action.actionStatus?.toLowerCase() || "";
  return selectedStatuses.some(
    (status) => status.toLowerCase() === actionStatusLower,
  );
}
/**
 * Helper to check if an action matches the milestone month filter
 */
function actionMatchesMilestoneMonth(
  action: WorkPackageAction,
  selectedMonths: string[],
): boolean {
  if (selectedMonths.length === 0) return true;
  if (!action.deliveryDate) return false;
  const deliveryDate = new Date(action.deliveryDate);
  const monthName = deliveryDate.toLocaleDateString("en-US", {
    month: "long",
  });
  return selectedMonths.includes(monthName);
}
function WorkPackageActions({
  actions,
  workPackageNumber,
  searchQuery = "",
  selectedActionStatus = [],
  selectedMilestoneMonth = [],
}: WorkPackageActionsProps) {
  const [showUnmatched, setShowUnmatched] = useState(false);

  if (actions.length === 0) {
    return (
      <div className="rounded-[6px] border border-slate-200 bg-white p-4.25">
        <p className="text-sm leading-tight font-normal text-slate-900">
          No actions available
        </p>
      </div>
    );
  }

  // Separate matched and unmatched actions based on search, status, and milestone month filters
  const hasActiveSearch = searchQuery.trim().length > 0;
  const hasActiveStatusFilter = selectedActionStatus.length > 0;
  const hasActiveMilestoneMonthFilter = selectedMilestoneMonth.length > 0;
  const hasActiveFilter =
    hasActiveSearch || hasActiveStatusFilter || hasActiveMilestoneMonthFilter;

  const matchedActions = hasActiveFilter
    ? actions.filter(
        (action) =>
          actionMatchesSearch(action, searchQuery) &&
          actionMatchesStatus(action, selectedActionStatus) &&
          actionMatchesMilestoneMonth(action, selectedMilestoneMonth),
      )
    : actions;
  const unmatchedActions = hasActiveFilter
    ? actions.filter(
        (action) =>
          !actionMatchesSearch(action, searchQuery) ||
          !actionMatchesStatus(action, selectedActionStatus) ||
          !actionMatchesMilestoneMonth(action, selectedMilestoneMonth),
      )
    : [];

  return (
    <div className="flex flex-col gap-2">
      {/* Display matched actions */}
      {matchedActions.map((action, idx) => (
        <ActionItem
          key={`${workPackageNumber}-${action.actionNumber}-${action.text}-${idx}`}
          action={action}
          workPackageNumber={workPackageNumber}
          searchQuery={searchQuery}
          isSearchMatch={true}
        />
      ))}

      {/* Show unmatched actions toggle button */}
      {unmatchedActions.length > 0 && (
        <>
          <button
            onClick={() => setShowUnmatched(!showUnmatched)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-500 transition-all hover:border-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${showUnmatched ? "rotate-180" : ""}`}
            />
            {showUnmatched
              ? "Hide other actions"
              : `Show ${unmatchedActions.length} other action${unmatchedActions.length === 1 ? "" : "s"}`}
          </button>

          {/* Unmatched actions - conditionally rendered */}
          {showUnmatched && (
            <div className="flex flex-col gap-2 pt-2 opacity-70">
              {unmatchedActions.map((action, idx) => (
                <ActionItem
                  key={`${workPackageNumber}-${action.actionNumber}-${action.text}-unmatched-${idx}`}
                  action={action}
                  workPackageNumber={workPackageNumber}
                  searchQuery={searchQuery}
                  isSearchMatch={false}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface WorkPackageItemProps {
  workPackage: WorkPackage;
  isOpen: boolean;
  onToggle: () => void;
  collapsibleKey: string;
  onSelectLead?: (lead: string[]) => void;
  onSelectWorkstream?: (workstream: string[]) => void;
  showProgress?: boolean;
  searchQuery?: string;
  selectedActions?: string[];
  selectedTeamMembers?: string[];
  selectedActionStatus?: string[];
  selectedMilestoneMonth?: string[];
  originalActionsCount?: number;
}

export function WorkPackageItem({
  workPackage: wp,
  isOpen,
  onToggle,
  onSelectLead,
  onSelectWorkstream,
  showProgress = false,
  searchQuery = "",
  selectedActions = [],
  selectedTeamMembers = [],
  selectedActionStatus = [],
  selectedMilestoneMonth = [],
  originalActionsCount,
}: WorkPackageItemProps) {
  // Calculate animation duration: base 150ms + 30ms per action, capped at 400ms
  const collapsibleDuration = Math.min(150 + wp.actions.length * 30, 400);

  // Use the original total count if provided, otherwise use current actions length
  const totalActionsCount = originalActionsCount ?? wp.actions.length;

  // Calculate matched actions for filter display
  const hasActiveSearch = searchQuery.trim().length > 0;
  const hasActiveStatusFilter = selectedActionStatus.length > 0;
  const hasActiveMilestoneMonthFilter = selectedMilestoneMonth.length > 0;
  const hasActiveActionFilter = selectedActions.length > 0;
  const hasActiveTeamMemberFilter = selectedTeamMembers.length > 0;
  const hasActiveFilter =
    hasActiveSearch ||
    hasActiveStatusFilter ||
    hasActiveMilestoneMonthFilter ||
    hasActiveActionFilter ||
    hasActiveTeamMemberFilter;

  const matchedActionsCount = hasActiveFilter
    ? wp.actions.filter(
        (action) =>
          actionMatchesSearch(action, searchQuery) &&
          actionMatchesStatus(action, selectedActionStatus) &&
          actionMatchesMilestoneMonth(action, selectedMilestoneMonth),
      ).length
    : wp.actions.length;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div
        className="group relative mb-20 rounded-[6px] bg-slate-100 transition-colors last:mb-0 hover:bg-[#E0F5FF]"
        style={
          {
            "--collapsible-duration": `${collapsibleDuration}ms`,
          } as React.CSSProperties
        }
      >
        {isOpen && (
          <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-1 rounded-l-[6px] bg-un-blue" />
        )}
        <CollapsibleTrigger
          className={`flex w-full flex-col items-start rounded-[6px] border-0 px-4 py-3 hover:no-underline sm:px-6 sm:py-4 ${
            isOpen ? "rounded-b-none" : ""
          }`}
        >
          {/* Work Package Title */}
          <div className="mb-2 min-w-0 pr-20 text-left sm:pr-24 md:pr-8">
            {wp.number ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm leading-5 font-medium tracking-wider text-slate-500 uppercase">
                    Work package {wp.number}
                  </span>
                  {/* Progress Bar */}
                  {showProgress && (
                    <div className="flex min-w-30 flex-1 items-center gap-2">
                      <div className="relative max-w-50 flex-1">
                        <Progress value={0} className="h-1.5" />
                        <div className="absolute top-0 left-0 h-1.5 w-0.5 rounded-l-full bg-un-blue" />
                      </div>
                      <span className="text-xs font-semibold whitespace-nowrap text-un-blue">
                        0%
                      </span>
                    </div>
                  )}
                </div>
                <h2 className="mt-1 text-base leading-6 font-semibold text-slate-900 sm:text-xl sm:leading-7">
                  <HighlightedText text={wp.name} query={searchQuery} />
                </h2>
              </>
            ) : (
              <h2 className="text-base leading-6 font-semibold text-slate-900 sm:text-xl sm:leading-7">
                <HighlightedText text={wp.name} query={searchQuery} />
              </h2>
            )}
          </div>

          {/* Goal from work package data */}
          {wp.goal && (
            <div className="mb-3 flex items-stretch gap-2.5 text-left sm:mb-4">
              <div className="w-0.75 shrink-0 rounded-full bg-un-blue" />
              <p className="py-0.5 text-sm leading-snug font-medium text-slate-600 sm:text-base">
                <span className="font-semibold text-un-blue">Goal:</span>{" "}
                <HighlightedText
                  text={formatGoalText(wp.goal)}
                  query={searchQuery}
                />
              </p>
            </div>
          )}

          {/* Report Labels and Work Package Leads */}
          <div className="flex w-full flex-wrap items-center gap-1.5">
            {/* Workstream Labels */}
            <WorkstreamLabels
              report={wp.report}
              onSelectWorkstream={onSelectWorkstream}
            />

            {/* Separator */}
            {wp.report.some((r) => ["WS1", "WS2", "WS3"].includes(r)) &&
              wp.leads.length > 0 && <span className="text-slate-300">•</span>}

            {/* Work Package Leads */}
            <WPLeadsBadge leads={wp.leads} onSelect={onSelectLead} />
          </div>
        </CollapsibleTrigger>

        {/* Divider and Action Count/Header - Always visible when actions exist */}
        {wp.actions.length > 0 && (
          <div className="px-4 sm:px-6">
            <div className="w-full border-t border-slate-200" />
            {/* Cross-fade header section - fixed height container */}
            {/* Animation timing: title animates first on expand, last on collapse */}
            <div className="relative flex h-10 items-center">
              {/* Collapsed state: "X Indicative Actions" */}
              <div
                className={`absolute inset-0 flex items-center gap-2 transition-opacity duration-200 ease-out ${
                  isOpen ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
              >
                <span className="text-sm font-semibold text-slate-500">
                  {hasActiveFilter
                    ? `${matchedActionsCount}/${totalActionsCount} Indicative ${totalActionsCount === 1 ? "Action" : "Actions"}`
                    : `${totalActionsCount} Indicative ${totalActionsCount === 1 ? "Action" : "Actions"}`}
                </span>
                <div className="flex -space-x-1.5">
                  {Array.from({ length: totalActionsCount }).map((_, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded-full border-2 border-slate-100 bg-un-blue transition-colors group-hover:border-[#E0F5FF]"
                      style={{
                        opacity: Math.max(0.3, 1 - i * 0.08),
                        zIndex: totalActionsCount - i,
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Expanded state: "Indicative Actions" header with count and dots */}
              <div
                className={`absolute inset-0 flex items-center gap-2 transition-opacity duration-200 ease-out ${
                  isOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <h3 className="text-left text-lg font-semibold tracking-wider text-slate-700">
                  {hasActiveFilter
                    ? `${matchedActionsCount}/${totalActionsCount} Indicative ${totalActionsCount === 1 ? "Action" : "Actions"}`
                    : `${totalActionsCount} Indicative ${totalActionsCount === 1 ? "Action" : "Actions"}`}
                </h3>
                <div className="flex -space-x-1.5">
                  {Array.from({ length: totalActionsCount }).map((_, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded-full border-2 border-slate-100 bg-un-blue transition-colors group-hover:border-[#E0F5FF]"
                      style={{
                        opacity: Math.max(0.3, 1 - i * 0.08),
                        zIndex: totalActionsCount - i,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Button */}
        <button
          type="button"
          className="absolute top-3 right-3 !flex !size-9 !min-h-9 !min-w-9 !max-h-9 !max-w-9 items-center justify-center rounded-md bg-slate-500 !p-0 text-white transition-colors hover:bg-slate-600 sm:!h-auto sm:!w-auto sm:!min-h-0 sm:!min-w-0 sm:!max-h-none sm:!max-w-none sm:gap-1.5 sm:rounded-[6px] sm:!px-3 sm:!py-1.5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
        >
          <Menu className="size-4 shrink-0 sm:size-3.5" />
          <span className="hidden text-sm font-medium sm:inline">Details</span>
        </button>

        {/* Collapsible Content */}
        <CollapsibleContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="pt-2">
            <WorkPackageActions
              actions={wp.actions}
              workPackageNumber={wp.number}
              searchQuery={searchQuery}
              selectedActionStatus={selectedActionStatus}
              selectedMilestoneMonth={selectedMilestoneMonth}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
