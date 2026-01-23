import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { abbreviationMap } from "@/constants/abbreviations";
import { cn, naturalSort } from "@/lib/utils";
import { SquareCheckBig, Clock } from "lucide-react";

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
    "border border-transparent bg-slate-300 text-slate-800 hover:bg-slate-400",
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
  /** When true, returns badges without a wrapper div (for inline flow) */
  inline?: boolean;
  /** Label to show in tooltip before the full name (e.g., "Leads", "Action Leads", "Team Members") */
  tooltipLabel?: string;
}

export function LabelBadge({
  items,
  variant = "primary",
  onSelect,
  tooltips,
  className,
  inline = false,
  tooltipLabel,
}: LabelBadgeProps) {
  if (items.length === 0) return null;

  const sortedItems = naturalSort(items);

  const badges = sortedItems.map((item, idx) => {
    const fullName = tooltips?.[item] || abbreviationMap[item] || item;
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
          <div className="space-y-1">
            {tooltipLabel && (
              <p className="text-xs font-semibold text-gray-700">{tooltipLabel}</p>
            )}
            <p className="text-sm text-gray-600">{fullName}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  });

  // Return badges without wrapper for inline flow
  if (inline) {
    return <>{badges}</>;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {badges}
    </div>
  );
}

// ============================================================================
// Specialized Wrappers
// ============================================================================

interface LeadBadgeProps {
  leads: string[];
  onSelect?: (lead: string[]) => void;
  /** When true, returns badges without a wrapper div (for inline flow) */
  inline?: boolean;
}

/** Work Package Leads - primary (solid blue) */
export function WPLeadsBadge({ leads, onSelect, inline }: LeadBadgeProps) {
  return <LabelBadge items={leads} variant="primary" onSelect={onSelect} inline={inline} tooltipLabel="Lead" />;
}

/** Action Leads - secondary (outlined blue) */
export function ActionLeadsBadge({ leads, onSelect, inline }: LeadBadgeProps) {
  return <LabelBadge items={leads} variant="secondary" onSelect={onSelect} inline={inline} tooltipLabel="Action Lead" />;
}

/** Team Members - tertiary (dashed, subtle) */
export function TeamBadge({ leads, onSelect, inline }: LeadBadgeProps) {
  return <LabelBadge items={leads} variant="tertiary" onSelect={onSelect} inline={inline} tooltipLabel="Team Member" />;
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
  /** Size variant: "sm" for compact (cards), "default" for larger (modals) */
  size?: "sm" | "default";
}

/**
 * Decision Status Badge - shows amber for "Further Work Ongoing" or green for "Decision Taken"
 */
export function DecisionStatusBadge({ status, size = "default" }: DecisionStatusBadgeProps) {
  if (!status) return null;

  const isDecisionTaken = status.toLowerCase() === "decision taken";
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        isSmall ? "gap-1 px-2 py-0.5 text-xs" : "gap-1.5 px-3 py-1 text-sm",
        isDecisionTaken
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700",
      )}
    >
      {isDecisionTaken ? (
        <SquareCheckBig className={isSmall ? "h-3 w-3" : "h-4 w-4"} />
      ) : (
        <Clock className={isSmall ? "h-3 w-3" : "h-4 w-4"} />
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
