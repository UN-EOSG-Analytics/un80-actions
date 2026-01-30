import { SquareCheckBig, Clock, type LucideIcon } from "lucide-react";

/**
 * Action status values matching the PostgreSQL enum `public_action_status`
 */
export const ACTION_STATUS = {
  FURTHER_WORK_ONGOING: "Further work ongoing",
  DECISION_TAKEN: "Decision taken",
} as const;

export type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];

interface StatusStyleConfig {
  label: string;
  badge: string;
  icon: {
    component: LucideIcon;
    className: string;
  };
}

/**
 * Get display styles for an action status value.
 * Returns colors, icon, and label for rendering status badges.
 */
export function getStatusStyles(
  status: string | null | undefined,
): StatusStyleConfig {
  const normalizedStatus = status?.toLowerCase().trim();

  if (normalizedStatus === "decision taken") {
    return {
      label: "Decision taken",
      badge: "bg-green-100 text-green-800 border border-green-200",
      icon: {
        component: SquareCheckBig,
        className: "text-green-600",
      },
    };
  }

  // Default: "Further work ongoing" or any other value
  return {
    label: "Further work ongoing",
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    icon: {
      component: Clock,
      className: "text-amber-600",
    },
  };
}
