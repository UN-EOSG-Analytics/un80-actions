import React from 'react';
import { Briefcase } from 'lucide-react';
import { SidebarChart, SidebarChartEntry } from './SidebarChart';
import type { WorkPackageChartEntry } from '@/types';

interface WorkPackagesChartProps {
    data: WorkPackageChartEntry[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedWorkPackage: string;
    onSelectWorkPackage: (workPackage: string) => void;
    showAll: boolean;
    onToggleShowAll: () => void;
}

export function WorkPackagesChart({
    data,
    searchQuery,
    onSearchChange,
    selectedWorkPackage,
    onSelectWorkPackage,
    showAll,
    onToggleShowAll,
}: WorkPackagesChartProps) {
    const chartEntries: SidebarChartEntry[] = data.map(entry => {
        const wpMatch = entry.workpackage.match(/^(\d+):/);
        const wpNumber = wpMatch ? wpMatch[1] : null;
        const wpName = wpMatch ? entry.workpackage.replace(/^\d+:\s*/, '') : entry.workpackage;
        const wpOption = wpNumber ? `${wpNumber}: ${wpName}` : wpName;

        return {
            label: wpNumber ? `WP: ${wpNumber}` : 'Work package',
            count: entry.count,
            value: wpOption,
            tooltip: wpNumber ? wpName : undefined,
        };
    });

    return (
        <SidebarChart
            title="Actions per work package"
            description="Number of actions per work package"
            icon={<Briefcase className="w-5 h-5 text-un-blue" />}
            data={chartEntries}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            searchPlaceholder="Search work packages"
            selectedValue={selectedWorkPackage}
            onSelectValue={onSelectWorkPackage}
            showAll={showAll}
            onToggleShowAll={onToggleShowAll}
        />
    );
}
