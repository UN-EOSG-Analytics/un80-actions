"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { ReactNode, useState, useRef, useEffect } from "react";

export interface FilterOption {
  key: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  color?: string;
}

interface FilterDropdownProps {
  /** Whether the popover is open */
  open: boolean;
  /** Callback when the popover open state changes */
  onOpenChange: (open: boolean) => void;
  /** The trigger button icon */
  icon: ReactNode;
  /** The trigger button text */
  triggerText: string;
  /** Whether any filters are active (not showing all) */
  isFiltered: boolean;
  /** Whether all options are active (showing all) */
  allActive: boolean;
  /** The list of filter options */
  options: FilterOption[];
  /** Set of selected option keys */
  selectedKeys: Set<string>;
  /** Callback when an option is toggled */
  onToggle: (key: string) => void;
  /** ARIA label for the trigger button */
  ariaLabel: string;
  /** Whether to show search input */
  enableSearch?: boolean;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
}

/**
 * FilterDropdown - A reusable filter dropdown component
 *
 * Wraps the shadcn Popover component with custom styling and behavior
 * for filter selections in the UN System Chart Navigator.
 */
export default function FilterDropdown({
  open,
  onOpenChange,
  icon,
  triggerText,
  isFiltered,
  allActive,
  options,
  selectedKeys,
  onToggle,
  ariaLabel,
  enableSearch = false,
  searchPlaceholder = "Search...",
}: FilterDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = searchQuery
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : options;

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && enableSearch && searchInputRef.current) {
      // Small delay to ensure the popover is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open, enableSearch]);

  // Handle open change and reset search
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={`relative flex h-10 w-full touch-manipulation items-center gap-3 rounded-lg border px-3 text-base transition-colors ${
            isFiltered
              ? "border-un-blue bg-un-blue/10 text-un-blue hover:border-un-blue"
              : "border-gray-200 bg-white text-gray-500 hover:border-un-blue hover:bg-un-blue/10 hover:text-un-blue"
          } `}
          aria-label={ariaLabel}
        >
          <div className="shrink-0">{icon}</div>
          <span className="flex-1 truncate text-left">{triggerText}</span>
          <div className="ml-auto shrink-0">
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-max max-w-[calc(100vw-2rem)] border border-gray-200 bg-white p-1 shadow-lg sm:max-w-sm"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={() => {
          // Allow closing when clicking outside
          handleOpenChange(false);
        }}
      >
        <div>
          {/* Search Input */}
          {enableSearch && (
            <div className="mb-1 border-b border-gray-200 px-2 py-2">
              <div className="relative">
                <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-md border border-gray-200 py-1.5 pr-3 pl-8 text-sm focus:border-un-blue focus:ring-2 focus:ring-un-blue/20 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            className={`${enableSearch ? "max-h-80" : "max-h-96"} overflow-y-auto`}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selectedKeys.has(option.key);
                // Only show checkmark if we're in filtered mode (not all options active)
                const showCheckmark = !allActive && isSelected;

                return (
                  <button
                    key={option.key}
                    onClick={() => onToggle(option.key)}
                    onPointerDown={(e) => e.preventDefault()}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-un-blue/10 hover:text-un-blue"
                  >
                    {option.color && (
                      <div
                        className={`${option.color} h-4 w-4 shrink-0 rounded`}
                      ></div>
                    )}
                    {option.icon && (
                      <div className="shrink-0">{option.icon}</div>
                    )}
                    <span className="flex-1 text-sm">
                      {option.label}
                      {option.count !== undefined && (
                        <span className="opacity-60"> ({option.count})</span>
                      )}
                    </span>
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {showCheckmark && (
                        <Check className="h-4 w-4 text-un-blue" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-sm text-gray-500">
                No results found
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
