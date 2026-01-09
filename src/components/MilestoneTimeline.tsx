"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { parseDate, formatDateMonthYear } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Milestone {
  label: string;
  deadline: string | null;
  isReached: boolean;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  if (!milestones || milestones.length === 0) {
    return null;
  }

  const now = new Date();

  return (
    <div className="relative space-y-0">
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const deadlineDate = milestone.deadline ? parseDate(milestone.deadline) : null;
        const isPast = deadlineDate ? deadlineDate < now : false;
        const isReached = milestone.isReached || isPast;

        return (
          <div key={index} className="relative flex items-start gap-4">
            {/* Vertical line connecting milestones */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[11px] top-8 w-0.5",
                  isReached ? "bg-un-blue" : "bg-gray-300"
                )}
                style={{ height: "calc(100% + 0.5rem)" }}
              />
            )}

            {/* Milestone icon */}
            <div className="relative z-10 flex shrink-0 items-center justify-center">
              {isReached ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-un-blue">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                  <Circle className="h-3 w-3 fill-gray-300 text-gray-300" />
                </div>
              )}
            </div>

            {/* Milestone content */}
            <div className="flex-1 pb-6">
              <div
                className={cn(
                  "flex flex-col gap-1",
                  isReached && "opacity-60"
                )}
              >
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-base font-medium text-gray-900",
                      isReached && "line-through"
                    )}
                  >
                    {milestone.label}
                  </p>
                  {!isReached && (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                {deadlineDate && (
                  <p className="text-sm text-gray-600">
                    {formatDateMonthYear(deadlineDate)}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

