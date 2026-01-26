"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
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
  const { actions } = useActions();
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
    ["Further work ongoing", "Decision taken"],
    setSelectedActionStatus,
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
          const actionNumber = String(action.actionNumber || "");
          return selectedAction.some((selected) => {
            const selectedTrimmed = selected.trim();
            return actionNumber === selectedTrimmed;
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

  // Track the last selectedActionStatus we processed to avoid infinite loops
  const lastProcessedActionStatusRef = useRef<string>("");
  // Track if we've processed the initial data load for action status
  const hasProcessedInitialActionStatusRef = useRef<boolean>(false);

  // Auto-expand work package collapsibles when action status filter is selected
  useEffect(() => {
    const selectedStatusKey = selectedActionStatus.sort().join(",");

    // Build a unique key that includes both the status and whether data is loaded
    const dataKey = `${selectedStatusKey}:${filteredWorkPackages.length > 0}`;

    // Skip if we've already processed this exact combination
    // But always process if we have data and haven't processed initial load yet
    const shouldProcess =
      selectedActionStatus.length > 0 &&
      filteredWorkPackages.length > 0 &&
      (dataKey !== lastProcessedActionStatusRef.current ||
        !hasProcessedInitialActionStatusRef.current);

    if (shouldProcess) {
      const collapsibleKeysToExpand: string[] = [];

      filteredWorkPackages.forEach((wp, index) => {
        // Check if this work package has any actions matching the status filter
        const hasMatchingAction = wp.actions.some((action) => {
          const actionStatusLower = action.actionStatus?.toLowerCase() || "";
          return selectedActionStatus.some(
            (status) => status.toLowerCase() === actionStatusLower,
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

      // Mark this selection as processed
      lastProcessedActionStatusRef.current = dataKey;
      hasProcessedInitialActionStatusRef.current = true;
    } else if (
      selectedActionStatus.length === 0 &&
      hasProcessedInitialActionStatusRef.current
    ) {
      // Collapse all work packages when action status filter is cleared
      collapseAllWorkPackages();
      // Reset tracking refs
      lastProcessedActionStatusRef.current = "";
      hasProcessedInitialActionStatusRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActionStatus, filteredWorkPackages, collapseAllWorkPackages]); // Depend on selectedActionStatus and filteredWorkPackages

  // Track previous filter state to detect when filters are cleared
  const prevHadFiltersRef = useRef<boolean>(false);

  // Collapse work packages when all filters are cleared
  useEffect(() => {
    const hasActiveFilters =
      searchQuery.trim().length > 0 ||
      selectedAction.length > 0 ||
      selectedActionStatus.length > 0 ||
      selectedWorkPackage.length > 0;

    // If we previously had filters and now we don't, collapse all
    if (prevHadFiltersRef.current && !hasActiveFilters) {
      collapseAllWorkPackages();
      // Reset all tracking refs
      lastProcessedActionsRef.current = "";
      lastProcessedWorkPackagesRef.current = "";
      lastProcessedSearchRef.current = "";
      lastProcessedActionStatusRef.current = "";
      hasProcessedInitialActionStatusRef.current = false;
    }

    prevHadFiltersRef.current = hasActiveFilters;
  }, [
    searchQuery,
    selectedAction,
    selectedActionStatus,
    selectedWorkPackage,
    collapseAllWorkPackages,
  ]);

  // Wrapper for reset that also collapses work packages
  const handleResetFiltersWithCollapse = useCallback(() => {
    handleResetFilters();
    // Collapse will happen via the effect above when URL state updates
  }, [handleResetFilters]);

  const handleResetAllWithCollapse = useCallback(() => {
    handleResetAll();
    // Collapse will happen via the effect above when URL state updates
  }, [handleResetAll]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-white">
        {/* Fixed Header */}
        <Header onReset={handleResetAllWithCollapse} showLogin={false} />

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
                    workPackages.flatMap((wp) => wp.report),
                  ).size;
                  // Include all actions except subaction entries (is_subaction + sub_action_details);
                  // main actions with sub_action_details (e.g. "Harmonized in-country logistics") are counted.
                  const totalActions = actions.filter(
                    (a) => !(a.sub_action_details && a.is_subaction),
                  ).length;
                  const totalLeads = new Set(
                    workPackages.flatMap((wp) => wp.leads),
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
                        showProgress={showProgress}
                        completed={0}
                        showFiltered={hasActiveFilters}
                        filteredCount={statsData.workstreams}
                      />
                      <DataCard
                        title="Work Packages"
                        value={workPackages.length}
                        icon={BriefcaseIcon}
                        showProgress={showProgress}
                        completed={0}
                        showFiltered={hasActiveFilters}
                        filteredCount={statsData.workpackages}
                      />
                      <DataCard
                        title="Actions"
                        value={totalActions}
                        icon={ListTodo}
                        showProgress={showProgress}
                        completed={0}
                        showFiltered={hasActiveFilters}
                        filteredCount={statsData.actions}
                      />
                      <DataCard
                        title="UN System Leaders"
                        value={totalLeads}
                        icon={Users}
                        showProgress={showProgress}
                        completed={0}
                        showFiltered={hasActiveFilters}
                        filteredCount={statsData.leads}
                      />
                      <DataCard
                        title="UN System Entities"
                        value={totalTeamMembers}
                        icon={User}
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
                    onResetFilters={handleResetFiltersWithCollapse}
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
