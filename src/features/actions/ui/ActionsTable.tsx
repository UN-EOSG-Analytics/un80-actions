"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ActionsTableData } from "@/types";
import type { RiskAssessment } from "@/types";
import { updateRiskAssessment } from "@/features/actions/commands";

type SortField = "work_package_id" | "action_id" | "work_package_title" | "indicative_action" | "tracking_status" | "public_action_status" | "risk_assessment";
type SortDirection = "asc" | "desc";

const RISK_OPTIONS: {
  value: RiskAssessment;
  label: string;
  indicatorClass: string;
}[] = [
  { value: "low_risk", label: "Low risk", indicatorClass: "bg-green-500" },
  { value: "medium_risk", label: "Medium risk", indicatorClass: "bg-amber-400" },
  { value: "at_risk", label: "High risk", indicatorClass: "bg-red-500" },
];

function actionLabel(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

// Multiselect filter component
function MultiSelectFilter<T extends string | number | boolean>({
  filterKey,
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
  const hasFilter = selected.length > 0;
  
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
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
      <PopoverContent className={`${maxWidth} p-2`} align="start" onClick={(e) => e.stopPropagation()}>
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-1">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={String(option)}
                  type="button"
                  onClick={() => onToggle(option)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 text-left"
                >
                  <div className={`h-4 w-4 border rounded flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-un-blue border-un-blue" : "border-gray-300"
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="flex-1 break-words">{renderOption(option)}</span>
                </button>
              );
            })}
          </div>
        </div>
        {hasFilter && (
          <div className="mt-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => {
                options.forEach(opt => {
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

interface ActionsTableProps {
  data: ActionsTableData;
}

export function ActionsTable({ data }: ActionsTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<SortField>("action_id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Column filters (multiselect - arrays)
  const [filterWP, setFilterWP] = useState<number[]>([]);
  const [filterWPTitle, setFilterWPTitle] = useState<string[]>([]);
  const [filterAction, setFilterAction] = useState<string[]>([]);
  const [filterIndicativeAction, setFilterIndicativeAction] = useState<string[]>([]);
  const [filterTrackingStatus, setFilterTrackingStatus] = useState<string[]>([]);
  const [filterPublicStatus, setFilterPublicStatus] = useState<string[]>([]);
  const [filterBigTicket, setFilterBigTicket] = useState<boolean[]>([]);
  
  // Track which filter popovers are open
  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({});

  const search = searchInput.trim().toLowerCase();
  const hasSearch = search.length > 0;

  // Flatten all actions from work packages
  const allActions = useMemo(() => {
    return data.workPackages.flatMap((wp) =>
      wp.actions.map((a) => ({
        ...a,
        work_package_id: wp.id,
        work_package_title: wp.work_package_title,
      })),
    );
  }, [data.workPackages]);

  // Extract unique WP IDs
  const uniqueWPIds = useMemo(() => {
    const ids = new Set<number>();
    allActions.forEach((a) => {
      ids.add(a.work_package_id);
    });
    return Array.from(ids).sort((a, b) => a - b);
  }, [allActions]);

  // Extract unique values for each column filter
  const uniqueWPTitles = useMemo(() => {
    const titles = new Set<string>();
    allActions.forEach((a) => {
      if (a.work_package_title) titles.add(a.work_package_title);
    });
    return Array.from(titles).sort();
  }, [allActions]);

  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    allActions.forEach((a) => {
      const label = actionLabel(a.action_id, a.action_sub_id);
      actions.add(label);
    });
    return Array.from(actions).sort((a, b) => {
      // Sort numerically if possible
      const numA = parseInt(a.replace(/[^0-9]/g, ""), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [allActions]);

  const uniqueIndicativeActions = useMemo(() => {
    const actions = new Set<string>();
    allActions.forEach((a) => {
      if (a.indicative_action) actions.add(a.indicative_action);
    });
    return Array.from(actions).sort();
  }, [allActions]);

  const uniqueTrackingStatuses = useMemo(() => {
    const statuses = new Set<string>();
    allActions.forEach((a) => {
      if (a.tracking_status) statuses.add(a.tracking_status);
    });
    return Array.from(statuses).sort();
  }, [allActions]);

  const uniquePublicStatuses = useMemo(() => {
    const statuses = new Set<string>();
    allActions.forEach((a) => {
      if (a.public_action_status) statuses.add(a.public_action_status);
    });
    return Array.from(statuses).sort();
  }, [allActions]);

  const filteredActions = useMemo(() => {
    let list = allActions;
    if (hasSearch) {
      const matches = (s: string) => s.toLowerCase().includes(search);
      list = list.filter(
        (a) =>
          matches(a.work_package_title) ||
          matches(String(a.work_package_id)) ||
          matches(String(a.action_id)) ||
          matches(a.indicative_action),
      );
    }
    if (filterWP.length > 0) {
      list = list.filter((a) => filterWP.includes(a.work_package_id));
    }
    if (filterWPTitle.length > 0) {
      list = list.filter((a) => filterWPTitle.includes(a.work_package_title));
    }
    if (filterAction.length > 0) {
      list = list.filter((a) => filterAction.includes(actionLabel(a.action_id, a.action_sub_id)));
    }
    if (filterIndicativeAction.length > 0) {
      list = list.filter((a) => filterIndicativeAction.includes(a.indicative_action));
    }
    if (filterTrackingStatus.length > 0) {
      list = list.filter((a) => a.tracking_status && filterTrackingStatus.includes(a.tracking_status));
    }
    if (filterPublicStatus.length > 0) {
      list = list.filter((a) => a.public_action_status && filterPublicStatus.includes(a.public_action_status));
    }
    if (filterBigTicket.length > 0) {
      const hasBigTicket = filterBigTicket.includes(true);
      const hasNotBigTicket = filterBigTicket.includes(false);
      if (hasBigTicket && !hasNotBigTicket) {
        list = list.filter((a) => a.is_big_ticket);
      } else if (hasNotBigTicket && !hasBigTicket) {
        list = list.filter((a) => !a.is_big_ticket);
      }
      // If both are selected, show all (no filter)
    }
    return list;
  }, [
    allActions,
    hasSearch,
    search,
    filterWP,
    filterWPTitle,
    filterAction,
    filterIndicativeAction,
    filterTrackingStatus,
    filterPublicStatus,
    filterBigTicket,
  ]);

  const sortedActions = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filteredActions].sort((a, b) => {
      let cmp = 0;
      if (sortField === "work_package_id") {
        cmp = a.work_package_id - b.work_package_id;
      } else if (sortField === "action_id") {
        cmp = a.action_id - b.action_id || (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? "");
      } else if (sortField === "work_package_title") {
        cmp = a.work_package_title.localeCompare(b.work_package_title);
      } else if (sortField === "indicative_action") {
        cmp = a.indicative_action.localeCompare(b.indicative_action);
      } else if (sortField === "tracking_status") {
        const av = a.tracking_status ?? "";
        const bv = b.tracking_status ?? "";
        cmp = av.localeCompare(bv);
      } else if (sortField === "public_action_status") {
        const av = a.public_action_status ?? "";
        const bv = b.public_action_status ?? "";
        cmp = av.localeCompare(bv);
      } else if (sortField === "risk_assessment") {
        const order: Record<string, number> = { low_risk: 0, medium_risk: 1, at_risk: 2 };
        const av = a.risk_assessment ?? "";
        const bv = b.risk_assessment ?? "";
        cmp = (order[av] ?? -1) - (order[bv] ?? -1);
      }
      return cmp * dir;
    });
  }, [filteredActions, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortField }) => {
    if (sortField !== column) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-un-blue" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-un-blue" />
    );
  };

  const handleActionClick = (actionId: number, actionSubId: string | null) => {
    sessionStorage.setItem("actionModalReturnUrl", window.location.href);
    const actionParam = actionSubId ? `${actionId}${actionSubId}` : `${actionId}`;
    router.push(`/?action=${actionParam}`, { scroll: false });
  };

  const handleRiskChange = async (
    actionId: number,
    actionSubId: string | null,
    value: RiskAssessment | null,
  ) => {
    const result = await updateRiskAssessment(actionId, actionSubId, value);
    if (result.success) {
      router.refresh();
    }
  };

  // Check if any filters are active
  const hasActiveFilters = 
    filterWP.length > 0 ||
    filterWPTitle.length > 0 ||
    filterAction.length > 0 ||
    filterIndicativeAction.length > 0 ||
    filterTrackingStatus.length > 0 ||
    filterPublicStatus.length > 0 ||
    filterBigTicket.length > 0;

  const clearAllFilters = () => {
    setFilterWP([]);
    setFilterWPTitle([]);
    setFilterAction([]);
    setFilterIndicativeAction([]);
    setFilterTrackingStatus([]);
    setFilterPublicStatus([]);
    setFilterBigTicket([]);
    setFilterWorkPackageId("");
    setFilterRisk("");
  };

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions..."
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
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto text-sm text-un-blue hover:underline flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Clear all filters
          </button>
        )}
        <p className={`text-sm text-gray-500 ${hasActiveFilters ? "" : "ml-auto"}`}>
          {sortedActions.length} action
          {sortedActions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Simple Table */}
      <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("work_package_id")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    WP
                    <SortIcon column="work_package_id" />
                  </button>
                  <MultiSelectFilter
                    filterKey="wp"
                    options={uniqueWPIds}
                    selected={filterWP}
                    onToggle={(id) => {
                      setFilterWP((prev) =>
                        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
                      );
                    }}
                    renderOption={(id) => `WP ${id}`}
                    isOpen={openFilters.wp || false}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, wp: open }))}
                  />
                </div>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("work_package_title")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    WP TITLE
                    <SortIcon column="work_package_title" />
                  </button>
                  <MultiSelectFilter
                    filterKey="wpTitle"
                    options={uniqueWPTitles}
                    selected={filterWPTitle}
                    onToggle={(title) => {
                      setFilterWPTitle((prev) =>
                        prev.includes(title) ? prev.filter((v) => v !== title) : [...prev, title]
                      );
                    }}
                    renderOption={(title) => title.length > 40 ? title.slice(0, 40) + "…" : title}
                    isOpen={openFilters.wpTitle || false}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, wpTitle: open }))}
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
                    <SortIcon column="action_id" />
                  </button>
                  <MultiSelectFilter
                    filterKey="action"
                    options={uniqueActions}
                    selected={filterAction}
                    onToggle={(action) => {
                      setFilterAction((prev) =>
                        prev.includes(action) ? prev.filter((v) => v !== action) : [...prev, action]
                      );
                    }}
                    renderOption={(action) => `Action ${action}`}
                    isOpen={openFilters.action || false}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, action: open }))}
                  />
                </div>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("indicative_action")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    INDICATIVE ACTION
                    <SortIcon column="indicative_action" />
                  </button>
                  <MultiSelectFilter
                    filterKey="indicativeAction"
                    options={uniqueIndicativeActions}
                    selected={filterIndicativeAction}
                    onToggle={(action) => {
                      setFilterIndicativeAction((prev) =>
                        prev.includes(action) ? prev.filter((v) => v !== action) : [...prev, action]
                      );
                    }}
                    renderOption={(action) => action.length > 60 ? action.slice(0, 60) + "…" : action}
                    isOpen={openFilters.indicativeAction || false}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, indicativeAction: open }))}
                    maxWidth="w-96"
                  />
                </div>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("tracking_status")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    TRACKING
                    <SortIcon column="tracking_status" />
                  </button>
                  <MultiSelectFilter
                    filterKey="trackingStatus"
                    options={uniqueTrackingStatuses}
                    selected={filterTrackingStatus}
                    onToggle={(status) => {
                      setFilterTrackingStatus((prev) =>
                        prev.includes(status) ? prev.filter((v) => v !== status) : [...prev, status]
                      );
                    }}
                    renderOption={(status) => status}
                    isOpen={openFilters.trackingStatus || false}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, trackingStatus: open }))}
                  />
                </div>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("public_action_status")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    PUBLIC STATUS
                    <SortIcon column="public_action_status" />
                  </button>
                  <MultiSelectFilter
                    filterKey="publicStatus"
                    options={uniquePublicStatuses}
                    selected={filterPublicStatus}
                    onToggle={(status) => {
                      setFilterPublicStatus((prev) =>
                        prev.includes(status) ? prev.filter((v) => v !== status) : [...prev, status]
                      );
                    }}
                    renderOption={(status) => status}
                    isOpen={openFilters.publicStatus || false}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, publicStatus: open }))}
                  />
                </div>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("risk_assessment")}
                  className="inline-flex items-center hover:text-un-blue"
                >
                  RISK
                  <SortIcon column="risk_assessment" />
                </button>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span>BIG TICKET</span>
                  <MultiSelectFilter
                    filterKey="bigTicket"
                    options={[true, false]}
                    selected={filterBigTicket}
                    onToggle={(value) => {
                      setFilterBigTicket((prev) =>
                        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
                      );
                    }}
                    renderOption={(value) => value ? "Big Ticket" : "Not Big Ticket"}
                    isOpen={openFilters.bigTicket || false}
                    onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, bigTicket: open }))}
                  />
                </div>
              </th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedActions.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  No actions found
                </td>
              </tr>
            ) : (
              sortedActions.map((a) => (
                <tr
                  key={`${a.action_id}-${a.action_sub_id ?? ""}`}
                  onClick={() => handleActionClick(a.action_id, a.action_sub_id)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {a.work_package_id}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="line-clamp-2">{a.work_package_title}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-un-blue whitespace-nowrap">
                    {actionLabel(a.action_id, a.action_sub_id)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="line-clamp-2">{a.indicative_action}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <span className="text-xs">{a.tracking_status ?? "–"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <span className="text-xs">{a.public_action_status ?? "–"}</span>
                  </td>
                  <td
                    className="px-4 py-3 text-gray-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Select
                      value={a.risk_assessment ?? ""}
                      onValueChange={(value) =>
                        handleRiskChange(
                          a.action_id,
                          a.action_sub_id,
                          (value as RiskAssessment) || null,
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-full min-w-28 border-gray-200 bg-white text-gray-700">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-gray-700"
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${opt.indicatorClass}`}
                                aria-hidden
                              />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.is_big_ticket && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-un-blue text-white text-xs font-bold">!</span>
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
