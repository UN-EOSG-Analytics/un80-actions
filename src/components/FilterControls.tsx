import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Briefcase, ChevronDown, Filter, Layers, Search, User } from 'lucide-react';

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
                    Work packages
                </h2>

                {/* Advanced Filtering and Sort */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Advanced Filtering Collapsible */}
                    <Collapsible open={isAdvancedFilterOpen} onOpenChange={onAdvancedFilterOpenChange}>
                        <CollapsibleTrigger className="flex items-center gap-1.5 text-[15px] font-medium text-slate-700 hover:text-un-blue transition-colors px-2 py-1 rounded-[6px] hover:bg-slate-50">
                            <span>Show advanced filters</span>
                            <ChevronDown
                                className={`w-3 h-3 text-slate-600 transition-transform ${isAdvancedFilterOpen ? 'transform rotate-180' : ''
                                    }`}
                            />
                        </CollapsibleTrigger>
                    </Collapsible>

                    {/* Sort Option */}
                    <div className="flex items-center">
                        <Select value={sortOption} onValueChange={onSortChange}>
                            <SelectTrigger className="w-40 h-9 text-[14px] border-0 rounded-[6px] bg-transparent transition-all hover:text-un-blue focus:ring-0 focus:ring-offset-0 focus:border-0">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-lg bg-white p-1 min-w-40">
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
                <div className="w-full mt-3 mb-3 bg-white border border-slate-200 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Work Package Filter */}
                        <div className="flex flex-col gap-2">
                            <Collapsible
                                open={openFilterCollapsibles.has('workPackage')}
                                onOpenChange={(open) => onToggleFilterCollapsible('workPackage', open)}
                            >
                                <CollapsibleTrigger className="w-full flex items-center justify-between h-10 px-3 text-[15px] border border-slate-300 rounded-xl bg-white transition-all hover:border-un-blue/60 hover:shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-un-blue" />
                                        <span className="text-slate-700">
                                            {selectedWorkPackage || 'Select work package'}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-slate-600 transition-transform ${openFilterCollapsibles.has('workPackage') ? 'transform rotate-180' : ''
                                            }`}
                                    />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-1 border border-slate-200 rounded-xl bg-white shadow-lg">
                                    <div className="p-1 max-h-[200px] overflow-y-auto">
                                        {uniqueWorkPackages.map((wp) => (
                                            <div
                                                key={wp}
                                                onClick={() => {
                                                    onSelectWorkPackage(wp === selectedWorkPackage ? '' : wp);
                                                    onCloseFilterCollapsible('workPackage');
                                                }}
                                                className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedWorkPackage === wp ? 'bg-[#E0F5FF] font-medium' : ''
                                                    }`}
                                            >
                                                {wp}
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        {/* Work Package Leads Filter */}
                        <div className="flex flex-col gap-2">
                            <Collapsible
                                open={openFilterCollapsibles.has('lead')}
                                onOpenChange={(open) => onToggleFilterCollapsible('lead', open)}
                            >
                                <CollapsibleTrigger className="w-full flex items-center justify-between h-10 px-3 text-[15px] border border-slate-300 rounded-xl bg-white transition-all hover:border-un-blue/60 hover:shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-un-blue" />
                                        <span className="text-slate-700">
                                            {selectedLead || 'Select work package lead'}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-slate-600 transition-transform ${openFilterCollapsibles.has('lead') ? 'transform rotate-180' : ''
                                            }`}
                                    />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-1 border border-slate-200 rounded-xl bg-white shadow-lg">
                                    <div className="p-1 max-h-[200px] overflow-y-auto">
                                        {uniqueLeads.map((lead) => (
                                            <div
                                                key={lead}
                                                onClick={() => {
                                                    onSelectLead(lead === selectedLead ? '' : lead);
                                                    onCloseFilterCollapsible('lead');
                                                }}
                                                className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedLead === lead ? 'bg-[#E0F5FF] font-medium' : ''
                                                    }`}
                                            >
                                                {lead}
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        {/* Workstream Filter */}
                        <div className="flex flex-col gap-2">
                            <Collapsible
                                open={openFilterCollapsibles.has('workstream')}
                                onOpenChange={(open) => onToggleFilterCollapsible('workstream', open)}
                            >
                                <CollapsibleTrigger className="w-full flex items-center justify-between h-10 px-3 text-[15px] border border-slate-300 rounded-xl bg-white transition-all hover:border-un-blue/60 hover:shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-un-blue" />
                                        <span className="text-slate-700">
                                            {selectedWorkstream || 'Select workstream'}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-slate-600 transition-transform ${openFilterCollapsibles.has('workstream') ? 'transform rotate-180' : ''
                                            }`}
                                    />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-1 border border-slate-200 rounded-xl bg-white shadow-lg">
                                    <div className="p-1 max-h-[200px] overflow-y-auto">
                                        {uniqueWorkstreams.map((ws) => (
                                            <div
                                                key={ws}
                                                onClick={() => {
                                                    onSelectWorkstream(ws === selectedWorkstream ? '' : ws);
                                                    onCloseFilterCollapsible('workstream');
                                                }}
                                                className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedWorkstream === ws ? 'bg-[#E0F5FF] font-medium' : ''
                                                    }`}
                                            >
                                                {ws}
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        {/* Type Filter */}
                        <div className="flex flex-col gap-2">
                            <Collapsible
                                open={openFilterCollapsibles.has('type')}
                                onOpenChange={(open) => onToggleFilterCollapsible('type', open)}
                            >
                                <CollapsibleTrigger className="w-full flex items-center justify-between h-10 px-3 text-[15px] border border-slate-300 rounded-xl bg-white transition-all hover:border-un-blue/60 hover:shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-un-blue" />
                                        <span className="text-slate-700">
                                            {selectedBigTicket === 'big-ticket'
                                                ? '"Big Ticket" Work packages'
                                                : selectedBigTicket === 'other'
                                                    ? 'Other Work packages'
                                                    : 'Select type'}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-slate-600 transition-transform ${openFilterCollapsibles.has('type') ? 'transform rotate-180' : ''
                                            }`}
                                    />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-1 border border-slate-200 rounded-xl bg-white shadow-lg">
                                    <div className="p-1">
                                        <div
                                            onClick={() => {
                                                onSelectBigTicket(selectedBigTicket === 'big-ticket' ? '' : 'big-ticket');
                                                onCloseFilterCollapsible('type');
                                            }}
                                            className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedBigTicket === 'big-ticket' ? 'bg-[#E0F5FF] font-medium' : ''
                                                }`}
                                        >
                                            "Big Ticket" Work packages
                                        </div>
                                        <div
                                            onClick={() => {
                                                onSelectBigTicket(selectedBigTicket === 'other' ? '' : 'other');
                                                onCloseFilterCollapsible('type');
                                            }}
                                            className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedBigTicket === 'other' ? 'bg-[#E0F5FF] font-medium' : ''
                                                }`}
                                        >
                                            Other Work packages
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="w-full mb-4">
                <div className="relative w-full sm:w-[770px] mb-2">
                    <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-un-blue pointer-events-none z-10" />
                    <Input
                        type="text"
                        placeholder="Search for work package"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full h-11 text-[16px] border-0 border-b border-slate-300 rounded-none pl-6 pr-4 py-2.5 text-slate-700 bg-white transition-all hover:border-b-un-blue/60 focus:border-b-un-blue focus:ring-0 focus:ring-offset-0 focus:shadow-none focus:outline-none shadow-none"
                    />
                </div>
                {hasActiveFilters && (
                    <div className="w-full sm:w-[770px]">
                        <Button
                            onClick={onResetFilters}
                            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-1.5 h-9 rounded-xl text-[14px] font-semibold transition-all shadow-sm hover:shadow-md"
                        >
                            Reset
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
