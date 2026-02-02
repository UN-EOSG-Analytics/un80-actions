"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusStyles } from "@/constants/actionStatus";
import type { Action } from "@/types";
import { Clock, FileText, Lightbulb, Target, Users } from "lucide-react";
import { type ReactNode } from "react";

// =========================================================
// HELPER COMPONENTS
// =========================================================

const SectionCard = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof FileText;
  children: ReactNode;
}) => (
  <div className="rounded-lg border border-slate-200 bg-white">
    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
      {Icon && <Icon className="h-4 w-4 text-slate-500" />}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
      {label}
    </span>
    <div className="text-sm text-slate-700">{children}</div>
  </div>
);

// =========================================================
// OVERVIEW TAB
// =========================================================

export default function OverviewTab({ action }: { action: Action }) {
  const statusStyles = getStatusStyles(action.public_action_status);
  const StatusIcon = statusStyles.icon.component;

  return (
    <div className="space-y-4">
      {/* Status & Key Info */}
      <SectionCard title="Status" icon={Target}>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={statusStyles.badge}>
            <StatusIcon
              className={`h-3.5 w-3.5 ${statusStyles.icon.className}`}
            />
            {statusStyles.label}
          </Badge>
          {action.is_big_ticket && (
            <Badge className="border border-purple-200 bg-purple-100 text-purple-800">
              Big Ticket
            </Badge>
          )}
          {action.needs_member_state_engagement && (
            <Badge className="border border-blue-200 bg-blue-100 text-blue-800">
              Member State Engagement
            </Badge>
          )}
        </div>
      </SectionCard>

      {/* Work Package Info */}
      <SectionCard title="Work Package" icon={FileText}>
        <div className="space-y-3">
          <InfoRow label="Title">{action.work_package_name}</InfoRow>
          {action.work_package_goal && (
            <InfoRow label="Goal">
              <p className="whitespace-pre-wrap">{action.work_package_goal}</p>
            </InfoRow>
          )}
          {action.work_package_leads &&
            action.work_package_leads.length > 0 && (
              <InfoRow label="Work Package Leads">
                <div className="flex flex-wrap gap-1.5">
                  {action.work_package_leads.map((lead) => (
                    <Badge
                      key={lead}
                      variant="outline"
                      className="bg-slate-50 text-slate-700"
                    >
                      {lead}
                    </Badge>
                  ))}
                </div>
              </InfoRow>
            )}
        </div>
      </SectionCard>

      {/* Action Details */}
      <SectionCard title="Action Details" icon={Lightbulb}>
        <div className="space-y-3">
          <InfoRow label="Indicative Action">
            <p className="whitespace-pre-wrap">{action.indicative_activity}</p>
          </InfoRow>
          {action.sub_action_details && (
            <InfoRow label="Sub-Action">
              <p className="whitespace-pre-wrap">{action.sub_action_details}</p>
            </InfoRow>
          )}
          {action.action_leads && action.action_leads.length > 0 && (
            <InfoRow label="Action Leads">
              <div className="flex flex-wrap gap-1.5">
                {action.action_leads.map((lead) => (
                  <Badge
                    key={lead}
                    className="border border-un-blue/20 bg-un-blue/10 text-un-blue"
                  >
                    {lead}
                  </Badge>
                ))}
              </div>
            </InfoRow>
          )}
          {action.action_entities && (
            <InfoRow label="Entities">
              <div className="flex flex-wrap gap-1.5">
                {action.action_entities
                  .split(";")
                  .filter(Boolean)
                  .map((entity) => (
                    <Badge
                      key={entity}
                      variant="outline"
                      className="bg-slate-50 text-slate-600"
                    >
                      {entity.trim()}
                    </Badge>
                  ))}
              </div>
            </InfoRow>
          )}
        </div>
      </SectionCard>

      {/* Document Reference */}
      {(action.document_paragraph || action.doc_text) && (
        <SectionCard title="Document Reference" icon={FileText}>
          <div className="space-y-3">
            {action.document_paragraph && (
              <InfoRow label="Paragraph">
                <span className="font-mono text-sm">
                  {action.document_paragraph}
                </span>
              </InfoRow>
            )}
            {action.doc_text && (
              <div className="border-l-2 border-slate-300 bg-slate-50 py-2 pr-2 pl-3">
                <p className="text-sm leading-relaxed text-slate-600 italic">
                  &ldquo;{action.doc_text}&rdquo;
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Implementation Details */}
      {(action.scope_definition ||
        action.legal_considerations ||
        action.proposal_advancement_scenario ||
        action.un_budgets) && (
        <SectionCard title="Implementation Details" icon={Users}>
          <div className="space-y-3">
            {action.scope_definition && (
              <InfoRow label="Scope Definition">
                <p className="whitespace-pre-wrap">{action.scope_definition}</p>
              </InfoRow>
            )}
            {action.legal_considerations && (
              <InfoRow label="Legal Considerations">
                <p className="whitespace-pre-wrap">
                  {action.legal_considerations}
                </p>
              </InfoRow>
            )}
            {action.proposal_advancement_scenario && (
              <InfoRow label="Proposal Advancement Scenario">
                <p className="whitespace-pre-wrap">
                  {action.proposal_advancement_scenario}
                </p>
              </InfoRow>
            )}
            {action.un_budgets && (
              <InfoRow label="UN Budgets">
                <p className="whitespace-pre-wrap">{action.un_budgets}</p>
              </InfoRow>
            )}
          </div>
        </SectionCard>
      )}

      {/* Latest Update */}
      {action.updates && (
        <SectionCard title="Latest Update" icon={Clock}>
          <p className="text-sm whitespace-pre-wrap text-slate-600">
            {action.updates}
          </p>
        </SectionCard>
      )}
    </div>
  );
}
