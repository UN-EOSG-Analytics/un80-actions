import React from "react";
import {
  Users,
  Calendar,
  Clock,
  SquareCheckBig,
  Layers,
  Activity,
} from "lucide-react";
import { SidebarChart, SidebarChartEntry } from "./SidebarChart";
import { buildCleanQueryString } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  LeadChartEntry,
  WorkstreamChartEntry,
  WorkPackageChartEntry,
  UpcomingMilestoneChartEntry,
  Action,
} from "@/types";

interface SidebarChartsProps {
  // Leads chart
  leadsData: LeadChartEntry[];
  leadsSearchQuery: string;
  onLeadsSearchChange: (query: string) => void;
  selectedLead: string[];
  onSelectLead: (lead: string[]) => void;
  showAllLeads: boolean;
  onToggleShowAllLeads: () => void;

  // Workstreams chart
  workstreamsData: WorkstreamChartEntry[];
  workstreamsSearchQuery: string;
  onWorkstreamsSearchChange: (query: string) => void;
  selectedWorkstream: string[];
  onSelectWorkstream: (workstream: string[]) => void;
  showAllWorkstreams: boolean;
  onToggleShowAllWorkstreams: () => void;

  // Work packages chart
  workPackagesData: WorkPackageChartEntry[];
  workPackagesSearchQuery: string;
  onWorkPackagesSearchChange: (query: string) => void;
  selectedWorkPackage: string[];
  onSelectWorkPackage: (workPackage: string[]) => void;
  showAllWorkPackages: boolean;
  onToggleShowAllWorkPackages: () => void;

  // Upcoming milestones chart
  upcomingMilestonesData: UpcomingMilestoneChartEntry[];
  upcomingMilestonesSearchQuery: string;
  onUpcomingMilestonesSearchChange: (query: string) => void;
  showAllUpcomingMilestones: boolean;
  onToggleShowAllUpcomingMilestones: () => void;

  // Milestones per month chart
  milestonesPerMonthSearchQuery: string;
  onMilestonesPerMonthSearchChange: (query: string) => void;
  showAllMilestonesPerMonth: boolean;
  onToggleShowAllMilestonesPerMonth: () => void;

  // Action Status filter
  selectedActionStatus: string[];
  onSelectActionStatus: (status: string[]) => void;

  // Actions data for status counts
  actions: Action[];
}

export function SidebarCharts({
  leadsData,
  leadsSearchQuery,
  onLeadsSearchChange,
  selectedLead,
  onSelectLead,
  workstreamsData,
  selectedWorkstream,
  onSelectWorkstream,
  upcomingMilestonesData,
  milestonesPerMonthSearchQuery,
  selectedActionStatus,
  onSelectActionStatus,
  actions,
}: SidebarChartsProps) {
  // Calculate status counts based on public_action_status field
  const decisionTakenCount = actions.filter(
    (action) => action.public_action_status?.toLowerCase() === "decision taken",
  ).length;
  const furtherWorkCount = actions.filter(
    (action) => action.public_action_status?.toLowerCase() === "further work ongoing",
  ).length;
  const totalActions = actions.length;

  const leadsChartEntries: SidebarChartEntry[] = leadsData.map((entry) => ({
    label: entry.lead,
    count: entry.count,
    value: entry.lead,
  }));

  const workstreamsChartEntries: SidebarChartEntry[] = workstreamsData.map(
    (entry) => ({
      label: entry.workstream,
      count: entry.count,
      value: entry.workstream,
    }),
  );

  // Format upcoming milestones with dates and urgency, filter for January only
  const now = new Date();
  const currentYear = now.getFullYear();
  const januaryStart = new Date(currentYear, 0, 1); // January 1st of current year
  const januaryEnd = new Date(currentYear, 0, 31, 23, 59, 59); // January 31st of current year

  const upcomingMilestonesChartEntries: SidebarChartEntry[] =
    upcomingMilestonesData
      .filter((entry) => {
        // Only show milestones with deadlines in January
        if (!entry.deadline) return false;
        const deadlineDate = new Date(entry.deadline);
        return deadlineDate >= januaryStart && deadlineDate <= januaryEnd;
      })
      .sort((a, b) => {
        const an = a.actionNumber != null ? Number(a.actionNumber) : Infinity;
        const bn = b.actionNumber != null ? Number(b.actionNumber) : Infinity;
        return an - bn;
      })
      .map((entry) => {
        const deadlineDate = entry.deadline ? new Date(entry.deadline) : null;
        const daysUntilDeadline = deadlineDate
          ? Math.ceil(
              (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            )
          : null;

        const isUpcoming =
          daysUntilDeadline !== null &&
          daysUntilDeadline >= 0 &&
          daysUntilDeadline <= 90;
        const isUrgent =
          daysUntilDeadline !== null &&
          daysUntilDeadline >= 0 &&
          daysUntilDeadline <= 30;

        let deadlineText = "";
        if (deadlineDate) {
          const formattedDate = deadlineDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          if (daysUntilDeadline === null || daysUntilDeadline < 0) {
            deadlineText = `Past: ${formattedDate}`;
          } else if (daysUntilDeadline === 0) {
            deadlineText = `Due today: ${formattedDate}`;
          } else if (daysUntilDeadline === 1) {
            deadlineText = `Due tomorrow: ${formattedDate}`;
          } else if (daysUntilDeadline <= 7) {
            deadlineText = `Due in ${daysUntilDeadline} days: ${formattedDate}`;
          } else if (daysUntilDeadline <= 30) {
            deadlineText = `Due in ${Math.ceil(daysUntilDeadline / 7)} weeks: ${formattedDate}`;
          } else {
            deadlineText = `Due ${formattedDate}`;
          }
        }

        return {
          label: entry.milestone,
          count: entry.count,
          value: entry.milestone,
          tooltip: deadlineText || undefined,
          deadline: entry.deadline,
          isUrgent: isUrgent || false,
          isUpcoming: isUpcoming || false,
          actionNumber: entry.actionNumber,
          workPackageNumber: entry.workPackageNumber,
          workPackageName: entry.workPackageName,
        };
      });

  // Calculate milestones per month
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const milestonesPerMonthMap = new Map<number, number>();

  upcomingMilestonesData.forEach((entry) => {
    if (entry.deadline) {
      const deadlineDate = new Date(entry.deadline);
      const month = deadlineDate.getMonth();
      milestonesPerMonthMap.set(
        month,
        (milestonesPerMonthMap.get(month) || 0) + entry.count,
      );
    }
  });

  const milestonesPerMonthEntries: SidebarChartEntry[] = Array.from(
    milestonesPerMonthMap.entries(),
  )
    .sort((a, b) => a[0] - b[0]) // Sort by month number
    .filter(([, count]) => count > 0) // Only include months with milestones
    .filter(([monthIndex]) => {
      // Filter by search query if provided
      if (!milestonesPerMonthSearchQuery) return true;
      const monthName = monthNames[monthIndex];
      return monthName
        ?.toLowerCase()
        .includes(milestonesPerMonthSearchQuery.toLowerCase());
    })
    .map(([monthIndex, count]) => ({
      label: monthNames[monthIndex],
      count: count,
      value: monthNames[monthIndex],
    }));

  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col divide-y divide-slate-200 lg:w-[320px] lg:max-w-[320px] lg:border-l lg:pl-6">
      {/* Action Status Chart */}
      {totalActions > 0 && (
        <div className="py-5 pl-4.5 first:pt-0">
          <h3 className="mb-3 flex h-6.25 items-center gap-2 text-[17px] font-semibold text-slate-900">
            <span className="flex h-5 w-5 items-center justify-center text-un-blue">
              <Activity className="h-5 w-5" />
            </span>
            Action Status
          </h3>

          <div className="space-y-3 pr-4">
            {/* Further Work Ongoing */}
            {(() => {
              const isSelected = selectedActionStatus.includes("Further work ongoing");
              return (
                <div
                  className={`group min-w-0 flex-1 cursor-pointer rounded-md px-2 py-1.5 transition-all ${
                    isSelected
                      ? "bg-un-blue/10 ring-2 ring-un-blue/30"
                      : "hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    // Toggle: if selected, clear; if not selected, select only this one
                    onSelectActionStatus(isSelected ? [] : ["Further work ongoing"]);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Clock className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isSelected ? "text-un-blue" : "text-un-blue"
                      }`} />
                      <span className={`text-sm font-medium transition-colors ${
                        isSelected ? "text-un-blue" : "text-slate-700 group-hover:text-slate-900"
                      }`}>
                        Further Work Ongoing
                      </span>
                    </div>
                    <span className={`shrink-0 text-[14px] font-semibold tabular-nums ${
                      isSelected ? "text-un-blue" : "text-un-blue"
                    }`}>
                      {furtherWorkCount}
                    </span>
                  </div>
                  <div className="relative mt-1.5 mr-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isSelected ? "bg-un-blue" : "bg-un-blue/50 group-hover:bg-un-blue/60"
                      }`}
                      style={{
                        width:
                          totalActions > 0
                            ? `${(furtherWorkCount / totalActions) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Decision Taken */}
            {(() => {
              const isSelected = selectedActionStatus.includes("Decision taken");
              return (
                <div
                  className={`group min-w-0 flex-1 cursor-pointer rounded-md px-2 py-1.5 transition-all ${
                    isSelected
                      ? "bg-un-blue/10 ring-2 ring-un-blue/30"
                      : "hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    // Toggle: if selected, clear; if not selected, select only this one
                    onSelectActionStatus(isSelected ? [] : ["Decision taken"]);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <SquareCheckBig className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isSelected ? "text-un-blue" : "text-un-blue"
                      }`} />
                      <span className={`text-sm font-medium transition-colors ${
                        isSelected ? "text-un-blue" : "text-slate-700 group-hover:text-slate-900"
                      }`}>
                        Decision Taken
                      </span>
                    </div>
                    <span className={`shrink-0 text-[14px] font-semibold tabular-nums ${
                      isSelected ? "text-un-blue" : "text-un-blue"
                    }`}>
                      {decisionTakenCount}
                    </span>
                  </div>
                  <div className="relative mt-1.5 mr-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isSelected ? "bg-un-blue" : "bg-un-blue/50 group-hover:bg-un-blue/60"
                      }`}
                      style={{
                        width:
                          totalActions > 0
                            ? `${(decisionTakenCount / totalActions) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Upcoming Milestones */}
      {upcomingMilestonesChartEntries.length > 0 && (
        <div className="py-5 pl-4.5">
          {/* Header */}
          <h3 className="mb-3 flex h-6.25 items-center gap-2 text-[17px] font-semibold text-slate-900">
            <span className="flex h-5 w-5 items-center justify-center text-un-blue">
              <Calendar className="h-5 w-5" />
            </span>
            Upcoming Milestones
          </h3>

          {/* Milestones List - ~3.5 entries visible, rest scrollable */}
          <div className="-mr-1 max-h-[15.5rem] divide-y divide-slate-100 overflow-y-auto overscroll-contain pr-1">
            {upcomingMilestonesChartEntries.map((entry, index) => {
              const deadlineDate = entry.deadline
                ? new Date(entry.deadline)
                : null;
              const monthShort = deadlineDate
                ? deadlineDate
                    .toLocaleDateString("en-US", { month: "short" })
                    .toUpperCase()
                : null;

              const handleMilestoneClick = () => {
                if (entry.actionNumber) {
                  // Save current URL to sessionStorage before opening modal
                  const currentUrl = window.location.search;
                  if (currentUrl) {
                    sessionStorage.setItem("previousUrl", currentUrl);
                  } else {
                    sessionStorage.removeItem("previousUrl");
                  }

                  // Build URL with query param: ?action=14 (preserving other params with clean encoding)
                  const params: Record<string, string> = {};
                  new URLSearchParams(window.location.search).forEach(
                    (value, key) => {
                      params[key] = value;
                    },
                  );
                  params.action = String(entry.actionNumber);
                  const url = `?${buildCleanQueryString(params)}`;
                  window.history.pushState({}, "", url);
                  // Trigger a popstate event to notify ModalHandler
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }
              };

              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={handleMilestoneClick}
                      className="group -mr-1 flex cursor-pointer items-start gap-3 py-3 pr-1 pl-2 transition-colors hover:bg-slate-50/50"
                    >
                      {/* Month Badge - Minimal pill style */}
                      <div className="mt-px flex h-4.5 min-w-11 items-center justify-center rounded-full bg-un-blue/8 text-un-blue">
                        <span className="text-[10px] font-semibold tracking-wide">
                          {monthShort || "—"}
                        </span>
                      </div>

                      {/* Milestone Content */}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13px] leading-snug text-slate-700 transition-colors group-hover:text-slate-900">
                          {entry.label}
                        </p>
                        {/* Action & Work Package Info */}
                        {(entry.workPackageNumber || entry.actionNumber) && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            {entry.workPackageNumber && (
                              <span className="font-medium">
                                Work Package {entry.workPackageNumber}
                              </span>
                            )}
                            {entry.workPackageNumber && entry.actionNumber && (
                              <span className="mx-1">·</span>
                            )}
                            {entry.actionNumber && (
                              <span>Action {entry.actionNumber}</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-70">
                    <p className="text-sm font-medium">{entry.label}</p>
                    {(entry.workPackageNumber || entry.actionNumber) && (
                      <p className="mt-1 text-xs text-slate-400">
                        {entry.workPackageNumber &&
                          `Work Package ${entry.workPackageNumber}`}
                        {entry.workPackageNumber && entry.actionNumber && " · "}
                        {entry.actionNumber && `Action ${entry.actionNumber}`}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Milestones by Month */}
      {milestonesPerMonthEntries.length > 0 && (
        <div className="py-5">
          <SidebarChart
            title="Upcoming Milestones by Month"
            description="Number of milestones by month"
            icon={<Calendar />}
            data={milestonesPerMonthEntries}
            selectedValue={[]}
            onSelectValue={() => {}}
            barWidth={105}
            maxHeight={155}
          />
        </div>
      )}

      <div className="py-5">
        <SidebarChart
          title="Work Packages per Leader"
          description="Number of packages by leader"
          icon={<Users />}
          data={leadsChartEntries}
          searchQuery={leadsSearchQuery}
          onSearchChange={onLeadsSearchChange}
          searchPlaceholder="Search principals"
          selectedValue={selectedLead}
          onSelectValue={onSelectLead}
          barWidth={105}
          maxHeight={145}
        />
      </div>

      {/* Actions per Workstream */}
      <div className="py-5 last:pb-0">
        <SidebarChart
          title="Actions per Workstream"
          description="Number of actions by workstream"
          icon={<Layers />}
          data={workstreamsChartEntries}
          selectedValue={selectedWorkstream}
          onSelectValue={onSelectWorkstream}
          barWidth={105}
        />
      </div>
    </div>
  );
}
