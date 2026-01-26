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
                return selectedActions.some((selected) => {
                  const selectedTrimmed = selected.trim();
                  return actionText === selectedTrimmed;
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

        // Check if any actions match the status filter (to determine if work package should show)
        const hasMatchingStatusAction =
          selectedActionStatus.length === 0 ||
          filteredActions.some((action) => {
            const actionStatusLower = action.actionStatus?.toLowerCase() || "";
            return selectedActionStatus.some(
              (status) => status.toLowerCase() === actionStatusLower,
            );
          });

        // If there are no actions to display, don't render an (empty) collapsible
        if (
          !filteredActions ||
          filteredActions.length === 0 ||
          !hasMatchingStatusAction
        ) {
          return null;
        }

        // Create a work package with filtered actions (by selected actions and team members)
        // but keep all actions for status filter - let WorkPackageCard handle the display
        const filteredWorkPackage = {
          ...wp,
          actions: filteredActions,
        };

        return (
          <WorkPackageItem
            key={collapsibleKey}
            workPackage={filteredWorkPackage}
            isOpen={isOpen}
            onToggle={() => onToggleCollapsible(collapsibleKey)}
            collapsibleKey={collapsibleKey}
            onSelectLead={onSelectLead}
            onSelectWorkstream={onSelectWorkstream}
            showProgress={showProgress}
            searchQuery={searchQuery}
            selectedActionStatus={selectedActionStatus}
          />
        );
      })}
    </div>
  );
}
