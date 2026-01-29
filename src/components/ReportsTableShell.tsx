"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortColumn = "work_package" | "action_updates" | "notes" | "questions";
type SortDirection = "asc" | "desc";

const GRID_COLS = "grid-cols-[1fr_1fr_1fr_1fr]";

function SortArrow({
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  column: SortColumn;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  onSort: (c: SortColumn) => void;
}) {
  const isActive = sortColumn === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="hover:text-gray-600 transition-colors"
    >
      {isActive ? (
        sortDirection === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5 text-un-blue" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-un-blue" />
        )
      ) : (
        <ChevronDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

export function ReportsTableShell() {
  const [searchInput, setSearchInput] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-96 rounded-md border border-input bg-background px-3 pl-9 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="ml-auto text-sm text-gray-500">0 rows</p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {/* Column headers */}
        <div
          className={`grid ${GRID_COLS} items-center gap-x-4 px-4 py-2 text-[10px] font-medium tracking-wider text-gray-400 uppercase bg-gray-50 border-b`}
        >
          <div className="flex items-center gap-1">
            <span>Work Package</span>
            <SortArrow
              column="work_package"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </div>
          <div className="flex items-center gap-1">
            <span>Action Updates</span>
            <SortArrow
              column="action_updates"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </div>
          <div className="flex items-center gap-1">
            <span>Notes</span>
            <SortArrow
              column="notes"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </div>
          <div className="flex items-center gap-1">
            <span>Questions</span>
            <SortArrow
              column="questions"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </div>
        </div>

        {/* Empty state — no data */}
        <div className="px-4 py-12 text-center">
          <p className="text-gray-400">No data</p>
          <p className="mt-1 text-sm text-gray-400">
            This is a visualization-only shell. No data is loaded.
          </p>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          disabled
          className="pointer-events-none"
        >
          Previous
        </Button>
        <span className="text-sm text-gray-600">0–0 of 0</span>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="pointer-events-none"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
