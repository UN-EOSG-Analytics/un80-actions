import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { abbreviationMap } from "@/constants/abbreviations";
import { cn, naturalSort } from "@/lib/utils";
import { CircleCheck, Clock } from "lucide-react";

/**
 * Badge variants (visual hierarchy):
 * - primary: Solid UN blue, white text (most prominent)
 * - secondary: UN blue outline with light fill
 * - tertiary: Dashed outline, minimal fill (least prominent)
 * - muted: Solid slate fill (neutral info)
 */
export type BadgeVariant = "primary" | "secondary" | "tertiary" | "muted";

const variantStyles: Record<BadgeVariant, string> = {
  primary:
    "border border-transparent bg-un-blue text-white hover:bg-un-blue/90",
  secondary:
    "border border-un-blue/50 bg-un-blue/15 text-un-blue hover:bg-un-blue/25",
  tertiary:
    "border border-un-blue/20 bg-un-blue/5 text-un-blue/70 hover:bg-un-blue/10 hover:border-un-blue/30",
  muted:
    "border border-transparent bg-slate-200 text-slate-700 hover:bg-slate-300",
};

// ============================================================================
// Base Component
// ============================================================================

interface LabelBadgeProps {
  items: string[];
  variant?: BadgeVariant;
  onSelect?: (item: string[]) => void;
  tooltips?: Record<string, string>;
  className?: string;
}

export function LabelBadge({
  items,
  variant = "primary",
  onSelect,
  tooltips,
  className,
}: LabelBadgeProps) {
  if (items.length === 0) return null;

  const sortedItems = naturalSort(items);

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {sortedItems.map((item, idx) => {
        const tooltip = tooltips?.[item] || abbreviationMap[item] || item;
        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "transition-all duration-150",
                  variantStyles[variant],
                  onSelect ? "cursor-pointer" : "cursor-help",
                )}
                onClick={(e) => {
                  if (onSelect) {
                    e.stopPropagation();
                    onSelect([item]);
                  }
                }}
              >
                {item}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm text-gray-600">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ============================================================================
// Specialized Wrappers
// ============================================================================

interface LeadBadgeProps {
  leads: string[];
  onSelect?: (lead: string[]) => void;
}

/** Work Package Leads - primary (solid blue) */
export function WPLeadsBadge({ leads, onSelect }: LeadBadgeProps) {
  return <LabelBadge items={leads} variant="primary" onSelect={onSelect} />;
}

/** Action Leads - secondary (outlined blue) */
export function ActionLeadsBadge({ leads, onSelect }: LeadBadgeProps) {
  return <LabelBadge items={leads} variant="secondary" onSelect={onSelect} />;
}

/** Team Members - tertiary (dashed, subtle) */
export function TeamBadge({ leads, onSelect }: LeadBadgeProps) {
  return <LabelBadge items={leads} variant="tertiary" onSelect={onSelect} />;
}

/** Workstream Labels - muted (slate fill) */
const workstreamTooltips: Record<string, string> = {
  WS1: "Workstream 1",
  WS2: "Workstream 2",
  WS3: "Workstream 3",
};

interface WorkstreamBadgeProps {
  workstreams: string[];
  onSelect?: (ws: string[]) => void;
}

export function WorkstreamBadge({
  workstreams,
  onSelect,
}: WorkstreamBadgeProps) {
  return (
    <LabelBadge
      items={workstreams}
      variant="muted"
      onSelect={onSelect}
      tooltips={workstreamTooltips}
    />
  );
}

interface WorkstreamLabelsProps {
  report: string[];
  onSelectWorkstream?: (workstream: string[]) => void;
}

/**
 * Filters report array for workstream values and displays them as badges.
 * Uses WorkstreamBadge for consistent styling.
 */
export function WorkstreamLabels({
  report,
  onSelectWorkstream,
}: WorkstreamLabelsProps) {
  const workstreams = ["WS1", "WS2", "WS3"] as const;
  const activeWorkstreams = workstreams.filter((ws) => report.includes(ws));

  if (activeWorkstreams.length === 0) return null;

  return (
    <WorkstreamBadge
      workstreams={activeWorkstreams}
      onSelect={onSelectWorkstream}
    />
  );
}

// ============================================================================
// Decision Status Badge
// ============================================================================

export type DecisionStatus = "decision taken" | "further work ongoing";

interface DecisionStatusBadgeProps {
  /** The decision status value */
  status: DecisionStatus | string | null | undefined;
}

/**
 * Decision Status Badge - shows amber for "Further Work Ongoing" or green for "Decision Taken"
 */
export function DecisionStatusBadge({ status }: DecisionStatusBadgeProps) {
  if (!status) return null;

  const isDecisionTaken = status.toLowerCase() === "decision taken";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isDecisionTaken
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700",
      )}
    >
      {isDecisionTaken ? (
        <CircleCheck className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span>{isDecisionTaken ? "Decision Taken" : "Further Work Ongoing"}</span>
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

/** Parse semicolon-separated string into array */
export function parseLeadsString(str: string | null): string[] {
  if (!str?.trim()) return [];
  return str
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
