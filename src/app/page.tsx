"use client";

import { Suspense, useEffect, useRef } from "react";
import { DataCard } from "@/components/DataCard";
import { ExplainerText } from "@/components/ExplainerText";
import { FilterControls } from "@/components/FilterControls";
import { Header } from "@/components/HeaderBar";
import { SidebarCharts } from "@/components/SidebarCharts";
import { WorkPackageList } from "@/components/ListContainer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useActions } from "@/hooks/useActions";
import { useChartSearch } from "@/hooks/useChartSearch";
import { useCollapsibles } from "@/hooks/useCollapsibles";
import { useFilters, useFilterSync } from "@/hooks/useFilters";
import { useWorkPackageData } from "@/hooks/useWorkPackageData";
import { normalizeTeamMemberForDisplay } from "@/lib/utils";
import {
  Briefcase as BriefcaseIcon,
  Layers,
  ListTodo,
  Users,
  User,
} from "lucide-react";

export function WorkPackagesPageContent() {
  // Custom hooks for state management
  const { actions, isLoading } = useActions();
  const showProgress = false;

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
    sortOption,
    setSortOption,
    handleResetFilters,
    handleResetAll,
  } = useFilters();

  const {
    openCollapsibles,
    toggleCollapsible,
    expandCollapsibles,
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
    uniqueActionTexts,
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
  useFilterSync(selectedAction, uniqueActionTexts, setSelectedAction);
  useFilterSync(selectedTeamMember, uniqueTeamMembers, setSelectedTeamMember);
  useFilterSync(
    selectedBigTicket,
    availableBigTicketOptions.map((opt) => opt.key),
    setSelectedBigTicket,
  );

  // Track the last selectedAction we processed to avoid infinite loops
  const lastProcessedActionsRef = useRef<string>("");
  // Track the last selectedWorkPackage we processed to avoid infinite loops
  const lastProcessedWorkPackagesRef = useRef<string>("");
  // Track the last search query we processed to avoid infinite loops
  const lastProcessedSearchRef = useRef<string>("");

  // Auto-expand work package collapsibles when work packages are selected via URL
  useEffect(() => {
    const selectedWpKey = selectedWorkPackage.sort().join(",");

    // Skip if we've already processed this selection
    if (selectedWpKey === lastProcessedWorkPackagesRef.current) {
      return;
    }

    if (selectedWorkPackage.length > 0 && filteredWorkPackages.length > 0) {
      const collapsibleKeysToExpand: string[] = [];

      filteredWorkPackages.forEach((wp, index) => {
        // Check if this work package is in the selectedWorkPackage filter
        const wpNumberStr = String(wp.number);
        const isSelected = selectedWorkPackage.some((selected) => {
          // Handle both "1: Name" format and plain number format
          const match = selected.match(/^(\d+):/);
          const selectedNumber = match ? match[1] : selected;
          return wpNumberStr === selectedNumber;
        });

        if (isSelected) {
          const collapsibleKey = `${wp.report.join("-")}-${wp.number || "empty"}-${index}`;
          // Only add if not already open
          if (!openCollapsibles.has(collapsibleKey)) {
            collapsibleKeysToExpand.push(collapsibleKey);
          }
        }
      });

      if (collapsibleKeysToExpand.length > 0) {
        expandCollapsibles(collapsibleKeysToExpand);
      }

      // Mark this selection as processed
      lastProcessedWorkPackagesRef.current = selectedWpKey;
    } else if (selectedWorkPackage.length === 0) {
      // Reset when no work packages are selected
      lastProcessedWorkPackagesRef.current = "";
    }
  }, [
    selectedWorkPackage,
    filteredWorkPackages,
    openCollapsibles,
    expandCollapsibles,
  ]);

  // Auto-expand work package collapsibles when actions are selected
  useEffect(() => {
    const selectedActionKey = selectedAction.sort().join(",");

    // Skip if we've already processed this selection
    if (selectedActionKey === lastProcessedActionsRef.current) {
      return;
    }

    if (selectedAction.length > 0 && filteredWorkPackages.length > 0) {
      const collapsibleKeysToExpand: string[] = [];

      filteredWorkPackages.forEach((wp, index) => {
        // Check if this work package contains any of the selected actions
        const hasSelectedAction = wp.actions.some((action) => {
          const actionText = action.text ? action.text.trim() : "";
          return selectedAction.some((selected) => {
            const selectedTrimmed = selected.trim();
            return actionText === selectedTrimmed;
          });
        });

        if (hasSelectedAction) {
          const collapsibleKey = `${wp.report.join("-")}-${wp.number || "empty"}-${index}`;
          // Only add if not already open
          if (!openCollapsibles.has(collapsibleKey)) {
            collapsibleKeysToExpand.push(collapsibleKey);
          }
        }
      });

      if (collapsibleKeysToExpand.length > 0) {
        expandCollapsibles(collapsibleKeysToExpand);
      }

      // Mark this selection as processed
      lastProcessedActionsRef.current = selectedActionKey;
    } else if (selectedAction.length === 0) {
      // Reset when no actions are selected
      lastProcessedActionsRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAction]); // Only depend on selectedAction to avoid infinite loops

  // Auto-expand work package collapsibles when search query matches action text
  useEffect(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();

    // Skip if we've already processed this search query
    if (trimmedQuery === lastProcessedSearchRef.current) {
      return;
    }

    if (trimmedQuery && filteredWorkPackages.length > 0) {
      const collapsibleKeysToExpand: string[] = [];

      filteredWorkPackages.forEach((wp, index) => {
        // Check if this work package has any actions matching the search query
        const hasMatchingAction = wp.actions.some((action) => {
          const actionText = action.text ? action.text.toLowerCase() : "";
          const subActionText = action.subActionDetails
            ? action.subActionDetails.toLowerCase()
            : "";
          return (
            actionText.includes(trimmedQuery) ||
            subActionText.includes(trimmedQuery)
          );
        });

        if (hasMatchingAction) {
          const collapsibleKey = `${wp.report.join("-")}-${wp.number || "empty"}-${index}`;
          // Only add if not already open
          if (!openCollapsibles.has(collapsibleKey)) {
            collapsibleKeysToExpand.push(collapsibleKey);
          }
        }
      });

      if (collapsibleKeysToExpand.length > 0) {
        expandCollapsibles(collapsibleKeysToExpand);
      }

      // Mark this search query as processed
      lastProcessedSearchRef.current = trimmedQuery;
    } else if (!trimmedQuery) {
      // Reset when search is cleared
      lastProcessedSearchRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filteredWorkPackages]); // Depend on searchQuery and filteredWorkPackages

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-white">
        {/* Fixed Header */}
        <Header onReset={handleResetAll} showLogin={false} />

        {/* Main Container */}
        <main className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-8 sm:pt-8 md:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          <div className="space-y-6 pb-16">
            {/* Header with context info */}
            <ExplainerText />

            {/* DataCards Section */}
            <section className="mb-6 sm:mb-10">
              <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
                {/* Check if any advanced filter is active */}
                {(() => {
                  const hasActiveFilters =
                    selectedLead.length > 0 ||
                    selectedWorkstream.length > 0 ||
                    selectedWorkPackage.length > 0 ||
                    selectedBigTicket.length > 0 ||
                    selectedAction.length > 0 ||
                    selectedTeamMember.length > 0 ||
                    searchQuery.trim().length > 0;

                  // Calculate total counts (unfiltered) - use all workPackages and actions
                  const totalWorkstreams = new Set(
                    workPackages.flatMap((wp) => wp.report)
                  ).size;
                  const totalActions = actions.filter(
                    (a) => !a.sub_action_details
                  ).length;
                  const totalLeads = new Set(
                    workPackages.flatMap((wp) => wp.leads)
                  ).size;
                  // Get unique team members from all actions (normalized)
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

                  return (
                    <>
                      <DataCard
                        title="Workstreams"
                        value={totalWorkstreams}
                        icon={Layers}
                        isLoading={isLoading}
                        showProgress={showProgress}
                        completed={0}
                        showFiltered={hasActiveFilters}
                        filteredCount={statsData.workstreams}
                      />
                      <DataCard
                        title="Work Packages"
                        value={workPackages.length}
                        icon={BriefcaseIcon}
                        isLoading={isLoading}
                        showProgress={showProgress}
                        completed={0}
                        showFiltered={hasActiveFilters}
                        filteredCount={statsData.workpackages}
                      />
                      <DataCard
                        title="Actions"
                        value={totalActions}
                        icon={ListTodo}
                        isLoading={isLoading}
                        showProgress={showProgress}
                        completed={0}
                        showFiltered={hasActiveFilters}
                        filteredCount={statsData.actions}
                      />
                      <DataCard
                        title="UN System Leaders"
                        value={totalLeads}
                        icon={Users}
                        isLoading={isLoading}
                        showProgress={showProgress}
                        completed={0}
                        showFiltered={hasActiveFilters}
                        filteredCount={statsData.leads}
                      />
                      <DataCard
                        title="UN System Entities"
                        value={totalTeamMembers}
                        icon={User}
                        isLoading={isLoading}
                        showProgress={showProgress}
                        completed={0}
                        showFiltered={hasActiveFilters}
                        filteredCount={statsData.teamMembers}
                      />
                    </>
                  );
                })()}
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
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    uniqueWorkPackages={uniqueWorkPackages}
                    uniqueLeads={uniqueLeads}
                    uniqueWorkstreams={uniqueWorkstreams}
                    uniqueActions={uniqueActions}
                    uniqueTeamMembers={uniqueTeamMembers}
                    availableBigTicketOptions={availableBigTicketOptions}
                    onResetFilters={handleResetFilters}
                  />

                  <WorkPackageList
                    workPackages={filteredWorkPackages}
                    openCollapsibles={openCollapsibles}
                    onToggleCollapsible={toggleCollapsible}
                    onSelectLead={setSelectedLead}
                    onSelectWorkstream={setSelectedWorkstream}
                    selectedActions={selectedAction}
                    selectedTeamMembers={selectedTeamMember}
                    isLoading={isLoading}
                    showProgress={showProgress}
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
                  totalActions={statsData.actions}
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
