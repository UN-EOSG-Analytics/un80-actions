import React from "react";
import { Users, Layers, Briefcase } from "lucide-react";
import { SidebarChart, SidebarChartEntry } from "./SidebarChart";
import type {
  LeadChartEntry,
  WorkstreamChartEntry,
  WorkPackageChartEntry,
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
}: SidebarChartsProps) {
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

  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 lg:w-[320px] lg:max-w-[320px] lg:border-l lg:border-slate-200 lg:pl-6">
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
        showAll={showAllLeads}
        onToggleShowAll={onToggleShowAllLeads}
        initialDisplayCount={6}
        barWidth={105}
      />

      <SidebarChart
        title="Actions per Workstream"
        description="Number of actions per workstream"
        icon={<Layers />}
        data={workstreamsChartEntries}
        searchQuery={workstreamsSearchQuery}
        onSearchChange={onWorkstreamsSearchChange}
        searchPlaceholder="Search workstreams"
        selectedValue={selectedWorkstream}
        onSelectValue={onSelectWorkstream}
        showAll={showAllWorkstreams}
        onToggleShowAll={onToggleShowAllWorkstreams}
        barWidth={105}
      />

      <SidebarChart
        title="Actions per Work Package"
        description="Number of actions per work package"
        icon={<Briefcase />}
        data={workPackagesChartEntries}
        searchQuery={workPackagesSearchQuery}
        onSearchChange={onWorkPackagesSearchChange}
        searchPlaceholder="Search work packages"
        selectedValue={selectedWorkPackage}
        onSelectValue={onSelectWorkPackage}
        showAll={showAllWorkPackages}
        onToggleShowAll={onToggleShowAllWorkPackages}
        initialDisplayCount={10}
        barWidth={105}
      />
    </div>
  );
}
