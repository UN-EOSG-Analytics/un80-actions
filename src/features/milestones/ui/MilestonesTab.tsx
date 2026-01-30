"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getActionMilestones,
  getMilestoneVersions,
  type MilestoneVersion,
} from "@/features/milestones/queries";
import { updateMilestone } from "@/features/milestones/commands";
import type { Action, ActionMilestone } from "@/types";
import {
  Calendar,
  Check,
  ChevronDown,
  History,
  Loader2,
  Pencil,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

// =========================================================
// HELPER COMPONENTS
// =========================================================

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <p className="text-sm text-slate-400">{message}</p>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-8">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-un-blue" />
  </div>
);

// =========================================================
// MILESTONES TAB
// =========================================================

export default function MilestonesTab({ action }: { action: Action }) {
  const [milestones, setMilestones] = useState<ActionMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: "",
    deadline: "",
    updates: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMilestones, setOpenMilestones] = useState<Set<string>>(new Set());
  const [versions, setVersions] = useState<Record<string, MilestoneVersion[]>>(
    {},
  );
  const [loadingVersions, setLoadingVersions] = useState<
    Record<string, boolean>
  >({});

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActionMilestones(action.id, action.sub_id);
      setMilestones(data);
    } catch (err) {
      console.error("Failed to load milestones:", err);
    } finally {
      setLoading(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const getMilestoneTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      first: "First Milestone",
      second: "Second Milestone",
      third: "Third Milestone",
      upcoming: "Upcoming",
      final: "Final",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-slate-100 text-slate-600",
      submitted: "bg-blue-100 text-blue-700",
      under_review: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-slate-100 text-slate-600";
  };

  const startEditing = (milestone: ActionMilestone) => {
    setEditingId(milestone.id);
    setEditForm({
      description: milestone.description || "",
      deadline: milestone.deadline || "",
      updates: milestone.updates || "",
    });
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ description: "", deadline: "", updates: "" });
    setError(null);
  };

  const handleSave = async (milestoneId: string) => {
    setSaving(true);
    setError(null);

    try {
      const result = await updateMilestone(milestoneId, {
        description: editForm.description || null,
        deadline: editForm.deadline || null,
        updates: editForm.updates || null,
      });

      if (result.success) {
        setEditingId(null);
        await loadMilestones();
        // Reload versions for this milestone
        await loadVersionsForMilestone(milestoneId);
      } else {
        setError(result.error || "Failed to save milestone");
      }
    } catch (err) {
      setError("Failed to save milestone");
    } finally {
      setSaving(false);
    }
  };

  const toggleMilestone = (milestoneId: string) => {
    const newOpen = new Set(openMilestones);
    if (newOpen.has(milestoneId)) {
      newOpen.delete(milestoneId);
    } else {
      newOpen.add(milestoneId);
      // Load versions when opening
      if (!versions[milestoneId]) {
        loadVersionsForMilestone(milestoneId);
      }
    }
    setOpenMilestones(newOpen);
  };

  const loadVersionsForMilestone = async (milestoneId: string) => {
    setLoadingVersions((prev) => ({ ...prev, [milestoneId]: true }));
    try {
      const data = await getMilestoneVersions(milestoneId);
      setVersions((prev) => ({ ...prev, [milestoneId]: data }));
    } catch (err) {
      console.error("Failed to load versions:", err);
    } finally {
      setLoadingVersions((prev) => ({ ...prev, [milestoneId]: false }));
    }
  };

  if (loading) return <LoadingState />;

  if (milestones.length === 0) {
    return <EmptyState message="No milestones have been added yet." />;
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone) => (
        <Collapsible
          key={milestone.id}
          open={openMilestones.has(milestone.id)}
          onOpenChange={() => toggleMilestone(milestone.id)}
        >
          <div className="rounded-lg border border-slate-200 bg-white">
            {/* Collapsible Header - Always shows current version */}
            <div className="p-4">
              <CollapsibleTrigger className="w-full">
                <div className="-m-2 flex items-start justify-between gap-3 rounded p-2 transition-colors hover:bg-slate-50">
                  <div className="flex flex-1 items-start gap-3">
                    <ChevronDown
                      className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        openMilestones.has(milestone.id)
                          ? "rotate-0"
                          : "-rotate-90"
                      }`}
                    />
                    <div className="flex-1 space-y-2 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getMilestoneTypeLabel(milestone.milestone_type)}
                        </Badge>
                        <Badge className={getStatusBadge(milestone.status)}>
                          {milestone.status.replace("_", " ")}
                        </Badge>
                        {milestone.deadline && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Calendar className="h-4 w-4" />
                            {new Date(milestone.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-slate-700">
                          {milestone.description}
                        </p>
                      )}
                      {milestone.updates && (
                        <p className="text-sm text-slate-500 italic">
                          {milestone.updates}
                        </p>
                      )}
                      {!milestone.description && !milestone.updates && (
                        <p className="text-sm text-slate-400 italic">
                          No content yet
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(milestone);
                    }}
                    className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    title="Edit milestone"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </CollapsibleTrigger>
            </div>

            {/* Collapsible Content */}
            <CollapsibleContent>
              <div className="border-t border-slate-200 p-4">
                {editingId === milestone.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Description
                      </label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                        rows={3}
                        disabled={saving}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Deadline
                        </label>
                        <input
                          type="date"
                          value={editForm.deadline}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              deadline: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Updates
                        </label>
                        <input
                          type="text"
                          value={editForm.updates}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              updates: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                          placeholder="Status update..."
                          disabled={saving}
                        />
                      </div>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(milestone.id)}
                        disabled={saving}
                        className="bg-un-blue hover:bg-un-blue/90"
                      >
                        {saving ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-3 w-3" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode - Version History Only (current version shown above)
                  <div>
                    {/* Version History */}
                    {loadingVersions[milestone.id] ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    ) : versions[milestone.id] &&
                      versions[milestone.id].length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                          <History className="h-3.5 w-3.5" />
                          Version History
                        </div>
                        <div className="space-y-2 rounded-md bg-slate-50 p-3">
                          {versions[milestone.id].map((version) => (
                            <div
                              key={version.id}
                              className="rounded border border-slate-200 bg-white p-3 text-xs"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="font-medium text-slate-600">
                                  {new Date(
                                    version.changed_at,
                                  ).toLocaleDateString(undefined, {
                                    dateStyle: "medium",
                                  })}{" "}
                                  at{" "}
                                  {new Date(
                                    version.changed_at,
                                  ).toLocaleTimeString(undefined, {
                                    timeStyle: "short",
                                  })}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {version.change_type}
                                </Badge>
                              </div>
                              {version.description && (
                                <p className="mb-1 text-slate-700">
                                  {version.description}
                                </p>
                              )}
                              {version.updates && (
                                <p className="text-slate-500 italic">
                                  {version.updates}
                                </p>
                              )}
                              {version.deadline && (
                                <p className="mt-1 text-slate-500">
                                  Deadline:{" "}
                                  {new Date(
                                    version.deadline,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-slate-400 italic">
                        No version history yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
