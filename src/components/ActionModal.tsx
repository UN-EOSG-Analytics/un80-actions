"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import type { Action } from "@/types";
import { DocumentBadge } from "@/components/DocumentBadge";
import { LeadsBadge } from "@/components/LeadsBadge";

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
        <div className="flex flex-1 items-start gap-3">
          <div className="mt-[3px] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-un-blue/10">
            <span className="text-sm font-semibold text-un-blue">
              {action.action_number}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg leading-tight font-semibold text-gray-900 sm:text-xl">
              {action.indicative_activity}
            </h2>
          </div>
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

          {action.work_package_goal && (
            <Field label="Goal">
              <div className="mt-2 border-l-2 border-un-blue bg-slate-50 py-3 pr-4 pl-4">
                <p className="text-sm leading-snug font-medium text-slate-600">
                  {action.work_package_goal}
                </p>
              </div>
            </Field>
          )}
        </div>

        {/* Document Reference */}
        {action.work_package_leads.length > 0 && (
          <div className="">
            <Field label="Leads">
              <LeadsBadge leads={action.work_package_leads} variant="default" />
            </Field>
          </div>
        )}

        {/* Document Reference */}
        {action.document_paragraph && (
          <div className="border-t border-gray-200 pt-6">
            <Field label="Document Reference">
              <DocumentBadge
                documentParagraphNumber={action.document_paragraph}
                report={action.report}
                workPackageNumber={action.work_package_number}
              />
            </Field>
          </div>
        )}

        {/* Document Text */}
        {action.doc_text && (
          <div className="">
            <Field label="">
              <div className="mt-2 border-l-2 border-slate-400 bg-slate-50 py-3 pr-4 pl-4">
                <p className="text-sm leading-relaxed text-slate-700">
                  &ldquo;{action.doc_text}&rdquo;
                </p>
              </div>
            </Field>
          </div>
        )}

        {/* Timeline */}
        {action.first_milestone && (
          <div className="border-t border-gray-200 pt-6">
            <Field label="First Milestone">
              {new Date(action.first_milestone).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Field>
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
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 md:w-1/2 lg:w-1/3 ${
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
