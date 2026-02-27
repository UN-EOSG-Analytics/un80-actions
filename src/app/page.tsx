"use client";

import { DataCard } from "@/components/DataCard";
import { ExplainerText } from "@/components/ExplainerText";
import { FilterControls } from "@/components/FilterControls";
import { Header } from "@/components/HeaderBar";
import { WorkPackageList } from "@/components/ListContainer";
import { SidebarCharts } from "@/components/SidebarCharts";
import { TooltipProvider } from "@/components/Tooltip";
import { ACTION_STATUS } from "@/constants/actionStatus";
import { useActions } from "@/hooks/useActions";
import { useAutoExpand } from "@/hooks/useAutoExpand";
import { useChartSearch } from "@/hooks/useChartSearch";
import { useCollapsibles } from "@/hooks/useCollapsibles";
import { useFilters, useFilterSync } from "@/hooks/useFilters";
import { useWorkPackageData } from "@/hooks/useWorkPackageData";
import { normalizeTeamMemberForDisplay } from "@/lib/utils";
import {
    Briefcase as BriefcaseIcon,
    Building,
    Layers,
    ListTodo,
    Users,
} from "lucide-react";
import { Suspense, useEffect, useRef } from "react";

export function WorkPackagesPageContent() {
  // Custom hooks for state management
  const { actions } = useActions();

  const {
    filters,
    searchQuery,
    setSearchQuery,
    selectedWorkPackage,
    setSelectedWorkPackage,
    selectedLead,
    setSelectedLead,
    selectedWorkstream,
    setSelectedWorkstream,
    selectedBigTicket,
    setSelectedBigTicket,
    selectedAction,
    setSelectedAction,
    selectedTeamMember,
    setSelectedTeamMember,
    selectedActionStatus,
    setSelectedActionStatus,
    selectedMilestoneMonth,
    setSelectedMilestoneMonth,
    sortOption,
    setSortOption,
    handleResetFilters,
    handleResetAll,
  } = useFilters();

  const {
    openCollapsibles,
    toggleCollapsible,
    expandCollapsibles,
    collapseAllWorkPackages,
    isAdvancedFilterOpen,
    setIsAdvancedFilterOpen,
    openFilterCollapsibles,
    toggleFilterCollapsible,
    closeFilterCollapsible,
    showAllLeads,
    setShowAllLeads,
    showAllWorkstreams,
    setShowAllWorkstreams,
    showAllWorkpackages,
    setShowAllWorkpackages,
    showAllUpcomingMilestones,
    setShowAllUpcomingMilestones,
    showAllMilestonesPerMonth,
    setShowAllMilestonesPerMonth,
  } = useCollapsibles();

  const {
    chartSearchQuery,
    setChartSearchQuery,
    workstreamChartSearchQuery,
    setWorkstreamChartSearchQuery,
    workpackageChartSearchQuery,
    setWorkpackageChartSearchQuery,
    upcomingMilestonesChartSearchQuery,
    setUpcomingMilestonesChartSearchQuery,
    milestonesPerMonthSearchQuery,
    setMilestonesPerMonthSearchQuery,
  } = useChartSearch();

  // Compute work package data using custom hook
  const {
    workPackages,
    filteredWorkPackages,
    uniqueWorkPackages,
    uniqueLeads,
    uniqueWorkstreams,
    uniqueActions,
    uniqueTeamMembers,
    availableBigTicketOptions,
    chartData,
    workstreamChartData,
    workpackageChartData,
    upcomingMilestonesChartData,
    statsData,
  } = useWorkPackageData(
    actions,
    filters,
    chartSearchQuery,
    workstreamChartSearchQuery,
    workpackageChartSearchQuery,
    upcomingMilestonesChartSearchQuery,
  );

  // Sync filters with available options
  useFilterSync(
    selectedWorkPackage,
    uniqueWorkPackages,
    setSelectedWorkPackage,
    true, // Match by prefix: "1" matches "1: Name"
  );
  useFilterSync(selectedLead, uniqueLeads, setSelectedLead);
  useFilterSync(selectedWorkstream, uniqueWorkstreams, setSelectedWorkstream);
  useFilterSync(
    selectedAction,
    uniqueActions.map((a) => a.actionNumber),
    setSelectedAction,
  );
  useFilterSync(selectedTeamMember, uniqueTeamMembers, setSelectedTeamMember);
  useFilterSync(
    selectedBigTicket,
    availableBigTicketOptions.map((opt) => opt.key),
    setSelectedBigTicket,
  );
  useFilterSync(
    selectedActionStatus,
    [ACTION_STATUS.FURTHER_WORK_ONGOING, ACTION_STATUS.DECISION_TAKEN],
    setSelectedActionStatus,
  );

  // Auto-expand collapsibles when a work package number filter is selected
  useAutoExpand(
    selectedWorkPackage.sort().join(","),
    selectedWorkPackage.length > 0,
    filteredWorkPackages,
    openCollapsibles,
    expandCollapsibles,
    (wp) =>
      selectedWorkPackage.some((selected) => {
        const match = selected.match(/^(\d+):/);
        const selectedNumber = match ? match[1] : selected;
        return String(wp.number) === selectedNumber;
      }),
  );

  // Auto-expand collapsibles when a specific action number is selected
  useAutoExpand(
    selectedAction.sort().join(","),
    selectedAction.length > 0,
    filteredWorkPackages,
    openCollapsibles,
    expandCollapsibles,
    (wp) =>
      wp.actions.some((action) =>
        selectedAction.some(
          (sel) => String(action.actionNumber) === sel.trim(),
        ),
      ),
  );

  // Auto-expand collapsibles when a search query matches action text
  useAutoExpand(
    searchQuery.trim().toLowerCase(),
    searchQuery.trim().length > 0,
    filteredWorkPackages,
    openCollapsibles,
    expandCollapsibles,
    (wp) => {
      const q = searchQuery.trim().toLowerCase();
      return wp.actions.some(
        (action) =>
          (action.text?.toLowerCase() ?? "").includes(q) ||
          (action.subActionDetails?.toLowerCase() ?? "").includes(q),
      );
    },
  );

  // Auto-expand collapsibles when an action status filter is selected;
  // collapse all when the filter is cleared
  useAutoExpand(
    selectedActionStatus.sort().join(","),
    selectedActionStatus.length > 0,
    filteredWorkPackages,
    openCollapsibles,
    expandCollapsibles,
    (wp) =>
      wp.actions.some((action) =>
        selectedActionStatus.some(
          (status) =>
            status.toLowerCase() === (action.actionStatus?.toLowerCase() ?? ""),
        ),
      ),
    collapseAllWorkPackages,
  );

  // Collapse all work packages when every auto-expand filter is cleared at once
  const prevHadAutoExpandFiltersRef = useRef<boolean>(false);
  useEffect(() => {
    const hasAutoExpandFilters =
      searchQuery.trim().length > 0 ||
      selectedAction.length > 0 ||
      selectedActionStatus.length > 0 ||
      selectedWorkPackage.length > 0;

    if (prevHadAutoExpandFiltersRef.current && !hasAutoExpandFilters) {
      collapseAllWorkPackages();
    }
    prevHadAutoExpandFiltersRef.current = hasAutoExpandFilters;
  }, [
    searchQuery,
    selectedAction,
    selectedActionStatus,
    selectedWorkPackage,
    collapseAllWorkPackages,
  ]);

  // DataCard totals — computed from the full (unfiltered) data
  const hasAnyActiveFilter =
    selectedLead.length > 0 ||
    selectedWorkstream.length > 0 ||
    selectedWorkPackage.length > 0 ||
    selectedBigTicket.length > 0 ||
    selectedAction.length > 0 ||
    selectedTeamMember.length > 0 ||
    searchQuery.trim().length > 0;

  const totalWorkstreams = new Set(workPackages.flatMap((wp) => wp.report))
    .size;

  // Include all actions except subaction entries (is_subaction + sub_action_details);
  // main actions with sub_action_details (e.g. "Harmonized in-country logistics") are counted.
  const totalActions = actions.filter(
    (a) => !(a.sub_action_details && a.is_subaction),
  ).length;

  const totalLeads = new Set(workPackages.flatMap((wp) => wp.leads)).size;

  const allTeamMembers = new Set<string>();
  actions.forEach((action) => {
    if (action.action_entities) {
      action.action_entities
        .split(";")
        .map((e) => normalizeTeamMemberForDisplay(e.trim()))
        .filter((e) => e && e.trim().length > 0)
        .forEach((member) => allTeamMembers.add(member));
    }
  });
  const totalTeamMembers = allTeamMembers.size;

  const expandedWorkPackagesCount = filteredWorkPackages.filter((wp, index) =>
    openCollapsibles.has(
      `${wp.report.join("-")}-${wp.number || "empty"}-${index}`,
    ),
  ).length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh bg-white">
        {/* Fixed Header */}
        <Header onReset={handleResetAll} showLogin={false} />

        {/* Main Container */}
        <main className="mx-auto w-full max-w-4xl px-[max(1rem,env(safe-area-inset-left))] pt-3 pr-[max(1rem,env(safe-area-inset-right))] sm:px-8 sm:pt-8 md:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          <div className="space-y-6 pb-16">
            {/* Header with context info */}
            <ExplainerText />

            {/* DataCards Section */}
            <section className="mb-6 sm:mb-10">
              <div className="grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
                <DataCard
                  title="Workstreams"
                  value={totalWorkstreams}
                  icon={Layers}
                  filteredCount={
                    hasAnyActiveFilter ? statsData.workstreams : undefined
                  }
                />
                <DataCard
                  title="Work Packages"
                  value={workPackages.length}
                  icon={BriefcaseIcon}
                  filteredCount={
                    hasAnyActiveFilter ? statsData.workpackages : undefined
                  }
                />
                <DataCard
                  title="Actions"
                  value={totalActions}
                  icon={ListTodo}
                  filteredCount={
                    hasAnyActiveFilter ? statsData.actions : undefined
                  }
                />
                <DataCard
                  title="UN System Leaders"
                  value={totalLeads}
                  icon={Users}
                  filteredCount={
                    hasAnyActiveFilter ? statsData.leads : undefined
                  }
                />
                <DataCard
                  title="UN System Entities"
                  value={totalTeamMembers}
                  icon={Building}
                  filteredCount={
                    hasAnyActiveFilter ? statsData.teamMembers : undefined
                  }
                />
              </div>
            </section>

            {/* Work Packages Breakdown Section */}
            <section className="mt-6 mb-4">
              {/* Work Packages and Chart Section */}
              <section className="flex flex-col items-start gap-6 overflow-hidden lg:flex-row">
                {/* Work Packages Collapsible */}
                <div className="w-full min-w-0 flex-1 lg:max-w-204.5">
                  <FilterControls
                    isAdvancedFilterOpen={isAdvancedFilterOpen}
                    onAdvancedFilterOpenChange={setIsAdvancedFilterOpen}
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    openFilterCollapsibles={openFilterCollapsibles}
                    onToggleFilterCollapsible={toggleFilterCollapsible}
                    onCloseFilterCollapsible={closeFilterCollapsible}
                    selectedWorkPackage={selectedWorkPackage}
                    onSelectWorkPackage={setSelectedWorkPackage}
                    selectedLead={selectedLead}
                    onSelectLead={setSelectedLead}
                    selectedWorkstream={selectedWorkstream}
                    onSelectWorkstream={setSelectedWorkstream}
                    selectedBigTicket={selectedBigTicket}
                    onSelectBigTicket={setSelectedBigTicket}
                    selectedAction={selectedAction}
                    onSelectAction={setSelectedAction}
                    selectedTeamMember={selectedTeamMember}
                    onSelectTeamMember={setSelectedTeamMember}
                    selectedActionStatus={selectedActionStatus}
                    onSelectActionStatus={setSelectedActionStatus}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    uniqueWorkPackages={uniqueWorkPackages}
                    uniqueLeads={uniqueLeads}
                    uniqueWorkstreams={uniqueWorkstreams}
                    uniqueActions={uniqueActions}
                    uniqueTeamMembers={uniqueTeamMembers}
                    availableBigTicketOptions={availableBigTicketOptions}
                    onResetFilters={handleResetFilters}
                    onExpandAll={() => {
                      const allKeys = filteredWorkPackages.map(
                        (wp, index) =>
                          `${wp.report.join("-")}-${wp.number || "empty"}-${index}`,
                      );
                      expandCollapsibles(allKeys);
                    }}
                    onCollapseAll={collapseAllWorkPackages}
                    totalWorkPackages={filteredWorkPackages.length}
                    expandedWorkPackages={expandedWorkPackagesCount}
                  />

                  <WorkPackageList
                    workPackages={filteredWorkPackages}
                    openCollapsibles={openCollapsibles}
                    onToggleCollapsible={toggleCollapsible}
                    onSelectLead={setSelectedLead}
                    onSelectWorkstream={setSelectedWorkstream}
                    selectedActions={selectedAction}
                    selectedTeamMembers={selectedTeamMember}
                    selectedActionStatus={selectedActionStatus}
                    selectedMilestoneMonth={selectedMilestoneMonth}
                    showProgress={false}
                    searchQuery={searchQuery}
                  />
                </div>

                {/* Charts Container */}
                <SidebarCharts
                  leadsData={chartData}
                  leadsSearchQuery={chartSearchQuery}
                  onLeadsSearchChange={setChartSearchQuery}
                  selectedLead={selectedLead}
                  onSelectLead={setSelectedLead}
                  showAllLeads={showAllLeads}
                  onToggleShowAllLeads={() => setShowAllLeads(!showAllLeads)}
                  workstreamsData={workstreamChartData}
                  workstreamsSearchQuery={workstreamChartSearchQuery}
                  onWorkstreamsSearchChange={setWorkstreamChartSearchQuery}
                  selectedWorkstream={selectedWorkstream}
                  onSelectWorkstream={setSelectedWorkstream}
                  showAllWorkstreams={showAllWorkstreams}
                  onToggleShowAllWorkstreams={() =>
                    setShowAllWorkstreams(!showAllWorkstreams)
                  }
                  workPackagesData={workpackageChartData}
                  workPackagesSearchQuery={workpackageChartSearchQuery}
                  onWorkPackagesSearchChange={setWorkpackageChartSearchQuery}
                  selectedWorkPackage={selectedWorkPackage}
                  onSelectWorkPackage={setSelectedWorkPackage}
                  showAllWorkPackages={showAllWorkpackages}
                  onToggleShowAllWorkPackages={() =>
                    setShowAllWorkpackages(!showAllWorkpackages)
                  }
                  upcomingMilestonesData={upcomingMilestonesChartData}
                  upcomingMilestonesSearchQuery={
                    upcomingMilestonesChartSearchQuery
                  }
                  onUpcomingMilestonesSearchChange={
                    setUpcomingMilestonesChartSearchQuery
                  }
                  showAllUpcomingMilestones={showAllUpcomingMilestones}
                  onToggleShowAllUpcomingMilestones={() =>
                    setShowAllUpcomingMilestones(!showAllUpcomingMilestones)
                  }
                  milestonesPerMonthSearchQuery={milestonesPerMonthSearchQuery}
                  onMilestonesPerMonthSearchChange={
                    setMilestonesPerMonthSearchQuery
                  }
                  showAllMilestonesPerMonth={showAllMilestonesPerMonth}
                  onToggleShowAllMilestonesPerMonth={() =>
                    setShowAllMilestonesPerMonth(!showAllMilestonesPerMonth)
                  }
                  selectedMilestoneMonth={selectedMilestoneMonth}
                  onSelectMilestoneMonth={setSelectedMilestoneMonth}
                  selectedActionStatus={selectedActionStatus}
                  onSelectActionStatus={setSelectedActionStatus}
                  actions={actions}
                />
              </section>
            </section>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function WorkPackagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <WorkPackagesPageContent />
    </Suspense>
  );
}
