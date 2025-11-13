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
import { ChevronDown, ChevronUp } from "lucide-react";

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
    onSelectLead?: (lead: string[]) => void;
    onSelectWorkstream?: (workstream: string[]) => void;
}

export function WorkPackageItem({
    workPackage: wp,
    isOpen,
    onToggle,
    onSelectLead,
    onSelectWorkstream,
}: WorkPackageItemProps) {
    return (
        <Collapsible open={isOpen} onOpenChange={onToggle}>
            <div
                className={`mb-20 last:mb-0 relative rounded-[6px] ${isOpen
                    ? "bg-slate-50/50 transition-colors duration-200"
                    : "transition-colors duration-200 delay-[400ms]"
                    }`}
            >
                {isOpen && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-un-blue rounded-l-[6px] z-10 pointer-events-none" />
                )}
                <CollapsibleTrigger
                    className={`w-full flex flex-col items-start px-6 py-4 hover:no-underline rounded-[6px] transition-colors hover:bg-[#E0F5FF] border-0 ${isOpen ? "rounded-b-none bg-slate-50/50" : "bg-slate-50"
                        }`}
                >
                    {/* Work Package Title */}
                    <div className="text-left min-w-0 mb-2 pr-20 sm:pr-8">
                        {wp.number ? (
                            <>
                                <span className="text-sm font-medium text-slate-500 uppercase tracking-wider leading-5">
                                    Work package {wp.number}
                                </span>
                                <h2 className="text-xl font-semibold text-slate-900 leading-7 mt-1">
                                    {wp.name}
                                </h2>
                            </>
                        ) : (
                            <h2 className="text-xl font-semibold text-slate-900 leading-7">
                                {wp.name}
                            </h2>
                        )}
                    </div>

                    {/* Goal from work package data */}
                    {wp.goal && (
                        <div className="pr-8 text-left mb-4 ml-0.5 border-l-2 border-un-blue pl-3">
                            <p className="text-slate-600 leading-relaxed font-medium">
                                {formatGoalText(wp.goal)}
                            </p>
                        </div>
                    )}

                    {/* Report Labels and Work Package Leads */}
                    <div className="flex items-start gap-4 mb-2 flex-wrap w-full">
                        {/* Workstream Labels */}
                        <WorkstreamLabels report={wp.report} onSelectWorkstream={onSelectWorkstream} />

                        {/* Work Package Leads */}
                        <LeadsBadge leads={wp.leads} onSelectLead={onSelectLead} />
                    </div>
                </CollapsibleTrigger>

                {/* Details Button */}
                <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-[6px] text-sm font-medium transition-colors absolute top-4 right-2 sm:right-4"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle();
                    }}
                >
                    {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                    )}
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
