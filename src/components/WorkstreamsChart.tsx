import React from 'react';
import { Layers } from 'lucide-react';
import { SidebarChart, SidebarChartEntry } from './SidebarChart';
import type { WorkstreamChartEntry } from '@/types';

interface WorkstreamsChartProps {
    data: WorkstreamChartEntry[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedWorkstream: string;
    onSelectWorkstream: (workstream: string) => void;
    showAll: boolean;
    onToggleShowAll: () => void;
}

export function WorkstreamsChart({
    data,
    searchQuery,
    onSearchChange,
    selectedWorkstream,
    onSelectWorkstream,
    showAll,
    onToggleShowAll,
}: WorkstreamsChartProps) {
    const chartEntries: SidebarChartEntry[] = data.map(entry => ({
        label: entry.workstream,
        count: entry.count,
        value: entry.workstream,
    }));

    return (
        <SidebarChart
            title="Actions per workstream"
            description="Number of actions per workstream"
            icon={<Layers className="w-5 h-5 text-un-blue" />}
            data={chartEntries}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            searchPlaceholder="Search workstreams"
            selectedValue={selectedWorkstream}
            onSelectValue={onSelectWorkstream}
            showAll={showAll}
            onToggleShowAll={onToggleShowAll}
        />
    );
}
