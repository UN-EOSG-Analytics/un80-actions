import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface SidebarChartEntry {
    label: string;
    count: number;
    value: string;
    tooltip?: string;
}

interface SidebarChartProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    data: SidebarChartEntry[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    searchPlaceholder: string;
    selectedValue: string;
    onSelectValue: (value: string) => void;
    showAll: boolean;
    onToggleShowAll: () => void;
    initialDisplayCount?: number;
}

export function SidebarChart({
    title,
    description,
    icon,
    data,
    searchQuery,
    onSearchChange,
    searchPlaceholder,
    selectedValue,
    onSelectValue,
    showAll,
    onToggleShowAll,
    initialDisplayCount = 3,
}: SidebarChartProps) {
    const displayedData = showAll ? data : data.slice(0, initialDisplayCount);
    const maxCount = data.length > 0 ? Math.max(...data.map(d => d.count)) : 1;

    const handleRowClick = (value: string) => {
        // Toggle: if already selected, deselect; otherwise select
        onSelectValue(selectedValue === value ? "" : value);
    };

    return (
        <div className="bg-white p-4 sm:p-5 rounded-xl">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-2 flex items-center gap-2">
                {icon}
                {title}
            </h3>
            <p className="text-[15px] text-slate-600 mb-3">
                {description}
            </p>

            {/* Search Bar */}
            <div className="relative w-full mb-4">
                <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#009EDB] pointer-events-none z-10" />
                <Input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-9 text-[15px] border-0 border-b border-slate-300 rounded-none pl-6 pr-4 py-[8px] text-slate-700 bg-white transition-all hover:border-b-[#009EDB]/60 focus:border-b-[#009EDB] focus:ring-0 focus:ring-offset-0 focus:shadow-none focus:outline-none shadow-none"
                />
            </div>

            {/* Chart Data */}
            <div className="h-[300px] sm:h-[350px] md:h-[400px] overflow-y-auto overflow-x-hidden">
                <table className="w-full">
                    <tbody>
                        {displayedData.map((entry, index) => {
                            const percentage = (entry.count / maxCount) * 100;
                            const isSelected = selectedValue === entry.value;
                            const isFiltered = selectedValue && selectedValue !== entry.value;

                            return (
                                <tr
                                    key={entry.value}
                                    onClick={() => handleRowClick(entry.value)}
                                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                                        isFiltered ? 'opacity-30' : ''
                                    } ${index < displayedData.length - 1 ? 'border-b border-slate-200' : ''}`}
                                >
                                    <td className="py-3 pr-3">
                                        <div className="flex items-center justify-between gap-3">
                                            {entry.tooltip ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-[14px] font-medium text-slate-900 shrink-0 min-w-0 cursor-help">
                                                            {entry.label}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{entry.tooltip}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <span className="text-[14px] font-medium text-slate-900 shrink-0 min-w-0">
                                                    {entry.label}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span
                                                    className={`text-[14px] font-semibold min-w-[20px] font-mono ${
                                                        isSelected ? 'text-[#0076A4]' : 'text-[#009EDB]'
                                                    }`}
                                                >
                                                    {entry.count}
                                                </span>
                                                <div className="w-[120px] h-[8px] bg-slate-100 rounded-full overflow-hidden relative">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            isSelected ? 'bg-[#0076A4]' : 'bg-[#009EDB]'
                                                        }`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Show More/Less Button */}
                {data.length > initialDisplayCount && (
                    <button
                        onClick={onToggleShowAll}
                        className="w-full mt-3 py-2 text-[14px] text-left text-[#009EDB] hover:text-[#0076A4] transition-colors"
                    >
                        {showAll ? 'Show less' : `Show more (${data.length - initialDisplayCount} more)`}
                    </button>
                )}
            </div>
        </div>
    );
}
