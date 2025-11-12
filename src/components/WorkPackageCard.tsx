import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ActionItem } from "@/components/ActionCard";
import { WorkstreamLabels } from "@/components/WorkstreamBadge";
import { LeadsBadge } from "@/components/LeadsBadge";
import { formatGoalText } from "@/lib/utils";
import type { WorkPackage, WorkPackageAction } from "@/types";
import { Info, Trophy } from "lucide-react";

interface WorkPackageActionsProps {
    actions: WorkPackageAction[];
    workPackageNumber: string;
}

function WorkPackageActions({ actions, workPackageNumber }: WorkPackageActionsProps) {
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
            <h3 className="text-lg font-semibold text-slate-700 tracking-wider text-left pb-1">
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

interface WorkPackageItemProps {
    workPackage: WorkPackage;
    isOpen: boolean;
    onToggle: () => void;
    collapsibleKey: string;
}

export function WorkPackageItem({
    workPackage: wp,
    isOpen,
    onToggle,
}: WorkPackageItemProps) {
    return (
        <Collapsible open={isOpen} onOpenChange={onToggle}>
            <div
                className={`mb-20 last:mb-0 relative border-l-4 border border-transparent rounded-[6px] ${isOpen
                    ? "border-l-un-blue border-slate-200 bg-slate-50/50 transition-colors duration-200"
                    : "border-l-transparent transition-colors duration-200 delay-[400ms]"
                    }`}
            >
                <CollapsibleTrigger
                    className={`w-full flex flex-col items-start px-6 py-4 hover:no-underline rounded-[6px] transition-colors hover:bg-[#E0F5FF] border-0 ${isOpen ? "rounded-b-none bg-slate-50/50" : "bg-gray-50"
                        }`}
                >
                    {/* Work Package Title */}
                    <div className="text-left min-w-0 mb-1 pr-20 sm:pr-8">
                        {wp.number ? (
                            <>
                                <span className="text-lg font-medium text-gray-400 leading-6">
                                    Work package {wp.number}:
                                </span>
                                <span className="text-lg font-medium text-slate-900 leading-6 ml-1">
                                    {wp.name}
                                </span>
                            </>
                        ) : (
                            <span className="text-lg font-medium text-slate-900 leading-6">
                                {wp.name}
                            </span>
                        )}
                    </div>

                    {/* Goal from work package data */}
                    {wp.goal && (
                        <div className="mt-0.5 pr-8 text-left pl-0 py-2 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Trophy className="w-4 h-4 text-un-blue" />
                                <p className="text-sm font-semibold text-un-blue uppercase tracking-wide text-left">
                                    Goal
                                </p>
                            </div>
                            <p className="text-base text-slate-800 leading-relaxed mt-2 text-left normal-case">
                                {formatGoalText(wp.goal)}
                            </p>
                        </div>
                    )}

                    {/* Report Labels and Work Package Leads */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {/* Workstream Labels */}
                        <WorkstreamLabels report={wp.report} />

                        {/* Work Package Leads */}
                        <LeadsBadge leads={wp.leads} />
                    </div>
                </CollapsibleTrigger>

                {/* Details Button */}
                <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[6px] text-sm font-medium transition-colors absolute top-4 right-2 sm:right-4"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle();
                    }}
                >
                    <Info className="w-3.5 h-3.5 text-gray-600" />
                    <span>Details</span>
                </button>

                {/* Collapsible Content */}
                <CollapsibleContent className="px-6 pb-6 pt-0">
                    <div className="pt-3">
                        <WorkPackageActions
                            actions={wp.actions}
                            workPackageNumber={wp.number}
                        />
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
