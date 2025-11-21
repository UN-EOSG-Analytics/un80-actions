import { DocumentBadge } from "@/components/DocumentBadge";
import { LeadsBadge } from "@/components/LeadsBadge";
import type { WorkPackageAction } from "@/types";

/**
 * Props for the ActionItem component (component-specific)
 */
interface ActionItemProps {
  /** The action data to display */
  action: WorkPackageAction;
  /** The work package number (e.g., "31") for document reference formatting */
  workPackageNumber: string;
}

/**
 * Displays a single action item within a work package.
 * Shows the action text, leads, document references, and optional doc text.
 */
export function ActionItem({
  action,
  workPackageNumber,
}: ActionItemProps) {
  return (
    <div className="rounded-[6px] border border-slate-200 bg-white p-5 pr-9 transition-shadow hover:shadow-sm">
      {/* Activity Number and Text */}
      <div className="mb-4 flex items-start gap-3">
        {/* Numbered circle badge */}
        <div className="mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-un-blue/10">
          <span className="text-xs font-semibold text-un-blue">
            {action.actionNumber || ""}
          </span>
        </div>
        {/* Action description text */}
        <div className="flex-1">
          <p className="leading-normal font-medium text-slate-900">
            {action.text}
          </p>
        </div>
      </div>

      {/* Metadata section - shown when there are leads */}
      {action.leads.length > 0 && (
        <div className="ml-9 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Display lead organizations in muted style */}
            <LeadsBadge leads={action.leads} variant="muted" />
            {/* Display document reference (e.g., "A/80/400 para. 5") */}
            <DocumentBadge
              documentParagraphNumber={action.documentParagraph}
              report={action.report}
              workPackageNumber={workPackageNumber}
            />
          </div>
          {/* Additional document text/quote - shown below metadata if available */}
          {action.docText && (
            <div className="pr- mt-3 ml-0.5 border-l-2 border-slate-400 bg-slate-50 py-2 pl-3">
              <p className="text-sm leading-tight text-slate-600">
                &ldquo;{action.docText}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
      {/* Document text - shown when no leads are present */}
      {action.leads.length === 0 && action.docText && (
        <div className="ml-9 border-l-2 border-slate-400 bg-slate-50 py-2 pr-3 pl-3">
          <p className="text-sm leading-tight text-slate-600">
            &ldquo;{action.docText}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
