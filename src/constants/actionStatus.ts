import { Clock, SquareCheckBig } from "lucide-react";

/**
 * Action status types - canonical values used throughout the application
 */
export const ACTION_STATUS = {
  DECISION_TAKEN: "Decision taken",
  FURTHER_WORK_ONGOING: "Further work ongoing",
} as const;

export type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];

/**
 * Normalize status string for comparison (case-insensitive)
 */
export function normalizeStatus(
  status: string | null | undefined,
): string | null {
  return status?.toLowerCase() ?? null;
}

/**
 * Check if a status indicates decision taken
 */
export function isDecisionTaken(status: string | null | undefined): boolean {
  return normalizeStatus(status) === "decision taken";
}

/**
 * Color palette for action statuses
 * Designed to complement UN-blue while providing clear visual distinction
 *
 * Further Work Ongoing: Amber/yellow tones (warm, indicates active progress)
 * Decision Taken: Green tones (indicates completion)
 */
const STATUS_COLORS = {
  furtherWork: {
    // Badge colors (pill-style badges)
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    // Icon color
    icon: "text-amber-700",
    
    // Bar/progress colors
    bar: "bg-amber-100",
    barTrack: "bg-slate-100",
    // Count/number color
    count: "text-amber-700",
    // Hover/selected states
    selectedBg: "bg-amber-50",
    hoverBg: "hover:bg-amber-50/50",
    selectedText: "text-amber-700",
    hoverText: "group-hover:text-amber-700",
    selectedBar: "bg-amber-500",
  },
  decisionTaken: {
    // Badge colors (pill-style badges)
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    // Icon color
    icon: "text-green-700",
    // Bar/progress colors
    bar: "bg-green-500",
    barTrack: "bg-slate-100",
    // Count/number color
    count: "text-green-700",
    // Hover/selected states
    selectedBg: "bg-green-50",
    hoverBg: "hover:bg-green-50/50",
    selectedText: "text-green-700",
    hoverText: "group-hover:text-green-700",
    selectedBar: "bg-green-600",
  },
} as const;

/**
 * Style definitions for action status components
 * Single source of truth for all status-related styling
 */
export const ACTION_STATUS_STYLES = {
  // Badge styles (used in DecisionStatusBadge component)
  badge: {
    decisionTaken: `${STATUS_COLORS.decisionTaken.badgeBg} ${STATUS_COLORS.decisionTaken.badgeText}`,
    furtherWork: `${STATUS_COLORS.furtherWork.badgeBg} ${STATUS_COLORS.furtherWork.badgeText}`,
  },
  // Icon styles
  icon: {
    decisionTaken: {
      component: SquareCheckBig,
      className: STATUS_COLORS.decisionTaken.icon,
    },
    furtherWork: {
      component: Clock,
      className: STATUS_COLORS.furtherWork.icon,
    },
  },
  // Sidebar chart styles
  sidebar: {
    decisionTaken: {
      icon: STATUS_COLORS.decisionTaken.icon,
      count: STATUS_COLORS.decisionTaken.count,
      bar: STATUS_COLORS.decisionTaken.bar,
      barTrack: STATUS_COLORS.decisionTaken.barTrack,
      selectedBg: STATUS_COLORS.decisionTaken.selectedBg,
      hoverBg: STATUS_COLORS.decisionTaken.hoverBg,
      selectedText: STATUS_COLORS.decisionTaken.selectedText,
      hoverText: STATUS_COLORS.decisionTaken.hoverText,
      selectedBar: STATUS_COLORS.decisionTaken.selectedBar,
    },
    furtherWork: {
      icon: STATUS_COLORS.furtherWork.icon,
      count: STATUS_COLORS.furtherWork.count,
      bar: STATUS_COLORS.furtherWork.bar,
      barTrack: STATUS_COLORS.furtherWork.barTrack,
      selectedBg: STATUS_COLORS.furtherWork.selectedBg,
      hoverBg: STATUS_COLORS.furtherWork.hoverBg,
      selectedText: STATUS_COLORS.furtherWork.selectedText,
      hoverText: STATUS_COLORS.furtherWork.hoverText,
      selectedBar: STATUS_COLORS.furtherWork.selectedBar,
    },
  },
} as const;

/**
 * Get styles for a specific status
 * Returns all styling information needed for badges, icons, and sidebar charts
 */
export function getStatusStyles(status: string | null | undefined) {
  const isCompleted = isDecisionTaken(status);

  const iconStyles = isCompleted
    ? ACTION_STATUS_STYLES.icon.decisionTaken
    : ACTION_STATUS_STYLES.icon.furtherWork;

  const sidebarStyles = isCompleted
    ? ACTION_STATUS_STYLES.sidebar.decisionTaken
    : ACTION_STATUS_STYLES.sidebar.furtherWork;

  return {
    // Badge classes (combined bg + text)
    badge: isCompleted
      ? ACTION_STATUS_STYLES.badge.decisionTaken
      : ACTION_STATUS_STYLES.badge.furtherWork,
    // Icon component and className
    icon: {
      component: iconStyles.component,
      className: iconStyles.className,
    },
    // Sidebar-specific styles
    sidebar: sidebarStyles,
    // Display label
    label: isCompleted
      ? ACTION_STATUS.DECISION_TAKEN
      : ACTION_STATUS.FURTHER_WORK_ONGOING,
    // Boolean for conditional logic
    isCompleted,
  };
}
