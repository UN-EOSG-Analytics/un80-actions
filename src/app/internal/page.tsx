"use client";

import { Suspense, useState } from "react";
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
  const { actions } = useActions();

  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([]);

  const { showAllLeaderChecklist, setShowAllLeaderChecklist } =
    useCollapsibles();

  const { leaderChecklistSearchQuery, setLeaderChecklistSearchQuery } =
    useChartSearch();

  // Compute work package data
  const { workPackages } = useWorkPackageData(
    actions,
    {
      searchQuery: "",
      selectedWorkPackage: [],
      selectedLead: [],
      selectedWorkstream: [],
      selectedWpFamily: "",
      selectedBigTicket: [],
      selectedAction: [],
      selectedTeamMember: [],
      sortOption: "number-asc",
    },
    "",
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
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px]">
            {/* Left Column - Main Content */}
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
            </div>

            {/* Right Column - Leader Submission Checklist */}
            <div className="lg:sticky lg:top-24 lg:h-fit">
              <section>
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
              </section>
            </div>
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
