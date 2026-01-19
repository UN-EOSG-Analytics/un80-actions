"use client";

import { CheckCircle2, Calendar, Users, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import type { Actions } from "@/types";
import { calculateLeaderSubmissionProgress } from "@/lib/progress";

interface LeaderSubmissionProgressProps {
  actions: Actions;
}

export function LeaderSubmissionProgress({
  actions,
}: LeaderSubmissionProgressProps) {
  const progress = useMemo(
    () => calculateLeaderSubmissionProgress(actions),
    [actions],
  );

  const firstMilestonePercentage = 0; // Always 0%
  const finalMilestonePercentage = 0; // Always 0%
  const focalPointsPercentage = Math.round((17 / 34) * 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-un-blue/20 to-un-blue/10">
          <TrendingUp className="h-5 w-5 text-un-blue" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            UN Leaders Submission Progress
          </h3>
          <p className="mt-0.5 text-sm text-gray-600">
            Tracking submissions from {progress.totalLeaders} UN System Leaders
          </p>
        </div>
      </div>

      {/* Progress Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ProgressCard
          label="Focal Points Submitted"
          value={17}
          total={34}
          percentage={focalPointsPercentage}
          icon={Users}
        />
        <ProgressCard
          label="First Milestone Submitted"
          value={0}
          total={87}
          percentage={firstMilestonePercentage}
          icon={CheckCircle2}
        />
        <ProgressCard
          label="Final Milestone Submitted"
          value={0}
          total={87}
          percentage={finalMilestonePercentage}
          icon={Calendar}
        />
      </div>
    </div>
  );
}

interface ProgressCardProps {
  label: string;
  value: number;
  total: number;
  percentage: number;
  icon: React.ComponentType<{ className?: string }>;
  separator?: string;
}

function ProgressCard({
    label,
    value,
    total,
    percentage,
    icon: Icon,
    separator = "of",
}: ProgressCardProps) {
    // Calculate circumference for circular progress (radius = 40, so circumference = 2 * π * 40 ≈ 251)
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-un-blue/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-un-blue/10 transition-colors group-hover:bg-un-blue/20">
                <Icon className="h-4 w-4 text-un-blue" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-600">{label}</h4>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {value}
                  </span>
                  <span className="text-sm text-gray-500">
                    {separator === "/"
                      ? `${separator}${total}`
                      : `${separator} ${total}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Circular Progress Indicator */}
            <div className="relative inline-flex items-center justify-center">
              <svg
                className="h-20 w-20 -rotate-90 transform"
                viewBox="0 0 100 100"
              >
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-gray-100"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="text-un-blue transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900">
                  {percentage}%
                </span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
