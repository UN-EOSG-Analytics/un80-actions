import { useState, useEffect } from "react";
import type { FilterState } from "@/types";

/**
 * Custom hook to manage filter state
 * @returns Object containing filter state and handlers
 */
export function useFilters() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedWorkPackage, setSelectedWorkPackage] = useState<string[]>([]);
    const [selectedLead, setSelectedLead] = useState<string[]>([]);
    const [selectedWorkstream, setSelectedWorkstream] = useState<string[]>([]);
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
        setSelectedWorkPackage([]);
        setSelectedLead([]);
        setSelectedWorkstream([]);
        setSelectedBigTicket("");
    };

    const handleResetAll = () => {
        handleResetFilters();
        setSortOption("");
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
        handleResetAll,
    };
}

/**
 * Hook to automatically clear filter if selected value is no longer available
 */
export function useFilterSync(
    selectedValue: string | string[],
    availableValues: string[],
    setValue: ((value: string[]) => void) | ((value: string) => void)
) {
    useEffect(() => {
        if (Array.isArray(selectedValue)) {
            // Handle array (multi-select)
            const validValues = selectedValue.filter(val => availableValues.includes(val));
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
