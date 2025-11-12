"use client";

import { DataCard } from "@/components/DataCard";
import { FilterControls } from "@/components/FilterControls";
import { SidebarCharts } from "@/components/SidebarCharts";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { abbreviationMap } from "@/constants/abbreviations";
import { useActions } from "@/hooks/useActions";
import { useChartSearch } from "@/hooks/useChartSearch";
import { useCollapsibles } from "@/hooks/useCollapsibles";
import { useFilters, useFilterSync } from "@/hooks/useFilters";
import { useWorkPackageData } from "@/hooks/useWorkPackageData";
import { formatGoalText } from "@/lib/utils";
import { Briefcase as BriefcaseIcon, FileText, Info, Layers, ListTodo, Trophy, User, Users } from "lucide-react";

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

                    {/* Progress Section */}
                    <section className="mb-0">
                        <div className="flex flex-col sm:flex-row gap-4 items-start flex-wrap sm:flex-nowrap">
                            <DataCard
                                title="Workstreams"
                                value={statsData.workstreams}
                                icon={<Layers className="w-5 h-5 text-un-blue" />}
                                tooltipText={`Number of workstreams: ${statsData.workstreams}`}
                            />

                            <DataCard
                                title="Work packages"
                                value={statsData.workpackages}
                                icon={<BriefcaseIcon className="w-5 h-5 text-un-blue" />}
                                tooltipText={`Number of work packages: ${statsData.workpackages}`}
                            />

                            <DataCard
                                title="Actions"
                                value={statsData.actions}
                                icon={<ListTodo className="w-5 h-5 text-un-blue" />}
                                tooltipText={`Number of actions: ${statsData.actions}`}
                            />

                            <DataCard
                                title="UN system leaders"
                                value={statsData.leads}
                                icon={<Users className="w-5 h-5 text-un-blue" />}
                                tooltipText={`Number of leads: ${statsData.leads}`}
                            />
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

                                <div className="w-full space-y-4">
                                    {filteredWorkPackages.map((wp, index) => {
                                        const collapsibleKey = `${wp.report.join('-')}-${wp.number || 'empty'}-${index}`;
                                        const isOpen = openCollapsibles.has(collapsibleKey);

                                        return (
                                            <Collapsible
                                                key={collapsibleKey}
                                                open={isOpen}
                                                onOpenChange={() => toggleCollapsible(collapsibleKey)}
                                            >
                                                <div className={`mb-20 last:mb-0 relative ${isOpen ? 'border-l-4 border-l-un-blue border border-slate-200 rounded-[6px] bg-slate-50/50' : ''}`}>
                                                    <CollapsibleTrigger className={`w-full flex flex-col items-start px-0 py-0 hover:no-underline rounded-[6px] px-6 py-4 transition-all hover:bg-[#E0F5FF] border-0 ${isOpen ? 'rounded-b-none bg-slate-50/50' : 'bg-gray-50'}`}>
                                                        <div className="text-left min-w-0 mb-1 pr-20 sm:pr-8">
                                                            {wp.number ? (
                                                                <>
                                                                    <span className="text-[17px] font-medium text-gray-400 leading-[24px]">
                                                                        Work package {wp.number}:
                                                                    </span>
                                                                    <span className="text-[17px] font-medium text-slate-900 leading-[24px] ml-1">
                                                                        {wp.name}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-[17px] font-medium text-slate-900 leading-[24px]">
                                                                    {wp.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Goal from work package data */}
                                                        {wp.goal && (
                                                            <div className="mt-0.5 pr-8 text-left pl-0 py-2 mb-2">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Trophy className="w-4 h-4 text-un-blue" />
                                                                    <p className="text-[14px] font-semibold text-un-blue uppercase tracking-wide text-left">
                                                                        Goal
                                                                    </p>
                                                                </div>
                                                                <p className="text-[15px] text-slate-800 leading-[23px] mt-2 text-left normal-case">
                                                                    {formatGoalText(wp.goal)}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {/* Report Labels and Work Package Leads */}
                                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                            {/* Workstream Labels */}
                                                            {wp.report.includes('WS1') && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                            <Layers className="w-4 h-4 text-gray-600" />
                                                                            <p className="text-[15px] text-gray-600 leading-[20px]">
                                                                                WS1
                                                                            </p>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Workstream 1</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {wp.report.includes('WS2') && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                            <Layers className="w-4 h-4 text-gray-600" />
                                                                            <p className="text-[15px] text-gray-600 leading-[20px]">
                                                                                WS2
                                                                            </p>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Workstream 2</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {wp.report.includes('WS3') && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                            <Layers className="w-4 h-4 text-gray-600" />
                                                                            <p className="text-[15px] text-gray-600 leading-[20px]">
                                                                                WS3
                                                                            </p>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Workstream 3</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {/* Work Package Leads */}
                                                            {wp.leads.length > 0 && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                            <User className="w-4 h-4 text-gray-600" />
                                                                            <p className="text-[15px] text-gray-600 leading-[20px]">
                                                                                {wp.leads.map((lead, idx) => {
                                                                                    const longForm = abbreviationMap[lead] || lead;
                                                                                    return (
                                                                                        <span key={idx}>
                                                                                            {idx > 0 && ', '}
                                                                                            <span title={longForm !== lead ? longForm : undefined}>
                                                                                                {lead}
                                                                                            </span>
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>
                                                                            {wp.leads.map((lead, idx) => {
                                                                                const longForm = abbreviationMap[lead] || lead;
                                                                                return (
                                                                                    <span key={idx}>
                                                                                        {idx > 0 && ', '}
                                                                                        {longForm}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </CollapsibleTrigger>
                                                    {/* Details Button */}
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[6px] text-[14px] font-medium transition-colors absolute top-4 right-2 sm:right-4"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleCollapsible(collapsibleKey);
                                                        }}
                                                    >
                                                        <Info className="w-3.5 h-3.5 text-gray-600" />
                                                        <span>Details</span>
                                                    </button>
                                                    <CollapsibleContent className={`px-0 pb-4 pt-4 pl-6 ${isOpen ? 'px-6' : ''}`}>
                                                        {wp.actions.length > 0 ? (
                                                            <div className="flex flex-col gap-4">
                                                                {/* Header */}
                                                                <div className="flex flex-col gap-2 mb-2">
                                                                    <h3 className="text-[17px] font-semibold text-slate-700 tracking-wider text-left">
                                                                        Indicative actions
                                                                    </h3>
                                                                </div>
                                                                {/* Display each indicative_activity in its own box */}
                                                                {wp.actions.map((action, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="bg-white border border-slate-200 rounded-[6px] p-5 transition-all hover:shadow-sm"
                                                                    >
                                                                        {/* Activity Number and Text */}
                                                                        <div className="flex items-start gap-3 mb-4">
                                                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-un-blue/10 flex items-center justify-center mt-0.5">
                                                                                <span className="text-[13px] font-semibold text-un-blue">
                                                                                    {idx + 1}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[16px] font-medium text-slate-900 leading-[25px] flex-1">
                                                                                {action.text}
                                                                            </p>
                                                                        </div>

                                                                        {/* Work Package Leads - Icon + Text */}
                                                                        {action.leads.length > 0 && (
                                                                            <div className="ml-9 pt-3 border-t border-slate-100">
                                                                                <div className="flex items-center gap-3 flex-wrap">
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                                                <User className="w-4 h-4 text-gray-500" />
                                                                                                <p className="text-[14px] text-gray-600 leading-[21px]">
                                                                                                    {action.leads.map((lead, idx) => {
                                                                                                        const longForm = abbreviationMap[lead] || lead;
                                                                                                        return (
                                                                                                            <span key={idx}>
                                                                                                                {idx > 0 && ', '}
                                                                                                                <span title={longForm !== lead ? longForm : undefined}>
                                                                                                                    {lead}
                                                                                                                </span>
                                                                                                            </span>
                                                                                                        );
                                                                                                    })}
                                                                                                </p>
                                                                                            </div>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>
                                                                                            <p>
                                                                                                {action.leads.map((lead, idx) => {
                                                                                                    const longForm = abbreviationMap[lead] || lead;
                                                                                                    return (
                                                                                                        <span key={idx}>
                                                                                                            {idx > 0 && ', '}
                                                                                                            {longForm}
                                                                                                        </span>
                                                                                                    );
                                                                                                })}
                                                                                            </p>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                    {action.documentParagraph && (
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                                                                                            <span className="text-[14px] text-gray-600 leading-[21px]">
                                                                                                {wp.number === '31'
                                                                                                    ? `A/80/400`
                                                                                                    : action.report === 'WS3'
                                                                                                        ? `A/80/392 para. ${action.documentParagraph}`
                                                                                                        : action.report === 'WS2'
                                                                                                            ? `A/80/318 para. ${action.documentParagraph}`
                                                                                                            : action.report === 'WS1'
                                                                                                                ? `A/80/400`
                                                                                                                : `Para. ${action.documentParagraph}`}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {/* Doc Text */}
                                                                                {action.docText && (
                                                                                    <div className="ml-[6px] pt-3 mt-3 border-t border-slate-100">
                                                                                        <p className="text-[14px] text-gray-600 leading-[21px]">
                                                                                            {action.docText}
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {/* Doc Text - when no leads */}
                                                                        {action.leads.length === 0 && action.docText && (
                                                                            <div className="ml-[6px] pt-3 border-t border-slate-100">
                                                                                <p className="text-[14px] text-gray-600 leading-[21px]">
                                                                                    {action.docText}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white border border-slate-200 rounded-[6px] p-[17px]">
                                                                <p className="text-[15px] font-normal text-slate-900 leading-[21px]">
                                                                    No actions available
                                                                </p>
                                                            </div>
                                                        )}
                                                    </CollapsibleContent>
                                                </div>
                                            </Collapsible>
                                        );
                                    })}
                                </div>
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

