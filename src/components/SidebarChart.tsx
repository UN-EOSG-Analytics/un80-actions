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
    selectedValue: string[];
    onSelectValue: (value: string[]) => void;
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

    const handleClickBar = (value: string) => {
        const newSelected = selectedValue.includes(value)
            ? selectedValue.filter((v) => v !== value)
            : [...selectedValue, value];
        onSelectValue(newSelected);
    };

    return (
        <div className="bg-white px-4 sm:px-5 pt-0 pb-4 sm:pb-5 rounded-xl">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 text-un-blue flex items-center justify-center">
                    {icon}
                </span>
                {title}
            </h3>
            <p className="text-[15px] text-slate-600 mb-3">
                {description}
            </p>

            {/* Search Bar */}
            <div className="relative w-full mb-4">
                <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-un-blue pointer-events-none z-10" />
                <Input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-9 text-[15px] border-0 border-b border-slate-300 rounded-none pl-6 pr-4 py-[8px] text-slate-700 bg-white transition-all hover:border-b-un-blue/60 focus:border-b-un-blue focus:ring-0 focus:ring-offset-0 focus:shadow-none focus:outline-none shadow-none"
                />
            </div>

            {/* Chart Data */}
            <div>
                <table className="w-full">
                    <tbody>
                        {displayedData.map((entry, index) => {
                            const percentage = (entry.count / maxCount) * 100;
                            const isSelected = selectedValue.includes(entry.value);
                            const isFiltered = selectedValue.length > 0 && !selectedValue.includes(entry.value);

                            return (
                                <tr
                                    key={entry.value}
                                    onClick={() => handleClickBar(entry.value)}
                                    className={`group cursor-pointer transition-colors hover:bg-slate-50 ${isFiltered ? 'opacity-30' : ''
                                        } ${index < displayedData.length - 1 ? 'border-b border-slate-200' : ''}`}
                                >
                                    <td className="py-2 pr-3">
                                        <div className="flex items-center justify-between gap-3">
                                            {entry.tooltip ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-[14px] font-medium text-slate-900 group-hover:text-un-blue transition-colors shrink-0 min-w-0 cursor-help">
                                                            {entry.label}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{entry.tooltip}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <span className="text-[14px] font-medium text-slate-900 group-hover:text-un-blue transition-colors shrink-0 min-w-0">
                                                    {entry.label}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span
                                                    className={`text-[14px] font-normal min-w-[20px] text-right font-mono ${isSelected ? 'text-un-blue' : 'text-un-blue'
                                                        }`}
                                                >
                                                    {entry.count}
                                                </span>
                                                <div className="w-[120px] h-[8px] bg-slate-100 rounded-full overflow-hidden relative">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${isSelected ? 'bg-un-blue' : 'bg-un-blue'
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
                        className="w-full py-2 text-[14px] text-left text-un-blue hover:text-un-blue/80 transition-colors"
                    >
                        {showAll ? 'Show less' : `Show ${data.length - initialDisplayCount} more`}
                    </button>
                )}
            </div>
        </div>
    );
}
