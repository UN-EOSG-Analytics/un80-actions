import FilterDropdown, { FilterOption } from '@/components/FilterDropdown';
import ResetButton from '@/components/ResetButton';
import { SearchBar } from '@/components/SearchBar';
import {
    Collapsible,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Briefcase, ChevronDown, Filter, Layers, User } from 'lucide-react';

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
    selectedWorkPackage: string;
    onSelectWorkPackage: (value: string) => void;
    selectedLead: string;
    onSelectLead: (value: string) => void;
    selectedWorkstream: string;
    onSelectWorkstream: (value: string) => void;
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
    const hasActiveFilters = !!(
        searchQuery ||
        selectedWorkPackage ||
        selectedLead ||
        selectedWorkstream ||
        selectedBigTicket
    );

    return (
        <>
            {/* Header with Advanced Filters Toggle and Sort */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-4">
                <h2 className="text-[22px] sm:text-[24px] md:text-[26px] font-bold text-black leading-[25px] flex items-center gap-2">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-un-blue" />
                    Work Packages
                </h2>

                {/* Advanced Filtering and Sort */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Advanced Filtering Collapsible */}
                    <Collapsible open={isAdvancedFilterOpen} onOpenChange={onAdvancedFilterOpenChange}>
                        <CollapsibleTrigger className="flex items-center gap-1.5 text-[15px] font-medium text-slate-700 hover:text-un-blue transition-colors px-2 py-1 rounded-[6px] hover:bg-slate-50">
                            <span>Show Advanced Filters</span>
                            <ChevronDown
                                className={`w-3 h-3 text-slate-600 transition-transform ${isAdvancedFilterOpen ? 'transform rotate-180' : ''
                                    }`}
                            />
                        </CollapsibleTrigger>
                    </Collapsible>

                    {/* Sort Option */}
                    <div className="flex items-center">
                        <Select value={sortOption} onValueChange={onSortChange}>
                            <SelectTrigger className="w-36 h-9 text-[14px] border-0 rounded-[6px] bg-transparent transition-all hover:text-un-blue focus:ring-0 focus:ring-offset-0 focus:border-0">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-lg bg-white p-1 min-w-36">
                                <SelectItem
                                    value="name-asc"
                                    className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-highlighted:bg-[#E0F5FF] transition-colors"
                                >
                                    Name (A-Z)
                                </SelectItem>
                                <SelectItem
                                    value="name-desc"
                                    className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-highlighted:bg-[#E0F5FF] transition-colors"
                                >
                                    Name (Z-A)
                                </SelectItem>
                                <SelectItem
                                    value="number-asc"
                                    className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-highlighted:bg-[#E0F5FF] transition-colors"
                                >
                                    Number (1-31)
                                </SelectItem>
                                <SelectItem
                                    value="number-desc"
                                    className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-highlighted:bg-[#E0F5FF] transition-colors"
                                >
                                    Number (31-1)
                                </SelectItem>
                            </SelectContent>
                        </Select>
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
                        triggerText={selectedWorkPackage || 'Select work package'}
                        isFiltered={!!selectedWorkPackage}
                        allActive={!selectedWorkPackage}
                        options={uniqueWorkPackages.map((wp): FilterOption => ({
                            key: wp,
                            label: wp,
                        }))}
                        selectedKeys={new Set(selectedWorkPackage ? [selectedWorkPackage] : [])}
                        onToggle={(key) => {
                            onSelectWorkPackage(key === selectedWorkPackage ? '' : key);
                            onCloseFilterCollapsible('workPackage');
                        }}
                        ariaLabel="Filter by work package"
                    />

                    {/* Work Package Leads Filter */}
                    <FilterDropdown
                        open={openFilterCollapsibles.has('lead')}
                        onOpenChange={(open) => onToggleFilterCollapsible('lead', open)}
                        icon={<User className="w-4 h-4 text-un-blue" />}
                        triggerText={selectedLead || 'Select work package lead'}
                        isFiltered={!!selectedLead}
                        allActive={!selectedLead}
                        options={uniqueLeads.map((lead): FilterOption => ({
                            key: lead,
                            label: lead,
                        }))}
                        selectedKeys={new Set(selectedLead ? [selectedLead] : [])}
                        onToggle={(key) => {
                            onSelectLead(key === selectedLead ? '' : key);
                            onCloseFilterCollapsible('lead');
                        }}
                        ariaLabel="Filter by work package lead"
                    />

                    {/* Workstream Filter */}
                    <FilterDropdown
                        open={openFilterCollapsibles.has('workstream')}
                        onOpenChange={(open) => onToggleFilterCollapsible('workstream', open)}
                        icon={<Layers className="w-4 h-4 text-un-blue" />}
                        triggerText={selectedWorkstream || 'Select workstream'}
                        isFiltered={!!selectedWorkstream}
                        allActive={!selectedWorkstream}
                        options={uniqueWorkstreams.map((ws): FilterOption => ({
                            key: ws,
                            label: ws,
                        }))}
                        selectedKeys={new Set(selectedWorkstream ? [selectedWorkstream] : [])}
                        onToggle={(key) => {
                            onSelectWorkstream(key === selectedWorkstream ? '' : key);
                            onCloseFilterCollapsible('workstream');
                        }}
                        ariaLabel="Filter by workstream"
                    />

                    {/* Type Filter */}
                    <FilterDropdown
                        open={openFilterCollapsibles.has('type')}
                        onOpenChange={(open) => onToggleFilterCollapsible('type', open)}
                        icon={<Filter className="w-4 h-4 text-un-blue" />}
                        triggerText={
                            selectedBigTicket === 'big-ticket'
                                ? '"Big Ticket" Work packages'
                                : selectedBigTicket === 'other'
                                    ? 'Other Work packages'
                                    : 'Select type'
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
                        ariaLabel="Filter by type"
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
