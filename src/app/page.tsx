"use client";

import { Suspense } from "react";
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
import {
  Briefcase as BriefcaseIcon,
  Layers,
  ListTodo,
  Users,
  User,
  AlertCircle,
} from "lucide-react";

function WorkPackagesPageContent() {
  // Custom hooks for state management
  const { actions, isLoading } = useActions();

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
  } = useCollapsibles();

  const {
    chartSearchQuery,
    setChartSearchQuery,
    workstreamChartSearchQuery,
    setWorkstreamChartSearchQuery,
    workpackageChartSearchQuery,
    setWorkpackageChartSearchQuery,
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-white">
        {/* Fixed Header */}
        <Header onReset={handleResetAll} />

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
                <DataCard
                  title="UN System Entities"
                  value={statsData.teamMembers}
                  icon={User}
                  isLoading={isLoading}
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
                    uniqueActionTexts={uniqueActionTexts}
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
