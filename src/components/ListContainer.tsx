import { WorkPackageItem } from "@/components/WorkPackageCard";
import type { WorkPackage } from "@/types";
import { normalizeTeamMember } from "@/lib/utils";

interface WorkPackageListProps {
  workPackages: WorkPackage[];
  openCollapsibles: Set<string>;
  onToggleCollapsible: (key: string) => void;
  onSelectLead?: (lead: string[]) => void;
  onSelectWorkstream?: (workstream: string[]) => void;
  selectedActions?: string[];
  selectedTeamMembers?: string[];
  selectedActionStatus?: string[];
  selectedMilestoneMonth?: string[];
  isLoading?: boolean;
  showProgress?: boolean;
  searchQuery?: string;
}

export function WorkPackageList({
  workPackages,
  openCollapsibles,
  onToggleCollapsible,
  onSelectLead,
  onSelectWorkstream,
  selectedActions = [],
  selectedTeamMembers = [],
  selectedActionStatus = [],
  selectedMilestoneMonth = [],
  isLoading = false,
  showProgress = false,
  searchQuery = "",
}: WorkPackageListProps) {
  // Don't show "no results" message while loading
  if (workPackages.length === 0 && !isLoading) {
    return (
      <div className="w-full py-12">
        <p className="text-left text-gray-600">
          No results found. Try adjusting your filters or search query.
        </p>
      </div>
    );
  }

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      {workPackages.map((wp, index) => {
        const collapsibleKey = `${wp.report.join("-")}-${wp.number || "empty"}-${index}`;
        const isOpen = openCollapsibles.has(collapsibleKey);

        // Filter actions if action filter is selected
        let filteredActions =
          selectedActions.length > 0
            ? wp.actions.filter((action) => {
                const actionText = action.text ? action.text.trim() : "";
                const actionNumberStr = String(action.actionNumber);
                return selectedActions.some((selected) => {
                  const selectedTrimmed = selected.trim();
                  return (
                    actionText === selectedTrimmed ||
                    actionNumberStr === selectedTrimmed
                  );
                });
              })
            : wp.actions;

        // Filter actions by team members if team member filter is selected
        if (selectedTeamMembers.length > 0) {
          filteredActions = filteredActions.filter((action) => {
            if (!action.actionEntities) return false;
            const entities = action.actionEntities
              .split(";")
              .map((e) => e.trim())
              .filter(Boolean);
            // Normalize both the selected team members and the entities for comparison
            const normalizedSelected = selectedTeamMembers
              .map(normalizeTeamMember)
              .filter(Boolean) as string[];
            return entities.some((entity) => {
              const normalizedEntity = normalizeTeamMember(entity);
              return (
                normalizedEntity &&
                normalizedSelected.includes(normalizedEntity)
              );
            });
          });
        }

        // Don't filter by milestone month or status here - let WorkPackageCard handle display
        // Check if any actions match the status filter (to determine if work package should show)
        const hasMatchingStatusAction =
          selectedActionStatus.length === 0 ||
          filteredActions.some((action) => {
            const actionStatusLower = action.actionStatus?.toLowerCase() || "";
            return selectedActionStatus.some(
              (status) => status.toLowerCase() === actionStatusLower,
            );
          });

        // Check if any actions match the milestone month filter (to determine if work package should show)
        const hasMatchingMilestoneMonth =
          selectedMilestoneMonth.length === 0 ||
          filteredActions.some((action) => {
            if (!action.deliveryDate) return false;
            const deliveryDate = new Date(action.deliveryDate);
            const monthName = deliveryDate.toLocaleDateString("en-US", {
              month: "long",
            });
            return selectedMilestoneMonth.includes(monthName);
          });

        // If there are no actions to display, don't render an (empty) collapsible
        if (
          !filteredActions ||
          filteredActions.length === 0 ||
          !hasMatchingStatusAction ||
          !hasMatchingMilestoneMonth
        ) {
          return null;
        }

        // Create a work package with filtered actions (by selected actions and team members only)
        // Status and milestone month filtering is handled by WorkPackageCard for display purposes
        const filteredWorkPackage = {
          ...wp,
          actions: filteredActions,
        };

        // Auto-expand work package if there are active filters and matched actions
        const hasActiveFilters =
          searchQuery.trim().length > 0 ||
          selectedActionStatus.length > 0 ||
          selectedMilestoneMonth.length > 0;
        const shouldBeOpen = hasActiveFilters || isOpen;

        return (
          <WorkPackageItem
            key={collapsibleKey}
            workPackage={filteredWorkPackage}
            isOpen={shouldBeOpen}
            onToggle={() => onToggleCollapsible(collapsibleKey)}
            collapsibleKey={collapsibleKey}
            onSelectLead={onSelectLead}
            onSelectWorkstream={onSelectWorkstream}
            showProgress={showProgress}
            searchQuery={searchQuery}
            selectedActions={selectedActions}
            selectedTeamMembers={selectedTeamMembers}
            selectedActionStatus={selectedActionStatus}
            selectedMilestoneMonth={selectedMilestoneMonth}
            originalActionsCount={wp.actions.length}
          />
        );
      })}
    </div>
  );
}
