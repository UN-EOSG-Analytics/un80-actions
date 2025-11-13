import { WorkPackageItem } from "@/components/WorkPackageCard";
import type { WorkPackage } from "@/types";

interface WorkPackageListProps {
  workPackages: WorkPackage[];
  openCollapsibles: Set<string>;
  onToggleCollapsible: (key: string) => void;
  onSelectLead?: (lead: string[]) => void;
  onSelectWorkstream?: (workstream: string[]) => void;
  isLoading?: boolean;
}

export function WorkPackageList({
  workPackages,
  openCollapsibles,
  onToggleCollapsible,
  onSelectLead,
  onSelectWorkstream,
  isLoading = false,
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

        return (
          <WorkPackageItem
            key={collapsibleKey}
            workPackage={wp}
            isOpen={isOpen}
            onToggle={() => onToggleCollapsible(collapsibleKey)}
            collapsibleKey={collapsibleKey}
            onSelectLead={onSelectLead}
            onSelectWorkstream={onSelectWorkstream}
          />
        );
      })}
    </div>
  );
}
