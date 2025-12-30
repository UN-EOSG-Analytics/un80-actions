import { WorkPackageItem } from "@/components/WorkPackageCard";
import type { WorkPackage } from "@/types";

interface WorkPackageListProps {
  workPackages: WorkPackage[];
  openCollapsibles: Set<string>;
  onToggleCollapsible: (key: string) => void;
  onSelectLead?: (lead: string[]) => void;
  onSelectWorkstream?: (workstream: string[]) => void;
  selectedActions?: string[];
  selectedTeamMembers?: string[];
  isLoading?: boolean;
  showProgress?: boolean;
}

export function WorkPackageList({
  workPackages,
  openCollapsibles,
  onToggleCollapsible,
  onSelectLead,
  onSelectWorkstream,
  selectedActions = [],
  selectedTeamMembers = [],
  isLoading = false,
  showProgress = false,
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
          ? wp.actions.filter((action) =>
                selectedActions.includes(action.text.trim()),
            )
          : wp.actions;

        // Filter actions by team members if team member filter is selected
        if (selectedTeamMembers.length > 0) {
          filteredActions = filteredActions.filter((action) => {
            if (!action.actionEntities) return false;
            const entities = action.actionEntities.split(';').map(e => e.trim()).filter(Boolean);
            return selectedTeamMembers.some(selected => entities.includes(selected));
          });
        }

        // If there are no actions to display, don't render an (empty) collapsible
        if (!filteredActions || filteredActions.length === 0) {
          return null;
        }

        // Create a work package with filtered actions
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
          />
        );
      })}
    </div>
  );
}
