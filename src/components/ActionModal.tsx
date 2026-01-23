"use client";

import {
    ActionLeadsBadge,
    DecisionStatusBadge,
    TeamBadge,
    WPLeadsBadge,
    parseLeadsString,
} from "@/components/Badges";
import { MilestoneTimeline } from "@/components/MilestoneTimeline";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDocumentReference, getDocumentUrl } from "@/constants/documents";
import { normalizeTeamMemberForDisplay, parseDate } from "@/lib/utils";
import type { Action } from "@/types";
import { ChevronRight, FileText, HelpCircle, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [copied, setCopied] = useState(false);
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

  // Render header content based on state
  const renderHeader = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-3 text-lg text-slate-500">
          Loading...
        </div>
      );
    }

    if (!action) {
      return (
        <div className="flex items-center justify-between gap-4">
          <p className="text-lg text-slate-500">Action not found</p>
          <button onClick={handleClose} className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Breadcrumb */}
          <div className="mb-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 sm:mb-3 sm:gap-x-1.5">
            <Link
              href={`/?ws=${action.report}`}
              onClick={handleClose}
              className="text-[10px] leading-4 font-medium tracking-wide text-slate-500 uppercase transition-colors hover:text-un-blue hover:underline sm:text-xs sm:leading-5 md:text-sm md:tracking-wider"
            >
              {action.report}
            </Link>
            <ChevronRight className="h-2.5 w-2.5 shrink-0 text-slate-400 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />
            <Link
              href={`/?wp=${action.work_package_number}`}
              onClick={handleClose}
              className="text-[10px] leading-4 font-medium tracking-wide text-slate-500 uppercase transition-colors hover:text-un-blue hover:underline sm:text-xs sm:leading-5 md:text-sm md:tracking-wider"
            >
              WORK PACKAGE {action.work_package_number}
            </Link>
            <ChevronRight className="h-2.5 w-2.5 shrink-0 text-slate-400 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />
            <Tooltip open={copied ? true : undefined}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}${window.location.pathname}?action=${action.action_number}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="cursor-pointer text-[10px] leading-4 font-medium tracking-wide text-un-blue uppercase transition-all hover:underline sm:text-xs sm:leading-5 md:text-sm md:tracking-wider"
                >
                  Action {action.action_number}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm text-gray-600">{copied ? "Copied!" : "Click to copy link"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <h2 className="text-base leading-snug font-semibold text-slate-900 sm:text-lg md:text-xl">
            {action.indicative_activity}
            {action.sub_action_details && (
              <>
                {" "}
                <span className="font-semibold text-slate-600">
                  – {action.sub_action_details}
                </span>
              </>
            )}
          </h2>
          {/* Action Leads and Team Members - underneath action name */}
          {(action.action_leads || action.action_entities) && (
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {/* Action Leads */}
              <ActionLeadsBadge
                leads={parseLeadsString(action.action_leads)}
                inline
              />
              {/* Separator */}
              {action.action_leads &&
                action.action_leads.trim() &&
                action.action_entities &&
                action.action_entities.trim() && (
                  <span className="text-slate-300">•</span>
                )}
              {/* Team Members */}
              <TeamBadge
                inline
                leads={
                  action.action_entities
                    ?.split(";")
                    .map((entity) =>
                      normalizeTeamMemberForDisplay(entity.trim()),
                    )
                    .filter((entity) => entity && entity.trim().length > 0)
                    .filter(
                      (entity, index, array) => array.indexOf(entity) === index,
                    ) || []
                }
              />
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading details...</div>
        </div>
      );
    }

    if (!action) {
      return (
        <div className="py-12">
          <p className="text-slate-500">
            The requested action could not be found.
          </p>
        </div>
      );
    }

    // Action content
    return (
      <div className="space-y-4 pt-4">
        {/* Combined Action Details, Milestones, and Updates Section */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {/* Action Details Header */}
          <div className="border-b-2 border-l-4 border-slate-300 border-l-slate-500 bg-slate-200 px-5 py-4">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-800">
              Action Details
            </h3>
          </div>
          {/* Action Details Content */}
          <div className="p-5">
            {/* Decision Status */}
            <div>
              <h3 className="mb-1.5 text-sm font-semibold tracking-wide text-slate-700">
                Status
              </h3>
              <DecisionStatusBadge status="further work ongoing" />
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
                <div className="my-3 border-t border-slate-200"></div>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold tracking-wide text-slate-700">
                  Upcoming Milestone
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="What is Upcoming Milestone?"
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:text-slate-700 sm:size-5 sm:text-slate-400 sm:hover:bg-slate-100 sm:hover:text-slate-600"
                      >
                        <HelpCircle className="size-4 sm:size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p className="text-gray-600">
                        Steps which will be taken towards the delivery of the
                        proposal concerned. Completed milestones are crossed out.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </h3>
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
                            const hasPassed =
                              deadlineDate && deadlineDate < now;
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
            <div className="my-3 border-t border-slate-200"></div>
            <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold tracking-wide text-slate-700">
              Updates
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="What are Updates?"
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:text-slate-700 sm:size-5 sm:text-slate-400 sm:hover:bg-slate-100 sm:hover:text-slate-600"
                  >
                    <HelpCircle className="size-4 sm:size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <p className="text-gray-600">
                    A summary of recent progress on the action.
                  </p>
                </TooltipContent>
              </Tooltip>
            </h3>
            <div className="text-sm leading-relaxed text-slate-600">
              Updates forthcoming
            </div>
          </div>
        </div>

        {/* Document Reference Section */}
        {(action.doc_text || action.document_paragraph) && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {/* Document Reference Header */}
            <div className="border-b-2 border-l-4 border-slate-300 border-l-slate-500 bg-slate-200 px-5 py-4">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-800">
                Document Reference
              </h3>
            </div>
            {/* Document Reference Content */}
            <div className="space-y-3 p-5">
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
                      <div className="flex flex-nowrap items-start gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-600" />
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 font-mono text-sm leading-tight text-un-blue hover:underline"
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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {/* Work Package Reference Header */}
          <div className="border-b-2 border-l-4 border-slate-300 border-l-slate-500 bg-slate-200 px-5 py-4">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-800">
              Work Package Reference
            </h3>
          </div>
          {/* Work Package Reference Content */}
          <div className="p-5">
            <div className="text-[15px] leading-snug text-slate-900">
              <span className="font-semibold">
                Work Package {action.work_package_number}
              </span>
              <span className="mx-2 text-slate-300">•</span>
              <span className="font-medium text-slate-600">{action.work_package_name}</span>
            </div>
            {/* Work Package Leads */}
            {action.work_package_leads &&
              action.work_package_leads.length > 0 && (
                <div className="mt-3">
                  <WPLeadsBadge leads={action.work_package_leads} />
                </div>
              )}
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
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-4/5 md:w-3/4 lg:w-1/2 ${
          isVisible && !isClosing ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex min-h-full flex-col">
          {/* Header */}
          <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
            {renderHeader()}
          </div>

          {/* Body */}
          <div className="flex-1 bg-slate-50 px-4 pb-6 sm:px-6 sm:pb-8 md:px-8">
            {renderBody()}
          </div>
        </div>
      </div>
    </div>
  );
}
