"use client";

import { Suspense, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Header } from "@/components/HeaderBar";
import { LeaderSubmissionProgress } from "@/components/LeaderSubmissionProgress";
import { LeaderSubmissionChecklist } from "@/components/LeaderSubmissionChecklist";
import { OverallProgressDashboard } from "@/components/OverallProgressDashboard";
import { WorkPackageProgress } from "@/components/WorkPackageProgress";
import { MilestonesTimeline } from "@/components/MilestonesTimeline";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useActions } from "@/hooks/useActions";
import { useChartSearch } from "@/hooks/useChartSearch";
import { useCollapsibles } from "@/hooks/useCollapsibles";
import { useWorkPackageData } from "@/hooks/useWorkPackageData";

function WorkPackagesPageContent() {
  // Custom hooks for state management
  const { actions, isLoading, stats, nextMilestone, progressPercentage } =
    useActions();

  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([]);

  const {
    showAllLeaderChecklist,
    setShowAllLeaderChecklist,
  } = useCollapsibles();

  const {
    leaderChecklistSearchQuery,
    setLeaderChecklistSearchQuery,
  } = useChartSearch();

  // Compute work package data
  const { workPackages } = useWorkPackageData(
    actions,
    {
      searchQuery: "",
      selectedWorkPackage: [],
      selectedLead: [],
      selectedWorkstream: [],
      selectedBigTicket: [],
      selectedAction: [],
      sortOption: "number-asc",
    },
    "",
    "",
    "",
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-white">
        {/* Fixed Header */}
        <Header onReset={() => {}} showLogin={false} />

        {/* Main Container */}
        <main className="mx-auto w-full max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {/* Overall Progress Dashboard */}
            <section>
              <OverallProgressDashboard
                actions={actions}
                workPackages={workPackages}
              />
            </section>

            {/* Leader Submission Progress */}
            <section>
              <LeaderSubmissionProgress actions={actions} />
            </section>

            {/* Milestones Timeline */}
            <section>
              <MilestonesTimeline actions={actions} />
            </section>

            {/* Work Package Progress - Full Width */}
            <section>
              <WorkPackageProgress workPackages={workPackages} />
            </section>

            {/* Leader Submission Checklist */}
            <section>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <LeaderSubmissionChecklist
                    actions={actions}
                    searchQuery={leaderChecklistSearchQuery}
                    onSearchChange={setLeaderChecklistSearchQuery}
                    selectedLeaders={selectedLeaders}
                    onSelectLeaders={setSelectedLeaders}
                    showAll={showAllLeaderChecklist}
                    onToggleShowAll={() =>
                      setShowAllLeaderChecklist(!showAllLeaderChecklist)
                    }
                    initialDisplayCount={15}
                  />
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function WorkPackagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <WorkPackagesPageContent />
    </Suspense>
  );
}
