import FilterDropdown, { FilterOption } from "@/components/FilterDropdown";
import ResetButton from "@/components/ResetButton";
import { SearchBar } from "@/components/SearchBar";
import { ACTION_STATUS } from "@/constants/actionStatus";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowUpDown,
  Briefcase,
  ChevronDown,
  Check,
  Filter,
  Layers,
  Users,
  User,
  Package,
  ListTodo,
  Activity,
} from "lucide-react";
import { useEffect, useState } from "react";

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
  selectedBigTicket: string[];
  onSelectBigTicket: (value: string[]) => void;
  selectedAction: string[];
  onSelectAction: (value: string[]) => void;
  selectedTeamMember: string[];
  onSelectTeamMember: (value: string[]) => void;
  selectedActionStatus: string[];
  onSelectActionStatus: (value: string[]) => void;

  // Search
  searchQuery: string;
  onSearchChange: (value: string) => void;

  // Options
  uniqueWorkPackages: string[];
  uniqueLeads: string[];
  uniqueWorkstreams: string[];
  uniqueActions: Array<{ text: string; actionNumber: string }>;
  uniqueTeamMembers: string[];
  availableBigTicketOptions: Array<{ key: string; label: string }>;

  // Reset
  onResetFilters: () => void;

  // Progress toggle
  showProgress?: boolean;
  onShowProgressChange?: (show: boolean) => void;
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
  selectedAction,
  onSelectAction,
  selectedTeamMember,
  onSelectTeamMember,
  selectedActionStatus,
  onSelectActionStatus,
  searchQuery,
  onSearchChange,
  uniqueWorkPackages,
  uniqueLeads,
  uniqueWorkstreams,
  uniqueActions,
  uniqueTeamMembers,
  availableBigTicketOptions,
  onResetFilters,
}: FilterControlsProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close desktop sort dropdown when mobile opens
  useEffect(() => {
    if (isMobile && openFilterCollapsibles.has("sort")) {
      // Mobile sort is open, ensure desktop is closed
      // The desktop one should be hidden anyway, but this ensures state is clean
    }
  }, [isMobile, openFilterCollapsibles]);

  const hasActiveFilters = !!(
    searchQuery ||
    selectedWorkPackage.length > 0 ||
    selectedLead.length > 0 ||
    selectedWorkstream.length > 0 ||
    selectedBigTicket.length > 0 ||
    selectedAction.length > 0 ||
    selectedTeamMember.length > 0 ||
    selectedActionStatus.length > 0
  );

  const hasActiveAdvancedFilters = !!(
    selectedWorkPackage.length > 0 ||
    selectedLead.length > 0 ||
    selectedWorkstream.length > 0 ||
    selectedBigTicket.length > 0 ||
    selectedAction.length > 0 ||
    selectedTeamMember.length > 0 ||
    selectedActionStatus.length > 0
  );

  return (
    <>
      {/* Header with Advanced Filters Toggle and Sort */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="flex shrink-0 items-center gap-2 text-[22px] leading-6.25 font-bold text-black sm:text-[24px] md:text-[26px]">
          <Briefcase className="h-5 w-5 text-un-blue sm:h-6 sm:w-6" />
          Work Packages
        </h2>

        {/* Advanced Filtering and Sort */}
        <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-3">
          {/* Mobile: Simple buttons aligned left */}
          <div className="flex items-center gap-2 sm:hidden">
            {/* Advanced Filtering Collapsible */}
            <Collapsible
              open={isAdvancedFilterOpen}
              onOpenChange={onAdvancedFilterOpenChange}
            >
              <CollapsibleTrigger
                className={`flex h-8 touch-manipulation items-center gap-2 rounded-lg border px-2 text-xs transition-colors ${
                  hasActiveAdvancedFilters
                    ? "border-un-blue bg-un-blue/10 text-un-blue hover:border-un-blue"
                    : "border-gray-300 bg-white text-gray-900 hover:border-un-blue hover:bg-un-blue/10 hover:text-un-blue"
                } `}
              >
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Advanced Filters</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    isAdvancedFilterOpen ? "rotate-180 transform" : ""
                  }`}
                />
              </CollapsibleTrigger>
            </Collapsible>

            {/* Sort Option - Mobile Style */}
            {isMobile && (
              <Popover
                open={openFilterCollapsibles.has("sort")}
                onOpenChange={(open) => {
                  onToggleFilterCollapsible("sort", open);
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`flex h-8 touch-manipulation items-center gap-2 rounded-lg border px-2 text-xs transition-colors ${
                      sortOption !== "number-asc"
                        ? "border-un-blue bg-un-blue/10 text-un-blue hover:border-un-blue"
                        : "border-gray-200 bg-white text-gray-500 hover:border-un-blue hover:bg-un-blue/10 hover:text-un-blue"
                    } `}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {sortOption === "number-asc"
                        ? "Number (1-31)"
                        : sortOption === "number-desc"
                          ? "Number (31-1)"
                          : sortOption === "name-asc"
                            ? "Name (A-Z)"
                            : sortOption === "name-desc"
                              ? "Name (Z-A)"
                              : "Sort"}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                        openFilterCollapsibles.has("sort")
                          ? "rotate-180 transform"
                          : ""
                      }`}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-max max-w-[calc(100vw-2rem)] border border-gray-200 bg-white p-1 shadow-lg"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div>
                    {[
                      { key: "number-asc", label: "Number (1-31)" },
                      { key: "number-desc", label: "Number (31-1)" },
                      { key: "name-asc", label: "Name (A-Z)" },
                      { key: "name-desc", label: "Name (Z-A)" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSortChange(option.key);
                          onCloseFilterCollapsible("sort");
                        }}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-un-blue/10 hover:text-un-blue"
                      >
                        <span>{option.label}</span>
                        {sortOption === option.key && (
                          <Check className="ml-auto h-4 w-4 text-un-blue" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden items-center gap-3 sm:flex">
            {/* Advanced Filtering Collapsible */}
            <Collapsible
              open={isAdvancedFilterOpen}
              onOpenChange={onAdvancedFilterOpenChange}
            >
              <CollapsibleTrigger
                className={`flex h-10 touch-manipulation items-center gap-3 rounded-lg border px-3 text-base transition-colors ${
                  hasActiveAdvancedFilters
                    ? "border-un-blue bg-un-blue/10 text-un-blue hover:border-un-blue"
                    : "border-gray-300 bg-white text-gray-900 hover:border-un-blue hover:bg-un-blue/10 hover:text-un-blue"
                } `}
              >
                <Filter className="h-4 w-4 shrink-0" />
                <span className="truncate">Advanced Filters</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    isAdvancedFilterOpen ? "rotate-180 transform" : ""
                  }`}
                />
              </CollapsibleTrigger>
            </Collapsible>

            {/* Sort Option */}
            <div className="w-32">
              <FilterDropdown
                open={!isMobile && openFilterCollapsibles.has("sort")}
                onOpenChange={(open) => {
                  if (!isMobile) {
                    onToggleFilterCollapsible("sort", open);
                  }
                }}
                icon={<ArrowUpDown className="h-4 w-4" />}
                triggerText={
                  sortOption === "number-desc"
                    ? "31-1"
                    : sortOption === "name-asc"
                      ? "A-Z"
                      : sortOption === "name-desc"
                        ? "Z-A"
                        : "Sort"
                }
                isFiltered={sortOption !== "number-asc"}
                allActive={false}
                options={[
                  { key: "number-asc", label: "Number (1-31)" },
                  { key: "number-desc", label: "Number (31-1)" },
                  { key: "name-asc", label: "Name (A-Z)" },
                  { key: "name-desc", label: "Name (Z-A)" },
                ]}
                selectedKeys={new Set([sortOption])}
                onToggle={(key) => {
                  onSortChange(key);
                  onCloseFilterCollapsible("sort");
                }}
                ariaLabel="Sort work packages"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Content - Expands Below */}
      {isAdvancedFilterOpen && (
        <div className="mb-3 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Work Package Leads Filter */}
          <FilterDropdown
            open={openFilterCollapsibles.has("lead")}
            onOpenChange={(open) => onToggleFilterCollapsible("lead", open)}
            icon={<Users className="h-4 w-4 text-un-blue" />}
            triggerText={
              selectedLead.length === 0
                ? "Select work package lead"
                : selectedLead.length === 1
                  ? selectedLead[0]
                  : `${selectedLead.length} leads selected`
            }
            isFiltered={selectedLead.length > 0}
            allActive={false}
            options={uniqueLeads.map(
              (lead): FilterOption => ({
                key: lead,
                label: lead,
              }),
            )}
            selectedKeys={new Set(selectedLead)}
            onToggle={(key) => {
              const newSelected = selectedLead.includes(key)
                ? selectedLead.filter((lead) => lead !== key)
                : [...selectedLead, key];
              onSelectLead(newSelected);
            }}
            ariaLabel="Filter by work package lead"
            enableSearch={true}
            searchPlaceholder="Search leads..."
          />

          {/* Work Package Filter */}
          <FilterDropdown
            open={openFilterCollapsibles.has("workPackage")}
            onOpenChange={(open) =>
              onToggleFilterCollapsible("workPackage", open)
            }
            icon={<Briefcase className="h-4 w-4 text-un-blue" />}
            triggerText={
              selectedWorkPackage.length === 0
                ? "Select work package"
                : selectedWorkPackage.length === 1
                  ? selectedWorkPackage[0]
                  : `${selectedWorkPackage.length} work packages selected`
            }
            isFiltered={selectedWorkPackage.length > 0}
            allActive={false}
            options={uniqueWorkPackages.map(
              (wp): FilterOption => ({
                key: wp,
                label: wp,
              }),
            )}
            selectedKeys={new Set(selectedWorkPackage)}
            onToggle={(key) => {
              const newSelected = selectedWorkPackage.includes(key)
                ? selectedWorkPackage.filter((wp) => wp !== key)
                : [...selectedWorkPackage, key];
              onSelectWorkPackage(newSelected);
            }}
            ariaLabel="Filter by work package"
            enableSearch={true}
            searchPlaceholder="Search work packages..."
          />

          {/* Workstream Filter */}
          <FilterDropdown
            open={openFilterCollapsibles.has("workstream")}
            onOpenChange={(open) =>
              onToggleFilterCollapsible("workstream", open)
            }
            icon={<Layers className="h-4 w-4 text-un-blue" />}
            triggerText={
              selectedWorkstream.length === 0
                ? "Select workstream"
                : selectedWorkstream.length === 1
                  ? selectedWorkstream[0]
                  : `${selectedWorkstream.length} workstreams selected`
            }
            isFiltered={selectedWorkstream.length > 0}
            allActive={false}
            options={uniqueWorkstreams.map(
              (ws): FilterOption => ({
                key: ws,
                label: ws,
              }),
            )}
            selectedKeys={new Set(selectedWorkstream)}
            onToggle={(key) => {
              const newSelected = selectedWorkstream.includes(key)
                ? selectedWorkstream.filter((ws) => ws !== key)
                : [...selectedWorkstream, key];
              onSelectWorkstream(newSelected);
            }}
            ariaLabel="Filter by workstream"
          />

          {/* Type Filter */}
          <FilterDropdown
            open={openFilterCollapsibles.has("type")}
            onOpenChange={(open) => onToggleFilterCollapsible("type", open)}
            icon={<Package className="h-4 w-4 text-un-blue" />}
            triggerText={
              selectedBigTicket.length === 0
                ? "Select package type"
                : selectedBigTicket.length === 1
                  ? selectedBigTicket[0] === "big-ticket"
                    ? '"Big Ticket" Work packages'
                    : "Other Work packages"
                  : `${selectedBigTicket.length} types selected`
            }
            isFiltered={selectedBigTicket.length > 0}
            allActive={selectedBigTicket.length === 0}
            options={availableBigTicketOptions}
            selectedKeys={new Set(selectedBigTicket)}
            onToggle={(key) => {
              const newSelected = selectedBigTicket.includes(key)
                ? selectedBigTicket.filter((type) => type !== key)
                : [...selectedBigTicket, key];
              onSelectBigTicket(newSelected);
            }}
            ariaLabel="Filter by package type"
          />

          {/* Action Filter */}
          <FilterDropdown
            open={openFilterCollapsibles.has("action")}
            onOpenChange={(open) => onToggleFilterCollapsible("action", open)}
            icon={<ListTodo className="h-4 w-4 text-un-blue" />}
            triggerText={
              selectedAction.length === 0
                ? "Select action"
                : selectedAction.length === 1
                  ? (() => {
                      const actionNum = selectedAction[0];
                      const actionObj = uniqueActions.find(
                        (a) => a.actionNumber === actionNum,
                      );
                      const displayText = actionObj
                        ? `${actionObj.actionNumber}: ${actionObj.text}`
                        : actionNum;
                      return displayText.length > 50
                        ? `${displayText.substring(0, 50)}...`
                        : displayText;
                    })()
                  : `${selectedAction.length} actions selected`
            }
            isFiltered={selectedAction.length > 0}
            allActive={false}
            options={uniqueActions.map(
              (action): FilterOption => ({
                key: action.actionNumber,
                label: action.actionNumber
                  ? `${action.actionNumber}: ${action.text}`
                  : action.text,
              }),
            )}
            selectedKeys={new Set(selectedAction)}
            onToggle={(key) => {
              const newSelected = selectedAction.includes(key)
                ? selectedAction.filter((action) => action !== key)
                : [...selectedAction, key];
              onSelectAction(newSelected);
            }}
            ariaLabel="Filter by action"
            enableSearch={true}
            searchPlaceholder="Search actions..."
          />

          {/* Team Member Filter */}
          <FilterDropdown
            open={openFilterCollapsibles.has("teamMember")}
            onOpenChange={(open) =>
              onToggleFilterCollapsible("teamMember", open)
            }
            icon={<User className="h-4 w-4 text-un-blue" />}
            triggerText={
              selectedTeamMember.length === 0
                ? "Select team member"
                : selectedTeamMember.length === 1
                  ? selectedTeamMember[0]
                  : `${selectedTeamMember.length} team members selected`
            }
            isFiltered={selectedTeamMember.length > 0}
            allActive={false}
            options={uniqueTeamMembers.map(
              (member): FilterOption => ({
                key: member,
                label: member,
              }),
            )}
            selectedKeys={new Set(selectedTeamMember)}
            onToggle={(key) => {
              const newSelected = selectedTeamMember.includes(key)
                ? selectedTeamMember.filter((member) => member !== key)
                : [...selectedTeamMember, key];
              onSelectTeamMember(newSelected);
            }}
            ariaLabel="Filter by team member"
            enableSearch={true}
            searchPlaceholder="Search team members..."
          />

          {/* Action Status Filter */}
          <FilterDropdown
            open={openFilterCollapsibles.has("actionStatus")}
            onOpenChange={(open) =>
              onToggleFilterCollapsible("actionStatus", open)
            }
            icon={<Activity className="h-4 w-4 text-un-blue" />}
            triggerText={
              selectedActionStatus.length === 0
                ? "Select action status"
                : selectedActionStatus[0]
            }
            isFiltered={selectedActionStatus.length > 0}
            allActive={false}
            options={[
              {
                key: ACTION_STATUS.FURTHER_WORK_ONGOING,
                label: "Further Work Ongoing",
              },
              { key: ACTION_STATUS.DECISION_TAKEN, label: "Decision Taken" },
            ]}
            selectedKeys={new Set(selectedActionStatus)}
            onToggle={(key) => {
              // Single-select: if clicking the same status, deselect it; otherwise select only this one
              const newSelected = selectedActionStatus.includes(key)
                ? []
                : [key];
              onSelectActionStatus(newSelected);
            }}
            ariaLabel="Filter by action status"
          />
        </div>
      )}

      {/* Search Bar, Progress Toggle, and Reset Button */}
      <div className="-mt-1 mb-4 flex w-full items-center justify-between gap-3">
        <SearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />
        <div className="flex items-center gap-3">
          {hasActiveFilters && <ResetButton onClick={onResetFilters} />}
        </div>
      </div>
    </>
  );
}
