import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkPackageActions } from "@/components/WorkPackageActions";
import { abbreviationMap } from "@/constants/abbreviations";
import { formatGoalText } from "@/lib/utils";
import type { WorkPackage } from "@/types";
import { Info, Layers, Trophy, Users } from "lucide-react";

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
                className={`mb-20 last:mb-0 relative ${
                    isOpen
                        ? "border-l-4 border-l-un-blue border border-slate-200 rounded-[6px] bg-slate-50/50"
                        : ""
                }`}
            >
                <CollapsibleTrigger
                    className={`w-full flex flex-col items-start px-6 py-4 hover:no-underline rounded-[6px] transition-all hover:bg-[#E0F5FF] border-0 ${
                        isOpen ? "rounded-b-none bg-slate-50/50" : "bg-gray-50"
                    }`}
                >
                    {/* Work Package Title */}
                    <div className="text-left min-w-0 mb-1 pr-20 sm:pr-8">
                        {wp.number ? (
                            <>
                                <span className="text-[17px] font-medium text-gray-400 leading-6">
                                    Work package {wp.number}:
                                </span>
                                <span className="text-[17px] font-medium text-slate-900 leading-6 ml-1">
                                    {wp.name}
                                </span>
                            </>
                        ) : (
                            <span className="text-[17px] font-medium text-slate-900 leading-6">
                                {wp.name}
                            </span>
                        )}
                    </div>

                    {/* Goal from work package data */}
                    {wp.goal && (
                        <div className="mt-0.5 pr-8 text-left pl-0 py-2 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Trophy className="w-4 h-4 text-un-blue" />
                                <p className="text-[14px] font-semibold text-un-blue uppercase tracking-wide text-left">
                                    Goal
                                </p>
                            </div>
                            <p className="text-[15px] text-slate-800 leading-[23px] mt-2 text-left normal-case">
                                {formatGoalText(wp.goal)}
                            </p>
                        </div>
                    )}

                    {/* Report Labels and Work Package Leads */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {/* Workstream Labels */}
                        {wp.report.includes("WS1") && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                        <Layers className="w-4 h-4 text-gray-600" />
                                        <p className="text-[15px] text-gray-600 leading-5">WS1</p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Workstream 1</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {wp.report.includes("WS2") && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                        <Layers className="w-4 h-4 text-gray-600" />
                                        <p className="text-[15px] text-gray-600 leading-5">WS2</p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Workstream 2</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {wp.report.includes("WS3") && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                        <Layers className="w-4 h-4 text-gray-600" />
                                        <p className="text-[15px] text-gray-600 leading-5">WS3</p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Workstream 3</p>
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {/* Work Package Leads */}
                        {wp.leads.length > 0 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                        <Users className="w-4 h-4 text-gray-600" />
                                        <p className="text-[15px] text-gray-600 leading-5">
                                            {wp.leads.map((lead, idx) => {
                                                const longForm = abbreviationMap[lead] || lead;
                                                return (
                                                    <span key={idx}>
                                                        {idx > 0 && ", "}
                                                        <span
                                                            title={
                                                                longForm !== lead ? longForm : undefined
                                                            }
                                                        >
                                                            {lead}
                                                        </span>
                                                    </span>
                                                );
                                            })}
                                        </p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        {wp.leads.map((lead, idx) => {
                                            const longForm = abbreviationMap[lead] || lead;
                                            return (
                                                <span key={idx}>
                                                    {idx > 0 && ", "}
                                                    {longForm}
                                                </span>
                                            );
                                        })}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </CollapsibleTrigger>

                {/* Details Button */}
                <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[6px] text-[14px] font-medium transition-colors absolute top-4 right-2 sm:right-4"
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
                <CollapsibleContent className={`px-0 pb-4 pt-2 pl-6 ${isOpen ? "px-6" : ""}`}>
                    <WorkPackageActions
                        actions={wp.actions}
                        workPackageNumber={wp.number}
                    />
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
