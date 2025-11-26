"use client";

import { useState } from "react";
import { DataCard } from "@/components/DataCard";
import { ExplainerText } from "@/components/ExplainerText";
import { FilterControls } from "@/components/FilterControls";
import { Header } from "@/components/HeaderBar";
import { LeaderSubmissionChecklist } from "@/components/LeaderSubmissionChecklist";
import { WorkPackageList } from "@/components/ListContainer";
import { LeaderSubmissionProgress } from "@/components/LeaderSubmissionProgress";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  AlertCircle,
} from "lucide-react";

export default function WorkPackagesPage() {
  // Custom hooks for state management
  const { actions, isLoading, stats, nextMilestone, progressPercentage } =
    useActions();

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
    sortOption,
    setSortOption,
    handleResetFilters,
    handleResetAll,
  } = useFilters();

  // State for leader checklist selection
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([]);

  const {
    openCollapsibles,
    toggleCollapsible,
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
    showAllLeaderChecklist,
    setShowAllLeaderChecklist,
  } = useCollapsibles();

  const {
    chartSearchQuery,
    setChartSearchQuery,
    workstreamChartSearchQuery,
    setWorkstreamChartSearchQuery,
    workpackageChartSearchQuery,
    setWorkpackageChartSearchQuery,
    leaderChecklistSearchQuery,
    setLeaderChecklistSearchQuery,
  } = useChartSearch();

  // Compute work package data using custom hook
  const {
    filteredWorkPackages,
    uniqueWorkPackages,
    uniqueLeads,
    uniqueWorkstreams,
    uniqueActions,
    uniqueActionTexts,
    availableBigTicketOptions,
    chartData,
    workstreamChartData,
    workpackageChartData,
    statsData,
  } = useWorkPackageData(
    actions,
    filters,
    chartSearchQuery,
    workstreamChartSearchQuery,
    workpackageChartSearchQuery,
  );

  // Sync filters with available options
  useFilterSync(
    selectedWorkPackage,
    uniqueWorkPackages,
    setSelectedWorkPackage,
  );
  useFilterSync(selectedLead, uniqueLeads, setSelectedLead);
  useFilterSync(selectedWorkstream, uniqueWorkstreams, setSelectedWorkstream);
  useFilterSync(selectedAction, uniqueActionTexts, setSelectedAction);
  useFilterSync(
    selectedBigTicket,
    availableBigTicketOptions.map((opt) => opt.key),
    setSelectedBigTicket,
  );

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
            {/* <section className="mb-10">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DataCard
                  title="Workstreams"
                  value={statsData.workstreams}
                  icon={Layers}
                  isLoading={isLoading}
                />
                <DataCard
                  title="Work Packages"
                  value={statsData.workpackages}
                  icon={BriefcaseIcon}
                  isLoading={isLoading}
                />
                <DataCard
                  title="Actions"
                  value={statsData.actions}
                  icon={ListTodo}
                  isLoading={isLoading}
                />
                <DataCard
                  title="UN System Leaders"
                  value={statsData.leads}
                  icon={Users}
                  isLoading={isLoading}
                />
              </div>
            </section> */}

            {/* Leader Submission Progress Section */}
            <section className="mb-10">
              <LeaderSubmissionProgress actions={actions} />
            </section>

            {/* Work Packages Breakdown Section */}
            <section className="mt-6 mb-4">
              {/* Work Packages and Chart Section */}
              <section className="flex flex-col items-start gap-6 overflow-hidden lg:flex-row">
                {/* Leader Submission Checklist */}
                <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 lg:w-[420px] lg:max-w-[420px]">
                  <LeaderSubmissionChecklist
                    actions={actions}
                    searchQuery={leaderChecklistSearchQuery}
                    onSearchChange={setLeaderChecklistSearchQuery}
                    selectedLeaders={selectedLeaders}
                    onSelectLeaders={setSelectedLeaders}
                    showAll={showAllLeaderChecklist}
                    onToggleShowAll={() =>
                      setShowAllLeaderChecklist(!showAllLeaderChecklist)
                    }
                    initialDisplayCount={10}
                  />
                </div>

                {/* Work Packages Collapsible */}
                <div className="w-full min-w-0 flex-1 lg:max-w-[818px]">
                  {/* <FilterControls
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
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    uniqueWorkPackages={uniqueWorkPackages}
                    uniqueLeads={uniqueLeads}
                    uniqueWorkstreams={uniqueWorkstreams}
                    uniqueActions={uniqueActions}
                    uniqueActionTexts={uniqueActionTexts}
                    availableBigTicketOptions={availableBigTicketOptions}
                    onResetFilters={handleResetFilters}
                  /> */}

                  {/* <WorkPackageList
                    workPackages={filteredWorkPackages}
                    openCollapsibles={openCollapsibles}
                    onToggleCollapsible={toggleCollapsible}
                    onSelectLead={setSelectedLead}
                    onSelectWorkstream={setSelectedWorkstream}
                    selectedActions={selectedAction}
                    isLoading={isLoading}
                  /> */}
                </div>

                
              </section>


            </section>


          </div>
        </main>

        {/* Red icon at bottom right */}
        <div className="fixed bottom-4 right-4 z-50">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
      </div>
    </TooltipProvider>
  );
}
