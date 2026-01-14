"use client";

import { useMemo, useState } from "react";
import type { WorkPackage } from "@/types";
import { Progress } from "@/components/ui/progress";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ActionItem } from "@/components/ActionCard";

interface WorkPackageProgressProps {
  workPackages: WorkPackage[];
}

export function WorkPackageProgress({
  workPackages,
}: WorkPackageProgressProps) {
  const [isOpen, setIsOpen] = useState(true);
  // Track which work packages are expanded
  const [openWorkPackages, setOpenWorkPackages] = useState<Set<string>>(
    new Set(),
  );

  // Calculate progress per work package
  const wpProgress = useMemo(() => {
    return workPackages
      .map((wp) => {
        const totalActions = wp.actions.length;
        // Simulate progress: 20% completed, 40% in progress, 40% planned
        const completed = Math.floor(totalActions * 0.2);
        const inProgress = Math.floor(totalActions * 0.4);
        const progressPercentage =
          totalActions > 0
            ? ((completed + inProgress * 0.5) / totalActions) * 100
            : 0;

        return {
          number: wp.number,
          name: wp.name,
          totalActions,
          completed,
          inProgress,
          progress: Math.round(progressPercentage),
        };
      })
      .sort((a, b) => {
        // Sort by number if available, otherwise by name
        if (typeof a.number === "number" && typeof b.number === "number") {
          return a.number - b.number;
        }
        return a.name.localeCompare(b.name);
      });
  }, [workPackages]);

  const toggleWorkPackage = (wpKey: string) => {
    setOpenWorkPackages((prev) => {
      const next = new Set(prev);
      if (next.has(wpKey)) {
        next.delete(wpKey);
      } else {
        next.add(wpKey);
      }
      return next;
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-gray-200 bg-white">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            Work Package Progress
          </h3>
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 px-6 pb-6">
            {wpProgress.map((wp) => {
              const fullWp = workPackages.find(
                (p) => p.number === wp.number && p.name === wp.name,
              );
              const wpKey = `${wp.number}-${wp.name}`;
              const isWpOpen = openWorkPackages.has(wpKey);

              return (
                <Collapsible
                  key={wpKey}
                  open={isWpOpen}
                  onOpenChange={() => toggleWorkPackage(wpKey)}
                >
                  <div className="rounded-lg border border-gray-100 bg-gray-50 transition-all hover:border-un-blue/30 hover:bg-un-blue/5">
                    <CollapsibleTrigger className="w-full p-4 text-left">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {typeof wp.number === "number" && (
                              <span className="flex h-6 w-6 items-center justify-center rounded bg-un-blue/10 text-xs font-semibold text-un-blue">
                                {wp.number}
                              </span>
                            )}
                            <h4 className="font-medium text-gray-900">
                              {wp.name}
                            </h4>
                            <ChevronDown
                              className={`h-4 w-4 text-gray-500 transition-transform ${
                                isWpOpen ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {wp.totalActions} actions • {wp.completed} completed
                            • {wp.inProgress} in progress
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {wp.progress}%
                          </p>
                          <p className="text-xs text-gray-500">Progress</p>
                        </div>
                      </div>
                      <Progress value={wp.progress} className="h-2" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-3 border-t border-gray-200 bg-white px-4 py-4">
                        {fullWp?.actions.map((action) => (
                          <ActionItem
                            key={action.actionNumber}
                            action={action}
                            workPackageNumber={fullWp.number}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
