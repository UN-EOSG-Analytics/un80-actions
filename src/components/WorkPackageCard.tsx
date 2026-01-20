import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ActionItem } from "@/components/ActionCard";
import { WorkstreamLabels } from "@/components/WorkstreamBadge";
import { LeadsBadge } from "@/components/LeadsBadge";
import { formatGoalText } from "@/lib/utils";
import type { WorkPackage, WorkPackageAction } from "@/types";
import { Menu } from "lucide-react";

interface WorkPackageActionsProps {
  actions: WorkPackageAction[];
  workPackageNumber: number | "";
}

function WorkPackageActions({
  actions,
  workPackageNumber,
}: WorkPackageActionsProps) {
  if (actions.length === 0) {
    return (
      <div className="rounded-[6px] border border-slate-200 bg-white p-[17px]">
        <p className="text-sm leading-tight font-normal text-slate-900">
          No actions available
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <h3 className="pb-1 text-left text-lg font-semibold tracking-wider text-slate-700">
        Indicative Actions
      </h3>
      {/* Display each indicative_activity in its own box */}
      {actions.map((action, idx) => (
        <ActionItem
          key={`${workPackageNumber}-${action.actionNumber}-${action.text}-${idx}`}
          action={action}
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
  showProgress?: boolean;
}

export function WorkPackageItem({
  workPackage: wp,
  isOpen,
  onToggle,
  onSelectLead,
  onSelectWorkstream,
  showProgress = false,
}: WorkPackageItemProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div
        className={`relative mb-20 rounded-[6px] last:mb-0 ${
          isOpen
            ? "bg-slate-100 transition-colors duration-200"
            : "transition-colors delay-[400ms] duration-200"
        }`}
      >
        {isOpen && (
          <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-1 rounded-l-[6px] bg-un-blue" />
        )}
        <CollapsibleTrigger
          className={`flex w-full flex-col items-start rounded-[6px] border-0 px-6 py-4 transition-colors hover:bg-[#E0F5FF] hover:no-underline ${
            isOpen ? "rounded-b-none bg-slate-100" : "bg-slate-100"
          }`}
        >
          {/* Work Package Title */}
          <div className="mb-2 min-w-0 pr-20 text-left sm:pr-8">
            {wp.number ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm leading-5 font-medium tracking-wider text-slate-500 uppercase">
                    Work package {wp.number}
                  </span>
                  {/* Progress Bar */}
                  {showProgress && (
                    <div className="flex min-w-[120px] flex-1 items-center gap-2">
                      <div className="relative max-w-[200px] flex-1">
                        <Progress value={0} className="h-1.5" />
                        <div className="absolute top-0 left-0 h-1.5 w-0.5 rounded-l-full bg-un-blue" />
                      </div>
                      <span className="text-xs font-semibold whitespace-nowrap text-un-blue">
                        0%
                      </span>
                    </div>
                  )}
                </div>
                <h2 className="mt-1 text-xl leading-7 font-semibold text-slate-900">
                  {wp.name}
                </h2>
              </>
            ) : (
              <h2 className="text-xl leading-7 font-semibold text-slate-900">
                {wp.name}
              </h2>
            )}
          </div>

          {/* Goal from work package data */}
          {wp.goal && (
            <div className="mb-4 ml-0.5 border-l-2 border-un-blue pr-8 pl-3 text-left">
              <p className="leading-snug font-medium text-slate-600">
                {formatGoalText(wp.goal)}
              </p>
            </div>
          )}

          {/* Report Labels and Work Package Leads */}
          <div className="flex w-full flex-wrap items-start gap-4">
            {/* Workstream Labels */}
            <WorkstreamLabels
              report={wp.report}
              onSelectWorkstream={onSelectWorkstream}
            />

            {/* Work Package Leads */}
            <LeadsBadge leads={wp.leads} onSelectLead={onSelectLead} />
          </div>

          {/* Action Count - Bottom Left */}
          {wp.actions.length > 0 && !isOpen && (
            <>
              <div className="w-full border-t border-slate-200 mt-3 mb-3" />
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {Array.from({ length: Math.min(wp.actions.length, 5) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border-2 border-slate-100 bg-un-blue"
                      style={{ 
                        opacity: 1 - (i * 0.15),
                        zIndex: 5 - i 
                      }}
                    />
                  ))}
                  {wp.actions.length > 5 && (
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-slate-100 bg-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-600" 
                      style={{ zIndex: 0 }}
                    >
                      +{wp.actions.length - 5}
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-500">
                  {wp.actions.length} {wp.actions.length === 1 ? "Action" : "Actions"}
                </span>
              </div>
            </>
          )}
        </CollapsibleTrigger>

        {/* Details Button */}
        <button
          type="button"
          className="absolute top-4 right-2 flex items-center gap-1.5 rounded-[6px] bg-slate-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-600 hover:text-white sm:right-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
        >
          <Menu className="h-3.5 w-3.5" />
          <span>Details</span>
        </button>

        {/* Collapsible Content */}
        <CollapsibleContent className="px-6 pt-0 pb-6">
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
