"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusStyles } from "@/constants/actionStatus";
import { getAllEntities } from "@/features/actions/queries";
import { updateActionEntities } from "@/features/actions/commands";
import type { Action } from "@/types";
import { Check, Clock, FileText, Lightbulb, Pencil, Target, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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

export default function OverviewTab({
  action,
  isAdmin = false,
}: {
  action: Action;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const statusStyles = getStatusStyles(action.public_action_status);
  const StatusIcon = statusStyles.icon.component;

  const [editing, setEditing] = useState(false);
  const [allEntities, setAllEntities] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(action.action_entities ?? []);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSelected(action.action_entities ?? []);
  }, [action.action_entities]);

  const openEditor = async () => {
    if (!allEntities.length) {
      const entities = await getAllEntities();
      setAllEntities(entities);
    }
    setSearch("");
    setEditing(true);
  };

  const toggle = (entity: string) => {
    setSelected((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity],
    );
  };

  const save = async () => {
    setSaving(true);
    const result = await updateActionEntities(action.id, action.sub_id, selected);
    setSaving(false);
    if (result.success) {
      setEditing(false);
      router.refresh();
    }
  };

  const cancel = () => {
    setSelected(action.action_entities ?? []);
    setEditing(false);
  };

  const filtered = allEntities.filter((e) =>
    e.toLowerCase().includes(search.toLowerCase()),
  );

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
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Action Team Members
              </span>
              {isAdmin && !editing && (
                <button
                  onClick={openEditor}
                  className="text-slate-400 hover:text-un-blue transition-colors"
                  title="Edit team members"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search entities…"
                  className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto rounded border border-slate-200 bg-white">
                  {filtered.map((entity) => (
                    <button
                      key={entity}
                      onClick={() => toggle(entity)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected.includes(entity)
                            ? "border-un-blue bg-un-blue text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {selected.includes(entity) && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="text-slate-700">{entity}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-3 py-2 text-sm text-slate-400">No matches</p>
                  )}
                </div>
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.map((e) => (
                      <Badge key={e} variant="outline" className="bg-slate-50 text-slate-600 gap-1">
                        {e}
                        <button onClick={() => toggle(e)} className="text-slate-400 hover:text-slate-600">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded bg-un-blue px-3 py-1 text-xs font-medium text-white hover:bg-un-blue/90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={cancel}
                    className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-700">
                {selected.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((entity) => (
                      <Badge key={entity} variant="outline" className="bg-slate-50 text-slate-600">
                        {entity}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Not applicable</span>
                )}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Document Reference */}
      {(action.document_paragraph || action.doc_text) && (
        <SectionCard title="Document Reference" icon={FileText}>
          <div className="space-y-3">
            {action.document_paragraph && (
              <InfoRow label="Paragraph">
                <span className="font-mono text-sm">
                  {Number.isFinite(Number(action.document_paragraph))
                    ? Math.round(Number(action.document_paragraph))
                    : String(action.document_paragraph)}
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
