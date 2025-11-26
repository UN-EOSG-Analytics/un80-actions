import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { FilterState } from "@/types";

/**
 * Custom hook to manage filter state with URL sync
 * @returns Object containing filter state and handlers
 */
export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize state from URL parameters
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [selectedWorkPackage, setSelectedWorkPackage] = useState<string[]>(
    searchParams.get("wp")?.split(",").filter(Boolean) || []
  );
  const [selectedLead, setSelectedLead] = useState<string[]>(
    searchParams.get("lead")?.split(",").filter(Boolean) || []
  );
  const [selectedWorkstream, setSelectedWorkstream] = useState<string[]>(
    searchParams.get("ws")?.split(",").filter(Boolean) || []
  );
  const [selectedBigTicket, setSelectedBigTicket] = useState<string[]>(
    searchParams.get("type")?.split(",").filter(Boolean) || []
  );
  const [selectedAction, setSelectedAction] = useState<string[]>(
    searchParams.get("action")?.split(",").filter(Boolean) || []
  );
  const [sortOption, setSortOption] = useState<string>(
    searchParams.get("sort") || "number-asc"
  );

  // Sync state to URL whenever filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery) params.set("search", searchQuery);
    if (selectedWorkPackage.length > 0)
      params.set("wp", selectedWorkPackage.join(","));
    if (selectedLead.length > 0) params.set("lead", selectedLead.join(","));
    if (selectedWorkstream.length > 0)
      params.set("ws", selectedWorkstream.join(","));
    if (selectedBigTicket.length > 0)
      params.set("type", selectedBigTicket.join(","));
    if (selectedAction.length > 0)
      params.set("action", selectedAction.join(","));
    if (sortOption !== "number-asc") params.set("sort", sortOption);

    const newUrl = params.toString() ? `?${params.toString()}` : "/";
    router.replace(newUrl, { scroll: false });
  }, [
    searchQuery,
    selectedWorkPackage,
    selectedLead,
    selectedWorkstream,
    selectedBigTicket,
    selectedAction,
    sortOption,
    router,
  ]);

  const filters: FilterState = {
    searchQuery,
    selectedWorkPackage,
    selectedLead,
    selectedWorkstream,
    selectedBigTicket,
    selectedAction,
    sortOption,
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedWorkPackage([]);
    setSelectedLead([]);
    setSelectedWorkstream([]);
    setSelectedBigTicket([]);
    setSelectedAction([]);
  };

  const handleResetAll = () => {
    handleResetFilters();
    setSortOption("number-asc");
  };

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
 */
export function useFilterSync(
  selectedValue: string | string[],
  availableValues: string[],
  setValue: ((value: string[]) => void) | ((value: string) => void),
) {
  useEffect(() => {
    if (Array.isArray(selectedValue)) {
      // Handle array (multi-select)
      const validValues = selectedValue.filter((val) =>
        availableValues.includes(val),
      );
      if (validValues.length !== selectedValue.length) {
        (setValue as (value: string[]) => void)(validValues);
      }
    } else {
      // Handle string (single-select)
      if (selectedValue && !availableValues.includes(selectedValue)) {
        (setValue as (value: string) => void)("");
      }
    }
  }, [selectedValue, availableValues, setValue]);
}
