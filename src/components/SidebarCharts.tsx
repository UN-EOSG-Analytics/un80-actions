import React from "react";
import { Users, Calendar, Layers, Activity } from "lucide-react";
import {
  ACTION_STATUS,
  getStatusStyles,
  isDecisionTaken,
} from "@/constants/actionStatus";
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
  selectedMilestoneMonth: string[];
  onSelectMilestoneMonth: (month: string[]) => void;

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
  selectedMilestoneMonth,
  onSelectMilestoneMonth,
  selectedActionStatus,
  onSelectActionStatus,
  actions,
}: SidebarChartsProps) {
  // Action Status: only main actions (exclude subactions)
  const mainActions = actions.filter(
    (a) => !(a.sub_action_details && a.is_subaction),
  );
  const totalActions = mainActions.length;
  const decisionTakenCount = mainActions.filter((a) =>
    isDecisionTaken(a.public_action_status),
  ).length;
  const furtherWorkCount = totalActions - decisionTakenCount;

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
        // Only show milestones with delivery dates in January
        if (!entry.deliveryDate) return false;
        const deliveryDate = new Date(entry.deliveryDate);
        return deliveryDate >= januaryStart && deliveryDate <= januaryEnd;
      })
      .sort((a, b) => {
        const an = a.actionNumber != null ? Number(a.actionNumber) : Infinity;
        const bn = b.actionNumber != null ? Number(b.actionNumber) : Infinity;
        return an - bn;
      })
      .map((entry) => {
        const deliveryDate = entry.deliveryDate
          ? new Date(entry.deliveryDate)
          : null;
        const daysUntilDelivery = deliveryDate
          ? Math.ceil(
              (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            )
          : null;

        const isUpcoming =
          daysUntilDelivery !== null &&
          daysUntilDelivery >= 0 &&
          daysUntilDelivery <= 90;
        const isUrgent =
          daysUntilDelivery !== null &&
          daysUntilDelivery >= 0 &&
          daysUntilDelivery <= 30;

        let deliveryText = "";
        if (deliveryDate) {
          const formattedDate = deliveryDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          if (daysUntilDelivery === null || daysUntilDelivery < 0) {
            deliveryText = `Past: ${formattedDate}`;
          } else if (daysUntilDelivery === 0) {
            deliveryText = `Due today: ${formattedDate}`;
          } else if (daysUntilDelivery === 1) {
            deliveryText = `Due tomorrow: ${formattedDate}`;
          } else if (daysUntilDelivery <= 7) {
            deliveryText = `Due in ${daysUntilDelivery} days: ${formattedDate}`;
          } else if (daysUntilDelivery <= 30) {
            deliveryText = `Due in ${Math.ceil(daysUntilDelivery / 7)} weeks: ${formattedDate}`;
          } else {
            deliveryText = `Due ${formattedDate}`;
          }
        }

        return {
          label: entry.milestone,
          count: entry.count,
          value: entry.milestone,
          tooltip: deliveryText || undefined,
          deliveryDate: entry.deliveryDate,
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
    if (entry.deliveryDate) {
      const deliveryDate = new Date(entry.deliveryDate);
      const month = deliveryDate.getMonth();
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

          <div className="divide-y divide-slate-200 pr-4">
            {/* Further Work Ongoing */}
            {(() => {
              const statusKey = ACTION_STATUS.FURTHER_WORK_ONGOING;
              const isSelected = selectedActionStatus.includes(statusKey);
              const styles = getStatusStyles(statusKey);
              const IconComponent = styles.icon.component;

              return (
                <div
                  className={`group flex cursor-pointer items-center justify-between gap-2 py-1.5 pl-0.5 transition-all ${
                    isSelected
                      ? styles.sidebar.selectedBg
                      : styles.sidebar.hoverBg
                  }`}
                  onClick={() => {
                    onSelectActionStatus(isSelected ? [] : [statusKey]);
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <IconComponent
                      className={`h-4 w-4 shrink-0 ${styles.sidebar.icon}`}
                    />
                    <span
                      className={`text-[14px] leading-tight font-semibold transition-colors ${
                        isSelected
                          ? styles.sidebar.selectedText
                          : `${styles.sidebar.count} ${styles.sidebar.hoverText}`
                      }`}
                    >
                      {styles.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`w-7 text-right text-[14px] font-semibold tabular-nums ${
                        isSelected
                          ? styles.sidebar.selectedText
                          : styles.sidebar.count
                      }`}
                    >
                      {furtherWorkCount}
                    </span>
                    <div
                      className={`relative mr-2 h-2 w-[85px] overflow-hidden rounded-full ${styles.sidebar.barTrack}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          isSelected
                            ? styles.sidebar.selectedBar
                            : styles.sidebar.bar
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
                </div>
              );
            })()}

            {/* Decision Taken */}
            {(() => {
              const statusKey = ACTION_STATUS.DECISION_TAKEN;
              const isSelected = selectedActionStatus.includes(statusKey);
              const styles = getStatusStyles(statusKey);
              const IconComponent = styles.icon.component;

              return (
                <div
                  className={`group flex cursor-pointer items-center justify-between gap-2 py-1.5 pl-0.5 transition-all ${
                    isSelected
                      ? styles.sidebar.selectedBg
                      : styles.sidebar.hoverBg
                  }`}
                  onClick={() => {
                    onSelectActionStatus(isSelected ? [] : [statusKey]);
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <IconComponent
                      className={`h-4 w-4 shrink-0 ${styles.sidebar.icon}`}
                    />
                    <span
                      className={`text-[14px] leading-tight font-semibold transition-colors ${
                        isSelected
                          ? styles.sidebar.selectedText
                          : `${styles.sidebar.count} ${styles.sidebar.hoverText}`
                      }`}
                    >
                      {styles.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`w-7 text-right text-[14px] font-semibold tabular-nums ${
                        isSelected
                          ? styles.sidebar.selectedText
                          : styles.sidebar.count
                      }`}
                    >
                      {decisionTakenCount}
                    </span>
                    <div
                      className={`relative mr-2 h-2 w-[85px] overflow-hidden rounded-full ${styles.sidebar.barTrack}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          isSelected
                            ? styles.sidebar.selectedBar
                            : styles.sidebar.bar
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
          <div className="-mr-1 max-h-62 divide-y divide-slate-100 overflow-y-auto overscroll-contain pr-1">
            {upcomingMilestonesChartEntries.map((entry, index) => {
              const deliveryDateObj = entry.deliveryDate
                ? new Date(entry.deliveryDate)
                : null;
              const monthShort = deliveryDateObj
                ? deliveryDateObj
                    .toLocaleDateString("en-US", { month: "short" })
                    .toUpperCase()
                : null;

              const handleMilestoneClick = () => {
                if (entry.actionNumber) {
                  // Save current URL to sessionStorage before opening modal
                  const currentUrl = window.location.search || "/";
                  sessionStorage.setItem("actionModalReturnUrl", currentUrl);
                  // Mark that modal is open (for useFilters to freeze state)
                  sessionStorage.setItem("actionModalOpen", "true");

                  // Navigate to clean URL with only action param
                  const cleanUrl = `?action=${entry.actionNumber}`;
                  window.history.pushState({}, "", cleanUrl);
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
            selectedValue={selectedMilestoneMonth}
            onSelectValue={onSelectMilestoneMonth}
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
