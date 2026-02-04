"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { formatUNDate } from "@/lib/format-date";
import { Badge } from "@/components/ui/badge";
import type { MilestoneViewRow, MilestoneViewCell } from "@/features/milestones/queries";

function actionLabel(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

/** Priority: Needs OLA review > Needs attention > Draft */
function getMilestoneStatusLabel(row: MilestoneViewRow): string | null {
  const cells = [row.public_milestone, row.first_milestone, row.final_milestone];
  let needsOla = false;
  let needsAttention = false;
  let draft = false;
  for (const c of cells) {
    if (!c) continue;
    if (c.needs_ola_review) needsOla = true;
    if (c.needs_attention) needsAttention = true;
    if (c.is_draft) draft = true;
  }
  if (needsOla) return "Needs OLA review";
  if (needsAttention) return "Needs attention";
  if (draft) return "Draft";
  return null;
}

const STATUS_STYLES: Record<string, { badge: string }> = {
  "Needs OLA review": { badge: "bg-amber-100 text-amber-800 border-amber-200" },
  "Needs attention": { badge: "bg-orange-100 text-orange-800 border-orange-200" },
  "Draft": { badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

function StatusCell({ label }: { label: string | null }) {
  if (!label) {
    return <span className="text-gray-400">—</span>;
  }
  const style = STATUS_STYLES[label]?.badge ?? "bg-gray-100 text-gray-700";
  return (
    <Badge variant="outline" className={`text-xs font-medium ${style}`}>
      {label}
    </Badge>
  );
}

function MilestoneCell({ cell }: { cell: MilestoneViewCell | null }) {
  if (!cell) {
    return <span className="text-gray-400">—</span>;
  }
  const hasDesc = cell.description?.trim();
  const hasDeadline = cell.deadline?.trim();
  if (!hasDesc && !hasDeadline) {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <div className="space-y-0.5">
      {hasDesc && (
        <p className="text-gray-700 text-sm line-clamp-2">{cell.description}</p>
      )}
      {hasDeadline && (
        <p className="text-xs text-gray-500">{formatUNDate(cell.deadline)}</p>
      )}
    </div>
  );
}

interface MilestonesTableProps {
  rows: MilestoneViewRow[];
}

export function MilestonesTable({ rows }: MilestonesTableProps) {
  const router = useRouter();

  const handleRowClick = (actionId: number, actionSubId: string | null) => {
    sessionStorage.setItem("actionModalReturnUrl", window.location.href);
    const actionParam = actionSubId ? `${actionId}${actionSubId}` : `${actionId}`;
    router.push(`/?action=${actionParam}`, { scroll: false });
  };

  return (
    <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
            <th className="px-3 py-3 whitespace-nowrap w-14">WP</th>
            <th className="px-4 py-3 whitespace-nowrap w-20">Action Number</th>
            <th className="px-4 py-3">Public milestone</th>
            <th className="px-4 py-3">First milestone</th>
            <th className="px-4 py-3">Final milestone</th>
            <th className="px-4 py-3 whitespace-nowrap">Status</th>
            <th className="w-10 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-12 text-center text-gray-400"
              >
                No actions found
              </td>
            </tr>
          ) : (
            rows.map((r) => (
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
                  <StatusCell label={getMilestoneStatusLabel(r)} />
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
  );
}
