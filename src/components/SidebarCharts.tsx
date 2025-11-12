import React from 'react';
import { LeadsChart } from './LeadsChart';
import { WorkstreamsChart } from './WorkstreamsChart';
import { WorkPackagesChart } from './WorkPackagesChart';
import type { LeadChartEntry, WorkstreamChartEntry, WorkPackageChartEntry } from '@/types';

interface SidebarChartsProps {
    // Leads chart
    leadsData: LeadChartEntry[];
    leadsSearchQuery: string;
    onLeadsSearchChange: (query: string) => void;
    selectedLead: string;
    onSelectLead: (lead: string) => void;
    showAllLeads: boolean;
    onToggleShowAllLeads: () => void;

    // Workstreams chart
    workstreamsData: WorkstreamChartEntry[];
    workstreamsSearchQuery: string;
    onWorkstreamsSearchChange: (query: string) => void;
    selectedWorkstream: string;
    onSelectWorkstream: (workstream: string) => void;
    showAllWorkstreams: boolean;
    onToggleShowAllWorkstreams: () => void;

    // Work packages chart
    workPackagesData: WorkPackageChartEntry[];
    workPackagesSearchQuery: string;
    onWorkPackagesSearchChange: (query: string) => void;
    selectedWorkPackage: string;
    onSelectWorkPackage: (workPackage: string) => void;
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
    return (
        <div className="w-full lg:w-[320px] shrink-0 mt-6 lg:mt-0 lg:border-l lg:border-slate-200 lg:pl-6 lg:ml-[calc((4*280px+3*16px)-818px-320px-24px)] flex flex-col gap-4">
            <LeadsChart
                data={leadsData}
                searchQuery={leadsSearchQuery}
                onSearchChange={onLeadsSearchChange}
                selectedLead={selectedLead}
                onSelectLead={onSelectLead}
                showAll={showAllLeads}
                onToggleShowAll={onToggleShowAllLeads}
            />

            <WorkstreamsChart
                data={workstreamsData}
                searchQuery={workstreamsSearchQuery}
                onSearchChange={onWorkstreamsSearchChange}
                selectedWorkstream={selectedWorkstream}
                onSelectWorkstream={onSelectWorkstream}
                showAll={showAllWorkstreams}
                onToggleShowAll={onToggleShowAllWorkstreams}
            />

            <WorkPackagesChart
                data={workPackagesData}
                searchQuery={workPackagesSearchQuery}
                onSearchChange={onWorkPackagesSearchChange}
                selectedWorkPackage={selectedWorkPackage}
                onSelectWorkPackage={onSelectWorkPackage}
                showAll={showAllWorkPackages}
                onToggleShowAll={onToggleShowAllWorkPackages}
            />
        </div>
    );
}
