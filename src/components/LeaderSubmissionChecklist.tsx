"use client";

import React, { useMemo } from "react";
import { Search, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Actions } from "@/types";
import { getLeaderSubmissionStatuses } from "@/lib/progress";

interface LeaderSubmissionChecklistProps {
  actions: Actions;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLeaders: string[];
  onSelectLeaders: (leaders: string[]) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  initialDisplayCount?: number;
}

export function LeaderSubmissionChecklist({
  actions,
  searchQuery,
  onSearchChange,
  selectedLeaders,
  onSelectLeaders,
  showAll,
  onToggleShowAll,
  initialDisplayCount = 10,
}: LeaderSubmissionChecklistProps) {
  const allStatuses = useMemo(
    () => getLeaderSubmissionStatuses(actions),
    [actions],
  );

  // Filter by search query
  const filteredStatuses = useMemo(() => {
    if (!searchQuery.trim()) {
      return allStatuses;
    }
    const query = searchQuery.toLowerCase();
    return allStatuses.filter((status) =>
      status.leader.toLowerCase().includes(query),
    );
  }, [allStatuses, searchQuery]);

  const displayedData = showAll
    ? filteredStatuses
    : filteredStatuses.slice(0, initialDisplayCount);

  // Calculate label width to match SidebarChart positioning
  // SidebarChart uses: maxLabelLength * 7 (7px per character) + ml-0.5 + gap-1
  const maxLabelLength = Math.max(...allStatuses.map((s) => s.leader.length));
  const labelWidth = maxLabelLength * 7; // Same calculation as SidebarChart

  const handleClickRow = (leader: string) => {
    const newSelected = selectedLeaders.includes(leader)
      ? selectedLeaders.filter((l) => l !== leader)
      : [...selectedLeaders, leader];
    onSelectLeaders(newSelected);
  };

  return (
    <div className="rounded-xl bg-white pb-4 sm:pb-5">
      <h3 className="mb-2 flex h-[25px] items-center gap-2 text-[17px] font-semibold text-slate-900">
        <span className="flex h-5 w-5 items-center justify-center text-un-blue">
          <Check className="h-5 w-5" />
        </span>
        Leader Submission Status
      </h3>
      <p className="mb-1.5 text-[15px] text-slate-600">
        Focal Points submitted per UN System Lead
      </p>

      {/* Search Bar */}
      <div className="relative mb-1 w-full">
        <Search className="pointer-events-none absolute top-1/2 left-0 z-10 h-4 w-4 -translate-y-1/2 transform text-un-blue" />
        <Input
          type="text"
          placeholder="Search leaders"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full rounded-none border-0 border-b border-slate-300 bg-white py-[8px] pr-4 pl-6 text-[15px] text-slate-700 shadow-none transition-all placeholder:text-slate-400 hover:border-b-un-blue/60 focus:border-b-un-blue focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none"
        />
      </div>

      {/* Table Header */}
      <div className="mb-1 mt-3 flex items-center justify-between px-1 text-xs font-semibold text-slate-600">
        <div
          style={{ width: `${labelWidth}px`, flexShrink: 0 }}
          className="ml-0.5"
        ></div>
      </div>

      {/* Checklist Data */}
      <div className="overflow-hidden">
        <table className="w-full">
          <tbody>
            {displayedData.map((status, index) => {
              const isSelected = selectedLeaders.includes(status.leader);
              const isFiltered =
                selectedLeaders.length > 0 &&
                !selectedLeaders.includes(status.leader);

              return (
                <tr
                  key={status.leader}
                  onClick={() => handleClickRow(status.leader)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-un-blue/5 hover:bg-un-blue/10"
                      : isFiltered
                        ? "opacity-30 hover:bg-slate-50"
                        : "hover:bg-slate-50"
                  } ${index < displayedData.length - 1 ? "border-b border-slate-200" : ""}`}
                >
                  <td className="py-2 pr-0">
                    <div className="flex items-center justify-between gap-1">
                      <div
                        style={{ width: `${labelWidth}px`, flexShrink: 0 }}
                        className="ml-0.5"
                      >
                        <span
                          className={`block text-[14px] font-medium whitespace-nowrap transition-colors ${
                            isSelected
                              ? "text-un-blue font-semibold"
                              : "text-slate-600 group-hover:text-un-blue"
                          }`}
                        >
                          {status.leader}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="w-7 flex justify-center">
                          {status.hasFocalPoints ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
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
        {filteredStatuses.length > initialDisplayCount && (
          <button
            onClick={onToggleShowAll}
            className="w-full py-2 text-left text-[14px] text-un-blue transition-colors hover:text-un-blue/80"
          >
            {showAll
              ? "Show less"
              : `Show ${filteredStatuses.length - initialDisplayCount} more`}
          </button>
        )}
      </div>
    </div>
  );
}

