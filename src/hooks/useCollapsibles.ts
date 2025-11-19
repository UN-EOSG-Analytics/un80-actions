import { useState, useCallback } from "react";

/**
 * Custom hook to manage collapsible UI state
 * @returns Object containing collapsible state and handlers
 */
export function useCollapsibles() {
  const [openCollapsibles, setOpenCollapsibles] = useState<Set<string>>(
    new Set(),
  );
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] =
    useState<boolean>(false);
  const [openFilterCollapsibles, setOpenFilterCollapsibles] = useState<
    Set<string>
  >(new Set());
  const [showAllLeads, setShowAllLeads] = useState<boolean>(false);
  const [showAllWorkstreams, setShowAllWorkstreams] = useState<boolean>(false);
  const [showAllWorkpackages, setShowAllWorkpackages] =
    useState<boolean>(false);
  const [showAllLeaderChecklist, setShowAllLeaderChecklist] = useState<boolean>(false);

  const toggleCollapsible = useCallback((key: string) => {
    setOpenCollapsibles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleFilterCollapsible = useCallback((key: string, open: boolean) => {
    setOpenFilterCollapsibles((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const closeFilterCollapsible = useCallback((key: string) => {
    setOpenFilterCollapsibles((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  return {
    openCollapsibles,
    toggleCollapsible,
    isAdvancedFilterOpen,
    setIsAdvancedFilterOpen,
    openFilterCollapsibles,
    toggleFilterCollapsible,
    closeFilterCollapsible,
    showAllLeads,
    setShowAllLeads,
    showAllWorkstreams,
    setShowAllWorkstreams,
    showAllWorkpackages,
    setShowAllWorkpackages,
    showAllLeaderChecklist,
    setShowAllLeaderChecklist,
  };
}
