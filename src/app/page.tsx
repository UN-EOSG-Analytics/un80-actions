"use client";

import { DataCard } from "@/components/DataCard";
import { ExplainerText } from "@/components/ExplainerText";
import { FilterControls } from "@/components/FilterControls";
import { Header } from "@/components/HeaderBar";
import { SidebarCharts } from "@/components/SidebarCharts";
import { WorkPackageList } from "@/components/WorkPackageList";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useActions } from "@/hooks/useActions";
import { useChartSearch } from "@/hooks/useChartSearch";
import { useCollapsibles } from "@/hooks/useCollapsibles";
import { useFilters, useFilterSync } from "@/hooks/useFilters";
import { useWorkPackageData } from "@/hooks/useWorkPackageData";
import { Briefcase as BriefcaseIcon, Layers, ListTodo, Users } from "lucide-react";

export default function WorkPackagesPage() {
    // Custom hooks for state management
    const { actions, isLoading, stats, nextMilestone, progressPercentage } = useActions();

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
        sortOption,
        setSortOption,
        handleResetFilters,
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
        chartData,
        workstreamChartData,
        workpackageChartData,
        statsData,
    } = useWorkPackageData(
        actions,
        filters,
        chartSearchQuery,
        workstreamChartSearchQuery,
        workpackageChartSearchQuery
    );

    // Sync filters with available options
    useFilterSync(selectedWorkPackage, uniqueWorkPackages, setSelectedWorkPackage);
    useFilterSync(selectedLead, uniqueLeads, setSelectedLead);
    useFilterSync(selectedWorkstream, uniqueWorkstreams, setSelectedWorkstream);

    return (
        <TooltipProvider delayDuration={200}>
            <div className="min-h-screen bg-white">
                {/* Fixed Header */}
                <Header />

                {/* Main Container - with padding to account for fixed header */}
                <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 pt-20">
                    <div className="space-y-6 pb-16">
                        {/* Header with context info */}
                        <ExplainerText />

                    {/* DataCards Section */}
                    <section className="mb-0">
                        <div className="flex flex-col sm:flex-row gap-4 items-start flex-wrap sm:flex-nowrap">
                            <DataCard title="Workstreams" value={statsData.workstreams} icon={Layers} />
                            <DataCard title="Work packages" value={statsData.workpackages} icon={BriefcaseIcon} />
                            <DataCard title="Actions" value={statsData.actions} icon={ListTodo} />
                            <DataCard title="UN system leaders" value={statsData.leads} icon={Users} />
                        </div>
                    </section>

                    {/* Work Packages Breakdown Section */}
                    <section className="mb-4 mt-6">
                        {/* Work Packages and Chart Section */}
                        <section className="flex flex-col lg:flex-row gap-6 items-start">
                            {/* Work Packages Collapsible */}
                            <div className="flex-1 w-full lg:max-w-[818px]">
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
                                    searchQuery={searchQuery}
                                    onSearchChange={setSearchQuery}
                                    uniqueWorkPackages={uniqueWorkPackages}
                                    uniqueLeads={uniqueLeads}
                                    uniqueWorkstreams={uniqueWorkstreams}
                                    onResetFilters={handleResetFilters}
                                />

                                <WorkPackageList
                                    workPackages={filteredWorkPackages}
                                    openCollapsibles={openCollapsibles}
                                    onToggleCollapsible={toggleCollapsible}
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
                                onToggleShowAllWorkstreams={() => setShowAllWorkstreams(!showAllWorkstreams)}
                                workPackagesData={workpackageChartData}
                                workPackagesSearchQuery={workpackageChartSearchQuery}
                                onWorkPackagesSearchChange={setWorkpackageChartSearchQuery}
                                selectedWorkPackage={selectedWorkPackage}
                                onSelectWorkPackage={setSelectedWorkPackage}
                                showAllWorkPackages={showAllWorkpackages}
                                onToggleShowAllWorkPackages={() => setShowAllWorkpackages(!showAllWorkpackages)}
                            />
                        </section>
                    </section>
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}

