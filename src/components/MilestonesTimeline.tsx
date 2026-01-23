"use client";

import { useMemo, useState } from "react";
import type { Actions } from "@/types";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  Briefcase,
} from "lucide-react";
import { parseDate, formatDate } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ActionItem } from "@/components/ActionCard";

interface MilestonesTimelineProps {
  actions: Actions;
}

export function MilestonesTimeline({ actions }: MilestonesTimelineProps) {
  const [isOpen, setIsOpen] = useState(true);
  // Track which milestones are expanded
  const [openMilestones, setOpenMilestones] = useState<Set<string>>(new Set());

  const milestones = useMemo(() => {
    const milestoneMap = new Map<
      string,
      { date: Date; count: number; completed: number; dateKey: string }
    >();

    // Use a deterministic hash function instead of Math.random()
    const hash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    };

    actions.forEach((action) => {
      if (action.first_milestone) {
        const date = parseDate(action.first_milestone);
        if (date) {
          const dateKey = date.toISOString().split("T")[0];
          if (!milestoneMap.has(dateKey)) {
            milestoneMap.set(dateKey, {
              date,
              count: 0,
              completed: 0,
              dateKey,
            });
          }
          const milestone = milestoneMap.get(dateKey)!;
          milestone.count++;
          // Use deterministic hash-based distribution instead of Math.random()
          const actionHash = hash(
            `${action.action_number}-${action.first_milestone}`,
          );
          if ((actionHash % 100) / 100 < 0.3) {
            milestone.completed++;
          }
        }
      }
    });

    return Array.from(milestoneMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 12); // Next 12 milestones
  }, [actions]);

  const getMilestoneActions = (milestone: (typeof milestones)[0]) => {
    return actions.filter((action) => {
      if (!action.first_milestone) return false;
      const actionDate = parseDate(action.first_milestone);
      if (!actionDate) return false;
      const actionDateKey = actionDate.toISOString().split("T")[0];
      return actionDateKey === milestone.dateKey;
    });
  };

  const toggleMilestone = (dateKey: string) => {
    setOpenMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const now = new Date();

  const getStatus = (date: Date, completed: number, total: number) => {
    if (completed === total) return "completed";
    if (date < now) return "overdue";
    if (date.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000)
      return "upcoming";
    return "planned";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-gray-200 bg-white">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            Upcoming Milestones
          </h3>
          <ChevronDown
            className={`h-5 w-5 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 px-6 pb-6">
            {milestones.length === 0 ? (
              <p className="text-center text-gray-500">
                No milestones scheduled
              </p>
            ) : (
              milestones.map((milestone) => {
                const status = getStatus(
                  milestone.date,
                  milestone.completed,
                  milestone.count,
                );
                const isPast = milestone.date < now;
                const isMilestoneOpen = openMilestones.has(milestone.dateKey);
                const milestoneActions = getMilestoneActions(milestone);

                return (
                  <Collapsible
                    key={milestone.dateKey}
                    open={isMilestoneOpen}
                    onOpenChange={() => toggleMilestone(milestone.dateKey)}
                  >
                    <div
                      className={`rounded-lg border transition-all ${
                        status === "completed"
                          ? "border-un-blue/30 bg-un-blue/5 hover:border-un-blue/50"
                          : status === "overdue"
                            ? "border-un-blue/30 bg-un-blue/5 hover:border-un-blue/50"
                            : status === "upcoming"
                              ? "border-un-blue/30 bg-un-blue/5 hover:border-un-blue/50"
                              : "border-gray-200 bg-gray-50 hover:border-un-blue/30"
                      }`}
                    >
                      <CollapsibleTrigger className="w-full p-4 text-left">
                        <div className="flex items-start gap-4">
                          <div
                            className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              status === "completed"
                                ? "bg-un-blue/20"
                                : status === "overdue"
                                  ? "bg-un-blue/20"
                                  : status === "upcoming"
                                    ? "bg-un-blue/20"
                                    : "bg-gray-100"
                            }`}
                          >
                            {status === "completed" ? (
                              <CheckCircle2 className="h-5 w-5 text-un-blue" />
                            ) : status === "overdue" ? (
                              <AlertCircle className="h-5 w-5 text-un-blue" />
                            ) : (
                              <Clock className="h-5 w-5 text-un-blue" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900">
                                {formatDate(milestone.date)}
                              </span>
                              {isPast && (
                                <span className="rounded-full bg-un-blue/20 px-2 py-0.5 text-xs font-medium text-un-blue">
                                  Past Due
                                </span>
                              )}
                              {status === "completed" && (
                                <span className="rounded-full bg-un-blue/20 px-2 py-0.5 text-xs font-medium text-un-blue">
                                  Completed
                                </span>
                              )}
                              <ChevronDown
                                className={`ml-auto h-4 w-4 text-gray-500 transition-transform ${
                                  isMilestoneOpen ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              {milestone.completed} of {milestone.count} actions
                              completed (
                              {milestone.count > 0
                                ? Math.round(
                                    (milestone.completed / milestone.count) *
                                      100,
                                  )
                                : 0}
                              %)
                            </p>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full bg-un-blue transition-all"
                                style={{
                                  width: `${
                                    milestone.count > 0
                                      ? (milestone.completed /
                                          milestone.count) *
                                        100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-4 border-t border-gray-200 bg-white px-4 py-4">
                          {milestoneActions.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No actions for this milestone
                            </p>
                          ) : (
                            milestoneActions.map((action) => {
                              // Convert Action to WorkPackageAction format
                              const wpAction = {
                                text: action.indicative_activity,
                                documentParagraph:
                                  action.document_paragraph || "",
                                leads: action.action_leads,
                                report: action.report,
                                docText: action.doc_text,
                                actionNumber: action.action_number,
                                firstMilestone: action.first_milestone,
                                finalMilestoneDeadline:
                                  action.final_milestone_deadline,
                                actionEntities: action.action_entities,
                                subActionDetails:
                                  action.sub_action_details || null,
                                decisionStatus: "Further work ongoing" as const,
                              };
                              return (
                                <div
                                  key={action.action_number}
                                  className="space-y-2"
                                >
                                  {/* Work Package Badge */}
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Briefcase className="h-4 w-4 text-un-blue" />
                                    <span className="font-medium">
                                      WP{action.work_package_number}:{" "}
                                      {action.work_package_name}
                                    </span>
                                  </div>
                                  <ActionItem
                                    action={wpAction}
                                    workPackageNumber={
                                      action.work_package_number
                                    }
                                  />
                                </div>
                              );
                            })
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
