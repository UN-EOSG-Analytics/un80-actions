import FilterDropdown, { FilterOption } from '@/components/FilterDropdown';
import ResetButton from '@/components/ResetButton';
import { SearchBar } from '@/components/SearchBar';
import {
    Collapsible,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowUpDown, Briefcase, ChevronDown, Check, Filter, Layers, Users, Package } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FilterControlsProps {
    // Advanced filter state
    isAdvancedFilterOpen: boolean;
    onAdvancedFilterOpenChange: (open: boolean) => void;

    // Sort
    sortOption: string;
    onSortChange: (value: string) => void;

    // Filter collapsibles state
    openFilterCollapsibles: Set<string>;
    onToggleFilterCollapsible: (key: string, open: boolean) => void;
    onCloseFilterCollapsible: (key: string) => void;

    // Filter values
    selectedWorkPackage: string[];
    onSelectWorkPackage: (value: string[]) => void;
    selectedLead: string[];
    onSelectLead: (value: string[]) => void;
    selectedWorkstream: string[];
    onSelectWorkstream: (value: string[]) => void;
    selectedBigTicket: string;
    onSelectBigTicket: (value: string) => void;

    // Search
    searchQuery: string;
    onSearchChange: (value: string) => void;

    // Options
    uniqueWorkPackages: string[];
    uniqueLeads: string[];
    uniqueWorkstreams: string[];

    // Reset
    onResetFilters: () => void;
}

export function FilterControls({
    isAdvancedFilterOpen,
    onAdvancedFilterOpenChange,
    sortOption,
    onSortChange,
    openFilterCollapsibles,
    onToggleFilterCollapsible,
    onCloseFilterCollapsible,
    selectedWorkPackage,
    onSelectWorkPackage,
    selectedLead,
    onSelectLead,
    selectedWorkstream,
    onSelectWorkstream,
    selectedBigTicket,
    onSelectBigTicket,
    searchQuery,
    onSearchChange,
    uniqueWorkPackages,
    uniqueLeads,
    uniqueWorkstreams,
    onResetFilters,
}: FilterControlsProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close desktop sort dropdown when mobile opens
    useEffect(() => {
        if (isMobile && openFilterCollapsibles.has('sort')) {
            // Mobile sort is open, ensure desktop is closed
            // The desktop one should be hidden anyway, but this ensures state is clean
        }
    }, [isMobile, openFilterCollapsibles]);

    const hasActiveFilters = !!(
        searchQuery ||
        selectedWorkPackage.length > 0 ||
        selectedLead.length > 0 ||
        selectedWorkstream.length > 0 ||
        selectedBigTicket
    );

    const hasActiveAdvancedFilters = !!(
        selectedWorkPackage.length > 0 ||
        selectedLead.length > 0 ||
        selectedWorkstream.length > 0 ||
        selectedBigTicket
    );

    return (
        <>
            {/* Header with Advanced Filters Toggle and Sort */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-3 sm:gap-4">
                <h2 className="text-[22px] sm:text-[24px] md:text-[26px] font-bold text-black leading-[25px] flex items-center gap-2 shrink-0">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-un-blue" />
                    Work Packages
                </h2>

                {/* Advanced Filtering and Sort */}
                <div className="flex items-center justify-start sm:justify-end gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    {/* Mobile: Simple buttons aligned left */}
                    <div className="flex items-center gap-2 sm:hidden">
                        {/* Advanced Filtering Collapsible */}
                        <Collapsible open={isAdvancedFilterOpen} onOpenChange={onAdvancedFilterOpenChange}>
                            <CollapsibleTrigger className={`
                                h-10 flex items-center gap-3 px-3
                                border rounded-lg
                                text-base
                                touch-manipulation transition-colors
                                ${hasActiveAdvancedFilters
                                    ? 'bg-un-blue/10 border-un-blue text-un-blue hover:border-un-blue'
                                    : 'bg-white border-gray-300 text-gray-900 hover:bg-un-blue/10 hover:border-un-blue hover:text-un-blue'
                                }
                            `}>
                                <Filter className="h-4 w-4 shrink-0" />
                                <span className="truncate">Advanced Filters</span>
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 transition-transform ${isAdvancedFilterOpen ? 'transform rotate-180' : ''
                                        }`}
                                />
                            </CollapsibleTrigger>
                        </Collapsible>

                        {/* Sort Option - Mobile Style */}
                        {isMobile && (
                            <Popover open={openFilterCollapsibles.has('sort')} onOpenChange={(open) => {
                                onToggleFilterCollapsible('sort', open);
                            }}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className={`
                                            h-10 flex items-center gap-3 px-3
                                            border rounded-lg
                                            text-base
                                            touch-manipulation transition-colors
                                            ${sortOption !== 'number-asc'
                                                ? 'bg-un-blue/10 border-un-blue text-un-blue hover:border-un-blue'
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-un-blue/10 hover:border-un-blue hover:text-un-blue'
                                            }
                                        `}
                                    >
                                        <ArrowUpDown className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                            {sortOption === 'number-asc' ? 'Number (1-31)' :
                                                sortOption === 'number-desc' ? 'Number (31-1)' :
                                                    sortOption === 'name-asc' ? 'Name (A-Z)' :
                                                        sortOption === 'name-desc' ? 'Name (Z-A)' :
                                                            'Sort'}
                                        </span>
                                        <ChevronDown
                                            className={`h-4 w-4 shrink-0 transition-transform ${openFilterCollapsibles.has('sort') ? 'transform rotate-180' : ''
                                                }`}
                                        />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-max max-w-[calc(100vw-2rem)] p-1 bg-white border border-gray-200 shadow-lg"
                                    align="start"
                                    side="bottom"
                                    sideOffset={4}
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                    <div>
                                        {[
                                            { key: 'number-asc', label: 'Number (1-31)' },
                                            { key: 'number-desc', label: 'Number (31-1)' },
                                            { key: 'name-asc', label: 'Name (A-Z)' },
                                            { key: 'name-desc', label: 'Name (Z-A)' },
                                        ].map((option) => (
                                            <button
                                                key={option.key}
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onSortChange(option.key);
                                                    onCloseFilterCollapsible('sort');
                                                }}
                                                className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-un-blue/10 hover:text-un-blue cursor-pointer transition-colors w-full text-left text-sm"
                                            >
                                                <span>{option.label}</span>
                                                {sortOption === option.key && (
                                                    <Check className="h-4 w-4 text-un-blue ml-auto" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>

                    {/* Desktop: Original layout */}
                    <div className="hidden sm:flex items-center gap-3">
                        {/* Advanced Filtering Collapsible */}
                        <Collapsible open={isAdvancedFilterOpen} onOpenChange={onAdvancedFilterOpenChange}>
                            <CollapsibleTrigger className={`
                                h-10 flex items-center gap-3 px-3
                                border rounded-lg
                                text-base
                                touch-manipulation transition-colors
                                ${hasActiveAdvancedFilters
                                    ? 'bg-un-blue/10 border-un-blue text-un-blue hover:border-un-blue'
                                    : 'bg-white border-gray-300 text-gray-900 hover:bg-un-blue/10 hover:border-un-blue hover:text-un-blue'
                                }
                            `}>
                                <Filter className="h-4 w-4 shrink-0" />
                                <span className="truncate">Advanced Filters</span>
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 transition-transform ${isAdvancedFilterOpen ? 'transform rotate-180' : ''
                                        }`}
                                />
                            </CollapsibleTrigger>
                        </Collapsible>

                        {/* Sort Option */}
                        <div className="w-32">
                            <FilterDropdown
                                open={!isMobile && openFilterCollapsibles.has('sort')}
                                onOpenChange={(open) => {
                                    if (!isMobile) {
                                        onToggleFilterCollapsible('sort', open);
                                    }
                                }}
                                icon={<ArrowUpDown className="w-4 h-4" />}
                                triggerText={
                                    sortOption === 'number-desc' ? '31-1' :
                                        sortOption === 'name-asc' ? 'A-Z' :
                                            sortOption === 'name-desc' ? 'Z-A' :
                                                'Sort'
                                }
                                isFiltered={sortOption !== 'number-asc'}
                                allActive={false}
                                options={[
                                    { key: 'number-asc', label: 'Number (1-31)' },
                                    { key: 'number-desc', label: 'Number (31-1)' },
                                    { key: 'name-asc', label: 'Name (A-Z)' },
                                    { key: 'name-desc', label: 'Name (Z-A)' },
                                ]}
                                selectedKeys={new Set([sortOption])}
                                onToggle={(key) => {
                                    onSortChange(key);
                                    onCloseFilterCollapsible('sort');
                                }}
                                ariaLabel="Sort work packages"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Filters Content - Expands Below */}
            {isAdvancedFilterOpen && (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {/* Work Package Filter */}
                    <FilterDropdown
                        open={openFilterCollapsibles.has('workPackage')}
                        onOpenChange={(open) => onToggleFilterCollapsible('workPackage', open)}
                        icon={<Briefcase className="w-4 h-4 text-un-blue" />}
                        triggerText={
                            selectedWorkPackage.length === 0
                                ? 'Select work package'
                                : selectedWorkPackage.length === 1
                                    ? selectedWorkPackage[0]
                                    : `${selectedWorkPackage.length} work packages selected`
                        }
                        isFiltered={selectedWorkPackage.length > 0}
                        allActive={false}
                        options={uniqueWorkPackages.map((wp): FilterOption => ({
                            key: wp,
                            label: wp,
                        }))}
                        selectedKeys={new Set(selectedWorkPackage)}
                        onToggle={(key) => {
                            const newSelected = selectedWorkPackage.includes(key)
                                ? selectedWorkPackage.filter(wp => wp !== key)
                                : [...selectedWorkPackage, key];
                            onSelectWorkPackage(newSelected);
                        }}
                        ariaLabel="Filter by work package"
                    />

                    {/* Work Package Leads Filter */}
                    <FilterDropdown
                        open={openFilterCollapsibles.has('lead')}
                        onOpenChange={(open) => onToggleFilterCollapsible('lead', open)}
                        icon={<Users className="w-4 h-4 text-un-blue" />}
                        triggerText={
                            selectedLead.length === 0
                                ? 'Select work package lead'
                                : selectedLead.length === 1
                                    ? selectedLead[0]
                                    : `${selectedLead.length} leads selected`
                        }
                        isFiltered={selectedLead.length > 0}
                        allActive={false}
                        options={uniqueLeads.map((lead): FilterOption => ({
                            key: lead,
                            label: lead,
                        }))}
                        selectedKeys={new Set(selectedLead)}
                        onToggle={(key) => {
                            const newSelected = selectedLead.includes(key)
                                ? selectedLead.filter(lead => lead !== key)
                                : [...selectedLead, key];
                            onSelectLead(newSelected);
                        }}
                        ariaLabel="Filter by work package lead"
                    />

                    {/* Workstream Filter */}
                    <FilterDropdown
                        open={openFilterCollapsibles.has('workstream')}
                        onOpenChange={(open) => onToggleFilterCollapsible('workstream', open)}
                        icon={<Layers className="w-4 h-4 text-un-blue" />}
                        triggerText={
                            selectedWorkstream.length === 0
                                ? 'Select workstream'
                                : selectedWorkstream.length === 1
                                    ? selectedWorkstream[0]
                                    : `${selectedWorkstream.length} workstreams selected`
                        }
                        isFiltered={selectedWorkstream.length > 0}
                        allActive={false}
                        options={uniqueWorkstreams.map((ws): FilterOption => ({
                            key: ws,
                            label: ws,
                        }))}
                        selectedKeys={new Set(selectedWorkstream)}
                        onToggle={(key) => {
                            const newSelected = selectedWorkstream.includes(key)
                                ? selectedWorkstream.filter(ws => ws !== key)
                                : [...selectedWorkstream, key];
                            onSelectWorkstream(newSelected);
                        }}
                        ariaLabel="Filter by workstream"
                    />

                    {/* Type Filter */}
                    <FilterDropdown
                        open={openFilterCollapsibles.has('type')}
                        onOpenChange={(open) => onToggleFilterCollapsible('type', open)}
                        icon={<Package className="w-4 h-4 text-un-blue" />}
                        triggerText={
                            selectedBigTicket === 'big-ticket'
                                ? '"Big Ticket" Work packages'
                                : selectedBigTicket === 'other'
                                    ? 'Other Work packages'
                                    : 'Select package type'
                        }
                        isFiltered={!!selectedBigTicket}
                        allActive={!selectedBigTicket}
                        options={[
                            { key: 'big-ticket', label: '"Big Ticket" Work packages' },
                            { key: 'other', label: 'Other Work packages' },
                        ]}
                        selectedKeys={new Set(selectedBigTicket ? [selectedBigTicket] : [])}
                        onToggle={(key) => {
                            onSelectBigTicket(key === selectedBigTicket ? '' : key);
                            onCloseFilterCollapsible('type');
                        }}
                        ariaLabel="Filter by package type"
                    />
                </div>
            )}

            {/* Search Bar and Reset Button */}
            <div className="w-full mb-4 flex items-center justify-between gap-3">
                <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={onSearchChange}
                />
                {hasActiveFilters && (
                    <ResetButton
                        onClick={onResetFilters}
                    />
                )}
            </div>
        </>
    );
}
