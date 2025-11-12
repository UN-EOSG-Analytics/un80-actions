import { useState, useEffect } from "react";
import type { FilterState } from "@/types";

/**
 * Custom hook to manage filter state
 * @returns Object containing filter state and handlers
 */
export function useFilters() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedWorkPackage, setSelectedWorkPackage] = useState<string>("");
    const [selectedLead, setSelectedLead] = useState<string>("");
    const [selectedWorkstream, setSelectedWorkstream] = useState<string>("");
    const [selectedBigTicket, setSelectedBigTicket] = useState<string>("");
    const [sortOption, setSortOption] = useState<string>("");

    const filters: FilterState = {
        searchQuery,
        selectedWorkPackage,
        selectedLead,
        selectedWorkstream,
        selectedBigTicket,
        sortOption,
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setSelectedWorkPackage("");
        setSelectedLead("");
        setSelectedWorkstream("");
        setSelectedBigTicket("");
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
        sortOption,
        setSortOption,
        handleResetFilters,
    };
}

/**
 * Hook to automatically clear filter if selected value is no longer available
 * @param selectedValue - Currently selected filter value
 * @param availableValues - Array of available values
 * @param setValue - Setter function for the filter value
 */
export function useFilterSync(
    selectedValue: string,
    availableValues: string[],
    setValue: (value: string) => void
) {
    useEffect(() => {
        if (selectedValue && !availableValues.includes(selectedValue)) {
            setValue("");
        }
    }, [selectedValue, availableValues, setValue]);
}
