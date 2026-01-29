"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ActionsTableData,
  ActionsTableTab,
  ActionWithMilestones,
  ActionWithUpdates,
  ActionWithNotes,
  ActionWithQuestions,
  WorkPackageWithActions,
} from "@/types/actions-table";

const TABS: { id: ActionsTableTab; label: string }[] = [
  { id: "work_package", label: "Work Package" },
  { id: "action_updates", label: "Action Updates" },
  { id: "notes", label: "Notes" },
  { id: "questions", label: "Questions" },
];

function actionLabel(actionId: number, subId: string | null): string {
  return subId ? `${actionId}${subId}` : String(actionId);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: "short",
    });
  } catch {
    return iso;
  }
}

interface ReportsTableShellProps {
  data: ActionsTableData;
}

export function ReportsTableShell({ data }: ReportsTableShellProps) {
  const [activeTab, setActiveTab] = useState<ActionsTableTab>("work_package");
  const [searchInput, setSearchInput] = useState("");

  const search = searchInput.trim().toLowerCase();
  const hasSearch = search.length > 0;

  const filteredWorkPackages = useMemo(() => {
    if (!hasSearch) return data.workPackages;
    return data.workPackages
      .map((wp) => {
        const matches = (s: string) => s.toLowerCase().includes(search);
        const actions = wp.actions.filter(
          (a) =>
            matches(wp.work_package_title) ||
            matches(String(wp.id)) ||
            matches(a.indicative_action) ||
            a.milestones.some(
              (m) =>
                (m.description && matches(m.description)) ||
                (m.updates && matches(m.updates))
            )
        );
        if (actions.length === 0 && !matches(wp.work_package_title) && !matches(String(wp.id)))
          return null;
        return { ...wp, actions: actions.length ? actions : wp.actions };
      })
      .filter(Boolean) as WorkPackageWithActions[];
  }, [data.workPackages, hasSearch, search]);

  const filteredUpdates = useMemo(() => {
    if (!hasSearch) return data.actionsWithUpdates;
    return data.actionsWithUpdates.filter(
      (a) =>
        search.includes(String(a.work_package_number)) ||
        a.indicative_action.toLowerCase().includes(search) ||
        a.updates.some((u) => u.content.toLowerCase().includes(search))
    );
  }, [data.actionsWithUpdates, hasSearch, search]);

  const filteredNotes = useMemo(() => {
    if (!hasSearch) return data.actionsWithNotes;
    return data.actionsWithNotes.filter(
      (a) =>
        search.includes(String(a.work_package_number)) ||
        a.indicative_action.toLowerCase().includes(search) ||
        a.notes.some((n) => n.content.toLowerCase().includes(search))
    );
  }, [data.actionsWithNotes, hasSearch, search]);

  const filteredQuestions = useMemo(() => {
    if (!hasSearch) return data.actionsWithQuestions;
    return data.actionsWithQuestions.filter(
      (a) =>
        search.includes(String(a.work_package_number)) ||
        a.indicative_action.toLowerCase().includes(search) ||
        a.questions.some(
          (q) =>
            q.question.toLowerCase().includes(search) ||
            (q.answer && q.answer.toLowerCase().includes(search))
        )
    );
  }, [data.actionsWithQuestions, hasSearch, search]);

  const rowCount =
    activeTab === "work_package"
      ? filteredWorkPackages.reduce((n, wp) => n + wp.actions.length, 0)
      : activeTab === "action_updates"
        ? filteredUpdates.length
        : activeTab === "notes"
          ? filteredNotes.length
          : filteredQuestions.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-96 rounded-md border border-input bg-background px-3 pl-9 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="ml-auto text-sm text-gray-500">
          {rowCount} row{rowCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {/* Tabs as column headers */}
        <div className="grid grid-cols-4 border-b bg-gray-50">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider transition-colors ${
                activeTab === id
                  ? "border-b-2 border-un-blue bg-white text-un-blue"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content: table within the table */}
        <div className="min-h-[200px]">
          {activeTab === "work_package" && (
            <WorkPackageTable workPackages={filteredWorkPackages} />
          )}
          {activeTab === "action_updates" && (
            <ActionUpdatesTable rows={filteredUpdates} />
          )}
          {activeTab === "notes" && (
            <NotesTable rows={filteredNotes} />
          )}
          {activeTab === "questions" && (
            <QuestionsTable rows={filteredQuestions} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" disabled className="pointer-events-none">
          Previous
        </Button>
        <span className="text-sm text-gray-600">0–{rowCount} of {rowCount}</span>
        <Button variant="outline" size="sm" disabled className="pointer-events-none">
          Next
        </Button>
      </div>
    </div>
  );
}

function WorkPackageTable({
  workPackages,
}: {
  workPackages: WorkPackageWithActions[];
}) {
  if (workPackages.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-400">No work packages or actions</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {workPackages.map((wp) => (
        <div key={wp.id} className="bg-white">
          {/* WP header: number + title */}
          <div className="grid grid-cols-[80px_1fr] gap-x-4 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-gray-400 bg-gray-50/80">
            <span>{wp.id}</span>
            <span>{wp.work_package_title}</span>
          </div>
          {/* Nested table: actions + milestones */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  <th className="w-24 px-4 py-2">Action</th>
                  <th className="min-w-[200px] px-4 py-2">Indicative action</th>
                  <th className="px-4 py-2">Milestones</th>
                </tr>
              </thead>
              <tbody>
                {wp.actions.map((a) => (
                  <tr key={`${a.action_id}-${a.action_sub_id ?? ""}`} className="border-b border-gray-50 last:border-b-0">
                    <td className="align-top px-4 py-2 font-medium text-un-blue">
                      {actionLabel(a.action_id, a.action_sub_id)}
                    </td>
                    <td className="align-top px-4 py-2 text-gray-700">
                      {a.indicative_action || "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {a.milestones.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {a.milestones.map((m) => (
                            <li key={m.milestone_type} className="flex flex-wrap gap-x-2 gap-y-0.5">
                              <span className="font-medium text-gray-700">{m.milestone_type}</span>
                              {m.deadline && (
                                <span className="text-gray-500">({formatDate(m.deadline)})</span>
                              )}
                              {m.description && <span>{m.description}</span>}
                              {m.updates && (
                                <span className="text-gray-500">— {m.updates}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionUpdatesTable({ rows }: { rows: ActionWithUpdates[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-400">No action updates</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50/80 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
            <th className="w-20 px-4 py-2">WP #</th>
            <th className="w-24 px-4 py-2">Action</th>
            <th className="px-4 py-2">Updates</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={`${a.action_id}-${a.action_sub_id ?? ""}`} className="border-b border-gray-50 last:border-b-0">
              <td className="px-4 py-2 font-medium">{a.work_package_number}</td>
              <td className="px-4 py-2 font-medium text-un-blue">
                {actionLabel(a.action_id, a.action_sub_id)}
              </td>
              <td className="px-4 py-2 text-gray-600">
                {a.updates.length === 0 ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  <ul className="space-y-1">
                    {a.updates.map((u) => (
                      <li key={u.id}>
                        <span className="text-gray-500">{formatDate(u.created_at)}</span> — {u.content}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotesTable({ rows }: { rows: ActionWithNotes[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-400">No notes</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50/80 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
            <th className="w-20 px-4 py-2">WP #</th>
            <th className="w-24 px-4 py-2">Action</th>
            <th className="px-4 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={`${a.action_id}-${a.action_sub_id ?? ""}`} className="border-b border-gray-50 last:border-b-0">
              <td className="px-4 py-2 font-medium">{a.work_package_number}</td>
              <td className="px-4 py-2 font-medium text-un-blue">
                {actionLabel(a.action_id, a.action_sub_id)}
              </td>
              <td className="px-4 py-2 text-gray-600">
                {a.notes.length === 0 ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  <ul className="space-y-1">
                    {a.notes.map((n) => (
                      <li key={n.id}>
                        <span className="text-gray-500">{formatDate(n.created_at)}</span> — {n.content}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuestionsTable({ rows }: { rows: ActionWithQuestions[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-400">No questions</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50/80 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
            <th className="w-20 px-4 py-2">WP #</th>
            <th className="w-24 px-4 py-2">Action</th>
            <th className="px-4 py-2">Questions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={`${a.action_id}-${a.action_sub_id ?? ""}`} className="border-b border-gray-50 last:border-b-0">
              <td className="px-4 py-2 font-medium">{a.work_package_number}</td>
              <td className="px-4 py-2 font-medium text-un-blue">
                {actionLabel(a.action_id, a.action_sub_id)}
              </td>
              <td className="px-4 py-2 text-gray-600">
                {a.questions.length === 0 ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  <ul className="space-y-2">
                    {a.questions.map((q) => (
                      <li key={q.id}>
                        <div className="font-medium text-gray-700">{q.question}</div>
                        {q.answer != null && (
                          <div className="mt-0.5 text-gray-500">
                            <span className="text-gray-400">{formatDate(q.created_at)}</span> — {q.answer}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
