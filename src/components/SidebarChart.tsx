import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search } from "lucide-react";
import React from "react";

export interface SidebarChartEntry {
  label: string;
  count: number;
  value: string;
  tooltip?: string;
  deadline?: string | null;
  isUrgent?: boolean;
  isUpcoming?: boolean;
  actionNumber?: number | string | null;
  workPackageNumber?: number | string | null;
  workPackageName?: string | null;
}

interface SidebarChartProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  data: SidebarChartEntry[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  selectedValue: string[];
  onSelectValue: (value: string[]) => void;
  barWidth?: number; // Width in pixels
  maxHeight?: number; // Max height in pixels for scrollable area
}

export function SidebarChart({
  title,
  icon,
  data,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  selectedValue,
  onSelectValue,
  barWidth = 90,
  maxHeight = 360,
}: SidebarChartProps) {
  const maxCount =
    data.length > 0 ? Math.max(...data.map((d) => d.count ?? 0)) : 1;

  // Calculate fixed width for count based on max count across ALL data
  const maxCountDigits =
    data.length > 0
      ? Math.max(...data.map((d) => d.count ?? 0)).toString().length
      : 1;
  const countWidth =
    maxCountDigits === 1 ? "w-5" : maxCountDigits === 2 ? "w-7" : "w-9";

  const handleClickBar = (value: string) => {
    const newSelected = selectedValue.includes(value)
      ? selectedValue.filter((v) => v !== value)
      : [...selectedValue, value];
    onSelectValue(newSelected);
  };

  return (
    <div className="rounded-xl bg-white pb-4 pl-4.5 sm:pb-5">
      <h3 className="mb-2 flex h-[25px] items-center gap-2 text-[17px] font-semibold text-slate-900">
        <span className="flex h-5 w-5 items-center justify-center text-un-blue">
          {icon}
        </span>
        {title}
      </h3>

      {/* Search Bar */}
      {onSearchChange && (
        <div className="relative mb-1 w-full">
          <Search className="pointer-events-none absolute top-1/2 left-0 z-10 h-4 w-4 -translate-y-1/2 transform text-un-blue" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full rounded-none border-0 border-b border-slate-300 bg-white py-2 pr-4 pl-6 text-[15px] text-slate-700 shadow-none transition-all placeholder:text-slate-400 hover:border-b-un-blue/60 focus:border-b-un-blue focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none"
          />
        </div>
      )}

      {/* Chart Data - Scrollable */}
      <div
        className="-mr-1 overflow-y-auto overscroll-contain pr-1"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <table className="w-full table-fixed">
          <tbody>
            {data.map((entry, index) => {
              const percentage = (entry.count / maxCount) * 100;
              const isSelected = selectedValue.includes(entry.value);
              const isFiltered =
                selectedValue.length > 0 &&
                !selectedValue.includes(entry.value);

              // Enhanced styling for urgent/upcoming milestones
              const isUrgent = entry.isUrgent === true;
              const isUpcoming = entry.isUpcoming === true;
              const hasUrgencyIndicator = isUrgent || isUpcoming;

              return (
                <tr
                  key={entry.value}
                  onClick={() => handleClickBar(entry.value)}
                  className={`group cursor-pointer transition-all ${
                    isSelected
                      ? isUrgent
                        ? "border-l-2 border-red-400 bg-red-50/50 hover:bg-red-100/50"
                        : "bg-un-blue/5 hover:bg-un-blue/10"
                      : isFiltered
                        ? "opacity-30 hover:bg-slate-50"
                        : isUrgent
                          ? "border-l-2 border-red-300 bg-red-50/30 hover:bg-red-50/50"
                          : isUpcoming
                            ? "border-l-2 border-amber-300 bg-amber-50/30 hover:bg-amber-50/50"
                            : "hover:bg-slate-50"
                  } ${index < data.length - 1 ? "border-b border-slate-200" : ""} ${hasUrgencyIndicator ? "pl-1" : ""}`}
                >
                  <td className="py-2.5 pr-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="ml-0.5 min-w-0 flex-1">
                        {entry.tooltip ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5">
                                {isUrgent && (
                                  <span
                                    className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                                    aria-label="Urgent"
                                  />
                                )}
                                {!isUrgent && isUpcoming && (
                                  <span
                                    className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                                    aria-label="Upcoming"
                                  />
                                )}
                                <span
                                  className={`block cursor-help truncate text-[14px] font-medium transition-colors ${
                                    isSelected
                                      ? "font-semibold text-un-blue"
                                      : isUrgent
                                        ? "text-red-700 group-hover:text-red-800"
                                        : isUpcoming
                                          ? "text-amber-700 group-hover:text-amber-800"
                                          : "text-slate-600 group-hover:text-un-blue"
                                  }`}
                                >
                                  {entry.label}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm text-gray-600">
                                <p>{entry.tooltip || entry.label}</p>
                                {isUrgent && (
                                  <p className="mt-1 text-xs font-semibold text-red-600">
                                    ⚠ Urgent
                                  </p>
                                )}
                                {!isUrgent && isUpcoming && (
                                  <p className="mt-1 text-xs text-amber-600">
                                    ⏱ Upcoming
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {isUrgent && (
                              <span
                                className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                                aria-label="Urgent"
                              />
                            )}
                            {!isUrgent && isUpcoming && (
                              <span
                                className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                                aria-label="Upcoming"
                              />
                            )}
                            <span
                              className={`block text-[14px] font-medium transition-colors ${
                                isSelected
                                  ? "font-semibold text-un-blue"
                                  : isUrgent
                                    ? "text-red-700 group-hover:text-red-800"
                                    : isUpcoming
                                      ? "text-amber-700 group-hover:text-amber-800"
                                      : "text-slate-600 group-hover:text-un-blue"
                              }`}
                            >
                              {entry.label}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`text-[14px] font-normal ${countWidth} text-right font-mono tabular-nums ${
                            isSelected
                              ? "font-semibold text-un-blue"
                              : isUrgent
                                ? "text-red-600"
                                : isUpcoming
                                  ? "text-amber-600"
                                  : "text-un-blue"
                          }`}
                        >
                          {entry.count}
                        </span>
                        <div
                          className="relative mr-2 h-2 overflow-hidden rounded-full bg-slate-100"
                          style={{ width: `${barWidth}px` }}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${
                              isSelected
                                ? "bg-un-blue"
                                : isUrgent
                                  ? "bg-red-500"
                                  : isUpcoming
                                    ? "bg-amber-500"
                                    : "bg-un-blue/40"
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
      </div>
    </div>
  );
}
