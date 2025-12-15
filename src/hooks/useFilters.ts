import { useMemo, useCallback, useEffect, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { FilterState } from "@/types";

/**
 * Custom hook to manage filter state with URL as single source of truth
 * Uses router.replace with startTransition for URL updates
 */
export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive all state directly from URL - URL is the single source of truth
  const searchQuery = searchParams.get("search") || "";
  const selectedWorkPackage = searchParams.get("wp")?.split(",").filter(Boolean) || [];
  const selectedLead = searchParams.get("lead")?.split(",").filter(Boolean) || [];
  const selectedWorkstream = searchParams.get("ws")?.split(",").filter(Boolean) || [];
  const selectedWpFamily = searchParams.get("family") || "";
  const selectedBigTicket = searchParams.get("type")?.split(",").filter(Boolean) || [];
  const selectedAction = searchParams.get("actions")?.split(",").filter(Boolean) || [];
  const sortOption = searchParams.get("sort") || "number-asc";

  // Helper to build query string from params
  const buildQueryString = useCallback((updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    updater(params);
    return params.toString();
  }, [searchParams]);

  // Helper to update URL using router.replace in a transition
  const updateUrl = useCallback((updater: (params: URLSearchParams) => void) => {
    const queryString = buildQueryString(updater);
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  }, [buildQueryString, pathname, router]);

  // Setters that update URL
  const setSearchQuery = useCallback((value: string) => {
    updateUrl((params) => {
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
    });
  }, [updateUrl]);

  const setSelectedWorkPackage = useCallback((value: string[]) => {
    updateUrl((params) => {
      if (value.length > 0) {
        const wpNumbers = value.map((wp) => {
          const match = wp.match(/^(\d+):/);
          return match ? match[1] : wp;
        });
        params.set("wp", wpNumbers.join(","));
      } else {
        params.delete("wp");
      }
    });
  }, [updateUrl]);

  const setSelectedLead = useCallback((value: string[]) => {
    updateUrl((params) => {
      if (value.length > 0) {
        params.set("lead", value.join(","));
      } else {
        params.delete("lead");
      }
    });
  }, [updateUrl]);

  const setSelectedWorkstream = useCallback((value: string[]) => {
    updateUrl((params) => {
      if (value.length > 0) {
        params.set("ws", value.join(","));
      } else {
        params.delete("ws");
      }
    });
  }, [updateUrl]);

  const setSelectedWpFamily = useCallback((value: string) => {
    updateUrl((params) => {
      if (value) {
        params.set("family", value);
      } else {
        params.delete("family");
      }
    });
  }, [updateUrl]);

  const setSelectedBigTicket = useCallback((value: string[]) => {
    updateUrl((params) => {
      if (value.length > 0) {
        params.set("type", value.join(","));
      } else {
        params.delete("type");
      }
    });
  }, [updateUrl]);

  const setSelectedAction = useCallback((value: string[]) => {
    updateUrl((params) => {
      if (value.length > 0) {
        params.set("actions", value.join(","));
      } else {
        params.delete("actions");
      }
    });
  }, [updateUrl]);

  const setSortOption = useCallback((value: string) => {
    updateUrl((params) => {
      if (value !== "number-asc") {
        params.set("sort", value);
      } else {
        params.delete("sort");
      }
    });
  }, [updateUrl]);

  const filters: FilterState = useMemo(() => ({
    searchQuery,
    selectedWorkPackage,
    selectedLead,
    selectedWorkstream,
    selectedWpFamily,
    selectedBigTicket,
    selectedAction,
    sortOption,
  }), [
    searchQuery,
    selectedWorkPackage,
    selectedLead,
    selectedWorkstream,
    selectedWpFamily,
    selectedBigTicket,
    selectedAction,
    sortOption,
  ]);

  const handleResetFilters = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [pathname, router]);

  const handleResetAll = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [pathname, router]);

  return {
    filters,
    searchQuery,
    setSearchQuery,
    selectedWorkPackage,
    setSelectedWorkPackage,
    selectedLead,
    setSelectedLead,
    selectedWorkstream,
    setSelectedWorkstream,
    selectedWpFamily,
    setSelectedWpFamily,
    selectedBigTicket,
    setSelectedBigTicket,
    selectedAction,
    setSelectedAction,
    sortOption,
    setSortOption,
    handleResetFilters,
    handleResetAll,
  };
}

/**
 * Hook to automatically clear filter if selected value is no longer available
 * Only clears values if availableValues has data (to avoid clearing on initial load)
 */
export function useFilterSync(
  selectedValue: string | string[],
  availableValues: string[],
  setValue: ((value: string[]) => void) | ((value: string) => void),
  matchByPrefix: boolean = false, // For workpackages: match "1" with "1: Name"
) {
  useEffect(() => {
    // Don't clear anything if availableValues is empty (data not loaded yet)
    if (availableValues.length === 0) {
      return;
    }

    if (Array.isArray(selectedValue)) {
      // Handle array (multi-select)
      const validValues = selectedValue.filter((val) => {
        if (matchByPrefix) {
          // For workpackages: match "1" with "1: Name"
          return availableValues.some(available => available.startsWith(val + ":"));
        }
        return availableValues.includes(val);
      });
      if (validValues.length !== selectedValue.length) {
        (setValue as (value: string[]) => void)(validValues);
      }
    } else {
      // Handle string (single-select)
      if (selectedValue) {
        const isValid = matchByPrefix
          ? availableValues.some(available => available.startsWith(selectedValue + ":"))
          : availableValues.includes(selectedValue);
        
        if (!isValid) {
          (setValue as (value: string) => void)("");
        }
      }
    }
  }, [selectedValue, availableValues, setValue, matchByPrefix]);
}
