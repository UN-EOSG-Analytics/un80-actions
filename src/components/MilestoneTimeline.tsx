"use client";

import { parseDate, formatDateMonthYear } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Milestone {
  label: string;
  deliveryDate: string | null;
  isReached: boolean;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  if (!milestones || milestones.length === 0) {
    return null;
  }

  return (
    <div className="relative space-y-0">
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const deliveryDateObj = milestone.deliveryDate
          ? parseDate(milestone.deliveryDate)
          : null;

        // All milestones shown the same way (uniform style)
        return (
          <div key={index} className="relative flex items-start gap-4">
            {/* Vertical line connecting milestones */}
            {!isLast && (
              <div
                className="absolute top-8 left-2.75 w-0.5 bg-gray-300"
                style={{ height: "calc(100% + 0.5rem)" }}
              />
            )}
            {/* Short dashed line for last item */}
            {isLast && (
              <div
                className="absolute top-8 left-2.5 w-1"
                style={{
                  height: "12px",
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, #cbd5e1 0px, #cbd5e1 3px, transparent 3px, transparent 6px)",
                }}
              />
            )}

            {/* Milestone icon - uniform style */}
            <div className="relative z-10 flex shrink-0 items-center justify-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-un-blue bg-white">
                <div className="h-2 w-2 rounded-full bg-un-blue" />
              </div>
            </div>

            {/* Milestone content */}
            <div className="flex-1 pb-2">
              <div className="flex flex-col gap-1">
                <p
                  className={cn(
                    "text-base font-medium text-gray-900",
                    milestone.label.toLowerCase() === "no longer relevant" &&
                      "text-slate-500 italic",
                  )}
                >
                  {milestone.label}
                </p>
                {deliveryDateObj && (
                  <p className="text-sm text-gray-600">
                    {formatDateMonthYear(deliveryDateObj)}
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
