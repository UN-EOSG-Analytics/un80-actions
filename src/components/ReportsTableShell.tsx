"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, Star } from "lucide-react";
import type { ActionsTableData } from "@/types";
import { Badge } from "@/components/ui/badge";

function actionLabel(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

interface ReportsTableShellProps {
  data: ActionsTableData;
}

export function ReportsTableShell({ data }: ReportsTableShellProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");

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

  const filteredActions = useMemo(() => {
    if (!hasSearch) return allActions;
    return allActions.filter((a) => {
      const matches = (s: string) => s.toLowerCase().includes(search);
      return (
        matches(a.work_package_title) ||
        matches(String(a.work_package_id)) ||
        matches(String(a.action_id)) ||
        matches(a.indicative_action)
      );
    });
  }, [allActions, hasSearch, search]);

  const handleActionClick = (actionId: number) => {
    // Store current URL for return navigation
    sessionStorage.setItem("actionModalReturnUrl", window.location.href);
    router.push(`/?action=${actionId}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
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
        <p className="ml-auto text-sm text-gray-500">
          {filteredActions.length} action
          {filteredActions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Simple Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              <th className="w-20 px-4 py-3">Action</th>
              <th className="w-24 px-4 py-3">WP</th>
              <th className="px-4 py-3">Indicative Activity</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredActions.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  No actions found
                </td>
              </tr>
            ) : (
              filteredActions.map((a) => (
                <tr
                  key={`${a.action_id}-${a.action_sub_id ?? ""}`}
                  onClick={() => handleActionClick(a.action_id)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-un-blue">
                    {actionLabel(a.action_id, a.action_sub_id)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.work_package_id}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="line-clamp-2">{a.indicative_action}</span>
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
