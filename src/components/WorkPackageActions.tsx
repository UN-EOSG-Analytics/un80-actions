import { ActionItem } from "@/components/ActionItem";
import type { WorkPackageAction } from "@/types";

interface WorkPackageActionsProps {
    actions: WorkPackageAction[];
    workPackageNumber: string;
}

export function WorkPackageActions({ actions, workPackageNumber }: WorkPackageActionsProps) {
    if (actions.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-[6px] p-[17px]">
                <p className="text-sm font-normal text-slate-900 leading-tight">
                    No actions available
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Header */}
            <h3 className="text-lg font-semibold text-slate-700 tracking-wider text-left">
                Indicative Actions
            </h3>
            {/* Display each indicative_activity in its own box */}
            {actions.map((action, idx) => (
                <ActionItem
                    key={idx}
                    action={action}
                    index={idx}
                    workPackageNumber={workPackageNumber}
                />
            ))}
        </div>
    );
}
