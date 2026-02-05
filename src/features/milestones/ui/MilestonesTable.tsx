"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter, Check, Send, Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatUNDate } from "@/lib/format-date";
import { Badge } from "@/components/ui/badge";
import type { MilestoneViewRow, MilestoneViewCell } from "@/features/milestones/queries";

type SortField = "work_package_id" | "action_id" | "work_package_title";
type SortDirection = "asc" | "desc";

const STATUS_FILTER_OPTIONS = ["Draft", "Needs attention", "Needs OLA review", "Approved"] as const;

function actionLabel(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

/** Get all status labels present in a row (for filtering). */
function getRowStatusLabels(row: MilestoneViewRow): string[] {
  const labels: string[] = [];
  for (const cell of [row.public_milestone, row.first_milestone, row.final_milestone]) {
    const label = cell ? getCellStatusLabel(cell) : null;
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

// Multiselect filter component
function MultiSelectFilter<T extends string | number>({
  options,
  selected,
  onToggle,
  renderOption,
  isOpen,
  onOpenChange,
  maxWidth = "w-64",
}: {
  filterKey: string;
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
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      renderOption(option).toLowerCase().includes(query),
    );
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
          className={`h-6 w-6 p-0 border-0 bg-transparent hover:bg-gray-100 rounded flex items-center justify-center transition-colors ${
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
            className="w-full h-8 px-2 text-sm border border-gray-200 rounded outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-sm text-gray-400 text-center">
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
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 text-left"
                  >
                    <div
                      className={`h-4 w-4 border rounded flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-un-blue border-un-blue" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="flex-1 wrap-break-word">
                      {renderOption(option)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        {hasFilter && (
          <div className="mt-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => {
                options.forEach((opt) => {
                  if (selected.includes(opt)) onToggle(opt);
                });
              }}
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

/** Priority for a single cell: Needs OLA review > Needs attention > Draft > Approved */
function getCellStatusLabel(cell: MilestoneViewCell | null): string | null {
  if (!cell) return null;
  if (cell.needs_ola_review) return "Needs OLA review";
  if (cell.needs_attention) return "Needs attention";
  if (cell.is_draft) return "Draft";
  return "Approved";
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

const STATUS_STYLES: Record<string, { badge: string }> = {
  "Needs OLA review": { badge: "bg-amber-100 text-amber-800 border-amber-200" },
  "Needs attention": { badge: "bg-orange-100 text-orange-800 border-orange-200" },
  "Draft": { badge: "bg-slate-100 text-slate-700 border-slate-200" },
  "Approved": { badge: "bg-green-100 text-green-800 border-green-200" },
};

function MilestoneCell({ cell }: { cell: MilestoneViewCell | null }) {
  if (!cell) {
    return <span className="text-gray-400">—</span>;
  }
  const hasDesc = cell.description?.trim();
  const hasDeadline = cell.deadline?.trim();
  const statusLabel = getCellStatusLabel(cell);
  const hasContent = hasDesc || hasDeadline || statusLabel;
  if (!hasContent) {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <div className="space-y-1">
      {hasDesc && (
        <p className="text-gray-700 text-sm line-clamp-2">{cell.description}</p>
      )}
      {hasDeadline && cell.deadline && (
        <p className="text-xs text-gray-500">{formatUNDate(cell.deadline)}</p>
      )}
      {statusLabel && (
        <Badge
          variant="outline"
          className={`text-xs font-medium ${STATUS_STYLES[statusLabel]?.badge ?? "bg-gray-100 text-gray-700"}`}
        >
          {statusLabel}
        </Badge>
      )}
    </div>
  );
}

interface MilestonesTableProps {
  rows: MilestoneViewRow[];
}

export function MilestonesTable({ rows }: MilestonesTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<SortField>("action_id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterWP, setFilterWP] = useState<number[]>([]);
  const [filterAction, setFilterAction] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({});

  const search = searchInput.trim().toLowerCase();
  const hasSearch = search.length > 0;

  const uniqueWPIds = useMemo(() => {
    const ids = new Set(rows.map((r) => r.work_package_id));
    return Array.from(ids).sort((a, b) => a - b);
  }, [rows]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(rows.map((r) => actionLabel(r.action_id, r.action_sub_id)));
    return Array.from(actions).sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ""), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (hasSearch) {
      const matches = (s: string) => s.toLowerCase().includes(search);
      list = list.filter(
        (r) =>
          matches(String(r.work_package_id)) ||
          matches(r.work_package_title) ||
          matches(actionLabel(r.action_id, r.action_sub_id)) ||
          matches(r.public_milestone?.description ?? "") ||
          matches(r.first_milestone?.description ?? "") ||
          matches(r.final_milestone?.description ?? ""),
      );
    }
    if (filterWP.length > 0) {
      list = list.filter((r) => filterWP.includes(r.work_package_id));
    }
    if (filterAction.length > 0) {
      list = list.filter((r) =>
        filterAction.includes(actionLabel(r.action_id, r.action_sub_id)),
      );
    }
    if (filterStatus.length > 0) {
      list = list.filter((r) => {
        const rowLabels = getRowStatusLabels(r);
        return filterStatus.some((s) => rowLabels.includes(s));
      });
    }
    return list;
  }, [rows, hasSearch, search, filterWP, filterAction, filterStatus]);

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
      } else if (sortField === "work_package_title") {
        cmp = a.work_package_title.localeCompare(b.work_package_title);
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
    filterWP.length > 0 || filterAction.length > 0 || filterStatus.length > 0;

  const clearAllFilters = () => {
    setFilterWP([]);
    setFilterAction([]);
    setFilterStatus([]);
  };

  const handleRowClick = (actionId: number, actionSubId: string | null) => {
    sessionStorage.setItem("actionModalReturnUrl", "/milestones");
    const actionParam = actionSubId ? `${actionId}${actionSubId}` : `${actionId}`;
    router.push(`/milestones?action=${actionParam}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search milestones..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-80 rounded-md border border-input bg-background px-3 pl-9 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <MultiSelectFilter
            filterKey="status"
            options={[...STATUS_FILTER_OPTIONS]}
            selected={filterStatus}
            onToggle={(status) =>
              setFilterStatus((prev) =>
                prev.includes(status)
                  ? prev.filter((v) => v !== status)
                  : [...prev, status],
              )
            }
            renderOption={(s) => s}
            isOpen={openFilters.status ?? false}
            onOpenChange={(open) =>
              setOpenFilters((prev) => ({ ...prev, status: open }))
            }
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto flex items-center gap-1 text-sm text-un-blue hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            Clear all filters
          </button>
        )}
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              <th className="px-2 py-3 whitespace-nowrap w-14">
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
                    filterKey="wp"
                    options={uniqueWPIds}
                    selected={filterWP}
                    onToggle={(id) =>
                      setFilterWP((prev) =>
                        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
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
                    Action Number
                    <SortIcon
                      column="action_id"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                  <MultiSelectFilter
                    filterKey="action"
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
              <th className="px-4 py-3">Public milestone</th>
              <th className="px-4 py-3">First milestone</th>
              <th className="px-4 py-3">Final milestone</th>
              <th className="px-4 py-3 whitespace-nowrap">Deliverables</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  No actions found
                </td>
              </tr>
            ) : (
              sortedRows.map((r) => (
              <tr
                key={`${r.action_id}-${r.action_sub_id ?? ""}`}
                onClick={() => handleRowClick(r.action_id, r.action_sub_id)}
                className="cursor-pointer transition-colors hover:bg-gray-50"
              >
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium text-sm tabular-nums">
                    {r.work_package_id}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-un-blue/10 text-un-blue font-semibold text-sm tabular-nums">
                    {actionLabel(r.action_id, r.action_sub_id)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <MilestoneCell cell={r.public_milestone} />
                </td>
                <td className="px-4 py-3">
                  <MilestoneCell cell={r.first_milestone} />
                </td>
                <td className="px-4 py-3">
                  <MilestoneCell cell={r.final_milestone} />
                </td>
                <td className="px-4 py-3">
                  {r.document_submitted ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1.5 w-fit">
                      <Send className="h-3 w-3" />
                      Submitted
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1.5 w-fit">
                      <Clock className="h-3 w-3" />
                      Not submitted
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  <ChevronRight className="h-4 w-4" />
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
