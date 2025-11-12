"use client";

import { DataCard } from "@/components/DataCard";
import { FilterControls } from "@/components/FilterControls";
import { SidebarCharts } from "@/components/SidebarCharts";
import { WorkPackageList } from "@/components/WorkPackageList";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useActions } from "@/hooks/useActions";
import { useChartSearch } from "@/hooks/useChartSearch";
import { useCollapsibles } from "@/hooks/useCollapsibles";
import { useFilters, useFilterSync } from "@/hooks/useFilters";
import { useWorkPackageData } from "@/hooks/useWorkPackageData";
import { Briefcase as BriefcaseIcon, Info, Layers, ListTodo, Users } from "lucide-react";

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
                {/* Main Container - Left-aligned with consistent padding */}
                <div className="max-w-[1421px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[101px] pt-1 sm:pt-2 md:pt-3 pb-4 sm:pb-6 md:pb-8">
                    {/* Header Section */}
                    <header className="mb-4 relative">
                        <div className="mb-6 mt-1 sm:mt-2 md:mt-3 relative">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-[33px] sm:text-[41px] md:text-[49px] lg:text-[57px] text-gray-800 leading-[41px] sm:leading-[49px] md:leading-[57px] lg:leading-[65px] tracking-[-0.02em] relative inline-block">
                                    <span className="relative z-10 bg-clip-text">
                                        <span className="font-bold">UN80 Initiative</span>
                                        <span className="font-normal"> Actions</span>
                                    </span>
                                </h1>
                                <button className="flex items-center gap-1.5 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-[13px] font-medium transition-colors h-[28px]">
                                    <Info className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                                    <span>Beta version</span>
                                </button>
                            </div>
                            <div className="absolute -left-4 sm:-left-6 md:-left-8 lg:-left-[101px] -right-4 sm:-right-6 md:-right-8 lg:-right-[101px] top-full mt-2 h-[1px] bg-gradient-to-r from-gray-400 via-gray-400/70 to-transparent opacity-80"></div>
                        </div>
                        <div className="text-[16px] text-gray-600 leading-[27px] max-w-[1093px] mt-2">
                            <p>
                                This Dashboard is an annex to the <a href="https://www.un.org/un80-initiative/en" target="_blank" rel="noopener noreferrer" className="text-un-blue hover:text-[#0076A4] hover:underline transition-colors">UN80 Initiative Action Plan</a>. It presents the detailed work packages across the three <a href="https://www.un.org/un80-initiative/en" target="_blank" rel="noopener noreferrer" className="text-un-blue hover:text-[#0076A4] hover:underline transition-colors">UN80 Initiative</a> workstreams in a single reference. This Dashboard also lists designated leads for each work package, as well as their individual action items (derived from paragraphs in the SG's reports on <a href="https://www.un.org/un80-initiative/en" target="_blank" rel="noopener noreferrer" className="text-un-blue hover:text-[#0076A4] hover:underline transition-colors">UN80 Initiative</a>).
                            </p>
                        </div>
                    </header>

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
            </div>
        </TooltipProvider>
    );
}

