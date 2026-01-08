"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DocumentBadge } from "@/components/DocumentBadge";
import { LeadsBadge } from "@/components/LeadsBadge";
import { CheckCircle2 } from "lucide-react";
import { parseDate } from "@/lib/utils";
import type { WorkPackageAction } from "@/types";

/**
 * Props for the ActionItem component (component-specific)
 */
interface ActionItemProps {
  /** The action data to display */
  action: WorkPackageAction;
  /** The work package number (e.g., "31") for document reference formatting */
  workPackageNumber: number | '';
}

/**
 * Displays a single action item within a work package.
 * Shows the action text, leads, document references, and optional doc text.
 */
export function ActionItem({
  action,
  workPackageNumber,
}: ActionItemProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = () => {
    // Save current URL to sessionStorage before opening modal
    const currentUrl = searchParams.toString();
    if (currentUrl) {
      sessionStorage.setItem('previousUrl', currentUrl);
    } else {
      sessionStorage.removeItem('previousUrl');
    }
    
    // Build URL with action number and optionally first_milestone for subactions
    let url = `/?action=${action.actionNumber}`;
    if (action.firstMilestone) {
      // Encode firstMilestone to handle special characters and use it to identify subactions
      url += `&milestone=${encodeURIComponent(action.firstMilestone)}`;
    }
    
    // Navigate to clean modal URL
    router.push(url, { scroll: false });
  };

  // Calculate progress to determine if action is completed
  // Icon only appears when progress reaches 100% based on elapsed time calculation
  const isCompleted = (() => {
    if (!action.finalMilestoneDeadline || !action.firstMilestone) return false;
    
    const deadlineDate = parseDate(action.finalMilestoneDeadline);
    const startDate = parseDate(action.firstMilestone);
    const now = new Date();
    
    // Both dates must be valid and startDate must be before deadlineDate
    if (!deadlineDate || !startDate) return false;
    if (isNaN(deadlineDate.getTime()) || isNaN(startDate.getTime())) return false;
    if (startDate >= deadlineDate) return false;
    
    const totalDuration = deadlineDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    
    return progress >= 100;
  })();

  return (
    <div 
      onClick={handleClick}
      className="rounded-[6px] border border-slate-200 bg-white p-5 pr-9 transition-all hover:shadow-md hover:border-slate-300 cursor-pointer"
    >
      {/* Activity Number and Text */}
      <div className="mb-4 flex items-start gap-3">
        {/* Numbered circle badge or Completed icon */}
        {isCompleted ? (
          <div className="mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-un-blue/10">
            <CheckCircle2 className="h-5 w-5 text-un-blue" />
          </div>
        ) : (
          <div className="mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-un-blue/10">
            <span className="text-xs font-semibold text-un-blue">
              {action.actionNumber || ""}
            </span>
          </div>
        )}
        {/* Action description text */}
        <div className="flex-1">
          <p className="leading-normal font-medium text-slate-900">
            {action.text}
            {action.subActionDetails && (
              <>
                {" "}
                <span className="font-bold text-slate-600">– {action.subActionDetails}</span>
              </>
            )}
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
