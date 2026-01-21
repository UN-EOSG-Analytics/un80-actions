"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { DataCard } from "@/components/DataCard";
import { ExplainerText } from "@/components/ExplainerText";
import { FilterControls } from "@/components/FilterControls";
import { Header } from "@/components/HeaderBar";
import { SidebarCharts } from "@/components/SidebarCharts";
import { WorkPackageList } from "@/components/ListContainer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useActions } from "@/hooks/useActions";
import { useChartSearch } from "@/hooks/useChartSearch";
import { useCollapsibles } from "@/hooks/useCollapsibles";
import { useFilters, useFilterSync } from "@/hooks/useFilters";
import { useWorkPackageData } from "@/hooks/useWorkPackageData";
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
  const [showProgress, setShowProgress] = useState(false);

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
  }, [selectedAction]); // Only depend on selectedAction

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-white">
        {/* Fixed Header */}
        <Header onReset={handleResetAll} showLogin={false} />

        {/* Main Container - with padding to account for fixed header */}
        <main className="mx-auto w-full max-w-4xl px-8 pt-8 sm:px-12 sm:pt-24 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          <div className="space-y-6 pb-16">
            {/* Header with context info */}
            <ExplainerText />

            {/* DataCards Section */}
            <section className="mb-10">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <DataCard
                  title="Workstreams"
                  value={statsData.workstreams}
                  icon={Layers}
                  isLoading={isLoading}
                  showProgress={showProgress}
                  completed={0}
                />
                <DataCard
                  title="Work Packages"
                  value={statsData.workpackages}
                  icon={BriefcaseIcon}
                  isLoading={isLoading}
                  showProgress={showProgress}
                  completed={0}
                />
                <DataCard
                  title="Actions"
                  value={statsData.actions}
                  icon={ListTodo}
                  isLoading={isLoading}
                  showProgress={showProgress}
                  completed={0}
                />
                <DataCard
                  title="UN System Leaders"
                  value={statsData.leads}
                  icon={Users}
                  isLoading={isLoading}
                  showProgress={showProgress}
                  completed={0}
                />
                <DataCard
                  title="UN System Entities"
                  value={statsData.teamMembers}
                  icon={User}
                  isLoading={isLoading}
                  showProgress={showProgress}
                  completed={0}
                />
              </div>
            </section>

            {/* Work Packages Breakdown Section */}
            <section className="mt-6 mb-4">
              {/* Work Packages and Chart Section */}
              <section className="flex flex-col items-start gap-6 overflow-hidden lg:flex-row">
                {/* Work Packages Collapsible */}
                <div className="w-full min-w-0 flex-1 lg:max-w-[818px]">
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
                  upcomingMilestonesSearchQuery={upcomingMilestonesChartSearchQuery}
                  onUpcomingMilestonesSearchChange={setUpcomingMilestonesChartSearchQuery}
                  showAllUpcomingMilestones={showAllUpcomingMilestones}
                  onToggleShowAllUpcomingMilestones={() =>
                    setShowAllUpcomingMilestones(!showAllUpcomingMilestones)
                  }
                  milestonesPerMonthSearchQuery={milestonesPerMonthSearchQuery}
                  onMilestonesPerMonthSearchChange={setMilestonesPerMonthSearchQuery}
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
