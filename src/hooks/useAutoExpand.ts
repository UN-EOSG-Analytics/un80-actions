import { useEffect, useRef } from "react";
import type { WorkPackage } from "@/types";

/**
 * Auto-expands work package collapsibles when a filter becomes active and the
 * matching work packages are not already open.
 *
 * Uses an internal ref to track the last-processed key so the effect only runs
 * when the filter value actually changes, preventing infinite loops caused by
 * `openCollapsibles` updating after each expand call.
 *
 * @param depKey       - Serialized representation of the current filter value
 *                       (e.g. `selectedAction.sort().join(",")`). Changes
 *                       whenever the filter changes.
 * @param isActive     - Whether any filter value is currently selected.
 * @param filteredWorkPackages - Work packages currently visible.
 * @param openCollapsibles    - Set of already-open collapsible keys.
 * @param expandCollapsibles  - Callback to open a list of collapsible keys.
 * @param matchWP      - Predicate: returns true if this WP should be expanded.
 * @param onClear      - Optional callback invoked once when the filter is
 *                       cleared (e.g. to collapse all work packages).
 */
export function useAutoExpand(
  depKey: string,
  isActive: boolean,
  filteredWorkPackages: WorkPackage[],
  openCollapsibles: Set<string>,
  expandCollapsibles: (keys: string[]) => void,
  matchWP: (wp: WorkPackage) => boolean,
  onClear?: () => void,
) {
  const lastProcessedRef = useRef<string>("");
  // Keep matchWP in a ref so it never needs to be in the deps array, avoiding
  // unnecessary re-runs from inline arrow functions at call sites.
  const matchWPRef = useRef(matchWP);
  matchWPRef.current = matchWP;

  useEffect(() => {
    // Include data length in the key so we re-process if filteredWorkPackages
    // loads/changes after the initial mount (e.g. when a URL filter is present
    // on first render before data is fully computed).
    const stateKey = `${depKey}:${filteredWorkPackages.length}`;

    if (
      isActive &&
      filteredWorkPackages.length > 0 &&
      stateKey !== lastProcessedRef.current
    ) {
      const keysToExpand: string[] = [];

      filteredWorkPackages.forEach((wp, index) => {
        if (matchWPRef.current(wp)) {
          const key = `${wp.report.join("-")}-${wp.number || "empty"}-${index}`;
          if (!openCollapsibles.has(key)) {
            keysToExpand.push(key);
          }
        }
      });

      if (keysToExpand.length > 0) {
        expandCollapsibles(keysToExpand);
      }

      lastProcessedRef.current = stateKey;
    } else if (!isActive && lastProcessedRef.current !== "") {
      onClear?.();
      lastProcessedRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, isActive, filteredWorkPackages, openCollapsibles, expandCollapsibles, onClear]);
}
