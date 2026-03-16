"use client";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    approveMilestoneContent,
    requestMilestoneChanges,
    setMilestoneAttentionToTimeline,
    setMilestoneConfirmationNeeded,
    setMilestoneFinalized,
    setMilestoneNeedsOlaReview,
    setMilestoneReviewedByOla,
    setMilestoneToDraft,
    updateMilestoneDocumentSubmitted,
    updateMilestonePublicProgress,
} from "@/features/milestones/commands";
import type { AllMilestonesTableRow } from "@/features/milestones/queries";
import { formatShortDate } from "@/lib/format-date";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Check,
    ChevronDown,
    ChevronRight,
    Filter,
    Search,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

// =========================================================
// TYPES & CONSTANTS
// =========================================================

type SortField =
  | "work_package_id"
  | "action_id"
  | "deadline"
  | "milestone_type";
type SortDirection = "asc" | "desc";

const MILESTONE_TYPE_ORDER: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  upcoming: 4,
  final: 5,
};

const MILESTONE_TYPE_LABELS: Record<string, string> = {
  first: "First",
  second: "Second",
  third: "Third",
  upcoming: "Upcoming",
  final: "Final",
};

// Matches MilestoneCard's getDisplayStatus() priority order and styles
type StatusConfig = { label: string; dot: string; pill: string };

function getStatusConfig(row: AllMilestonesTableRow): StatusConfig {
  if (row.is_draft)
    return {
      label: "Draft",
      dot: "bg-slate-400",
      pill: "border-slate-200  bg-slate-50   text-slate-600",
    };
  if (row.finalized)
    return {
      label: "Finalized",
      dot: "bg-emerald-500",
      pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  if (row.confirmation_needed)
    return {
      label: "Confirmation needed",
      dot: "bg-orange-400",
      pill: "border-orange-200  bg-orange-50   text-orange-700",
    };
  if (row.attention_to_timeline)
    return {
      label: "Attention to timeline",
      dot: "bg-yellow-400",
      pill: "border-yellow-200  bg-yellow-50   text-yellow-700",
    };
  if (row.reviewed_by_ola)
    return {
      label: "Reviewed by OLA",
      dot: "bg-sky-500",
      pill: "border-sky-200     bg-sky-50      text-sky-700",
    };
  if (row.is_approved)
    return {
      label: "Approved",
      dot: "bg-emerald-500",
      pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  if (row.needs_attention)
    return {
      label: "Needs attention",
      dot: "bg-amber-400",
      pill: "border-amber-200   bg-amber-50    text-amber-700",
    };
  if (row.needs_ola_review)
    return {
      label: "Needs OLA review",
      dot: "bg-violet-500",
      pill: "border-violet-200  bg-violet-50   text-violet-700",
    };
  return {
    label: "In review",
    dot: "bg-blue-400",
    pill: "border-blue-200    bg-blue-50     text-blue-700",
  };
}

const PUBLIC_PROGRESS_CONFIG: Record<string, StatusConfig> = {
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  in_progress: {
    label: "In progress",
    dot: "bg-blue-400",
    pill: "border-blue-200    bg-blue-50    text-blue-700",
  },
  delayed: {
    label: "Delayed",
    dot: "bg-amber-400",
    pill: "border-amber-200   bg-amber-50   text-amber-700",
  },
};

const ALL_STATUS_LABELS = [
  "Draft",
  "Needs attention",
  "Needs OLA review",
  "Reviewed by OLA",
  "Attention to timeline",
  "Confirmation needed",
  "Finalized",
  "Approved",
  "In review",
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

// =========================================================
// STATUS EDITING
// =========================================================

type MilestoneStatus =
  | "draft"
  | "approved"
  | "needs_attention"
  | "needs_ola_review"
  | "reviewed_by_ola"
  | "finalized"
  | "attention_to_timeline"
  | "confirmation_needed"
  | "no_submission";

const STATUS_CONFIRM_MESSAGES: Record<MilestoneStatus, string> = {
  draft: "Change this milestone to Draft? It will no longer be approved.",
  no_submission: "Mark this milestone as No Submission? This will set it to draft status.",
  approved: "Approve this milestone? This will mark it as approved and no longer a draft.",
  needs_attention: "Mark this milestone as needing attention? This will notify the team to make changes.",
  needs_ola_review: "Mark this milestone as needing OLA (Office of Legal Affairs) review?",
  reviewed_by_ola: "Mark this milestone as reviewed by OLA (Office of Legal Affairs)?",
  finalized: "Finalize this milestone? This marks it as complete.",
  attention_to_timeline: "Mark this milestone as needing attention to timeline?",
  confirmation_needed: "Mark this milestone as needing confirmation?",
};

function getCurrentStatus(row: AllMilestonesTableRow): string {
  if (row.is_draft) return "draft";
  if (row.finalized) return "finalized";
  if (row.confirmation_needed) return "confirmation_needed";
  if (row.attention_to_timeline) return "attention_to_timeline";
  if (row.reviewed_by_ola) return "reviewed_by_ola";
  if (row.is_approved) return "approved";
  if (row.needs_attention) return "needs_attention";
  if (row.needs_ola_review) return "needs_ola_review";
  return "in_review";
}

function applyStatusToRow(row: AllMilestonesTableRow, status: MilestoneStatus): AllMilestonesTableRow {
  return {
    ...row,
    is_draft: status === "draft" || status === "no_submission",
    is_approved: status === "approved",
    needs_attention: status === "needs_attention",
    needs_ola_review: status === "needs_ola_review",
    reviewed_by_ola: status === "reviewed_by_ola",
    finalized: status === "finalized",
    attention_to_timeline: status === "attention_to_timeline",
    confirmation_needed: status === "confirmation_needed",
  };
}

// =========================================================
// HELPERS
// =========================================================

function actionLabel(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

function getDeadlineMonthKey(deadline: string | null | undefined): string {
  if (!deadline?.trim()) return "no_date";
  const match = deadline.trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return "no_date";
  return `${match[1]}-${match[2]}`;
}

function formatMonthLabel(key: string): string {
  if (key === "no_date") return "No date";
  const [y, m] = key.split("-");
  const monthNum = parseInt(m, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return key;
  return `${MONTH_NAMES[monthNum - 1]} ${y}`;
}

function isPastDue(deadline: string | null): boolean {
  if (!deadline) return false;
  const s = deadline.trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d) < today;
  }
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  return dl < today;
}

// =========================================================
// STATUS PILL — matches MilestoneCard style
// =========================================================

function StatusPill({ config }: { config: StatusConfig }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border ${config.pill} h-6 px-2.5 text-xs font-medium whitespace-nowrap`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// =========================================================
// MULTISELECT FILTER
// =========================================================

function MultiSelectFilter<T extends string | number>({
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
  const [searchQuery, setSearchQuery] = useState("");
  const hasFilter = selected.length > 0;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((o) => renderOption(o).toLowerCase().includes(q));
  }, [options, searchQuery, renderOption]);

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
          aria-label={`Filter ${filterKey}`}
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
                No results
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
          <div className="mt-2 border-t pt-2">
            <button
              type="button"
              onClick={() =>
                options.forEach((o) => selected.includes(o) && onToggle(o))
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

// =========================================================
// SORT ICON
// =========================================================

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

// =========================================================
// MAIN TABLE
// =========================================================

interface MilestonesTableProps {
  rows: AllMilestonesTableRow[];
}

export function MilestonesTable({ rows }: MilestonesTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<SortField>("action_id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [filterWP, setFilterWP] = useState<number[]>([]);
  const [filterAction, setFilterAction] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState<string[]>([]);
  const [filterPublic, setFilterPublic] = useState<string[]>([]);
  const [filterDoc, setFilterDoc] = useState<string[]>([]);
  const [filterDesc, setFilterDesc] = useState("");

  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({});

  // Editable status/doc state
  const [localRows, setLocalRows] = useState<AllMilestonesTableRow[]>(rows);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    milestoneId: string | null;
    status: MilestoneStatus | null;
  }>({ open: false, milestoneId: null, status: null });
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleStatusChange = (milestoneId: string, status: MilestoneStatus) => {
    setConfirmDialog({ open: true, milestoneId, status });
  };

  const confirmStatusChange = async () => {
    if (!confirmDialog.milestoneId || !confirmDialog.status) return;
    const { milestoneId, status } = confirmDialog;
    setConfirmDialog({ open: false, milestoneId: null, status: null });
    setSavingId(milestoneId);
    try {
      const handlers: Record<MilestoneStatus, () => Promise<{ success: boolean; error?: string }>> = {
        approved: () => approveMilestoneContent(milestoneId),
        needs_attention: () => requestMilestoneChanges(milestoneId),
        needs_ola_review: () => setMilestoneNeedsOlaReview(milestoneId),
        reviewed_by_ola: () => setMilestoneReviewedByOla(milestoneId),
        finalized: () => setMilestoneFinalized(milestoneId),
        attention_to_timeline: () => setMilestoneAttentionToTimeline(milestoneId),
        confirmation_needed: () => setMilestoneConfirmationNeeded(milestoneId),
        draft: () => setMilestoneToDraft(milestoneId),
        no_submission: () => setMilestoneToDraft(milestoneId),
      };
      const result = await handlers[status]();
      if (result.success) {
        setLocalRows((prev) =>
          prev.map((r) => r.milestone_id === milestoneId ? applyStatusToRow(r, status) : r)
        );
      }
    } catch {
      // silently fail
    } finally {
      setSavingId(null);
    }
  };

  const handleDocChange = async (milestoneId: string, submitted: boolean) => {
    setSavingId(milestoneId);
    try {
      const result = await updateMilestoneDocumentSubmitted(milestoneId, submitted);
      if (result.success) {
        setLocalRows((prev) =>
          prev.map((r) => r.milestone_id === milestoneId ? { ...r, milestone_document_submitted: submitted } : r)
        );
      }
    } catch {
      // silently fail
    } finally {
      setSavingId(null);
    }
  };

  const handlePublicProgressChange = async (milestoneId: string, value: "completed" | "in_progress" | "delayed") => {
    setSavingId(milestoneId);
    try {
      const result = await updateMilestonePublicProgress(milestoneId, value);
      if (result.success) {
        setLocalRows((prev) =>
          prev.map((r) => r.milestone_id === milestoneId ? { ...r, public_progress: value } : r)
        );
      }
    } catch {
      // silently fail
    } finally {
      setSavingId(null);
    }
  };

  const search = searchInput.trim().toLowerCase();
  const hasSearch = search.length > 0;

  type FilterSkip =
    | "wp"
    | "action"
    | "type"
    | "status"
    | "month"
    | "public"
    | "doc"
    | "desc";

  const applyFiltersExcept = useCallback(
    (list: AllMilestonesTableRow[], except: FilterSkip) => {
      let r = list;
      if (hasSearch) {
        const m = (s: string) => s.toLowerCase().includes(search);
        r = r.filter(
          (row) =>
            m(String(row.work_package_id)) ||
            m(row.work_package_title) ||
            m(actionLabel(row.action_id, row.action_sub_id)) ||
            m(row.description ?? "") ||
            m(MILESTONE_TYPE_LABELS[row.milestone_type] ?? ""),
        );
      }
      if (except !== "wp" && filterWP.length > 0)
        r = r.filter((row) => filterWP.includes(row.work_package_id));
      if (except !== "action" && filterAction.length > 0)
        r = r.filter((row) =>
          filterAction.includes(actionLabel(row.action_id, row.action_sub_id)),
        );
      if (except !== "type" && filterType.length > 0)
        r = r.filter((row) => filterType.includes(row.milestone_type));
      if (except !== "status" && filterStatus.length > 0)
        r = r.filter((row) =>
          filterStatus.includes(getStatusConfig(row).label),
        );
      if (except !== "month" && filterMonth.length > 0)
        r = r.filter((row) =>
          filterMonth.includes(getDeadlineMonthKey(row.deadline)),
        );
      if (except !== "public" && filterPublic.length > 0)
        r = r.filter((row) => {
          if (filterPublic.includes("Public") && row.is_public) return true;
          if (filterPublic.includes("Internal") && !row.is_public) return true;
          return false;
        });
      if (except !== "doc" && filterDoc.length > 0)
        r = r.filter((row) => {
          if (row.is_public) return false;
          if (
            filterDoc.includes("Submitted") &&
            row.milestone_document_submitted
          )
            return true;
          if (
            filterDoc.includes("Not submitted") &&
            !row.milestone_document_submitted
          )
            return true;
          return false;
        });
      if (except !== "desc" && filterDesc.trim())
        r = r.filter((row) =>
          (row.description ?? "")
            .toLowerCase()
            .includes(filterDesc.trim().toLowerCase()),
        );
      return r;
    },
    [
      hasSearch,
      search,
      filterWP,
      filterAction,
      filterType,
      filterStatus,
      filterMonth,
      filterPublic,
      filterDoc,
      filterDesc,
    ],
  );

  const uniqueWPIds = useMemo(() => {
    const ids = new Set(
      applyFiltersExcept(localRows, "wp").map((r) => r.work_package_id),
    );
    return Array.from(ids).sort((a, b) => a - b);
  }, [localRows, applyFiltersExcept]);

  const uniqueActions = useMemo(() => {
    const set = new Set(
      applyFiltersExcept(localRows, "action").map((r) =>
        actionLabel(r.action_id, r.action_sub_id),
      ),
    );
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10);
      const nb = parseInt(b.replace(/\D/g, ""), 10);
      return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
    });
  }, [localRows, applyFiltersExcept]);

  const uniqueTypes = useMemo(() => {
    const set = new Set(
      applyFiltersExcept(localRows, "type").map((r) => r.milestone_type),
    );
    return Array.from(set).sort(
      (a, b) => (MILESTONE_TYPE_ORDER[a] ?? 9) - (MILESTONE_TYPE_ORDER[b] ?? 9),
    );
  }, [localRows, applyFiltersExcept]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set(
      applyFiltersExcept(localRows, "status").map((r) => getStatusConfig(r).label),
    );
    return ALL_STATUS_LABELS.filter((s) => set.has(s));
  }, [localRows, applyFiltersExcept]);

  const uniqueMonthKeys = useMemo(() => {
    const set = new Set(
      applyFiltersExcept(localRows, "month").map((r) =>
        getDeadlineMonthKey(r.deadline),
      ),
    );
    const sorted = Array.from(set)
      .filter((k) => k !== "no_date")
      .sort();
    if (set.has("no_date")) sorted.push("no_date");
    return sorted;
  }, [localRows, applyFiltersExcept]);

  const filteredRows = useMemo(() => {
    let list = localRows;
    if (hasSearch) {
      const m = (s: string) => s.toLowerCase().includes(search);
      list = list.filter(
        (r) =>
          m(String(r.work_package_id)) ||
          m(r.work_package_title) ||
          m(actionLabel(r.action_id, r.action_sub_id)) ||
          m(r.description ?? "") ||
          m(MILESTONE_TYPE_LABELS[r.milestone_type] ?? ""),
      );
    }
    if (filterWP.length > 0)
      list = list.filter((r) => filterWP.includes(r.work_package_id));
    if (filterAction.length > 0)
      list = list.filter((r) =>
        filterAction.includes(actionLabel(r.action_id, r.action_sub_id)),
      );
    if (filterType.length > 0)
      list = list.filter((r) => filterType.includes(r.milestone_type));
    if (filterStatus.length > 0)
      list = list.filter((r) =>
        filterStatus.includes(getStatusConfig(r).label),
      );
    if (filterMonth.length > 0)
      list = list.filter((r) =>
        filterMonth.includes(getDeadlineMonthKey(r.deadline)),
      );
    if (filterPublic.length > 0)
      list = list.filter((r) => {
        if (filterPublic.includes("Public") && r.is_public) return true;
        if (filterPublic.includes("Internal") && !r.is_public) return true;
        return false;
      });
    if (filterDoc.length > 0)
      list = list.filter((r) => {
        if (r.is_public) return false;
        if (filterDoc.includes("Submitted") && r.milestone_document_submitted)
          return true;
        if (
          filterDoc.includes("Not submitted") &&
          !r.milestone_document_submitted
        )
          return true;
        return false;
      });
    if (filterDesc.trim())
      list = list.filter((r) =>
        (r.description ?? "")
          .toLowerCase()
          .includes(filterDesc.trim().toLowerCase()),
      );
    return list;
  }, [
    localRows,
    hasSearch,
    search,
    filterWP,
    filterAction,
    filterType,
    filterStatus,
    filterMonth,
    filterPublic,
    filterDoc,
    filterDesc,
  ]);

  const sortedRows = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      let cmp = 0;
      if (sortField === "work_package_id") {
        cmp =
          a.work_package_id - b.work_package_id ||
          a.action_id - b.action_id ||
          (MILESTONE_TYPE_ORDER[a.milestone_type] ?? 9) -
            (MILESTONE_TYPE_ORDER[b.milestone_type] ?? 9);
      } else if (sortField === "action_id") {
        cmp =
          a.action_id - b.action_id ||
          (a.action_sub_id ?? "").localeCompare(b.action_sub_id ?? "") ||
          (MILESTONE_TYPE_ORDER[a.milestone_type] ?? 9) -
            (MILESTONE_TYPE_ORDER[b.milestone_type] ?? 9);
      } else if (sortField === "milestone_type") {
        cmp =
          (MILESTONE_TYPE_ORDER[a.milestone_type] ?? 9) -
          (MILESTONE_TYPE_ORDER[b.milestone_type] ?? 9);
      } else if (sortField === "deadline") {
        cmp = (a.deadline ?? "9999-12-31").localeCompare(
          b.deadline ?? "9999-12-31",
        );
      }
      return cmp * dir;
    });
  }, [filteredRows, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field)
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggle = <T,>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    value: T,
  ) =>
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  const setFilter = (key: string, open: boolean) =>
    setOpenFilters((prev) => ({ ...prev, [key]: open }));

  const hasActiveFilters =
    filterWP.length > 0 ||
    filterAction.length > 0 ||
    filterType.length > 0 ||
    filterStatus.length > 0 ||
    filterMonth.length > 0 ||
    filterPublic.length > 0 ||
    filterDoc.length > 0 ||
    filterDesc.trim().length > 0 ||
    searchInput.trim().length > 0;

  const clearAllFilters = () => {
    setFilterWP([]);
    setFilterAction([]);
    setFilterType([]);
    setFilterStatus([]);
    setFilterMonth([]);
    setFilterPublic([]);
    setFilterDoc([]);
    setFilterDesc("");
    setSearchInput("");
  };

  const handleRowClick = (actionId: number, actionSubId: string | null) => {
    sessionStorage.setItem("actionModalReturnUrl", "/milestones");
    const param = actionSubId ? `${actionId}${actionSubId}` : `${actionId}`;
    router.push(`/milestones?action=${param}&tab=milestones`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-3">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Milestones</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {rows.length} milestones across all actions
          </p>
        </div>
        {sortedRows.length !== rows.length && (
          <span className="mb-0.5 text-sm text-gray-400">
            {sortedRows.length} of {rows.length} shown
          </span>
        )}
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search milestones..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-80 rounded-md border border-input bg-background px-3 pl-9 text-sm outline-none focus:border-un-blue"
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
            className="flex h-9 items-center gap-1.5 rounded-md border border-un-blue/20 bg-un-blue/5 px-3 text-sm font-medium text-un-blue transition-colors hover:bg-un-blue/10"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              {/* WP */}
              <th className="w-14 py-3 pr-2 pl-4 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSort("work_package_id")}
                    className="inline-flex items-center uppercase hover:text-un-blue"
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
                    onToggle={(v) => toggle(setFilterWP, v)}
                    renderOption={(id) => `WP ${id}`}
                    isOpen={openFilters.wp ?? false}
                    onOpenChange={(o) => setFilter("wp", o)}
                    maxWidth="w-36"
                  />
                </div>
              </th>

              {/* Action */}
              <th className="px-2 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSort("action_id")}
                    className="inline-flex items-center uppercase hover:text-un-blue"
                  >
                    Action
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
                    onToggle={(v) => toggle(setFilterAction, v)}
                    renderOption={(a) => `Action ${a}`}
                    isOpen={openFilters.action ?? false}
                    onOpenChange={(o) => setFilter("action", o)}
                  />
                </div>
              </th>

              {/* Type */}
              <th className="px-2 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSort("milestone_type")}
                    className="inline-flex items-center uppercase hover:text-un-blue"
                  >
                    Type
                    <SortIcon
                      column="milestone_type"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                  <MultiSelectFilter
                    filterKey="type"
                    options={uniqueTypes}
                    selected={filterType}
                    onToggle={(v) => toggle(setFilterType, v)}
                    renderOption={(t) => MILESTONE_TYPE_LABELS[t] ?? t}
                    isOpen={openFilters.type ?? false}
                    onOpenChange={(o) => setFilter("type", o)}
                    maxWidth="w-40"
                  />
                </div>
              </th>

              {/* Visibility */}
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <span>Visibility</span>
                  <MultiSelectFilter
                    filterKey="public"
                    options={["Public", "Internal"]}
                    selected={filterPublic}
                    onToggle={(v) => toggle(setFilterPublic, v)}
                    renderOption={(v) => v}
                    isOpen={openFilters.public ?? false}
                    onOpenChange={(o) => setFilter("public", o)}
                    maxWidth="w-36"
                  />
                </div>
              </th>

              {/* Description */}
              <th className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <span>Description</span>
                  <Popover
                    open={openFilters.desc ?? false}
                    onOpenChange={(o) => setFilter("desc", o)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilter("desc", !(openFilters.desc ?? false));
                        }}
                        className={`flex h-6 w-6 items-center justify-center rounded border-0 bg-transparent p-0 transition-colors hover:bg-gray-100 ${filterDesc.trim() ? "text-un-blue" : "text-gray-400"}`}
                        aria-label="Filter description"
                      >
                        <Filter className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 p-2"
                      align="start"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search description..."
                          value={filterDesc}
                          onChange={(e) => setFilterDesc(e.target.value)}
                          className="h-8 w-full rounded border border-gray-200 px-2 pr-6 text-sm outline-none focus:border-un-blue"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        {filterDesc && (
                          <button
                            type="button"
                            onClick={() => setFilterDesc("")}
                            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </th>

              {/* Deadline */}
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSort("deadline")}
                    className="inline-flex items-center uppercase hover:text-un-blue"
                  >
                    Deadline
                    <SortIcon
                      column="deadline"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                  <MultiSelectFilter
                    filterKey="month"
                    options={uniqueMonthKeys}
                    selected={filterMonth}
                    onToggle={(v) => toggle(setFilterMonth, v)}
                    renderOption={(k) => formatMonthLabel(k)}
                    isOpen={openFilters.month ?? false}
                    onOpenChange={(o) => setFilter("month", o)}
                    maxWidth="w-44"
                  />
                </div>
              </th>

              {/* Status */}
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <MultiSelectFilter
                    filterKey="status"
                    options={[...uniqueStatuses]}
                    selected={filterStatus}
                    onToggle={(v) => toggle(setFilterStatus, v)}
                    renderOption={(s) => s}
                    isOpen={openFilters.status ?? false}
                    onOpenChange={(o) => setFilter("status", o)}
                  />
                </div>
              </th>

              {/* Public Progress */}
              <th className="px-4 py-3 whitespace-nowrap">
                <span>Progress</span>
              </th>

              {/* Doc submitted */}
              <th className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <span>Deliverable</span>
                  <MultiSelectFilter
                    filterKey="doc"
                    options={["Submitted", "Not submitted"]}
                    selected={filterDoc}
                    onToggle={(v) => toggle(setFilterDoc, v)}
                    renderOption={(v) => v}
                    isOpen={openFilters.doc ?? false}
                    onOpenChange={(o) => setFilter("doc", o)}
                    maxWidth="w-44"
                  />
                </div>
              </th>

              <th className="w-8 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  No milestones found
                </td>
              </tr>
            ) : (
              sortedRows.map((r) => {
                const statusConfig = getStatusConfig(r);
                const currentStatusValue = getCurrentStatus(r);
                const isSaving = savingId === r.milestone_id;
                const pastDue =
                  isPastDue(r.deadline) && !r.milestone_document_submitted;

                return (
                  <tr
                    key={r.milestone_id}
                    onClick={() => handleRowClick(r.action_id, r.action_sub_id)}
                    className="cursor-pointer transition-colors hover:bg-sky-50/50"
                  >
                    {/* WP */}
                    <td className="py-2.5 pr-2 pl-4 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded bg-gray-100 px-1.5 py-0.5 text-sm font-medium text-gray-700 tabular-nums">
                        {r.work_package_id}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded bg-un-blue/10 px-1.5 py-0.5 text-sm font-semibold text-un-blue tabular-nums">
                        {actionLabel(r.action_id, r.action_sub_id)}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs leading-tight font-medium text-slate-500">
                        {r.is_public
                          ? "Public"
                          : (MILESTONE_TYPE_LABELS[r.milestone_type] ??
                            r.milestone_type)}
                      </span>
                    </td>

                    {/* Visibility */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs leading-tight font-medium ${r.is_public ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"}`}>
                        {r.is_public ? "Public" : "Internal"}
                      </span>
                    </td>

                    {/* Description */}
                    <td
                      className="px-4 py-2.5 align-top"
                      style={{ maxWidth: "420px" }}
                    >
                      {r.description ? (
                        <p className="line-clamp-2 text-xs leading-snug text-gray-600">
                          {r.description}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Deadline */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.deadline ? (
                        <span
                          className={`flex items-center gap-1 text-sm tabular-nums ${pastDue ? "font-medium text-red-600" : "text-slate-500"}`}
                        >
                          {formatShortDate(r.deadline)}
                          {pastDue && (
                            <span
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700"
                              title="Past due"
                            >
                              !
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400 italic">
                          No deadline
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            disabled={isSaving}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border ${statusConfig.pill} h-6 px-2.5 text-xs font-medium transition-opacity hover:opacity-75 disabled:opacity-50`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusConfig.dot}`} />
                            {statusConfig.label}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          {r.is_public ? (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "draft")} disabled={currentStatusValue === "draft"}>
                                <span className="flex w-full items-center justify-between">Draft {currentStatusValue === "draft" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "needs_ola_review")} disabled={currentStatusValue === "needs_ola_review"}>
                                <span className="flex w-full items-center justify-between">Needs OLA review {currentStatusValue === "needs_ola_review" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "reviewed_by_ola")} disabled={currentStatusValue === "reviewed_by_ola"}>
                                <span className="flex w-full items-center justify-between">Reviewed by OLA {currentStatusValue === "reviewed_by_ola" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "finalized")} disabled={currentStatusValue === "finalized"}>
                                <span className="flex w-full items-center justify-between">Finalized {currentStatusValue === "finalized" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "draft")} disabled={currentStatusValue === "draft"}>
                                <span className="flex w-full items-center justify-between">Draft {currentStatusValue === "draft" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "no_submission")} disabled={currentStatusValue === "draft"}>
                                <span className="flex w-full items-center justify-between">No Submission {currentStatusValue === "draft" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "needs_attention")} disabled={currentStatusValue === "needs_attention"}>
                                <span className="flex w-full items-center justify-between">Needs Attention {currentStatusValue === "needs_attention" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "attention_to_timeline")} disabled={currentStatusValue === "attention_to_timeline"}>
                                <span className="flex w-full items-center justify-between">Attention to timeline {currentStatusValue === "attention_to_timeline" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "confirmation_needed")} disabled={currentStatusValue === "confirmation_needed"}>
                                <span className="flex w-full items-center justify-between">Confirmation needed {currentStatusValue === "confirmation_needed" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "approved")} disabled={currentStatusValue === "approved"}>
                                <span className="flex w-full items-center justify-between">Approved {currentStatusValue === "approved" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(r.milestone_id, "finalized")} disabled={currentStatusValue === "finalized"}>
                                <span className="flex w-full items-center justify-between">Finalized {currentStatusValue === "finalized" && <Check className="h-3 w-3" />}</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>

                    {/* Public Progress */}
                    <td className="px-4 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {r.is_public ? (() => {
                        const currentProgress = r.public_progress ?? "in_progress";
                        const progressConf = PUBLIC_PROGRESS_CONFIG[currentProgress];
                        const progressLabels: Record<string, string> = { completed: "Completed", in_progress: "In progress", delayed: "Delayed" };
                        return (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                disabled={isSaving}
                                className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-opacity hover:opacity-75 disabled:opacity-50 ${progressConf.pill}`}
                              >
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${progressConf.dot}`} />
                                {progressConf.label}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-36">
                              {(["completed", "in_progress", "delayed"] as const).map((v) => (
                                <DropdownMenuItem key={v} onClick={() => handlePublicProgressChange(r.milestone_id, v)} disabled={currentProgress === v}>
                                  <span className="flex w-full items-center justify-between">
                                    {progressLabels[v]}
                                    {currentProgress === v && <Check className="h-3 w-3" />}
                                  </span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })() : <span className="text-sm text-slate-300">—</span>}
                    </td>

                    {/* Doc submitted */}
                    <td className="px-4 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {!r.is_public ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              disabled={isSaving}
                              className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-opacity hover:opacity-75 disabled:opacity-50 ${
                                r.milestone_document_submitted
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.milestone_document_submitted ? "bg-emerald-500" : "bg-slate-300"}`} />
                              {r.milestone_document_submitted ? "Submitted" : "Not submitted"}
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuItem onClick={() => handleDocChange(r.milestone_id, false)} disabled={!r.milestone_document_submitted}>
                              <span className="flex w-full items-center justify-between">Not submitted {!r.milestone_document_submitted && <Check className="h-3 w-3" />}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDocChange(r.milestone_id, true)} disabled={r.milestone_document_submitted}>
                              <span className="flex w-full items-center justify-between">Submitted {r.milestone_document_submitted && <Check className="h-3 w-3" />}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>

                    {/* Chevron */}
                    <td className="px-3 py-2.5 text-gray-400">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Status change confirm dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, milestoneId: null, status: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Milestone Status</DialogTitle>
            <DialogDescription>
              {confirmDialog.status && STATUS_CONFIRM_MESSAGES[confirmDialog.status]}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, milestoneId: null, status: null })}
            >
              Cancel
            </Button>
            <Button onClick={confirmStatusChange} className="bg-un-blue hover:bg-un-blue/90">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
