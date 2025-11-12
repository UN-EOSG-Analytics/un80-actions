import React from 'react';
import { Users, Layers, Briefcase } from 'lucide-react';
import { SidebarChart, SidebarChartEntry } from './SidebarChart';
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
    const leadsChartEntries: SidebarChartEntry[] = leadsData.map(entry => ({
        label: entry.lead,
        count: entry.count,
        value: entry.lead,
    }));

    const workstreamsChartEntries: SidebarChartEntry[] = workstreamsData.map(entry => ({
        label: entry.workstream,
        count: entry.count,
        value: entry.workstream,
    }));

    const workPackagesChartEntries: SidebarChartEntry[] = workPackagesData.map(entry => {
        const wpMatch = entry.workpackage.match(/^(\d+):/);
        const wpNumber = wpMatch ? wpMatch[1] : null;
        const wpName = wpMatch ? entry.workpackage.replace(/^\d+:\s*/, '') : entry.workpackage;
        const wpOption = wpNumber ? `${wpNumber}: ${wpName}` : wpName;

        return {
            label: wpNumber ? `WP${wpNumber}` : 'Work package',
            count: entry.count,
            value: wpOption,
            tooltip: wpNumber ? wpName : undefined,
        };
    });

    return (
        <div className="w-full lg:w-[320px] shrink-0 mt-6 lg:mt-0 lg:border-l lg:border-slate-200 lg:pl-6 lg:ml-[calc((4*280px+3*16px)-818px-320px-24px)] flex flex-col gap-4">
            <SidebarChart
                title="Work packages per lead"
                description="Principals and number of related work packages"
                icon={<Users className="w-5 h-5 text-un-blue" />}
                data={leadsChartEntries}
                searchQuery={leadsSearchQuery}
                onSearchChange={onLeadsSearchChange}
                searchPlaceholder="Search entities"
                selectedValue={selectedLead}
                onSelectValue={onSelectLead}
                showAll={showAllLeads}
                onToggleShowAll={onToggleShowAllLeads}
            />

            <SidebarChart
                title="Actions per workstream"
                description="Number of actions per workstream"
                icon={<Layers className="w-5 h-5 text-un-blue" />}
                data={workstreamsChartEntries}
                searchQuery={workstreamsSearchQuery}
                onSearchChange={onWorkstreamsSearchChange}
                searchPlaceholder="Search workstreams"
                selectedValue={selectedWorkstream}
                onSelectValue={onSelectWorkstream}
                showAll={showAllWorkstreams}
                onToggleShowAll={onToggleShowAllWorkstreams}
            />

            <SidebarChart
                title="Actions per work package"
                description="Number of actions per work package"
                icon={<Briefcase className="w-5 h-5 text-un-blue" />}
                data={workPackagesChartEntries}
                searchQuery={workPackagesSearchQuery}
                onSearchChange={onWorkPackagesSearchChange}
                searchPlaceholder="Search work packages"
                selectedValue={selectedWorkPackage}
                onSelectValue={onSelectWorkPackage}
                showAll={showAllWorkPackages}
                onToggleShowAll={onToggleShowAllWorkPackages}
            />
        </div>
    );
}
