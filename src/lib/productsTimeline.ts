import timelineData from "@data/products_timeline.json";

interface TimelineEntry {
  workPackages: number[];
  text: string;
  actions?: number[];
  note?: string;
}

interface TimelineMonth {
  month: string;
  entries: TimelineEntry[];
}

interface TimelineCategory {
  category: string;
  description: string;
  items: TimelineMonth[];
}

const data = timelineData as TimelineCategory[];

// action number → set of months
const monthsByAction = new Map<number, Set<string>>();
// WP number → set of months (for entries without action numbers)
const monthsByWp = new Map<number, Set<string>>();
// month → count of unique WPs (for chart display)
const wpsByMonth = new Map<string, Set<number>>();

for (const cat of data) {
  for (const item of cat.items) {
    if (!wpsByMonth.has(item.month)) {
      wpsByMonth.set(item.month, new Set());
    }
    const wpSet = wpsByMonth.get(item.month)!;

    for (const entry of item.entries) {
      for (const wp of entry.workPackages) {
        wpSet.add(wp);
      }

      if (entry.actions && entry.actions.length > 0) {
        for (const a of entry.actions) {
          if (!monthsByAction.has(a)) monthsByAction.set(a, new Set());
          monthsByAction.get(a)!.add(item.month);
        }
      } else {
        // WP-level entry (e.g. official reports) — applies to all actions in these WPs
        for (const wp of entry.workPackages) {
          if (!monthsByWp.has(wp)) monthsByWp.set(wp, new Set());
          monthsByWp.get(wp)!.add(item.month);
        }
      }
    }
  }
}

export function getProductMonths(): { month: string; count: number }[] {
  const monthOrder = [
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "Later or TBD",
  ];
  return monthOrder
    .filter((m) => wpsByMonth.has(m))
    .map((m) => ({
      month: m,
      count: wpsByMonth.get(m)!.size,
    }));
}

export function actionMatchesProductMonths(
  actionNumber: number,
  wpNumber: number | "",
  selectedMonths: string[],
): boolean {
  if (selectedMonths.length === 0) return true;

  // Check action-level match
  const actionMonths = monthsByAction.get(actionNumber);
  if (actionMonths) {
    if (selectedMonths.some((m) => actionMonths.has(m))) return true;
  }

  // Check WP-level match (for entries without action numbers, like official reports)
  if (typeof wpNumber === "number") {
    const wpMonths = monthsByWp.get(wpNumber);
    if (wpMonths) {
      if (selectedMonths.some((m) => wpMonths.has(m))) return true;
    }
  }

  return false;
}
