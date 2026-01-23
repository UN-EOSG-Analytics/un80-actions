"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/HeaderBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  LabelBadge,
  WPLeadsBadge,
  ActionLeadsBadge,
  TeamBadge,
  WorkstreamBadge,
  DecisionStatusBadge,
} from "@/components/Badges";
import { WorkPackageItem } from "@/components/WorkPackageCard";
import { ActionItem } from "@/components/ActionCard";
import { useActions } from "@/hooks/useActions";
import { groupActionsByWorkPackage } from "@/lib/workPackages";

function BadgeShowcase({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-xl font-bold text-slate-900">{children}</h2>;
}

export default function StyleGuidePage() {
  const [wpOpen, setWpOpen] = useState(false);
  const { actions, isLoading } = useActions();

  // Get real work packages from data
  const workPackages = useMemo(
    () => groupActionsByWorkPackage(actions),
    [actions],
  );

  // Find a work package with multiple actions and workstreams for demo
  const sampleWorkPackage = useMemo(() => {
    return (
      workPackages.find(
        (wp) =>
          wp.actions.length >= 2 &&
          wp.leads.length > 0 &&
          wp.report.some((r) => ["WS1", "WS2", "WS3"].includes(r)),
      ) || workPackages[0]
    );
  }, [workPackages]);

  // Find actions with different decision statuses
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const actionOngoing = useMemo(() => {
    for (const wp of workPackages) {
      const action = wp.actions.find(
        (a) =>
          a.decisionStatus?.toLowerCase() !== "decision taken" &&
          a.leads.length > 0 &&
          a.actionEntities,
      );
      if (action) return { action, wpNumber: wp.number };
    }
    return null;
  }, [workPackages]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const actionTaken = useMemo(() => {
    for (const wp of workPackages) {
      const action = wp.actions.find(
        (a) =>
          a.decisionStatus?.toLowerCase() === "decision taken" &&
          a.leads.length > 0,
      );
      if (action) return { action, wpNumber: wp.number };
    }
    return null;
  }, [workPackages]);

  // Extract sample data from real actions for badge demos
  const sampleLeads = useMemo(() => {
    const leads = new Set<string>();
    workPackages.forEach((wp) => {
      wp.leads.forEach((lead) => leads.add(lead));
    });
    return Array.from(leads).slice(0, 3);
  }, [workPackages]);

  const sampleTeam = useMemo(() => {
    const team = new Set<string>();
    workPackages.forEach((wp) => {
      wp.actions.forEach((action) => {
        if (action.actionEntities) {
          action.actionEntities.split(";").forEach((entity) => {
            const trimmed = entity.trim();
            if (trimmed) team.add(trimmed);
          });
        }
      });
    });
    return Array.from(team).slice(0, 5);
  }, [workPackages]);

  const sampleWorkstreams = useMemo(() => {
    const ws = new Set<string>();
    workPackages.forEach((wp) => {
      wp.report.forEach((r) => {
        if (["WS1", "WS2", "WS3"].includes(r)) ws.add(r);
      });
    });
    return Array.from(ws).sort();
  }, [workPackages]);

  if (isLoading) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="min-h-screen bg-slate-50">
          <Header />
          <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="text-slate-500">Loading data...</div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-slate-50">
        <Header />

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Component Style Guide
            </h1>
            <p className="mt-2 text-slate-600">
              Live preview using actual data. Edit badge styles in{" "}
              <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm">
                src/components/Badges.tsx
              </code>
            </p>
          </div>

          {/* Badge Variants */}
          <section className="mb-10">
            <SectionHeader>Badge Variants</SectionHeader>
            <p className="mb-4 text-sm text-slate-600">
              Four visual variants for different hierarchy levels.
            </p>

            <div className="space-y-4">
              <BadgeShowcase
                title="primary"
                description="Solid UN blue, white text. Used for Work Package Leads."
              >
                <LabelBadge
                  items={sampleLeads.length > 0 ? sampleLeads : ["Example"]}
                  variant="primary"
                />
              </BadgeShowcase>

              <BadgeShowcase
                title="secondary"
                description="UN blue outline with light fill. Used for Action Leads."
              >
                <LabelBadge
                  items={sampleLeads.length > 0 ? sampleLeads : ["Example"]}
                  variant="secondary"
                />
              </BadgeShowcase>

              <BadgeShowcase
                title="tertiary"
                description="Subtle UN blue outline and tint. Used for Team Members."
              >
                <LabelBadge
                  items={sampleTeam.length > 0 ? sampleTeam : ["Example"]}
                  variant="tertiary"
                />
              </BadgeShowcase>

              <BadgeShowcase
                title="muted"
                description="Solid slate fill. Used for Workstream labels."
              >
                <LabelBadge
                  items={
                    sampleWorkstreams.length > 0 ? sampleWorkstreams : ["WS1"]
                  }
                  variant="muted"
                />
              </BadgeShowcase>
            </div>
          </section>

          {/* Hierarchy Comparison */}
          <section className="mb-10">
            <SectionHeader>Hierarchy Comparison</SectionHeader>
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="mb-4 text-sm text-slate-600">
                All variants side by side (most to least prominent):
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <LabelBadge items={["primary"]} variant="primary" />
                <LabelBadge items={["secondary"]} variant="secondary" />
                <LabelBadge items={["tertiary"]} variant="tertiary" />
                <LabelBadge items={["muted"]} variant="muted" />
              </div>
            </div>
          </section>

          {/* Decision Status Badges */}
          <section className="mb-10">
            <SectionHeader>Decision Status Badges</SectionHeader>
            <p className="mb-4 text-sm text-slate-600">
              Status indicators for action decision states.
            </p>

            <div className="space-y-4">
              <BadgeShowcase
                title="Further Work Ongoing"
                description="Amber with clock icon - decision still in progress"
              >
                <DecisionStatusBadge status="further work ongoing" />
              </BadgeShowcase>

              <BadgeShowcase
                title="Decision Taken"
                description="Green with check icon - decision has been finalized"
              >
                <DecisionStatusBadge status="decision taken" />
              </BadgeShowcase>
            </div>
          </section>

          {/* WorkPackageItem - Actual Component with Real Data */}
          {sampleWorkPackage && (
            <section className="mb-10">
              <SectionHeader>WorkPackageItem (Live Data)</SectionHeader>
              <p className="mb-4 text-sm text-slate-600">
                Actual WorkPackageItem component using real data. Click
                &quot;Details&quot; to expand and see ActionItems inside.
              </p>
              <WorkPackageItem
                workPackage={sampleWorkPackage}
                isOpen={wpOpen}
                onToggle={() => setWpOpen(!wpOpen)}
                collapsibleKey="stylings-wp-live"
              />
            </section>
          )}

          {/* ActionItem - Further Work Ongoing */}
          {actionOngoing && (
            <section className="mb-10">
              <SectionHeader>ActionItem - Further Work Ongoing</SectionHeader>
              <p className="mb-4 text-sm text-slate-600">
                Action {actionOngoing.action.actionNumber} from Work Package{" "}
                {actionOngoing.wpNumber}.
              </p>
              <ActionItem
                action={actionOngoing.action}
                workPackageNumber={actionOngoing.wpNumber}
              />
            </section>
          )}

          {/* ActionItem - Decision Taken */}
          {actionTaken && (
            <section className="mb-10">
              <SectionHeader>ActionItem - Decision Taken</SectionHeader>
              <p className="mb-4 text-sm text-slate-600">
                Action {actionTaken.action.actionNumber} from Work Package{" "}
                {actionTaken.wpNumber}.
              </p>
              <ActionItem
                action={actionTaken.action}
                workPackageNumber={actionTaken.wpNumber}
              />
            </section>
          )}

          {/* Specialized Badge Wrappers */}
          <section className="mb-10">
            <SectionHeader>Specialized Badge Wrappers</SectionHeader>
            <p className="mb-4 text-sm text-slate-600">
              Convenience components with preset variants, using real data.
            </p>

            <div className="space-y-4">
              <BadgeShowcase
                title="WPLeadsBadge"
                description="Work Package Leads - primary variant"
              >
                <WPLeadsBadge
                  leads={sampleLeads.length > 0 ? sampleLeads : ["USG DPPA"]}
                />
              </BadgeShowcase>

              <BadgeShowcase
                title="ActionLeadsBadge"
                description="Action Leads - secondary variant"
              >
                <ActionLeadsBadge
                  leads={sampleLeads.length > 0 ? sampleLeads : ["USG DPPA"]}
                />
              </BadgeShowcase>

              <BadgeShowcase
                title="TeamBadge"
                description="Team Members - tertiary variant"
              >
                <TeamBadge
                  leads={sampleTeam.length > 0 ? sampleTeam : ["DPPA", "DPO"]}
                />
              </BadgeShowcase>

              <BadgeShowcase
                title="WorkstreamBadge"
                description="Workstream Labels - muted variant"
              >
                <WorkstreamBadge
                  workstreams={
                    sampleWorkstreams.length > 0 ? sampleWorkstreams : ["WS1"]
                  }
                />
              </BadgeShowcase>
            </div>
          </section>

          {/* Interactive Example */}
          <section className="mb-10">
            <SectionHeader>Interactive (Clickable)</SectionHeader>
            <p className="mb-4 text-sm text-slate-600">
              Badges can have click handlers. Click to see console log.
            </p>
            <div className="space-y-4">
              <BadgeShowcase
                title="With onSelect handler"
                description="Cursor changes to pointer when clickable"
              >
                <LabelBadge
                  items={sampleLeads.length > 0 ? sampleLeads : ["Example"]}
                  variant="primary"
                  onSelect={(item) => console.log("Selected:", item)}
                />
              </BadgeShowcase>
            </div>
          </section>
        </main>
      </div>
    </TooltipProvider>
  );
}
