import React from 'react';
import { Users } from 'lucide-react';
import { SidebarChart, SidebarChartEntry } from './SidebarChart';
import type { LeadChartEntry } from '@/types';

interface LeadsChartProps {
    data: LeadChartEntry[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedLead: string;
    onSelectLead: (lead: string) => void;
    showAll: boolean;
    onToggleShowAll: () => void;
}

export function LeadsChart({
    data,
    searchQuery,
    onSearchChange,
    selectedLead,
    onSelectLead,
    showAll,
    onToggleShowAll,
}: LeadsChartProps) {
    const chartEntries: SidebarChartEntry[] = data.map(entry => ({
        label: entry.lead,
        count: entry.count,
        value: entry.lead,
    }));

    return (
        <SidebarChart
            title="Work packages per lead"
            description="Principals and number of related work packages"
            icon={<Users className="w-5 h-5 text-un-blue" />}
            data={chartEntries}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            searchPlaceholder="Search entities"
            selectedValue={selectedLead}
            onSelectValue={onSelectLead}
            showAll={showAll}
            onToggleShowAll={onToggleShowAll}
        />
    );
}
