"use client";

import { Badge } from "@/components/ui/badge";
import type { MilestoneVersion } from "@/features/milestones/queries";
import { formatUNDate } from "@/lib/format-date";
import { History, Loader2 } from "lucide-react";

interface MilestoneVersionHistoryProps {
  versions: MilestoneVersion[];
  loading: boolean;
}

export function MilestoneVersionHistory({
  versions,
  loading,
}: MilestoneVersionHistoryProps) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Version History
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : versions.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400 italic">
          No version history yet
        </p>
      ) : (
        <div className="space-y-2 rounded-md bg-slate-50 p-3">
          {versions.map((version) => {
            const changedAt = new Date(version.changed_at);
            return (
              <div
                key={version.id}
                className="rounded border border-slate-200 bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-slate-600">
                      {changedAt.toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}{" "}
                      at{" "}
                      {changedAt.toLocaleTimeString(undefined, {
                        timeStyle: "short",
                      })}
                    </span>
                    {version.changed_by && (
                      <span className="text-xs text-slate-400">
                        by {version.changed_by}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {version.change_type}
                  </Badge>
                </div>
                {version.description && (
                  <p className="mb-1 text-xs text-slate-700">
                    {version.description}
                  </p>
                )}
                {version.updates && (
                  <p className="text-xs text-slate-500 italic">
                    {version.updates}
                  </p>
                )}
                {version.deadline && (
                  <p className="mt-1 text-xs text-slate-500">
                    Deadline: {formatUNDate(version.deadline)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
