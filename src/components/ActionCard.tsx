"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentBadge } from "@/components/DocumentBadge";
import { LeadsBadge } from "@/components/LeadsBadge";
import { CheckCircle2 } from "lucide-react";
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
    
    // Navigate to clean modal URL
    router.push(`/?action=${action.actionNumber}`, { scroll: false });
  };

  // Simulate completion status (20% of actions are completed)
  // In a real scenario, this would come from the action data
  const isCompleted = useMemo(() => {
    // Use action number as seed for consistent "completion" status
    return (action.actionNumber || 0) % 5 === 0;
  }, [action.actionNumber]);

  return (
    <div 
      onClick={handleClick}
      className={`rounded-[6px] border p-5 pr-9 transition-all hover:shadow-md cursor-pointer relative ${
        isCompleted 
          ? "border-un-blue/30 bg-un-blue/5 hover:border-un-blue/50" 
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {/* Completion indicator */}
      {isCompleted && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-un-blue/20 px-2 py-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-un-blue" />
          <span className="text-xs font-medium text-un-blue">Completed</span>
        </div>
      )}
      
      {/* Activity Number and Text */}
      <div className="mb-4 flex items-start gap-3">
        {/* Numbered circle badge */}
        <div className={`mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isCompleted ? "bg-un-blue/20" : "bg-un-blue/10"
        }`}>
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-un-blue" />
          ) : (
            <span className="text-xs font-semibold text-un-blue">
              {action.actionNumber || ""}
            </span>
          )}
        </div>
        {/* Action description text */}
        <div className="flex-1">
          <p className={`leading-normal font-medium ${
            isCompleted ? "text-slate-700 line-through" : "text-slate-900"
          }`}>
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
