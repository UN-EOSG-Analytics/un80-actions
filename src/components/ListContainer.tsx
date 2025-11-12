import { WorkPackageItem } from "@/components/WorkPackageCard";
import type { WorkPackage } from "@/types";

interface WorkPackageListProps {
    workPackages: WorkPackage[];
    openCollapsibles: Set<string>;
    onToggleCollapsible: (key: string) => void;
    onSelectLead?: (lead: string[]) => void;
    onSelectWorkstream?: (workstream: string[]) => void;
}

export function WorkPackageList({
    workPackages,
    openCollapsibles,
    onToggleCollapsible,
    onSelectLead,
    onSelectWorkstream,
}: WorkPackageListProps) {
    if (workPackages.length === 0) {
        return (
            <div className="w-full py-12">
                <p className="text-left text-gray-600">
                    No results found. Try adjusting your filters or search query.
                </p>
            </div>
        );
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
