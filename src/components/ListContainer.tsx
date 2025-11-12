import { WorkPackageItem } from "@/components/WorkPackageCard";
import type { WorkPackage } from "@/types";

interface WorkPackageListProps {
    workPackages: WorkPackage[];
    openCollapsibles: Set<string>;
    onToggleCollapsible: (key: string) => void;
}

export function WorkPackageList({
    workPackages,
    openCollapsibles,
    onToggleCollapsible,
}: WorkPackageListProps) {
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
                    />
                );
            })}
        </div>
    );
}
