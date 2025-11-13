import { DocumentBadge } from "@/components/DocumentBadge";
import { LeadsBadge } from "@/components/LeadsBadge";
import type { WorkPackageAction } from "@/types";

/**
 * Props for the ActionItem component (component-specific)
 */
interface ActionItemProps {
    /** The action data to display */
    action: WorkPackageAction;
    /** The index of this action in its parent list (0-based) */
    index: number;
    /** The work package number (e.g., "31") for document reference formatting */
    workPackageNumber: string;
}

/**
 * Displays a single action item within a work package.
 * Shows the action text, leads, document references, and optional doc text.
 */
export function ActionItem({ action, index, workPackageNumber }: ActionItemProps) {
    return (
        <div className="bg-white border border-slate-200 rounded-[6px] p-5 hover:shadow-sm transition-shadow">
            {/* Activity Number and Text */}
            <div className="flex gap-3 mb-4 items-start">
                {/* Numbered circle badge */}
                <div className="shrink-0 w-6 h-6 rounded-full bg-un-blue/10 flex items-center justify-center mt-[3px]">
                    <span className="text-xs font-semibold text-un-blue">
                        {index + 1}
                    </span>
                </div>
                {/* Action description text */}
                <div className="flex-1">
                    <p className="font-medium text-slate-900 leading-normal">
                        {action.text}
                    </p>
                </div>
            </div>

            {/* Metadata section - shown when there are leads */}
            {action.leads.length > 0 && (
                <div className="ml-9 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Display lead organizations in muted style */}
                        <LeadsBadge leads={action.leads} variant="muted" />
                        {/* Display document reference (e.g., "A/80/400 para. 5") */}
                        <DocumentBadge
                            documentParagraph={action.documentParagraph}
                            report={action.report}
                            workPackageNumber={workPackageNumber}
                        />
                    </div>
                    {/* Additional document text/quote - shown below metadata if available */}
                    {action.docText && (
                        <div className="pt-3 mt-3 border-t border-slate-100">
                            <p className="text-sm text-gray-600 leading-tight">
                                {action.docText}
                            </p>
                        </div>
                    )}
                </div>
            )}
            {/* Document text - shown when no leads are present */}
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
