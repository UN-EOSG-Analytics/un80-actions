"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewTab from "@/features/actions/ui/OverviewTab";
import MilestonesTab from "@/features/milestones/ui/MilestonesTab";
import NotesTab from "@/features/notes/ui/NotesTab";
import QuestionsTab from "@/features/questions/ui/QuestionsTab";
import LegalTab from "@/features/legal-comments/ui/LegalTab";
import { getActionQuestions } from "@/features/questions/queries";
import { getActionNotes } from "@/features/notes/queries";
import { getActionLegalComments } from "@/features/legal-comments/queries";
import {
  exportActionToWord,
  exportActionToPdf,
  exportActionToMarkdown,
  type ExportTab,
  type ExportFormat,
} from "@/features/actions/lib/export-action-document";
import type { Action } from "@/types";
import {
  Calendar,
  ChevronRight,
  MessageCircle,
  Scale,
  StickyNote,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// =========================================================
// CONSTANTS
// =========================================================

const breadcrumbBaseClass =
  "inline-flex !min-h-0 items-center text-[10px] leading-4 font-medium tracking-wide uppercase transition-colors sm:text-xs sm:leading-5 md:text-sm md:tracking-wider";
const breadcrumbLinkClass = `${breadcrumbBaseClass} text-slate-500 hover:text-un-blue hover:underline`;
const breadcrumbActionClass = `${breadcrumbBaseClass} text-un-blue`;
const chevronClass =
  "h-2.5 w-2.5 shrink-0 text-slate-400 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5";

// =========================================================
// HELPER COMPONENTS
// =========================================================

const LoadingState = () => (
  <div className="flex items-center justify-center py-8">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-un-blue" />
  </div>
);

// =========================================================
// MAIN MODAL COMPONENT
// =========================================================

interface ActionModalProps {
  action: Action | null;
  onClose: () => void;
  loading: boolean;
  isAdmin?: boolean;
}

export default function ActionModal({
  action,
  onClose,
  loading,
  isAdmin = false,
}: ActionModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [exporting, setExporting] = useState(false);

  // Reset tab when action changes
  useEffect(() => {
    setActiveTab("overview");
  }, [action?.id, action?.sub_id]);

  // Animation state management
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
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

  const handleCopyLink = () => {
    if (!action) return;
    const url = `${window.location.origin}${window.location.pathname}?action=${action.action_number}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!action) return;
      setExporting(true);
      try {
        // Determine which tab we're exporting from
        let exportTab: ExportTab = "all";
        if (activeTab === "questions") exportTab = "questions";
        else if (activeTab === "notes") exportTab = "notes";
        else if (activeTab === "legal") exportTab = "legal";

        // Only fetch data for the active tab
        const questions =
          exportTab === "questions" || exportTab === "all"
            ? await getActionQuestions(action.id, action.sub_id)
            : [];
        const notes =
          exportTab === "notes" || exportTab === "all"
            ? await getActionNotes(action.id, action.sub_id)
            : [];
        const legalComments =
          exportTab === "legal" || exportTab === "all"
            ? await getActionLegalComments(action.id, action.sub_id)
            : [];

        const safeName = `Action-${action.action_display_id.replace(/[^a-zA-Z0-9-]/g, "-")}`;
        const tabSuffix = exportTab === "all" ? "All" : exportTab.charAt(0).toUpperCase() + exportTab.slice(1);

        if (format === "word") {
          const blob = await exportActionToWord(
            action,
            exportTab,
            questions,
            notes,
            legalComments,
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${safeName}-${tabSuffix}.docx`;
          a.click();
          URL.revokeObjectURL(url);
        } else if (format === "pdf") {
          const blob = exportActionToPdf(
            action,
            exportTab,
            questions,
            notes,
            legalComments,
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${safeName}-${tabSuffix}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        } else if (format === "markdown") {
          const markdown = exportActionToMarkdown(
            action,
            exportTab,
            questions,
            notes,
            legalComments,
          );
          const blob = new Blob([markdown], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${safeName}-${tabSuffix}.md`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } finally {
        setExporting(false);
      }
    },
    [action, activeTab],
  );

  // Render loading state
  if (loading) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
          isVisible && !isClosing ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
      >
        <div className="rounded-lg bg-white p-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  // Render not found state
  if (!action) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
          isVisible && !isClosing ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
      >
        <div className="rounded-lg bg-white p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-lg text-slate-500">Action not found</p>
            <button
              onClick={handleClose}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity duration-300 ${
        isVisible && !isClosing ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleBackdropClick}
    >
      {/* Slide-in panel */}
      <div
        className={`flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-xl transition-transform duration-300 ${
          isVisible && !isClosing ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Breadcrumb */}
              <div className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
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
                  WP {action.work_package_number}
                </Link>
                <ChevronRight className={chevronClass} />
                <button
                  onClick={handleCopyLink}
                  className={`${breadcrumbActionClass} cursor-pointer`}
                  title={copied ? "Copied!" : "Click to copy link"}
                >
                  Action {action.action_display_id}
                  {copied && <span className="ml-1.5 text-green-600">✓</span>}
                </button>
              </div>
              {/* Title */}
              <h2 className="text-base leading-snug font-semibold text-slate-900 sm:text-lg">
                {action.indicative_activity}
                {action.sub_action_details && (
                  <span className="font-normal text-slate-600">
                    {" "}
                    – {action.sub_action_details}
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 border-b border-slate-200 bg-white px-6">
            <TabsList variant="line" className="h-11">
              <TabsTrigger value="overview" className="gap-1.5">
                <Target className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="milestones" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                Milestones
              </TabsTrigger>
              <TabsTrigger value="questions" className="gap-1.5">
                <MessageCircle className="h-4 w-4" />
                Questions
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5">
                <StickyNote className="h-4 w-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="legal" className="gap-1.5">
                <Scale className="h-4 w-4" />
                Legal
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <TabsContent value="overview" className="mt-0">
                <OverviewTab action={action} />
              </TabsContent>
              <TabsContent value="milestones" className="mt-0">
                <MilestonesTab action={action} isAdmin={isAdmin} />
              </TabsContent>
              <TabsContent value="questions" className="mt-0">
                <QuestionsTab
                  action={action}
                  isAdmin={isAdmin}
                  exportProps={{ onExport: handleExport, exporting }}
                />
              </TabsContent>
              <TabsContent value="notes" className="mt-0">
                <NotesTab
                  action={action}
                  isAdmin={isAdmin}
                  exportProps={{ onExport: handleExport, exporting }}
                />
              </TabsContent>
              <TabsContent value="legal" className="mt-0">
                <LegalTab
                  action={action}
                  isAdmin={isAdmin}
                  exportProps={{ onExport: handleExport, exporting }}
                />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
