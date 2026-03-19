"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ACTION_STATUS } from "@/constants/actionStatus";
import {
    updatePublicActionStatus,
    updateRiskAssessment,
} from "@/features/actions/commands";
import type {
    ActionsTableData,
    ActionWithMilestones,
    RiskAssessment,
} from "@/types";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Check,
    ChevronRight,
    Filter,
    Search,
    Send,
    X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SortField =
  | "work_package_id"
  | "action_id"
  | "work_package_title"
  | "indicative_action"
  | "risk_assessment"
  | "deliverables";
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

const ALL_RISK_VALUES = RISK_OPTIONS.map((option) => option.value);

function actionLabel(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

/** Get YYYYMM-encoded integer from ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss). */
function yearMonthFromDeadline(deadline: string | null): number | null {
  if (!deadline?.trim()) return null;
  const parts = deadline.trim().split(/[-T]/);
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return !isNaN(y) && !isNaN(m) && m >= 1 && m <= 12 ? y * 100 + m : null;
}

/** Deliverables status for an action, optionally for a specific YYYYMM (when filter is set). */
function getDeliverablesStatus(
  action: ActionWithMilestones,
  selectedMonth: number | null,
): "submitted" | "not_submitted" | null {
  if (!selectedMonth) return action.deliverables_status;
  const internal = action.milestones?.find(
    (m) => !m.is_public && yearMonthFromDeadline(m.deadline) === selectedMonth,
  );
  if (!internal) return null;
  return internal.document_submitted ? "submitted" : "not_submitted";
}

// Multiselect filter component
function MultiSelectFilter<T extends string | number | boolean>({
  options,
  allOptions,
  selected,
  onToggle,
  renderOption,
  isOpen,
  onOpenChange,
  maxWidth = "w-64",
}: {
  filterKey: string;
  /** Options available given current filters (determines greyed-out state). */
  options: T[];
  /** Full list of options regardless of filters (determines display order). */
  allOptions: T[];
  selected: T[];
  onToggle: (value: T) => void;
  renderOption: (value: T) => string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  maxWidth?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const hasFilter = selected.length > 0;

  const availableSet = useMemo(() => new Set(options.map(String)), [options]);

  // Sort: available first, then unavailable; within each group preserve allOptions order
  const sortedOptions = useMemo(() => {
    const available = allOptions.filter((o) => availableSet.has(String(o)));
    const unavailable = allOptions.filter((o) => !availableSet.has(String(o)));
    return [...available, ...unavailable];
  }, [allOptions, availableSet]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return sortedOptions;
    const q = searchQuery.toLowerCase();
    return sortedOptions.filter((o) =>
      renderOption(o).toLowerCase().includes(q),
    );
  }, [sortedOptions, searchQuery, renderOption]);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) setSearchQuery("");
        onOpenChange(open);
      }}
    >
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
            className="h-8 w-full rounded border border-gray-200 px-2 text-sm outline-none focus:border-un-blue"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-center text-sm text-gray-400">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);
                const isAvailable = availableSet.has(String(option));
                return (
                  <button
                    key={String(option)}
                    type="button"
                    onClick={() => isAvailable && onToggle(option)}
                    disabled={!isAvailable && !isSelected}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                      isAvailable || isSelected
                        ? "hover:bg-gray-100"
                        : "cursor-default opacity-35"
                    }`}
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
                    <span className="flex-1 break-words">
                      {renderOption(option)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        {hasFilter && (
          <div className="mt-2 border-t pt-2">
            <button
              type="button"
              onClick={() =>
                allOptions.forEach((o) => selected.includes(o) && onToggle(o))
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

// Sort icon component (must be outside render to satisfy React 19)
function SortIcon({
  column,
  sortField,
  sortDirection,
}: {
  column: SortField;
  sortField: SortField | null;
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

interface ActionsTableProps {
  data: ActionsTableData;
  isAdmin?: boolean;
}

export function ActionsTable({ data, isAdmin = false }: ActionsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  // Initialize filter state from URL search params
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [sortField, setSortField] = useState<SortField | null>(
    () => (searchParams.get("sort") as SortField | null) ?? null,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    () => (searchParams.get("dir") as SortDirection | null) ?? "asc",
  );

  // Column filters (multiselect - arrays)
  const [filterWP, setFilterWP] = useState<number[]>(() =>
    searchParams
      .getAll("wp")
      .map(Number)
      .filter((n) => !isNaN(n)),
  );
  const [filterWPTitle, setFilterWPTitle] = useState<string[]>(() =>
    searchParams.getAll("wpt"),
  );
  const [filterAction, setFilterAction] = useState<string[]>(() =>
    searchParams.getAll("a"),
  );
  const [filterIndicativeAction, setFilterIndicativeAction] = useState<
    string[]
  >(() => searchParams.getAll("ia"));
  const [filterWorkPackageId, setFilterWorkPackageId] = useState<string>(
    () => searchParams.get("wpid") ?? "",
  );
  const [filterRisk, setFilterRisk] = useState<string>(
    () => searchParams.get("risk") ?? "",
  );
  const [filterDeliverablesMonth, setFilterDeliverablesMonth] = useState<
    number | null
  >(() => {
    const v = searchParams.get("dm");
    if (!v) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  });

  // Track which filter popovers are open
  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({});

  // Sync filter state to URL
  useEffect(() => {
    const current = searchParamsRef.current;
    const params = new URLSearchParams();
    // Preserve modal params
    const action = current.get("action");
    const milestone = current.get("milestone");
    if (action) params.set("action", action);
    if (milestone) params.set("milestone", milestone);
    // Filter params
    if (searchInput) params.set("q", searchInput);
    if (sortField) params.set("sort", sortField);
    if (sortDirection !== "asc") params.set("dir", sortDirection);
    filterWP.forEach((v) => params.append("wp", String(v)));
    filterWPTitle.forEach((v) => params.append("wpt", v));
    filterAction.forEach((v) => params.append("a", v));
    filterIndicativeAction.forEach((v) => params.append("ia", v));
    if (filterWorkPackageId) params.set("wpid", filterWorkPackageId);
    if (filterRisk) params.set("risk", filterRisk);
    if (filterDeliverablesMonth != null)
      params.set("dm", String(filterDeliverablesMonth));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [
    searchInput,
    sortField,
    sortDirection,
    filterWP,
    filterWPTitle,
    filterAction,
    filterIndicativeAction,
    filterWorkPackageId,
    filterRisk,
    filterDeliverablesMonth,
    router,
  ]);

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

  // Full (unfiltered) option lists — used as allOptions for greyed-out display
  const allWPIds = useMemo(() => {
    const ids = new Set<number>();
    allActions.forEach((a) => ids.add(a.work_package_id));
    return Array.from(ids).sort((a, b) => a - b);
  }, [allActions]);

  const allWPTitles = useMemo(() => {
    const titles = new Set<string>();
    allActions.forEach((a) => {
      if (a.work_package_title) titles.add(a.work_package_title);
    });
    return Array.from(titles).sort();
  }, [allActions]);

  const allActionLabels = useMemo(() => {
    const labels = new Set<string>();
    allActions.forEach((a) =>
      labels.add(actionLabel(a.action_id, a.action_sub_id)),
    );
    return Array.from(labels).sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ""), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [allActions]);

  const allIndicativeActions = useMemo(() => {
    const actions = new Set<string>();
    allActions.forEach((a) => {
      if (a.indicative_action) actions.add(a.indicative_action);
    });
    return Array.from(actions).sort();
  }, [allActions]);

  const allDeliverableMonths = useMemo(() => {
    const months = new Set<number>();
    allActions.forEach((a) => {
      a.upcoming_milestone_months.forEach((m) => months.add(m));
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [allActions]);

  type FilterSkip =
    | "wp"
    | "wpTitle"
    | "action"
    | "indicativeAction"
    | "risk"
    | "deliverablesMonth";

  // Apply all filters except one – used to derive "connected" filter options
  const applyFiltersExcept = useCallback(
    (list: typeof allActions, except: FilterSkip) => {
      let result = list;
      if (hasSearch) {
        const matches = (s: string) => s.toLowerCase().includes(search);
        result = result.filter(
          (a) =>
            matches(a.work_package_title ?? "") ||
            matches(String(a.work_package_id)) ||
            matches(String(a.action_id)) ||
            matches(a.indicative_action ?? ""),
        );
      }
      if (except !== "wp" && filterWP.length > 0) {
        result = result.filter((a) => filterWP.includes(a.work_package_id));
      }
      if (except !== "wpTitle" && filterWPTitle.length > 0) {
        result = result.filter((a) =>
          filterWPTitle.includes(a.work_package_title),
        );
      }
      if (except !== "action" && filterAction.length > 0) {
        result = result.filter((a) =>
          filterAction.includes(actionLabel(a.action_id, a.action_sub_id)),
        );
      }
      if (except !== "indicativeAction" && filterIndicativeAction.length > 0) {
        result = result.filter((a) =>
          filterIndicativeAction.includes(a.indicative_action),
        );
      }
      if (filterWorkPackageId) {
        result = result.filter((a) =>
          String(a.work_package_id).includes(filterWorkPackageId),
        );
      }
      if (except !== "risk" && filterRisk) {
        result = result.filter((a) => a.risk_assessment === filterRisk);
      }
      if (except !== "deliverablesMonth" && filterDeliverablesMonth != null) {
        result = result.filter((a) =>
          a.upcoming_milestone_months.includes(filterDeliverablesMonth),
        );
      }
      return result;
    },
    [
      hasSearch,
      search,
      filterWP,
      filterWPTitle,
      filterAction,
      filterIndicativeAction,
      filterWorkPackageId,
      filterRisk,
      filterDeliverablesMonth,
    ],
  );

  // Connected filter options: each filter only shows values that exist in rows matching the other filters
  const uniqueWPIds = useMemo(() => {
    const list = applyFiltersExcept(allActions, "wp");
    const ids = new Set<number>();
    list.forEach((a) => ids.add(a.work_package_id));
    return Array.from(ids).sort((a, b) => a - b);
  }, [allActions, applyFiltersExcept]);

  const uniqueWPTitles = useMemo(() => {
    const list = applyFiltersExcept(allActions, "wpTitle");
    const titles = new Set<string>();
    list.forEach((a) => {
      if (a.work_package_title) titles.add(a.work_package_title);
    });
    return Array.from(titles).sort();
  }, [allActions, applyFiltersExcept]);

  const uniqueActions = useMemo(() => {
    const list = applyFiltersExcept(allActions, "action");
    const actions = new Set<string>();
    list.forEach((a) => {
      actions.add(actionLabel(a.action_id, a.action_sub_id));
    });
    return Array.from(actions).sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ""), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [allActions, applyFiltersExcept]);

  const uniqueIndicativeActions = useMemo(() => {
    const list = applyFiltersExcept(allActions, "indicativeAction");
    const actions = new Set<string>();
    list.forEach((a) => {
      if (a.indicative_action) actions.add(a.indicative_action);
    });
    return Array.from(actions).sort();
  }, [allActions, applyFiltersExcept]);

  const uniqueRiskOptions = useMemo(() => {
    const list = applyFiltersExcept(allActions, "risk");
    const risks = new Set<RiskAssessment>();
    list.forEach((a) => {
      if (a.risk_assessment) risks.add(a.risk_assessment);
    });
    return ALL_RISK_VALUES.filter((value) => risks.has(value));
  }, [allActions, applyFiltersExcept]);

  const uniqueDeliverablesMonths = useMemo(() => {
    const list = applyFiltersExcept(allActions, "deliverablesMonth");
    const months = new Set<number>();
    list.forEach((a) => {
      a.upcoming_milestone_months.forEach((month) => months.add(month));
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [allActions, applyFiltersExcept]);

  const deliverableMonthStats = useMemo(() => {
    const list = applyFiltersExcept(allActions, "deliverablesMonth");
    const stats = new Map<number, { submitted: number; total: number }>();
    list.forEach((a) => {
      a.upcoming_milestone_months.forEach((ym) => {
        const entry = stats.get(ym) ?? { submitted: 0, total: 0 };
        entry.total += 1;
        const milestone = a.milestones?.find(
          (m) => !m.is_public && yearMonthFromDeadline(m.deadline) === ym,
        );
        if (milestone?.document_submitted) entry.submitted += 1;
        stats.set(ym, entry);
      });
    });
    return stats;
  }, [allActions, applyFiltersExcept]);

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
      list = list.filter((a) =>
        filterAction.includes(actionLabel(a.action_id, a.action_sub_id)),
      );
    }
    if (filterIndicativeAction.length > 0) {
      list = list.filter((a) =>
        filterIndicativeAction.includes(a.indicative_action),
      );
    }
    if (filterWorkPackageId) {
      list = list.filter((a) =>
        String(a.work_package_id).includes(filterWorkPackageId),
      );
    }
    if (filterRisk) {
      list = list.filter((a) => a.risk_assessment === filterRisk);
    }
    if (filterDeliverablesMonth != null) {
      list = list.filter((a) =>
        a.upcoming_milestone_months.includes(filterDeliverablesMonth),
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
    filterWorkPackageId,
    filterRisk,
    filterDeliverablesMonth,
  ]);

  // Calculate deliverables counter (when month filter set, use status for that month)
  const deliverablesCounter = useMemo(() => {
    const total = filteredActions.length;
    const submitted = filteredActions.filter(
      (a) => getDeliverablesStatus(a, filterDeliverablesMonth) === "submitted",
    ).length;
    return { submitted, total };
  }, [filteredActions, filterDeliverablesMonth]);

  const sortedActions = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filteredActions].sort((a, b) => {
      // User-selected primary sort (overrides default when active)
      if (sortField !== null) {
        let cmp = 0;
        if (sortField === "work_package_id") {
          cmp = a.work_package_id - b.work_package_id;
        } else if (sortField === "action_id") {
          cmp =
            a.action_id - b.action_id ||
            (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? "");
        } else if (sortField === "work_package_title") {
          cmp = a.work_package_title.localeCompare(b.work_package_title);
        } else if (sortField === "indicative_action") {
          cmp = a.indicative_action.localeCompare(b.indicative_action);
        } else if (sortField === "risk_assessment") {
          const order: Record<string, number> = {
            low_risk: 0,
            medium_risk: 1,
            at_risk: 2,
          };
          const av = a.risk_assessment ?? "";
          const bv = b.risk_assessment ?? "";
          cmp = (order[av] ?? -1) - (order[bv] ?? -1);
        } else if (sortField === "deliverables") {
          const order: Record<string, number> = {
            submitted: 0,
            not_submitted: 1,
          };
          const av = getDeliverablesStatus(a, filterDeliverablesMonth) ?? "";
          const bv = getDeliverablesStatus(b, filterDeliverablesMonth) ?? "";
          cmp = (order[av] ?? 2) - (order[bv] ?? 2);
        }
        if (cmp !== 0) return cmp * dir;
      }

      // Default compound sort: WP → Action → Vis (public first) → deadline (earlier first)
      const wpCmp = a.work_package_id - b.work_package_id;
      if (wpCmp !== 0) return wpCmp;

      const actionCmp =
        a.action_id - b.action_id ||
        (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? "");
      if (actionCmp !== 0) return actionCmp;

      const aPublic = a.public_action_status !== null ? 0 : 1;
      const bPublic = b.public_action_status !== null ? 0 : 1;
      const visCmp = aPublic - bPublic;
      if (visCmp !== 0) return visCmp;

      const aDeadline = a.deliverables_deadline_month ?? Infinity;
      const bDeadline = b.deliverables_deadline_month ?? Infinity;
      return aDeadline - bDeadline;
    });
  }, [filteredActions, sortField, sortDirection, filterDeliverablesMonth]);

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
    const actionParam = actionSubId
      ? `${actionId}${actionSubId}`
      : `${actionId}`;
    // Preserve existing filter params when opening the modal
    const params = new URLSearchParams(searchParamsRef.current.toString());
    params.set("action", actionParam);
    params.delete("milestone");
    router.push(`/actions?${params.toString()}`, { scroll: false });
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

  const confirmStatusChange = async () => {
    if (confirmDialog.actionId === null || confirmDialog.status === null)
      return;

    const { actionId, actionSubId, status } = confirmDialog;
    setConfirmDialog({
      open: false,
      actionId: null,
      actionSubId: null,
      status: null,
    });

    const result = await updatePublicActionStatus(
      actionId,
      actionSubId,
      status,
    );
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
    filterWorkPackageId.length > 0 ||
    filterRisk.length > 0 ||
    filterDeliverablesMonth != null;

  const clearAllFilters = () => {
    setFilterWP([]);
    setFilterWPTitle([]);
    setFilterAction([]);
    setFilterIndicativeAction([]);
    setFilterWorkPackageId("");
    setFilterRisk("");
    setFilterDeliverablesMonth(null);
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Actions</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {data.workPackages.length} work packages &middot;{" "}
            {allActions.length} actions
          </p>
        </div>
        <span className="mb-0.5 text-sm text-gray-400">
          {sortedActions.length !== allActions.length
            ? `${sortedActions.length} of ${allActions.length} shown`
            : null}
        </span>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-80 rounded-md border border-input bg-background px-3 pl-9 text-sm"
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
            className="ml-auto flex items-center gap-1 text-sm text-un-blue hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            Clear all filters
          </button>
        )}
      </div>

      {/* Simple Table */}
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
                    filterKey="wp"
                    options={uniqueWPIds}
                    allOptions={allWPIds}
                    selected={filterWP}
                    onToggle={(id) => {
                      setFilterWP((prev) =>
                        prev.includes(id)
                          ? prev.filter((v) => v !== id)
                          : [...prev, id],
                      );
                    }}
                    renderOption={(id) => `WP ${id}`}
                    isOpen={openFilters.wp || false}
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
                    onClick={() => handleSort("work_package_title")}
                    className="inline-flex items-center hover:text-un-blue"
                  >
                    WP TITLE
                    <SortIcon
                      column="work_package_title"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                  <MultiSelectFilter
                    filterKey="wpTitle"
                    options={uniqueWPTitles}
                    allOptions={allWPTitles}
                    selected={filterWPTitle}
                    onToggle={(title) => {
                      setFilterWPTitle((prev) =>
                        prev.includes(title)
                          ? prev.filter((v) => v !== title)
                          : [...prev, title],
                      );
                    }}
                    renderOption={(title) =>
                      title.length > 40 ? title.slice(0, 40) + "…" : title
                    }
                    isOpen={openFilters.wpTitle || false}
                    onOpenChange={(open) =>
                      setOpenFilters((prev) => ({ ...prev, wpTitle: open }))
                    }
                  />
                </div>
              </th>
              <th className="w-16 px-4 py-3 whitespace-nowrap">
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
                    filterKey="action"
                    options={uniqueActions}
                    allOptions={allActionLabels}
                    selected={filterAction}
                    onToggle={(action) => {
                      setFilterAction((prev) =>
                        prev.includes(action)
                          ? prev.filter((v) => v !== action)
                          : [...prev, action],
                      );
                    }}
                    renderOption={(action) => `Action ${action}`}
                    isOpen={openFilters.action || false}
                    onOpenChange={(open) =>
                      setOpenFilters((prev) => ({ ...prev, action: open }))
                    }
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
                    <SortIcon
                      column="indicative_action"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                  <MultiSelectFilter
                    filterKey="indicativeAction"
                    options={uniqueIndicativeActions}
                    allOptions={allIndicativeActions}
                    selected={filterIndicativeAction}
                    onToggle={(action) => {
                      setFilterIndicativeAction((prev) =>
                        prev.includes(action)
                          ? prev.filter((v) => v !== action)
                          : [...prev, action],
                      );
                    }}
                    renderOption={(action) =>
                      action.length > 60 ? action.slice(0, 60) + "…" : action
                    }
                    isOpen={openFilters.indicativeAction || false}
                    onOpenChange={(open) =>
                      setOpenFilters((prev) => ({
                        ...prev,
                        indicativeAction: open,
                      }))
                    }
                    maxWidth="w-96"
                  />
                </div>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleSort("deliverables")}
                            className="inline-flex items-center hover:text-un-blue"
                          >
                            DELIVERABLES
                            <SortIcon
                              column="deliverables"
                              sortField={sortField}
                              sortDirection={sortDirection}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-64 text-center text-xs"
                        >
                          Whether the action&apos;s deliverable document has
                          been submitted. Use the month filter to scope by
                          milestone deadline.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Popover
                      open={openFilters.deliverablesMonth || false}
                      onOpenChange={(open) =>
                        setOpenFilters((prev) => ({
                          ...prev,
                          deliverablesMonth: open,
                        }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFilters((prev) => ({
                              ...prev,
                              deliverablesMonth: !prev.deliverablesMonth,
                            }));
                          }}
                          className={`flex h-6 w-6 items-center justify-center rounded border-0 bg-transparent p-0 transition-colors hover:bg-gray-100 ${
                            filterDeliverablesMonth != null
                              ? "text-un-blue"
                              : "text-gray-400"
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-48 p-2"
                        align="start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="max-h-64 space-y-1 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterDeliverablesMonth(null);
                              setOpenFilters((prev) => ({
                                ...prev,
                                deliverablesMonth: false,
                              }));
                            }}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100 ${
                              filterDeliverablesMonth === null
                                ? "font-medium text-un-blue"
                                : ""
                            }`}
                          >
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                filterDeliverablesMonth === null
                                  ? "border-un-blue bg-un-blue"
                                  : "border-gray-300"
                              }`}
                            >
                              {filterDeliverablesMonth === null && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            All months
                          </button>
                          {allDeliverableMonths.map((month) => {
                            const isSelected =
                              filterDeliverablesMonth === month;
                            const isAvailable =
                              uniqueDeliverablesMonths.includes(month);
                            const year = Math.floor(month / 100);
                            const monthNum = month % 100;
                            const label =
                              new Date(year, monthNum - 1, 1).toLocaleString(
                                "en-US",
                                { month: "short" },
                              ) + ` ${year}`;
                            const stats = deliverableMonthStats.get(month);
                            return (
                              <button
                                key={month}
                                type="button"
                                disabled={!isAvailable && !isSelected}
                                onClick={() => {
                                  if (!isAvailable && !isSelected) return;
                                  setFilterDeliverablesMonth(month);
                                  setOpenFilters((prev) => ({
                                    ...prev,
                                    deliverablesMonth: false,
                                  }));
                                }}
                                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                                  isSelected
                                    ? "font-medium text-un-blue"
                                    : isAvailable
                                      ? "hover:bg-gray-100"
                                      : "cursor-default opacity-35"
                                }`}
                              >
                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                    isSelected
                                      ? "border-un-blue bg-un-blue"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <span className="flex-1">{label}</span>
                                {stats && (
                                  <span
                                    className={`text-xs tabular-nums ${
                                      isSelected
                                        ? "text-un-blue"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {stats.submitted}/{stats.total}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="text-xs font-normal tracking-normal text-gray-400 normal-case tabular-nums">
                    {deliverablesCounter.submitted}/{deliverablesCounter.total}{" "}
                    submitted
                  </div>
                </div>
              </th>
              {isAdmin && (
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSort("risk_assessment")}
                      className="inline-flex items-center hover:text-un-blue"
                    >
                      RISK
                      <SortIcon
                        column="risk_assessment"
                        sortField={sortField}
                        sortDirection={sortDirection}
                      />
                    </button>
                    <Popover
                      open={openFilters.risk || false}
                      onOpenChange={(open) =>
                        setOpenFilters((prev) => ({
                          ...prev,
                          risk: open,
                        }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFilters((prev) => ({
                              ...prev,
                              risk: !prev.risk,
                            }));
                          }}
                          className={`flex h-6 w-6 items-center justify-center rounded border-0 bg-transparent p-0 transition-colors hover:bg-gray-100 ${
                            filterRisk
                              ? "text-un-blue"
                              : "text-gray-400"
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-48 p-2"
                        align="start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterRisk("");
                              setOpenFilters((prev) => ({
                                ...prev,
                                risk: false,
                              }));
                            }}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100 ${
                              filterRisk === "" ? "font-medium text-un-blue" : ""
                            }`}
                          >
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                filterRisk === ""
                                  ? "border-un-blue bg-un-blue"
                                  : "border-gray-300"
                              }`}
                            >
                              {filterRisk === "" && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            All risk levels
                          </button>
                          {RISK_OPTIONS.map((option) => {
                            const isSelected = filterRisk === option.value;
                            const isAvailable = uniqueRiskOptions.includes(
                              option.value,
                            );

                            return (
                              <button
                                key={option.value}
                                type="button"
                                disabled={!isAvailable && !isSelected}
                                onClick={() => {
                                  if (!isAvailable && !isSelected) return;
                                  setFilterRisk(option.value);
                                  setOpenFilters((prev) => ({
                                    ...prev,
                                    risk: false,
                                  }));
                                }}
                                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                                  isSelected
                                    ? "font-medium text-un-blue"
                                    : isAvailable
                                      ? "hover:bg-gray-100"
                                      : "cursor-default opacity-35"
                                }`}
                              >
                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                    isSelected
                                      ? "border-un-blue bg-un-blue"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${option.indicatorClass}`}
                                />
                                <span>{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>
              )}
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedActions.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  No actions found
                </td>
              </tr>
            ) : (
              sortedActions.map((a) => (
                <tr
                  key={`${a.action_id}-${a.action_sub_id ?? ""}`}
                  onClick={() =>
                    handleActionClick(a.action_id, a.action_sub_id)
                  }
                  className="cursor-pointer transition-colors hover:bg-sky-50/50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center rounded bg-gray-100 px-1.5 py-0.5 text-sm font-medium text-gray-700 tabular-nums">
                      {a.work_package_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="line-clamp-2">{a.work_package_title}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center rounded bg-un-blue/10 px-1.5 py-0.5 text-sm font-semibold text-un-blue tabular-nums">
                      {actionLabel(a.action_id, a.action_sub_id)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="line-clamp-2">{a.indicative_action}</span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const status = getDeliverablesStatus(
                        a,
                        filterDeliverablesMonth,
                      );
                      if (!status) {
                        return <span className="text-xs text-gray-400">—</span>;
                      }
                      return (
                        <Badge
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            status === "submitted"
                              ? "border-green-300 bg-green-50 text-green-800"
                              : "border-amber-300 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {status === "submitted" ? (
                            <>
                              <Send className="h-3 w-3" />
                              Submitted
                            </>
                          ) : (
                            <>Not submitted</>
                          )}
                        </Badge>
                      );
                    })()}
                  </td>
                  {isAdmin && (
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
                  )}
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
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmDialog({
            open: false,
            actionId: null,
            actionSubId: null,
            status: null,
          })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Action Status</DialogTitle>
            <DialogDescription>
              {confirmDialog.actionId !== null &&
                confirmDialog.status === ACTION_STATUS.DECISION_TAKEN && (
                  <>
                    Change{" "}
                    <span className="font-medium text-slate-700">
                      Action{" "}
                      {actionLabel(
                        confirmDialog.actionId,
                        confirmDialog.actionSubId,
                      )}
                    </span>
                    's status to 'Decision taken'?
                  </>
                )}
              {confirmDialog.actionId !== null &&
                confirmDialog.status === ACTION_STATUS.FURTHER_WORK_ONGOING && (
                  <>
                    Change{" "}
                    <span className="font-medium text-slate-700">
                      Action{" "}
                      {actionLabel(
                        confirmDialog.actionId,
                        confirmDialog.actionSubId,
                      )}
                    </span>
                    's status to 'Further work ongoing'?
                  </>
                )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({
                  open: false,
                  actionId: null,
                  actionSubId: null,
                  status: null,
                })
              }
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
