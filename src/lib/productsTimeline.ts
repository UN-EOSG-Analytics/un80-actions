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

const CATEGORY_KEYS: Record<string, string> = {
  "Secretary-General's and other official reports": "reports",
  "Secretary-General's information briefs": "briefs",
  "Operational tools and products": "tools",
};

const CATEGORY_LABELS: Record<string, string> = {
  reports: "SG reports",
  briefs: "SG information briefs",
  tools: "Operational tools",
};

// action number → set of months
const monthsByAction = new Map<number, Set<string>>();
// WP number → set of months (for entries without action numbers)
const monthsByWp = new Map<number, Set<string>>();
// month → count of unique WPs (for chart display)
const wpsByMonth = new Map<string, Set<number>>();
// action number → set of category keys
const categoriesByAction = new Map<number, Set<string>>();
// WP number → set of category keys (for entries without action numbers)
const categoriesByWp = new Map<number, Set<string>>();

for (const cat of data) {
  const catKey = CATEGORY_KEYS[cat.category];

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
          if (!categoriesByAction.has(a))
            categoriesByAction.set(a, new Set());
          categoriesByAction.get(a)!.add(catKey);
        }
      } else {
        // WP-level entry (e.g. official reports) — applies to all actions in these WPs
        for (const wp of entry.workPackages) {
          if (!monthsByWp.has(wp)) monthsByWp.set(wp, new Set());
          monthsByWp.get(wp)!.add(item.month);
          if (!categoriesByWp.has(wp)) categoriesByWp.set(wp, new Set());
          categoriesByWp.get(wp)!.add(catKey);
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

export function getProductCategories(): { key: string; label: string }[] {
  return Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    key,
    label,
  }));
}

export function actionMatchesProductCategories(
  actionNumber: number,
  wpNumber: number | "",
  selectedCategories: string[],
): boolean {
  if (selectedCategories.length === 0) return true;

  const actionCats = categoriesByAction.get(actionNumber);
  if (actionCats && selectedCategories.some((c) => actionCats.has(c)))
    return true;

  if (typeof wpNumber === "number") {
    const wpCats = categoriesByWp.get(wpNumber);
    if (wpCats && selectedCategories.some((c) => wpCats.has(c))) return true;
  }

  return false;
}
