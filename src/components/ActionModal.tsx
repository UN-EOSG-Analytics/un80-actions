"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { X, Clock, ChevronRight } from "lucide-react";
import type { Action } from "@/types";
import { LeadsBadge } from "@/components/LeadsBadge";
import { MilestoneTimeline } from "@/components/MilestoneTimeline";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { getDocumentReference, getDocumentUrl } from "@/constants/documents";
import { parseDate, normalizeTeamMemberForDisplay } from "@/lib/utils";
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
          {/* Breadcrumb */}
          <div className="mb-3 flex items-center gap-1.5">
            <Link
              href={`/?ws=${action.report}`}
              onClick={handleClose}
              className="text-sm leading-5 font-medium tracking-wider text-slate-500 uppercase transition-colors hover:text-un-blue hover:underline"
            >
              {action.report}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <Link
              href={`/?wp=${action.work_package_number}`}
              onClick={handleClose}
              className="text-sm leading-5 font-medium tracking-wider text-slate-500 uppercase transition-colors hover:text-un-blue hover:underline"
            >
              Work Package {action.work_package_number}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-sm leading-5 font-medium tracking-wider text-un-blue uppercase">
              Action {action.action_number}
            </span>
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
          {/* Action Leads and Team Members - underneath action name */}
          {(action.action_leads || action.action_entities) && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {/* Action Leads - Blue */}
              {action.action_leads && action.action_leads.trim() && (
                <LeadsBadge
                  leads={action.action_leads
                    .split(";")
                    .map((lead) => lead.trim())
                    .filter((lead) => lead.length > 0)}
                  variant="default"
                  showIcon={false}
                />
              )}
              {/* Team Members - Slate */}
              {action.action_entities && action.action_entities.trim() && (
                <>
                  {action.action_leads && action.action_leads.trim() && (
                    <span className="text-slate-300">•</span>
                  )}
                  {action.action_entities
                    .split(";")
                    .map((entity) =>
                      normalizeTeamMemberForDisplay(entity.trim()),
                    )
                    .filter((entity) => entity && entity.trim().length > 0)
                    .filter(
                      (entity, index, array) => array.indexOf(entity) === index,
                    )
                    .map((entity, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-default border-slate-300 bg-slate-100 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200/50 transition-all duration-150 ring-inset hover:bg-slate-200"
                      >
                        {entity}
                      </Badge>
                    ))}
                </>
              )}
            </div>
          )}
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
      <div className="space-y-4 py-4">
        {/* Combined Action Details, Milestones, and Updates Section */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          {/* Action Details */}
          <div className="space-y-5">
            {/* Decision Status */}
            <div>
              <FieldLabel>Decision Status</FieldLabel>
              <div className="mt-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">
                    Further Work Ongoing
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          {(() => {
            const hasFirstMilestonePassed =
              action.first_milestone && action.first_milestone_deadline
                ? (() => {
                    const deadlineDate = parseDate(
                      action.first_milestone_deadline,
                    );
                    const now = new Date();
                    return deadlineDate && deadlineDate < now;
                  })()
                : false;
            return hasFirstMilestonePassed || action.upcoming_milestone;
          })() && (
            <>
              <div className="my-5 border-t border-slate-200"></div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="mb-4 cursor-help text-sm font-semibold tracking-wide text-slate-700 uppercase">
                    Upcoming Milestone
                  </h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-gray-600">
                    Steps which will be taken towards the delivery of the
                    proposal concerned. Completed milestones are crossed out.
                  </p>
                </TooltipContent>
              </Tooltip>
              <div className="mt-2">
                <MilestoneTimeline
                  milestones={[
                    ...(action.first_milestone &&
                    action.first_milestone_deadline
                      ? (() => {
                          const deadlineDate = parseDate(
                            action.first_milestone_deadline,
                          );
                          const now = new Date();
                          const hasPassed = deadlineDate && deadlineDate < now;
                          return hasPassed
                            ? [
                                {
                                  label: action.first_milestone,
                                  deadline: action.first_milestone_deadline,
                                  isReached: false,
                                },
                              ]
                            : [];
                        })()
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
            </>
          )}

          {/* Updates Section */}
          <div className="my-5 border-t border-slate-200"></div>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="mb-4 cursor-help text-sm font-semibold tracking-wide text-slate-700 uppercase">
                Updates
              </h3>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-gray-600">
                A summary of recent progress on the action.
              </p>
            </TooltipContent>
          </Tooltip>
          <div className="text-base text-gray-900">
            <div className="text-gray-500">Updates forthcoming</div>
          </div>
        </div>

        {/* Document Reference Section */}
        {(action.doc_text || action.document_paragraph) && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-4 text-sm font-semibold tracking-wide text-slate-700 uppercase">
              Document Reference
            </h3>
            <div className="space-y-3">
              {/* Document Paragraph Number */}
              {action.document_paragraph &&
                (() => {
                  const documentData = getDocumentReference({
                    workPackageNumber: action.work_package_number,
                    report: action.report,
                    documentParagraph: action.document_paragraph,
                  });

                  if (documentData) {
                    const documentUrl = getDocumentUrl(
                      documentData.documentNumber,
                    );
                    return (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-600" />
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm leading-tight text-un-blue hover:underline"
                        >
                          {documentData.text}
                        </a>
                      </div>
                    );
                  }
                  return null;
                })()}

              {/* Document Text Quote */}
              {action.doc_text && (
                <div className="border-l-2 border-slate-300 bg-white py-3 pr-3 pl-4">
                  <p className="text-sm leading-relaxed text-slate-700">
                    &ldquo;{action.doc_text}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Work Package Reference Section */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold tracking-wide text-slate-700 uppercase">
            Work Package Reference
          </h3>
          <div className="text-base text-gray-900">
            <span className="font-medium">
              Work Package {action.work_package_number}
            </span>
            <span className="mx-2 text-slate-400">•</span>
            <span className="text-slate-600">{action.work_package_name}</span>
          </div>
        </div>

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
