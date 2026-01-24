import { useMemo, useCallback, useEffect, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { FilterState } from "@/types";
import {
  encodeUrlParam,
  decodeUrlParam,
  encodeUrlParamArray,
  decodeUrlParamArray,
  buildCleanQueryString,
} from "@/lib/utils";

/**
 * Custom hook to manage filter state with URL as single source of truth
 * Uses router.replace with startTransition for URL updates
 * URL params use underscores for spaces and commas as delimiters for clean, readable URLs
 */
export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive all state directly from URL - URL is the single source of truth
  // Decode underscores back to spaces for display
  const searchQuery = decodeUrlParam(searchParams.get("search") || "");
  const selectedWorkPackage = decodeUrlParamArray(searchParams.get("wp"));
  const selectedLead = decodeUrlParamArray(searchParams.get("lead"));
  const selectedWorkstream = decodeUrlParamArray(searchParams.get("ws"));
  const selectedWpFamily = decodeUrlParam(searchParams.get("family") || "");
  const selectedBigTicket = decodeUrlParamArray(searchParams.get("type"));
  const selectedAction = decodeUrlParamArray(searchParams.get("actions"));
  const selectedTeamMember = decodeUrlParamArray(searchParams.get("team"));
  const selectedActionStatus = decodeUrlParamArray(searchParams.get("action_status"));
  const sortOption = searchParams.get("sort") || "number-asc";

  // Helper to build a clean, human-readable query string
  const buildQueryString = useCallback(
    (updater: (params: Record<string, string>) => void) => {
      // Start with current params as a plain object
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      updater(params);
      // Remove empty values
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      return buildCleanQueryString(params);
    },
    [searchParams],
  );

  // Helper to update URL using router.replace in a transition
  const updateUrl = useCallback(
    (updater: (params: Record<string, string>) => void) => {
      const queryString = buildQueryString(updater);
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.replace(newUrl, { scroll: false });
      });
    },
    [buildQueryString, pathname, router],
  );

  // Setters that update URL - encode values for clean, readable URLs
  const setSearchQuery = useCallback(
    (value: string) => {
      updateUrl((params) => {
        if (value) {
          params.search = encodeUrlParam(value);
        } else {
          delete params.search;
        }
      });
    },
    [updateUrl],
  );

  const setSelectedWorkPackage = useCallback(
    (value: string[]) => {
      updateUrl((params) => {
        if (value.length > 0) {
          const wpNumbers = value.map((wp) => {
            const match = wp.match(/^(\d+):/);
            return match ? match[1] : wp;
          });
          params.wp = wpNumbers.join(",");
        } else {
          delete params.wp;
        }
      });
    },
    [updateUrl],
  );

  const setSelectedLead = useCallback(
    (value: string[]) => {
      updateUrl((params) => {
        if (value.length > 0) {
          params.lead = encodeUrlParamArray(value);
        } else {
          delete params.lead;
        }
      });
    },
    [updateUrl],
  );

  const setSelectedWorkstream = useCallback(
    (value: string[]) => {
      updateUrl((params) => {
        if (value.length > 0) {
          params.ws = encodeUrlParamArray(value);
        } else {
          delete params.ws;
        }
      });
    },
    [updateUrl],
  );

  const setSelectedWpFamily = useCallback(
    (value: string) => {
      updateUrl((params) => {
        if (value) {
          params.family = encodeUrlParam(value);
        } else {
          delete params.family;
        }
      });
    },
    [updateUrl],
  );

  const setSelectedBigTicket = useCallback(
    (value: string[]) => {
      updateUrl((params) => {
        if (value.length > 0) {
          params.type = encodeUrlParamArray(value);
        } else {
          delete params.type;
        }
      });
    },
    [updateUrl],
  );

  const setSelectedAction = useCallback(
    (value: string[]) => {
      updateUrl((params) => {
        if (value.length > 0) {
          params.actions = encodeUrlParamArray(value);
        } else {
          delete params.actions;
        }
      });
    },
    [updateUrl],
  );

  const setSelectedTeamMember = useCallback(
    (value: string[]) => {
      updateUrl((params) => {
        if (value.length > 0) {
          params.team = encodeUrlParamArray(value);
        } else {
          delete params.team;
        }
      });
    },
    [updateUrl],
  );

  const setSelectedActionStatus = useCallback(
    (value: string[]) => {
      updateUrl((params) => {
        if (value.length > 0) {
          params.action_status = encodeUrlParamArray(value);
        } else {
          delete params.action_status;
        }
      });
    },
    [updateUrl],
  );

  const setSortOption = useCallback(
    (value: string) => {
      updateUrl((params) => {
        if (value !== "number-asc") {
          params.sort = value;
        } else {
          delete params.sort;
        }
      });
    },
    [updateUrl],
  );

  const filters: FilterState = useMemo(
    () => ({
      searchQuery,
      selectedWorkPackage,
      selectedLead,
      selectedWorkstream,
      selectedWpFamily,
      selectedBigTicket,
      selectedAction,
      selectedTeamMember,
      selectedActionStatus,
      sortOption,
    }),
    [
      searchQuery,
      selectedWorkPackage,
      selectedLead,
      selectedWorkstream,
      selectedWpFamily,
      selectedBigTicket,
      selectedAction,
      selectedTeamMember,
      selectedActionStatus,
      sortOption,
    ],
  );

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
    selectedTeamMember,
    setSelectedTeamMember,
    selectedActionStatus,
    setSelectedActionStatus,
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
          return availableValues.some((available) =>
            available.startsWith(val + ":"),
          );
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
          ? availableValues.some((available) =>
              available.startsWith(selectedValue + ":"),
            )
          : availableValues.includes(selectedValue);

        if (!isValid) {
          (setValue as (value: string) => void)("");
        }
      }
    }
  }, [selectedValue, availableValues, setValue, matchByPrefix]);
}
