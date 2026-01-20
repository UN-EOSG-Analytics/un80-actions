"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import type { Action } from "@/types";
import { LeadsBadge } from "@/components/LeadsBadge";
import { MilestoneTimeline } from "@/components/MilestoneTimeline";
import { parseDate, formatDate, formatDateMonthYear, normalizeTeamMemberForDisplay } from "@/lib/utils";
import { getWorkPackageLeads } from "@/lib/actions";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActionModalProps {
  action: Action | null;
  onClose: () => void;
  loading: boolean;
}

export default function ActionModal({
  action,
  onClose,
  loading,
}: ActionModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [workPackageLeads, setWorkPackageLeads] = useState<string[]>([]);

  // Animation state management
  useEffect(() => {
    // Trigger entrance animation after mount
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for exit animation before actually closing
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleClose]);

  // Swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;

    // Close on right swipe (swipe to dismiss)
    if (isRightSwipe) {
      handleClose();
    }
  };

  // Fetch aggregated work package leads when action changes
  useEffect(() => {
    if (action && action.work_package_number) {
      getWorkPackageLeads(action.work_package_number)
        .then((leads) => {
          setWorkPackageLeads(leads);
        })
        .catch((err) => {
          console.error("Error fetching work package leads:", err);
          // Fallback to action's own leads if aggregation fails
          setWorkPackageLeads(action.work_package_leads || []);
        });
    } else {
      setWorkPackageLeads([]);
    }
  }, [action]);

  // Prevent body scroll when modal is open while maintaining scrollbar space
  useEffect(() => {
    // Store original values
    const originalOverflow = document.documentElement.style.overflow;

    // Prevent scrolling on the html element instead of body to preserve scrollbar
    document.documentElement.style.overflow = "hidden";

    return () => {
      // Restore original values
      document.documentElement.style.overflow = originalOverflow;
    };
  }, []);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Reusable field label component
  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="text-sm font-normal tracking-wide text-gray-600 uppercase">
      {children}
    </span>
  );

  // Reusable field value wrapper component
  const FieldValue = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-1 text-base text-gray-900">{children}</div>
  );

  // Complete field component combining label and value
  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <FieldValue>{children}</FieldValue>
    </div>
  );

  // Render header content based on state
  const renderHeader = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-3 text-lg text-gray-500">
          Loading...
        </div>
      );
    }

    if (!action) {
      return (
        <div className="flex items-center justify-between gap-4">
          <p className="text-lg text-gray-500">Action not found</p>
          <button onClick={handleClose} className="text-gray-400">
            <X size={24} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 text-sm font-medium tracking-wide text-un-blue uppercase">
            Action {action.action_number}
          </div>
          <h2 className="text-lg leading-tight font-semibold text-gray-900 sm:text-xl">
            {action.indicative_activity}
            {action.sub_action_details && (
              <>
                {" "}
                <span className="font-bold text-gray-600">
                  – {action.sub_action_details}
                </span>
              </>
            )}
          </h2>
        </div>
        <button
          onClick={handleClose}
          className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
      </div>
    );
  };

  // Render body content based on state
  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading details...</div>
        </div>
      );
    }

    if (!action) {
      return (
        <div className="py-8">
          <p className="text-gray-500">
            The requested action could not be found.
          </p>
        </div>
      );
    }

    // Action content
    return (
      <div className="space-y-6 py-4">
        {/* Work Package Info */}
        <div className="space-y-4">
          <Field label="Work Package">
            <div className="font-medium">
              #{action.work_package_number}: {action.work_package_name}
            </div>
          </Field>

        </div>

        {/* Work Package Leads */}
        {workPackageLeads.length > 0 && (
          <div className="">
            <Field label="Work package leads">
              <div className="mt-1 text-base text-gray-900">
                <LeadsBadge
                  leads={workPackageLeads}
                  variant="default"
                  showIcon={false}
                  color="text-gray-600"
                />
              </div>
            </Field>
          </div>
        )}

        {/* Visual separator between Work Package and Action sections */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-gray-300"></div>
          </div>
          <div className="relative flex justify-start">
            <span className="bg-white pr-3 pl-0 text-sm font-bold tracking-wider text-un-blue uppercase">
              Action Details
            </span>
          </div>
        </div>

        {/* Action-specific information starts here */}
        {/* Action Leads */}
        {action.action_leads && action.action_leads.trim() && (
          <div className="">
            <Field label="Action leads">
              <div className="mt-1 text-base text-gray-900">
                <LeadsBadge
                  leads={action.action_leads
                    .split(";")
                    .map((lead) => lead.trim())
                    .filter((lead) => lead.length > 0)}
                  variant="default"
                  showIcon={false}
                  color="text-gray-600"
                />
              </div>
            </Field>
          </div>
        )}

        {/* Team Members for Indicative Action */}
        <div className="-mt-2 pt-0">
          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-sm font-normal tracking-wide text-gray-600 uppercase">
                  Team members for indicative action
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-gray-600">
                  UN system entities that contribute to the implementation of a
                  specific action, in support of the relevant Work Package Lead.
                  Work Package Leads report to the UN80 Steering Committee under
                  the authority of the Secretary-General.
                </p>
              </TooltipContent>
            </Tooltip>
            <div className="mt-1 text-base text-gray-900">
              <p className="text-left leading-tight text-gray-700">
                {action.action_entities && action.action_entities.trim() ? (
                  action.action_entities
                    .split(";")
                    .map((entity) =>
                      normalizeTeamMemberForDisplay(entity.trim()),
                    )
                    .filter((entity, index, array) => {
                      // Remove duplicates after normalization
                      return array.indexOf(entity) === index;
                    })
                    .map((entity, index, array) => (
                      <span key={index}>
                        {entity}
                        {index < array.length - 1 && (
                          <span className="text-gray-400"> • </span>
                        )}
                      </span>
                    ))
                ) : (
                  <span>to be updated</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Milestones Timeline */}
        {(action.first_milestone || action.final_milestone || action.upcoming_milestone) && (
          <div className="-mt-2 pt-0">
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-normal tracking-wide text-gray-600 uppercase cursor-help">
                    Milestones
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-gray-600">
                    Steps which will be taken towards the delivery of the proposal concerned. Completed milestones are crossed out.
                  </p>
                </TooltipContent>
              </Tooltip>
              <div className="mt-4">
                <MilestoneTimeline
                  milestones={[
                    ...(action.first_milestone
                      ? [
                          {
                            label: action.first_milestone,
                            deadline: action.first_milestone_deadline,
                            isReached: false, // Will be calculated based on deadline
                          },
                        ]
                      : []),
                    ...(action.final_milestone
                      ? [
                          {
                            label: action.final_milestone,
                            deadline: action.final_milestone_deadline,
                            isReached: false, // Will be calculated based on deadline
                          },
                        ]
                      : []),
                    ...(action.upcoming_milestone
                      ? [
                          {
                            label: action.upcoming_milestone,
                            deadline: action.upcoming_milestone_deadline,
                            isReached: false,
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Updates */}
        <div className="-mt-2 pt-0">
          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-sm font-normal tracking-wide text-gray-600 uppercase">
                  Updates
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-gray-600">
                  A summary of recent progress on the action.
                </p>
              </TooltipContent>
            </Tooltip>
            <div className="mt-1 text-base text-gray-900">
              <div className="text-gray-700">To be updated</div>
              </div>
          </div>
        </div>

        {/* Document Text */}
        {action.doc_text && (
          <div className="-mt-2 pt-0">
            <div className="mt-4 ml-0.5 border-l-2 border-slate-400 bg-slate-50 py-2 pr-3 pl-3">
              <p className="text-sm leading-tight text-slate-600">
                &ldquo;{action.doc_text}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* MS Approval */}
        {/* {action.ms_approval && (
          <div className="border-t border-gray-200 pt-6">
            <Field label="Member State Approval">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">
                  Required
                </div>
                {action.ms_body.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {action.ms_body.map((body, i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full bg-un-blue/10 px-3 py-1 text-sm font-medium text-un-blue"
                      >
                        {body}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </div>
        )} */}

        {/* Budget */}
        {/* {action.un_budget.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <Field label="UN Budget">
              <div className="flex flex-wrap gap-2">
                {action.un_budget.map((budget, i) => (
                  <span
                    key={i}
                    className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800"
                  >
                    {budget}
                  </span>
                ))}
              </div>
            </Field>
          </div>
        )} */}
      </div>
    );
  };

  // Single modal wrapper with dynamic content
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${
        isVisible && !isClosing ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-3/4 md:w-1/2 lg:w-1/2 ${
          isVisible && !isClosing ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex min-h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white px-6 py-5 sm:px-8 sm:py-6">
            {renderHeader()}
          </div>

          {/* Body */}
          <div className="flex-1 px-6 pb-8 sm:px-8">{renderBody()}</div>
        </div>
      </div>
    </div>
  );
}
