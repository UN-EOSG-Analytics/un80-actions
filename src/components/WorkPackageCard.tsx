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
import { Menu } from "lucide-react";

interface WorkPackageActionsProps {
  actions: WorkPackageAction[];
  workPackageNumber: string;
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
                <span className="text-sm leading-5 font-medium tracking-wider text-slate-500 uppercase">
                  Work package {wp.number}
                </span>
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
              <p className="leading-relaxed font-medium text-slate-600">
                {formatGoalText(wp.goal)}
              </p>
            </div>
          )}

          {/* Report Labels and Work Package Leads */}
          <div className="mb-2 flex w-full flex-wrap items-start gap-4">
            {/* Workstream Labels */}
            <WorkstreamLabels
              report={wp.report}
              onSelectWorkstream={onSelectWorkstream}
            />

            {/* Work Package Leads */}
            <LeadsBadge leads={wp.leads} onSelectLead={onSelectLead} />
          </div>
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
