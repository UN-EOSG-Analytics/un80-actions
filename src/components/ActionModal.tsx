"use client";

import {
  ActionLeadsBadge,
  DecisionStatusBadge,
  ShowMoreBadge,
  TeamBadge,
  WPLeadsBadge,
} from "@/components/Badges";
import { HelpTooltip } from "@/components/HelpTooltip";
import { MilestoneTimeline } from "@/components/MilestoneTimeline";
import {
  Tooltip,
  TooltipCollisionBoundaryProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/Tooltip";
import { ACTION_STATUS } from "@/constants/actionStatus";
import { getDocumentReference, getDocumentUrl } from "@/constants/documents";
import { normalizeTeamMemberForDisplay, encodeUrlParam } from "@/lib/utils";
import type { Action } from "@/types";
import { ChevronRight, FileText, X } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Modal-specific section card component
const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="rounded-lg border border-slate-200 bg-white">
    <div className="-ml-px rounded-tl-[9px] border-l-4 border-slate-300 bg-slate-200 px-5 py-4">
      <h3 className="text-xs font-extrabold tracking-widest text-slate-800 uppercase sm:text-sm">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

const CHIPS_PER_LINE = 5;
const breadcrumbBaseClass =
  "inline-flex !min-h-0 items-center text-[10px] leading-4 font-medium tracking-wide uppercase transition-colors sm:text-xs sm:leading-5 md:text-sm md:tracking-wider";
const breadcrumbLinkClass = `${breadcrumbBaseClass} text-slate-500 hover:text-un-blue hover:underline`;
const breadcrumbActionClass = `${breadcrumbBaseClass} text-un-blue hover:underline`;
const chevronClass =
  "h-2.5 w-2.5 shrink-0 text-slate-400 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5";

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
  const [modalEl, setModalEl] = useState<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showAllChips, setShowAllChips] = useState(false);
  const prevActionNumberRef = useRef<number | undefined>(undefined);

  const setModalRef = useCallback((el: HTMLDivElement | null) => {
    (modalRef as { current: HTMLDivElement | null }).current = el;
    setModalEl(el);
  }, []);

  // Reset chips expand when action changes
  if (prevActionNumberRef.current !== action?.action_number) {
    prevActionNumberRef.current = action?.action_number;
    if (showAllChips) {
      setShowAllChips(false);
    }
  }

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

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
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
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>
      );
    }

    // Merge leads + team, dedupe; then take first N for one line, rest in "+x more"
    const teamMembers =
      action.action_entities
        ?.split(";")
        .map((e) => normalizeTeamMemberForDisplay(e.trim()))
        .filter((e) => e && e.trim().length > 0) || [];
    const seen = new Set<string>();
    const allChips: { name: string; type: "lead" | "team" }[] = [];
    for (const n of action.action_leads || []) {
      if (!n?.trim() || seen.has(n)) continue;
      seen.add(n);
      allChips.push({ name: n, type: "lead" });
    }
    for (const n of teamMembers) {
      if (seen.has(n)) continue;
      seen.add(n);
      allChips.push({ name: n, type: "team" });
    }
    const displayedChips = showAllChips
      ? allChips
      : allChips.slice(0, CHIPS_PER_LINE);
    const hasMore = allChips.length > CHIPS_PER_LINE;

    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Breadcrumb */}
          <div className="mb-2 flex flex-wrap items-center gap-x-1 gap-y-1 sm:mb-3 sm:gap-x-1.5 sm:gap-y-0.5">
            <Link
              href={`/?ws=${action.report}`}
              onClick={handleClose}
              className={breadcrumbLinkClass}
            >
              {action.report}
            </Link>
            <ChevronRight className={chevronClass} />
            <Link
              href={`/?wp=${action.work_package_number}`}
              onClick={handleClose}
              className={breadcrumbLinkClass}
            >
              WORK PACKAGE {action.work_package_number}
            </Link>
            <ChevronRight className={chevronClass} />
            <Tooltip open={copied ? true : undefined}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Build URL with action number and milestone (for subactions)
                    let url = `${window.location.origin}${window.location.pathname}?action=${action.action_number}`;
                    if (action.sub_action_details && action.first_milestone) {
                      url += `&milestone=${encodeUrlParam(action.first_milestone)}`;
                    }
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`${breadcrumbActionClass} cursor-pointer`}
                >
                  Action {action.action_number}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm text-gray-600">
                  {copied ? "Copied!" : "Click to copy link"}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <h2 className="text-base leading-snug font-semibold text-slate-900 sm:text-lg">
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
          {/* Action Leads and Team Members - one line, rest in "+x more" */}
          {allChips.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {displayedChips.map((c) =>
                c.type === "lead" ? (
                  <ActionLeadsBadge key={c.name} leads={[c.name]} inline />
                ) : (
                  <TeamBadge key={c.name} leads={[c.name]} inline />
                ),
              )}
              {hasMore && (
                <ShowMoreBadge
                  showAll={showAllChips}
                  hiddenCount={allChips.length - CHIPS_PER_LINE}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllChips((s) => !s);
                  }}
                />
              )}
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
      <div className="space-y-6">
        {/* Action Details Section */}
        <SectionCard title="Action Details">
          <div className="p-5">
            {/* Decision Status */}
            <div>
              <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-slate-700 sm:text-sm">
                Status
              </h3>
              <DecisionStatusBadge
                status={
                  action.public_action_status ||
                  ACTION_STATUS.FURTHER_WORK_ONGOING
                }
              />
            </div>

            {/* Upcoming Milestone */}
            {action.upcoming_milestone && (
              <>
                <div className="my-3 border-t border-slate-200"></div>
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700 sm:text-sm">
                  Upcoming Milestone
                  <HelpTooltip content="Steps which will be taken towards the delivery of the proposal concerned. Completed milestones are crossed out." />
                </h3>
                <div className="mt-2">
                  <MilestoneTimeline
                    milestones={[
                      {
                        label: action.upcoming_milestone,
                        deliveryDate: action.delivery_date ?? null,
                        isReached: false,
                      },
                    ]}
                  />
                </div>
              </>
            )}

            {/* Updates Section */}
            <div className="my-6 border-t border-slate-200"></div>
            <h3 className="mb-4 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700 sm:text-sm">
              Updates
              <HelpTooltip content="A summary of recent progress on the action." />
            </h3>
            <div className="text-xs leading-relaxed text-slate-600 sm:text-sm">
              {action.updates && action.updates.trim() ? (
                <p className="whitespace-pre-wrap">{action.updates}</p>
              ) : (
                <p className="text-slate-400 italic">Updates forthcoming</p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Document Reference Section */}
        {(action.doc_text || action.document_paragraph) && (
          <SectionCard title="Document Reference">
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
                  <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">
                    &ldquo;{action.doc_text}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Work Package Reference Section */}
        <SectionCard title="Work Package Reference">
          <div className="p-5">
            <div className="text-sm leading-snug text-slate-900 sm:text-[15px]">
              <span className="font-semibold">
                Work Package {action.work_package_number}
              </span>
              <span className="mx-2 text-slate-300">•</span>
              <span className="font-medium text-slate-600">
                {action.work_package_name}
              </span>
            </div>
            {action.work_package_leads &&
              action.work_package_leads.length > 0 && (
                <div className="mt-3">
                  <WPLeadsBadge leads={action.work_package_leads} />
                </div>
              )}
          </div>
        </SectionCard>
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
        ref={setModalRef}
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-4/5 md:w-3/4 lg:w-1/2 ${
          isVisible && !isClosing ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <TooltipCollisionBoundaryProvider value={modalEl}>
          <div className="flex min-h-full flex-col">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-4 pt-4 pb-3 shadow-sm sm:px-6 sm:pt-5 sm:pb-4 md:px-8 md:pt-6 md:pb-5">
              {renderHeader()}
            </div>

            {/* Body */}
            <div className="flex-1 bg-slate-50 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-12 md:px-8">
              {renderBody()}
            </div>
          </div>
        </TooltipCollisionBoundaryProvider>
      </div>
    </div>
  );
}
