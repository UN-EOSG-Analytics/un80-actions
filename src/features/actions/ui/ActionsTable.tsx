"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter, Check, Send, Clock } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusStyles, ACTION_STATUS } from "@/constants/actionStatus";
import type { ActionsTableData } from "@/types";
import type { RiskAssessment } from "@/types";
import { updateRiskAssessment, updatePublicActionStatus } from "@/features/actions/commands";

type SortField = "work_package_id" | "action_id" | "work_package_title" | "indicative_action" | "public_action_status" | "risk_assessment" | "deliverables";
type SortDirection = "asc" | "desc";

const RISK_OPTIONS: {
  value: RiskAssessment;
  label: string;
  indicatorClass: string;
}[] = [
  { value: "low_risk", label: "Low", indicatorClass: "bg-green-500" },
  { value: "medium_risk", label: "Medium", indicatorClass: "bg-amber-400" },
  { value: "at_risk", label: "High", indicatorClass: "bg-red-500" },
];

const STATUS_OPTIONS = [
  { value: ACTION_STATUS.DECISION_TAKEN, label: "Decision taken" },
  { value: ACTION_STATUS.FURTHER_WORK_ONGOING, label: "Further work ongoing" },
];

function actionLabel(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

// Multiselect filter component
function MultiSelectFilter<T extends string | number | boolean>({
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
  
  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(option => 
      renderOption(option).toLowerCase().includes(query)
    );
  }, [options, searchQuery, renderOption]);
  
  // Reset search when popover closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery("");
    }
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
      <PopoverContent className={`${maxWidth} p-2`} align="start" onClick={(e) => e.stopPropagation()}>
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
                    <div className={`h-4 w-4 border rounded flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-un-blue border-un-blue" : "border-gray-300"
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="flex-1 wrap-break-word">{renderOption(option)}</span>
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

// Sort icon component (must be outside render to satisfy React 19)
function SortIcon({ 
  column, 
  sortField, 
  sortDirection 
}: { 
  column: SortField; 
  sortField: SortField; 
  sortDirection: SortDirection 
}) {
  if (sortField !== column) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-gray-400" />;
  return sortDirection === "asc" ? (
    <ArrowUp className="ml-1 h-3.5 w-3.5 text-un-blue" />
  ) : (
    <ArrowDown className="ml-1 h-3.5 w-3.5 text-un-blue" />
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
  const [filterPublicStatus, setFilterPublicStatus] = useState<string[]>([]);
  const [filterBigTicket, setFilterBigTicket] = useState<boolean[]>([]);
  const [filterWorkPackageId, setFilterWorkPackageId] = useState<string>("");
  const [filterRisk, setFilterRisk] = useState<string>("");
  const [filterDeliverablesMonth, setFilterDeliverablesMonth] = useState<number[]>([]);
  
  // Track which filter popovers are open
  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({});
  
  // Status change confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    actionId: number | null;
    actionSubId: string | null;
    status: string | null;
  }>({ open: false, actionId: null, actionSubId: null, status: null });

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

  const uniquePublicStatuses = useMemo(() => {
    const statuses = new Set<string>();
    allActions.forEach((a) => {
      if (a.public_action_status) statuses.add(a.public_action_status);
    });
    return Array.from(statuses).sort();
  }, [allActions]);

  const uniqueDeliverablesMonths = useMemo(() => {
    const months = new Set<number>();
    allActions.forEach((a) => {
      // Include all upcoming milestone months
      a.upcoming_milestone_months.forEach((month) => {
        months.add(month);
      });
      // Also include January 2026 (month 1) if not already present
      months.add(1);
    });
    return Array.from(months).sort((a, b) => a - b);
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
    if (filterWorkPackageId) {
      list = list.filter((a) => String(a.work_package_id).includes(filterWorkPackageId));
    }
    if (filterRisk) {
      list = list.filter((a) => a.risk_assessment === filterRisk);
    }
    if (filterDeliverablesMonth.length > 0) {
      list = list.filter((a) => 
        a.upcoming_milestone_months.some((month) => filterDeliverablesMonth.includes(month))
      );
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
    filterPublicStatus,
    filterBigTicket,
    filterWorkPackageId,
    filterRisk,
    filterDeliverablesMonth,
  ]);

  // Calculate deliverables counter
  const deliverablesCounter = useMemo(() => {
    const total = filteredActions.length;
    const submitted = filteredActions.filter((a) => a.deliverables_status === "submitted").length;
    return { submitted, total };
  }, [filteredActions]);

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
      } else if (sortField === "public_action_status") {
        const av = a.public_action_status ?? "";
        const bv = b.public_action_status ?? "";
        cmp = av.localeCompare(bv);
      } else if (sortField === "risk_assessment") {
        const order: Record<string, number> = { low_risk: 0, medium_risk: 1, at_risk: 2 };
        const av = a.risk_assessment ?? "";
        const bv = b.risk_assessment ?? "";
        cmp = (order[av] ?? -1) - (order[bv] ?? -1);
      } else if (sortField === "deliverables") {
        const order: Record<string, number> = { submitted: 0, not_submitted: 1 };
        const av = a.deliverables_status ?? "";
        const bv = b.deliverables_status ?? "";
        cmp = (order[av] ?? 2) - (order[bv] ?? 2);
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

  const handleStatusChange = async (
    actionId: number,
    actionSubId: string | null,
    value: string | null,
  ) => {
    setConfirmDialog({ open: true, actionId, actionSubId, status: value });
  };

  const confirmStatusChange = async () => {
    if (confirmDialog.actionId === null || confirmDialog.status === null) return;

    const { actionId, actionSubId, status } = confirmDialog;
    setConfirmDialog({ open: false, actionId: null, actionSubId: null, status: null });

    const result = await updatePublicActionStatus(actionId, actionSubId, status);
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
    filterPublicStatus.length > 0 ||
    filterBigTicket.length > 0 ||
    filterWorkPackageId.length > 0 ||
    filterRisk.length > 0;

  const clearAllFilters = () => {
    setFilterWP([]);
    setFilterWPTitle([]);
    setFilterAction([]);
    setFilterIndicativeAction([]);
    setFilterPublicStatus([]);
    setFilterBigTicket([]);
    setFilterWorkPackageId("");
    setFilterRisk("");
    setFilterDeliverablesMonth([]);
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
      </div>

      {/* Simple Table */}
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
                    <SortIcon column="work_package_id" sortField={sortField} sortDirection={sortDirection} />
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
                    <SortIcon column="work_package_title" sortField={sortField} sortDirection={sortDirection} />
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
              <th className="px-2 py-3 whitespace-nowrap w-16">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort("action_id")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    ACTION
                    <SortIcon column="action_id" sortField={sortField} sortDirection={sortDirection} />
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
                    <SortIcon column="indicative_action" sortField={sortField} sortDirection={sortDirection} />
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
                    onClick={() => handleSort("public_action_status")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    PUBLIC STATUS
                    <SortIcon column="public_action_status" sortField={sortField} sortDirection={sortDirection} />
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
              <th className="px-4 py-3 whitespace-nowrap align-top">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-normal text-gray-500 tabular-nums">
                    {deliverablesCounter.submitted}/{deliverablesCounter.total} submitted
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSort("deliverables")}
                      className="inline-flex items-center hover:text-un-blue"
                    >
                      DELIVERABLES
                      <SortIcon column="deliverables" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                    <MultiSelectFilter
                      filterKey="deliverablesMonth"
                      options={uniqueDeliverablesMonths}
                      selected={filterDeliverablesMonth}
                      onToggle={(month) => {
                        setFilterDeliverablesMonth((prev) =>
                          prev.includes(month) ? prev.filter((v) => v !== month) : [...prev, month]
                        );
                      }}
                      renderOption={(month) => {
                        const date = new Date(2024, month - 1, 1);
                        return date.toLocaleString('en-US', { month: 'short' });
                      }}
                      isOpen={openFilters.deliverablesMonth || false}
                      onOpenChange={(open) => setOpenFilters((prev) => ({ ...prev, deliverablesMonth: open }))}
                    />
                  </div>
                </div>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("risk_assessment")}
                  className="inline-flex items-center hover:text-un-blue"
                >
                  RISK
                  <SortIcon column="risk_assessment" sortField={sortField} sortDirection={sortDirection} />
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
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium text-sm tabular-nums">
                      {a.work_package_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="line-clamp-2">{a.work_package_title}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-un-blue/10 text-un-blue font-semibold text-sm tabular-nums">
                      {actionLabel(a.action_id, a.action_sub_id)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="line-clamp-2">{a.indicative_action}</span>
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="cursor-pointer transition-opacity hover:opacity-75">
                          {a.public_action_status ? (
                            <Badge className={getStatusStyles(a.public_action_status).badge}>
                              {getStatusStyles(a.public_action_status).label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-500">
                              Set status...
                            </Badge>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="space-y-1">
                          {STATUS_OPTIONS.map((opt) => {
                            const styles = getStatusStyles(opt.value);
                            const isSelected = a.public_action_status === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => handleStatusChange(a.action_id, a.action_sub_id, opt.value)}
                                className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                                  isSelected ? "bg-slate-200" : "hover:bg-slate-100"
                                }`}
                              >
                                <Badge className={styles.badge}>
                                  {styles.label}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </td>
                  <td className="px-4 py-3">
                    {a.deliverables_status ? (
                      <Badge
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          a.deliverables_status === "submitted"
                            ? "border-green-300 bg-green-50 text-green-800"
                            : "border-amber-300 bg-amber-50 text-amber-800"
                        }`}
                      >
                        {a.deliverables_status === "submitted" ? (
                          <Send className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {a.deliverables_status === "submitted" ? "Submitted" : "Not submitted"}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
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
                      <SelectTrigger className="h-8 w-32 border-gray-200 bg-white text-gray-700">
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

      {/* Status Change Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, actionId: null, actionSubId: null, status: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Action Status</DialogTitle>
            <DialogDescription>
              {confirmDialog.actionId !== null && confirmDialog.status === ACTION_STATUS.DECISION_TAKEN && (
                <>
                  Change <span className="font-medium text-slate-700">Action {actionLabel(confirmDialog.actionId, confirmDialog.actionSubId)}</span>'s status to 'Decision taken'?
                </>
              )}
              {confirmDialog.actionId !== null && confirmDialog.status === ACTION_STATUS.FURTHER_WORK_ONGOING && (
                <>
                  Change <span className="font-medium text-slate-700">Action {actionLabel(confirmDialog.actionId, confirmDialog.actionSubId)}</span>'s status to 'Further work ongoing'?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, actionId: null, actionSubId: null, status: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              className="bg-un-blue hover:bg-un-blue/90"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
