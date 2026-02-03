"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ActionsTableProps {
  data: ActionsTableData;
}

export function ActionsTable({ data }: ActionsTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<SortField>("action_id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterWorkPackageId, setFilterWorkPackageId] = useState<number | "">("");
  const [filterRisk, setFilterRisk] = useState<RiskAssessment | "">("");

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

  // Unique work packages for filter dropdown (id + title for display)
  const workPackageOptions = useMemo(() => {
    const seen = new Set<number>();
    return data.workPackages
      .filter((wp) => {
        if (seen.has(wp.id)) return false;
        seen.add(wp.id);
        return true;
      })
      .map((wp) => ({ id: wp.id, title: wp.work_package_title }))
      .sort((a, b) => a.id - b.id);
  }, [data.workPackages]);

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
    if (filterWorkPackageId !== "") {
      list = list.filter((a) => a.work_package_id === filterWorkPackageId);
    }
    if (filterRisk !== "") {
      list = list.filter((a) => a.risk_assessment === filterRisk);
    }
    return list;
  }, [allActions, hasSearch, search, filterWorkPackageId, filterRisk]);

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
        <Select
          value={filterWorkPackageId === "" ? "all" : String(filterWorkPackageId)}
          onValueChange={(v) => setFilterWorkPackageId(v === "all" ? "" : Number(v))}
        >
          <SelectTrigger className="h-9 w-44 border-gray-200 bg-white text-gray-700">
            <SelectValue placeholder="Work package" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All work packages</SelectItem>
            {workPackageOptions.map((wp) => (
              <SelectItem key={wp.id} value={String(wp.id)}>
                WP {wp.id} – {wp.title.length > 30 ? wp.title.slice(0, 30) + "…" : wp.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterRisk === "" ? "all" : filterRisk}
          onValueChange={(v) => setFilterRisk((v === "all" ? "" : v) as RiskAssessment | "")}
        >
          <SelectTrigger className="h-9 w-40 border-gray-200 bg-white text-gray-700">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk levels</SelectItem>
            {RISK_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${opt.indicatorClass}`} aria-hidden />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-gray-500">
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
                <button
                  type="button"
                  onClick={() => handleSort("work_package_id")}
                  className="inline-flex items-center hover:text-un-blue"
                >
                  WP
                  <SortIcon column="work_package_id" />
                </button>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("work_package_title")}
                  className="inline-flex items-center hover:text-un-blue"
                >
                  WP TITLE
                  <SortIcon column="work_package_title" />
                </button>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("action_id")}
                  className="inline-flex items-center hover:text-un-blue"
                >
                  ACTION
                  <SortIcon column="action_id" />
                </button>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("indicative_action")}
                  className="inline-flex items-center hover:text-un-blue"
                >
                  INDICATIVE ACTION
                  <SortIcon column="indicative_action" />
                </button>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("tracking_status")}
                  className="inline-flex items-center hover:text-un-blue"
                >
                  TRACKING
                  <SortIcon column="tracking_status" />
                </button>
              </th>
              <th className="px-4 py-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort("public_action_status")}
                  className="inline-flex items-center hover:text-un-blue"
                >
                  PUBLIC STATUS
                  <SortIcon column="public_action_status" />
                </button>
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
              <th className="px-4 py-3 whitespace-nowrap">BIG TICKET</th>
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
