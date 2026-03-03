"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Check,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatUNDate } from "@/lib/format-date";
import { Badge } from "@/components/ui/badge";
import type { PublicMilestoneViewRow } from "@/features/milestones/queries";

type SortField =
  | "work_package_id"
  | "action_id"
  | "milestone_deadline"
  | "public_progress";
type SortDirection = "asc" | "desc";

function actionLabel(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

function actionParam(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

const PUBLIC_PROGRESS_LABELS: Record<string, string> = {
  in_progress: "In progress",
  delayed: "Delayed",
  completed: "Complete",
};

const PUBLIC_PROGRESS_STYLES: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  delayed: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-green-100 text-green-800 border-green-200",
};

function PublicProgressBadge({
  value,
}: {
  value: PublicMilestoneViewRow["public_progress"];
}) {
  // Default for all public milestones is "In progress"
  const displayValue = value ?? "in_progress";
  const label = PUBLIC_PROGRESS_LABELS[displayValue] ?? displayValue;
  const style =
    PUBLIC_PROGRESS_STYLES[displayValue] ??
    "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <Badge variant="outline" className={`text-xs font-medium ${style}`}>
      {label}
    </Badge>
  );
}

function SortIcon({
  column,
  sortField,
  sortDirection,
}: {
  column: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== column)
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-gray-400" />;
  return sortDirection === "asc" ? (
    <ArrowUp className="ml-1 h-3.5 w-3.5 text-un-blue" />
  ) : (
    <ArrowDown className="ml-1 h-3.5 w-3.5 text-un-blue" />
  );
}

function MultiSelectFilter<T extends string | number>({
  options,
  selected,
  onToggle,
  renderOption,
  isOpen,
  onOpenChange,
  maxWidth = "w-64",
}: {
  options: T[];
  selected: T[];
  onToggle: (value: T) => void;
  renderOption: (value: T) => string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  maxWidth?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const hasFilter = selected.length > 0;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((o) => renderOption(o).toLowerCase().includes(q));
  }, [options, searchQuery, renderOption]);

  const handleOpenChange = (open: boolean) => {
    if (!open) setSearchQuery("");
    onOpenChange(open);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(!isOpen);
          }}
          className={`flex h-6 w-6 items-center justify-center rounded border-0 bg-transparent p-0 transition-colors hover:bg-gray-100 ${
            hasFilter ? "text-un-blue" : "text-gray-400"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={`${maxWidth} p-2`}
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded border border-gray-200 px-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-2 text-center text-sm text-gray-400">
              No results found
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={String(option)}
                  type="button"
                  onClick={() => onToggle(option)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? "border-un-blue bg-un-blue"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="flex-1 truncate">
                    {renderOption(option)}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {hasFilter && (
          <div className="mt-2 border-t pt-2">
            <button
              type="button"
              onClick={() =>
                options.forEach(
                  (opt) => selected.includes(opt) && onToggle(opt),
                )
              }
              className="w-full text-xs text-un-blue hover:underline"
            >
              Clear ({selected.length})
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

const PUBLIC_PROGRESS_OPTIONS = [
  "in_progress",
  "delayed",
  "completed",
] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Parse YYYY-MM-DD to YYYY-MM; returns "no_date" if missing/invalid. */
function getDeadlineMonthKey(deadline: string | null): string {
  if (!deadline?.trim()) return "no_date";
  const match = deadline.trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return "no_date";
  return `${match[1]}-${match[2]}`;
}

/** Format "2026-02" as "February 2026". */
function formatMonthLabel(key: string): string {
  if (key === "no_date") return "No date";
  const [y, m] = key.split("-");
  const monthNum = parseInt(m, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return key;
  return `${MONTH_NAMES[monthNum - 1]} ${y}`;
}

interface PublicMilestonesTableProps {
  rows: PublicMilestoneViewRow[];
}

export function PublicMilestonesTable({ rows }: PublicMilestonesTableProps) {
  const [sortField, setSortField] = useState<SortField>("work_package_id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterWP, setFilterWP] = useState<number[]>([]);
  const [filterAction, setFilterAction] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState<string[]>([]);
  const [filterPublicProgress, setFilterPublicProgress] = useState<string[]>(
    [],
  );
  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({});

  type FilterSkip = "wp" | "action" | "month" | "publicProgress";

  // Apply all filters except one — used for cascading (Excel-style) filter options
  const applyFiltersExcept = useCallback(
    (list: PublicMilestoneViewRow[], except: FilterSkip) => {
      let result = list;
      if (except !== "wp" && filterWP.length > 0) {
        result = result.filter((r) => filterWP.includes(r.work_package_id));
      }
      if (except !== "action" && filterAction.length > 0) {
        result = result.filter((r) =>
          filterAction.includes(actionLabel(r.action_id, r.action_sub_id)),
        );
      }
      if (except !== "month" && filterMonth.length > 0) {
        result = result.filter((r) =>
          filterMonth.includes(getDeadlineMonthKey(r.milestone_deadline)),
        );
      }
      if (except !== "publicProgress" && filterPublicProgress.length > 0) {
        result = result.filter((r) => {
          const v = r.public_progress ?? "in_progress";
          return filterPublicProgress.includes(v);
        });
      }
      return result;
    },
    [filterWP, filterAction, filterMonth, filterPublicProgress],
  );

  const uniqueWPIds = useMemo(() => {
    const list = applyFiltersExcept(rows, "wp");
    const ids = new Set(list.map((r) => r.work_package_id));
    return Array.from(ids).sort((a, b) => a - b);
  }, [rows, applyFiltersExcept]);

  const uniqueActions = useMemo(() => {
    const list = applyFiltersExcept(rows, "action");
    const set = new Set(
      list.map((r) => actionLabel(r.action_id, r.action_sub_id)),
    );
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [rows, applyFiltersExcept]);

  const uniqueMonthKeys = useMemo(() => {
    const list = applyFiltersExcept(rows, "month");
    const set = new Set(
      list.map((r) => getDeadlineMonthKey(r.milestone_deadline)),
    );
    const sorted = Array.from(set)
      .filter((k) => k !== "no_date")
      .sort();
    if (set.has("no_date")) sorted.push("no_date");
    return sorted;
  }, [rows, applyFiltersExcept]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterWP.length > 0) {
      list = list.filter((r) => filterWP.includes(r.work_package_id));
    }
    if (filterAction.length > 0) {
      list = list.filter((r) =>
        filterAction.includes(actionLabel(r.action_id, r.action_sub_id)),
      );
    }
    if (filterMonth.length > 0) {
      list = list.filter((r) =>
        filterMonth.includes(getDeadlineMonthKey(r.milestone_deadline)),
      );
    }
    if (filterPublicProgress.length > 0) {
      list = list.filter((r) => {
        const v = r.public_progress ?? "in_progress";
        return filterPublicProgress.includes(v);
      });
    }
    return list;
  }, [rows, filterWP, filterAction, filterMonth, filterPublicProgress]);

  const sortedRows = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      let cmp = 0;
      if (sortField === "work_package_id") {
        cmp = a.work_package_id - b.work_package_id;
      } else if (sortField === "action_id") {
        cmp =
          a.action_id - b.action_id ||
          (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? "");
      } else if (sortField === "milestone_deadline") {
        const da = a.milestone_deadline ?? "";
        const db = b.milestone_deadline ?? "";
        cmp = da.localeCompare(db);
      } else if (sortField === "public_progress") {
        const order = { completed: 0, in_progress: 1, delayed: 2 };
        const va =
          a.public_progress == null ? 1 : (order[a.public_progress] ?? 1);
        const vb =
          b.public_progress == null ? 1 : (order[b.public_progress] ?? 1);
        cmp = va - vb;
      }
      return cmp * dir;
    });
  }, [filteredRows, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const hasActiveFilters =
    filterWP.length > 0 ||
    filterAction.length > 0 ||
    filterMonth.length > 0 ||
    filterPublicProgress.length > 0;

  const clearAllFilters = () => {
    setFilterWP([]);
    setFilterAction([]);
    setFilterMonth([]);
    setFilterPublicProgress([]);
  };

  return (
    <div className="space-y-4">
      {hasActiveFilters && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-sm text-un-blue hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            Clear all filters
          </button>
        </div>
      )}
      <div className="overflow-hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              <th className="w-14 px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("work_package_id")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    WP
                    <SortIcon
                      column="work_package_id"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                  <MultiSelectFilter
                    options={uniqueWPIds}
                    selected={filterWP}
                    onToggle={(id) =>
                      setFilterWP((prev) =>
                        prev.includes(id)
                          ? prev.filter((v) => v !== id)
                          : [...prev, id],
                      )
                    }
                    renderOption={(id) => `WP ${id}`}
                    isOpen={openFilters.wp ?? false}
                    onOpenChange={(open) =>
                      setOpenFilters((prev) => ({ ...prev, wp: open }))
                    }
                  />
                </div>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("action_id")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    ACTION
                    <SortIcon
                      column="action_id"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                  <MultiSelectFilter
                    options={uniqueActions}
                    selected={filterAction}
                    onToggle={(action) =>
                      setFilterAction((prev) =>
                        prev.includes(action)
                          ? prev.filter((v) => v !== action)
                          : [...prev, action],
                      )
                    }
                    renderOption={(a) => `Action ${a}`}
                    isOpen={openFilters.action ?? false}
                    onOpenChange={(open) =>
                      setOpenFilters((prev) => ({ ...prev, action: open }))
                    }
                  />
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("milestone_deadline")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    PUBLIC MILESTONE
                    <SortIcon
                      column="milestone_deadline"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                  <MultiSelectFilter
                    options={uniqueMonthKeys}
                    selected={filterMonth}
                    onToggle={(key) =>
                      setFilterMonth((prev) =>
                        prev.includes(key)
                          ? prev.filter((v) => v !== key)
                          : [...prev, key],
                      )
                    }
                    renderOption={(key) => formatMonthLabel(key)}
                    isOpen={openFilters.milestone ?? false}
                    onOpenChange={(open) =>
                      setOpenFilters((prev) => ({ ...prev, milestone: open }))
                    }
                    maxWidth="w-44"
                  />
                </div>
              </th>
              <th className="w-32 px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("public_progress")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    PUBLIC PROGRESS
                    <SortIcon
                      column="public_progress"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                  <MultiSelectFilter
                    options={[...PUBLIC_PROGRESS_OPTIONS]}
                    selected={filterPublicProgress}
                    onToggle={(value) =>
                      setFilterPublicProgress((prev) =>
                        prev.includes(value)
                          ? prev.filter((v) => v !== value)
                          : [...prev, value],
                      )
                    }
                    renderOption={(v) => PUBLIC_PROGRESS_LABELS[v] ?? v}
                    isOpen={openFilters.publicProgress ?? false}
                    onOpenChange={(open) =>
                      setOpenFilters((prev) => ({
                        ...prev,
                        publicProgress: open,
                      }))
                    }
                    maxWidth="w-40"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  {hasActiveFilters
                    ? "No public milestones match the filters"
                    : "No public milestones found"}
                </td>
              </tr>
            ) : (
              sortedRows.map((r, idx) => (
                <tr
                  key={`${r.work_package_id}-${r.action_id}-${r.action_sub_id ?? ""}-${idx}`}
                  className="transition-colors hover:bg-sky-50/50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center rounded bg-gray-100 px-1.5 py-0.5 text-sm font-medium text-gray-700 tabular-nums">
                      {r.work_package_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/?action=${actionParam(r.action_id, r.action_sub_id)}`}
                      className="inline-flex items-center justify-center rounded bg-un-blue/10 px-1.5 py-0.5 text-sm font-semibold text-un-blue tabular-nums hover:bg-un-blue/20"
                    >
                      {actionLabel(r.action_id, r.action_sub_id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {r.milestone_description?.trim() ? (
                        <p className="text-sm text-gray-700">
                          {r.milestone_description}
                        </p>
                      ) : null}
                      {r.milestone_deadline?.trim() ? (
                        <p className="text-xs text-gray-500">
                          {formatUNDate(r.milestone_deadline)}
                        </p>
                      ) : r.milestone_description?.trim() ? null : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PublicProgressBadge value={r.public_progress} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
