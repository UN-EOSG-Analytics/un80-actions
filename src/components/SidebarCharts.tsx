import React from "react";
import { Users, Briefcase, Calendar, ChevronDown, ChevronUp, Clock, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
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

  // Decision status chart
  totalActions: number;
}

export function SidebarCharts({
  leadsData,
  leadsSearchQuery,
  onLeadsSearchChange,
  selectedLead,
  onSelectLead,
  showAllLeads,
  onToggleShowAllLeads,
  workstreamsData,
  workstreamsSearchQuery,
  onWorkstreamsSearchChange,
  selectedWorkstream,
  onSelectWorkstream,
  showAllWorkstreams,
  onToggleShowAllWorkstreams,
  workPackagesData,
  workPackagesSearchQuery,
  onWorkPackagesSearchChange,
  selectedWorkPackage,
  onSelectWorkPackage,
  showAllWorkPackages,
  onToggleShowAllWorkPackages,
  upcomingMilestonesData,
  upcomingMilestonesSearchQuery,
  onUpcomingMilestonesSearchChange,
  showAllUpcomingMilestones,
  onToggleShowAllUpcomingMilestones,
  milestonesPerMonthSearchQuery,
  onMilestonesPerMonthSearchChange,
  showAllMilestonesPerMonth,
  onToggleShowAllMilestonesPerMonth,
  totalActions,
}: SidebarChartsProps) {
  const router = useRouter();
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

  const workPackagesChartEntries: SidebarChartEntry[] = workPackagesData.map(
    (entry) => {
      const rawWorkpackage =
        typeof entry.workpackage === "string" ? entry.workpackage : "";

      const wpMatch = rawWorkpackage.match(/^(\d+):/);
      const wpNumber = wpMatch ? wpMatch[1] : null;
      const wpName = wpMatch
        ? rawWorkpackage.replace(/^\d+:\s*/, "")
        : rawWorkpackage;
      const wpOption = wpNumber ? `${wpNumber}: ${wpName}` : wpName;

      return {
        label: wpNumber ? `WP${wpNumber}` : "Work package",
        count: entry.count,
        value: wpOption,
        tooltip: wpNumber && wpName ? wpName : undefined,
      };
    },
  );

  // Format upcoming milestones with dates and urgency, filter for January only
  const now = new Date();
  const currentYear = now.getFullYear();
  const januaryStart = new Date(currentYear, 0, 1); // January 1st of current year
  const januaryEnd = new Date(currentYear, 0, 31, 23, 59, 59); // January 31st of current year
  
  const upcomingMilestonesChartEntries: SidebarChartEntry[] = upcomingMilestonesData
    .filter((entry) => {
      // Only show milestones with deadlines in January
      if (!entry.deadline) return false;
      const deadlineDate = new Date(entry.deadline);
      return deadlineDate >= januaryStart && deadlineDate <= januaryEnd;
    })
    .map((entry) => {
      const deadlineDate = entry.deadline ? new Date(entry.deadline) : null;
      const daysUntilDeadline = deadlineDate
        ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      const isUpcoming = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 90;
      const isUrgent = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 30;
      
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
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];
  const milestonesPerMonthMap = new Map<number, number>();
  
  upcomingMilestonesData.forEach((entry) => {
    if (entry.deadline) {
      const deadlineDate = new Date(entry.deadline);
      const month = deadlineDate.getMonth();
      milestonesPerMonthMap.set(month, (milestonesPerMonthMap.get(month) || 0) + entry.count);
    }
  });

  const milestonesPerMonthEntries: SidebarChartEntry[] = Array.from(milestonesPerMonthMap.entries())
    .sort((a, b) => a[0] - b[0]) // Sort by month number
    .filter(([, count]) => count > 0) // Only include months with milestones
    .filter(([monthIndex]) => {
      // Filter by search query if provided
      if (!milestonesPerMonthSearchQuery) return true;
      const monthName = monthNames[monthIndex];
      return monthName?.toLowerCase().includes(milestonesPerMonthSearchQuery.toLowerCase());
    })
    .map(([monthIndex, count]) => ({
      label: monthNames[monthIndex],
      count: count,
      value: monthNames[monthIndex],
    }));

  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 lg:w-[320px] lg:max-w-[320px] lg:border-l lg:border-slate-200 lg:pl-6">
      {/* Decision Status Chart */}
      {totalActions > 0 && (
        <div className="rounded-xl bg-white pb-4 pl-4.5 sm:pb-5">
          <h3 className="mb-3 flex h-[25px] items-center gap-2 text-[17px] font-semibold text-slate-900">
            <span className="flex h-5 w-5 items-center justify-center text-un-blue">
              <Clock className="h-5 w-5" />
            </span>
            Decision Status
          </h3>
          
          <div className="space-y-3 pr-4">
            {/* Further Work Ongoing */}
            <div className="flex items-center gap-3">
              <div className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-un-blue animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Further Work Ongoing</span>
                  <span className="text-sm font-bold text-un-blue">{totalActions}</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-un-blue" style={{ width: "100%" }} />
                </div>
              </div>
            </div>

            {/* Decision Taken */}
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 shrink-0 text-un-blue" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Decision Taken</span>
                  <span className="text-sm font-bold text-un-blue">0</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-un-blue" style={{ width: "0%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Milestones */}
      {upcomingMilestonesChartEntries.length > 0 && (
        <div className="pb-2 pl-4.5">
          {/* Header */}
          <h3 className="mb-3 flex h-[25px] items-center gap-2 text-[17px] font-semibold text-slate-900">
            <span className="flex h-5 w-5 items-center justify-center text-un-blue">
              <Calendar className="h-5 w-5" />
            </span>
            Upcoming Milestones
          </h3>

          {/* Milestones List - Scrollable */}
          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto overscroll-contain pr-1 -mr-1">
            {upcomingMilestonesChartEntries.map((entry, index) => {
              const deadlineDate = entry.deadline ? new Date(entry.deadline) : null;
              const monthShort = deadlineDate 
                ? deadlineDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
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
                  new URLSearchParams(window.location.search).forEach((value, key) => {
                    params[key] = value;
                  });
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
                      className="group flex items-start gap-3 py-3 cursor-pointer transition-colors hover:bg-slate-50/50 -mr-1 pr-1 pl-2"
                    >
                      {/* Month Badge - Minimal pill style */}
                      <div className="flex items-center justify-center min-w-[44px] h-[18px] rounded-full bg-un-blue/8 text-un-blue mt-px">
                        <span className="text-[10px] font-semibold tracking-wide">{monthShort || "—"}</span>
                      </div>
                      
                      {/* Milestone Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-snug line-clamp-2 text-slate-700 group-hover:text-slate-900 transition-colors">
                          {entry.label}
                        </p>
                        {/* Action & Work Package Info */}
                        {(entry.workPackageNumber || entry.actionNumber) && (
                          <p className="text-[11px] mt-1 text-slate-400">
                            {entry.workPackageNumber && (
                              <span className="font-medium">WP{entry.workPackageNumber}</span>
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
                  <TooltipContent side="left" className="max-w-[280px]">
                    <p className="text-sm font-medium">{entry.label}</p>
                    {(entry.workPackageNumber || entry.actionNumber) && (
                      <p className="text-xs text-slate-400 mt-1">
                        {entry.workPackageNumber && `WP${entry.workPackageNumber}`}
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

      {/* Milestones by Month */}
      {milestonesPerMonthEntries.length > 0 && (
        <SidebarChart
          title="Milestones by Month"
          description="Number of milestones by month"
          icon={<Calendar />}
          data={milestonesPerMonthEntries}
          searchQuery={milestonesPerMonthSearchQuery}
          onSearchChange={onMilestonesPerMonthSearchChange}
          searchPlaceholder="Search months"
          selectedValue={[]}
          onSelectValue={() => {}}
          barWidth={105}
        />
      )}

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
        maxHeight={135}
      />

    </div>
  );
}
