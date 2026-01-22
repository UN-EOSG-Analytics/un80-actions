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
      <div className="rounded-[6px] border border-slate-200 bg-white p-4.25">
        <p className="text-sm leading-tight font-normal text-slate-900">
          No actions available
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
      <div className="group relative mb-20 rounded-[6px] bg-slate-100 transition-colors last:mb-0 hover:bg-[#E0F5FF]">
        {isOpen && (
          <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-1 rounded-l-[6px] bg-un-blue" />
        )}
        <CollapsibleTrigger
          className={`flex w-full flex-col items-start rounded-[6px] border-0 px-4 py-3 hover:no-underline sm:px-6 sm:py-4 ${
            isOpen ? "rounded-b-none" : ""
          }`}
        >
          {/* Work Package Title */}
          <div className="mb-2 min-w-0 pr-20 text-left sm:pr-24 md:pr-8">
            {wp.number ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm leading-5 font-medium tracking-wider text-slate-500 uppercase">
                    Work package {wp.number}
                  </span>
                  {/* Progress Bar */}
                  {showProgress && (
                    <div className="flex min-w-30 flex-1 items-center gap-2">
                      <div className="relative max-w-50 flex-1">
                        <Progress value={0} className="h-1.5" />
                        <div className="absolute top-0 left-0 h-1.5 w-0.5 rounded-l-full bg-un-blue" />
                      </div>
                      <span className="text-xs font-semibold whitespace-nowrap text-un-blue">
                        0%
                      </span>
                    </div>
                  )}
                </div>
                <h2 className="mt-1 text-base leading-6 font-semibold text-slate-900 sm:text-xl sm:leading-7">
                  {wp.name}
                </h2>
              </>
            ) : (
              <h2 className="text-base leading-6 font-semibold text-slate-900 sm:text-xl sm:leading-7">
                {wp.name}
              </h2>
            )}
          </div>

          {/* Goal from work package data */}
          {wp.goal && (
            <div className="mb-3 pr-4 text-left sm:mb-4 sm:pr-8">
              <p className="text-sm leading-snug font-medium text-slate-600 sm:text-base">
                <span className="font-semibold text-un-blue">Goal:</span>{" "}
                {formatGoalText(wp.goal)}
              </p>
            </div>
          )}

          {/* Report Labels and Work Package Leads */}
          <div className="flex w-full flex-wrap items-start gap-1.5">
            {/* Workstream Labels */}
            <WorkstreamLabels
              report={wp.report}
              onSelectWorkstream={onSelectWorkstream}
            />

            {/* Work Package Leads */}
            <LeadsBadge
              leads={wp.leads}
              onSelectLead={onSelectLead}
              showIcon={false}
              chipType="Work Package Lead"
            />
          </div>
        </CollapsibleTrigger>

        {/* Divider and Action Count/Header - Always visible when actions exist */}
        {wp.actions.length > 0 && (
          <div className="px-4 sm:px-6">
            <div className="w-full border-t border-slate-200" />
            {/* Cross-fade header section - fixed height container */}
            <div className="relative flex h-10 items-center">
              {/* Collapsed state: "X Actions" */}
              <div
                className={`absolute inset-0 flex items-center gap-2 transition-opacity duration-200 ease-out ${
                  isOpen ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
              >
                <span className="text-sm font-semibold text-slate-500">
                  {wp.actions.length}{" "}
                  {wp.actions.length === 1 ? "Action" : "Actions"}
                </span>
                <div className="flex -space-x-1.5">
                  {Array.from({ length: wp.actions.length }).map((_, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded-full border-2 border-slate-100 bg-un-blue transition-colors group-hover:border-[#E0F5FF]"
                      style={{
                        opacity: Math.max(0.3, 1 - i * 0.08),
                        zIndex: wp.actions.length - i,
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Expanded state: "Indicative Actions" header with count and dots */}
              <div
                className={`absolute inset-0 flex items-center gap-2 transition-opacity duration-200 ease-out ${
                  isOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <h3 className="text-left text-lg font-semibold tracking-wider text-slate-700">
                  {wp.actions.length} Indicative{" "}
                  {wp.actions.length === 1 ? "Action" : "Actions"}
                </h3>
                <div className="flex -space-x-1.5">
                  {Array.from({ length: wp.actions.length }).map((_, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded-full border-2 border-slate-100 bg-un-blue transition-colors group-hover:border-[#E0F5FF]"
                      style={{
                        opacity: Math.max(0.3, 1 - i * 0.08),
                        zIndex: wp.actions.length - i,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Button */}
        <button
          type="button"
          className="absolute top-3 right-2 flex items-center gap-1 rounded-[6px] bg-slate-500 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-600 hover:text-white sm:top-4 sm:right-4 sm:gap-1.5 sm:px-3 sm:text-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
        >
          <Menu className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Details</span>
        </button>

        {/* Collapsible Content */}
        <CollapsibleContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="pt-2">
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
