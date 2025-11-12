import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { abbreviationMap } from "@/constants/abbreviations";
import type { WorkPackageAction } from "@/types";
import { FileText, Users } from "lucide-react";

interface ActionItemProps {
    action: WorkPackageAction;
    index: number;
    workPackageNumber: string;
}

export function ActionItem({ action, index, workPackageNumber }: ActionItemProps) {
    return (
        <div className="bg-white border border-slate-200 rounded-[6px] p-5 hover:shadow-sm transition-shadow">
            {/* Activity Number and Text */}
            <div className="flex gap-3 mb-4 items-start">
                <div className="shrink-0 w-6 h-6 rounded-full bg-un-blue/10 flex items-center justify-center mt-[3px]">
                    <span className="text-xs font-semibold text-un-blue">
                        {index + 1}
                    </span>
                </div>
                <div className="flex-1">
                    <p className="text-base font-medium text-slate-900 leading-normal">
                        {action.text}
                    </p>
                </div>
            </div>

            {/* Work Package Leads - Icon + Text */}
            {action.leads.length > 0 && (
                <div className="ml-9 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                    <Users className="w-4 h-4 text-gray-500" />
                                    <p className="text-sm text-gray-600 leading-tight">
                                        {action.leads.map((lead, idx) => {
                                            const longForm = abbreviationMap[lead] || lead;
                                            return (
                                                <span key={idx}>
                                                    {idx > 0 && ', '}
                                                    <span title={longForm !== lead ? longForm : undefined}>
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
                                    {action.leads.map((lead, idx) => {
                                        const longForm = abbreviationMap[lead] || lead;
                                        return (
                                            <span key={idx}>
                                                {idx > 0 && ', '}
                                                {longForm}
                                            </span>
                                        );
                                    })}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                        {(action.documentParagraph || action.report === 'WS1' || workPackageNumber === '31') && (
                            <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-sm text-gray-600 leading-tight">
                                    {workPackageNumber === '31'
                                        ? `A/80/400`
                                        : action.report === 'WS1'
                                            ? `A/80/400`
                                            : action.report === 'WS3'
                                                ? `A/80/392 para. ${action.documentParagraph}`
                                                : action.report === 'WS2'
                                                    ? `A/80/318 para. ${action.documentParagraph}`
                                                    : `Para. ${action.documentParagraph}`}
                                </span>
                            </div>
                        )}
                    </div>
                    {/* Doc Text */}
                    {action.docText && (
                        <div className="pt-3 mt-3 border-t border-slate-100">
                            <p className="text-sm text-gray-600 leading-tight">
                                {action.docText}
                            </p>
                        </div>
                    )}
                </div>
            )}
            {/* Doc Text - when no leads */}
            {action.leads.length === 0 && action.docText && (
                <div className="ml-9 pt-3 border-t border-slate-100">
                    <p className="text-sm text-gray-600 leading-tight">
                        {action.docText}
                    </p>
                </div>
            )}
        </div>
    );
}
