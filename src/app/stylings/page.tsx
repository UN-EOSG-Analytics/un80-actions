"use client";

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
  const sampleLeads = ["USG DPPA", "USG DPO", "ASG DOS"];
  const sampleTeam = ["DPPA", "DPO", "DOS", "DCO", "OCHA"];
  const sampleWorkstreams = ["WS1", "WS2", "WS3"];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-slate-50">
        <Header />

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Badge Style Guide
            </h1>
            <p className="mt-2 text-slate-600">
              Reference for all badge components. Edit styles in{" "}
              <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm">
                src/components/Badges.tsx
              </code>
            </p>
          </div>

          {/* Variants Overview */}
          <section className="mb-10">
            <SectionHeader>Badge Variants</SectionHeader>
            <p className="mb-4 text-sm text-slate-600">
              Four visual variants for different hierarchy levels.
            </p>

            <div className="space-y-4">
              <BadgeShowcase
                title="primary"
                description="Solid UN blue, white text. Most prominent."
              >
                <LabelBadge items={["Example"]} variant="primary" />
              </BadgeShowcase>

              <BadgeShowcase
                title="secondary"
                description="UN blue outline with light fill."
              >
                <LabelBadge items={["Example"]} variant="secondary" />
              </BadgeShowcase>

              <BadgeShowcase
                title="tertiary"
                description="Dashed outline, minimal fill. Least prominent."
              >
                <LabelBadge items={["Example"]} variant="tertiary" />
              </BadgeShowcase>

              <BadgeShowcase
                title="muted"
                description="Solid slate fill. Neutral info."
              >
                <LabelBadge items={["Example"]} variant="muted" />
              </BadgeShowcase>
            </div>
          </section>

          {/* Side by Side Comparison */}
          <section className="mb-10">
            <SectionHeader>Hierarchy Comparison</SectionHeader>
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="mb-4 text-sm text-slate-600">
                All variants side by side:
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <LabelBadge items={["primary"]} variant="primary" />
                <LabelBadge items={["secondary"]} variant="secondary" />
                <LabelBadge items={["tertiary"]} variant="tertiary" />
                <LabelBadge items={["muted"]} variant="muted" />
              </div>
            </div>
          </section>

          {/* Specialized Wrappers */}
          <section className="mb-10">
            <SectionHeader>Specialized Wrappers</SectionHeader>
            <p className="mb-4 text-sm text-slate-600">
              Convenience components with preset variants.
            </p>

            <div className="space-y-4">
              <BadgeShowcase
                title="WPLeadsBadge"
                description="Work Package Leads - uses primary variant"
              >
                <WPLeadsBadge leads={sampleLeads} />
              </BadgeShowcase>

              <BadgeShowcase
                title="ActionLeadsBadge"
                description="Action Leads - uses secondary variant"
              >
                <ActionLeadsBadge leads={sampleLeads} />
              </BadgeShowcase>

              <BadgeShowcase
                title="TeamBadge"
                description="Team Members - uses tertiary variant"
              >
                <TeamBadge leads={sampleTeam} />
              </BadgeShowcase>

              <BadgeShowcase
                title="WorkstreamBadge"
                description="Workstream Labels - uses muted variant"
              >
                <WorkstreamBadge workstreams={sampleWorkstreams} />
              </BadgeShowcase>
            </div>
          </section>

          {/* Decision Status Badges */}
          <section className="mb-10">
            <SectionHeader>Decision Status Badges</SectionHeader>
            <p className="mb-4 text-sm text-slate-600">
              Status indicators for action decision states. Green for completed
              decisions, amber for ongoing work.
            </p>

            <div className="space-y-4">
              <BadgeShowcase
                title="Decision Taken"
                description="Green with check icon - decision has been finalized"
              >
                <DecisionStatusBadge status="decision taken" />
              </BadgeShowcase>

              <BadgeShowcase
                title="Further Work Ongoing"
                description="Amber with clock icon - decision still in progress"
              >
                <DecisionStatusBadge status="further work ongoing" />
              </BadgeShowcase>
            </div>
          </section>

          {/* Combined Example */}
          <section className="mb-10">
            <SectionHeader>Combined Example (Card Layout)</SectionHeader>
            <div className="rounded-lg border border-slate-200 bg-slate-100 p-6">
              <div className="mb-4">
                <span className="text-sm font-medium tracking-wider text-slate-500 uppercase">
                  Work Package 1
                </span>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  Peace operations (task delegation; review)
                </h3>
              </div>

              <div className="mb-4 flex items-stretch gap-2.5">
                <div className="w-1 shrink-0 rounded-full bg-un-blue" />
                <p className="py-0.5 text-sm leading-snug font-medium text-slate-600">
                  <span className="font-semibold text-un-blue">Goal:</span>{" "}
                  Joined up and networked for lasting impact
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <WorkstreamBadge workstreams={["WS3"]} />
                <WPLeadsBadge leads={["USG DPPA", "USG DPO"]} />
              </div>
            </div>
          </section>

          {/* ActionCard Example */}
          <section className="mb-10">
            <SectionHeader>ActionCard Example</SectionHeader>
            <p className="mb-4 text-sm text-slate-600">
              Example of how badges are combined in an ActionCard with Decision
              Status.
            </p>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              {/* Action Number and Decision Status */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium tracking-wider text-un-blue uppercase">
                  Action 14
                </span>
                <DecisionStatusBadge status="further work ongoing" />
              </div>

              {/* Action description text */}
              <p className="mb-4 leading-normal font-medium text-slate-900">
                Review arrangements for timely decision-making on peace
                operations in relation to changing circumstances
              </p>

              {/* Metadata section - Action Leads and Team Members */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionLeadsBadge leads={["USG DPPA", "USG DPO"]} />
                  <span className="text-slate-400">•</span>
                  <TeamBadge leads={["DPO", "DPPA"]} />
                </div>
              </div>
            </div>
          </section>

          {/* Decision Taken Example */}
          <section className="mb-10">
            <SectionHeader>ActionCard (Decision Taken)</SectionHeader>
            <p className="mb-4 text-sm text-slate-600">
              Same layout with a Decision Taken status badge.
            </p>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              {/* Action Number and Decision Status */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium tracking-wider text-un-blue uppercase">
                  Action 27
                </span>
                <DecisionStatusBadge status="decision taken" />
              </div>

              {/* Action description text */}
              <p className="mb-4 leading-normal font-medium text-slate-900">
                Ensure that all entities take into consideration relevant human
                rights guidance
              </p>

              {/* Metadata section */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionLeadsBadge leads={["OHCHR"]} />
                  <span className="text-slate-400">•</span>
                  <TeamBadge leads={["DPPA", "DPO", "OCHA"]} />
                </div>
              </div>
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
                  items={sampleLeads}
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
