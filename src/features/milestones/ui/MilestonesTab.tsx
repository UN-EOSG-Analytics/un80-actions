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
import {
  canViewAttachments,
  getMilestoneAttachments,
  getMilestoneAttachmentCount,
  uploadMilestoneAttachment,
  deleteMilestoneAttachment,
} from "@/features/milestones/attachments";
import { approveMilestoneContent } from "@/features/milestones/commands";
import { ReviewStatus } from "@/features/shared/ReviewStatus";
import { TagSelector } from "@/features/shared/TagSelector";
import type { Action, ActionMilestone, MilestoneAttachment } from "@/types";
import {
  Calendar,
  Check,
  ChevronDown,
  History,
  Loader2,
  Paperclip,
  Pencil,
  Download,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

export default function MilestonesTab({
  action,
  isAdmin = false,
}: {
  action: Action;
  isAdmin?: boolean;
}) {
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
  const [canViewDocs, setCanViewDocs] = useState(false);
  const [attachments, setAttachments] = useState<
    Record<string, MilestoneAttachment[]>
  >({});
  const [attachmentCounts, setAttachmentCounts] = useState<
    Record<string, number>
  >({});
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    canViewAttachments().then(setCanViewDocs);
  }, []);


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
      setError(err instanceof Error ? err.message : "Failed to save milestone");
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
      if (!versions[milestoneId]) {
        loadVersionsForMilestone(milestoneId);
      }
    }
    setOpenMilestones(newOpen);
  };

  const loadAllAttachments = useCallback(async () => {
    if (milestones.length === 0) return;
    setLoadingAttachments(true);
    try {
      const [canView, ...counts] = await Promise.all([
        canViewAttachments(),
        ...milestones.map((m) => getMilestoneAttachmentCount(m.id)),
      ]);
      setCanViewDocs((prev) => prev || canView);
      const countsMap: Record<string, number> = {};
      milestones.forEach((m, i) => {
        countsMap[m.id] = counts[i] as number;
      });
      setAttachmentCounts(countsMap);
      if (canView) {
        const allData = await Promise.all(
          milestones.map((m) => getMilestoneAttachments(m.id)),
        );
        const attachmentsMap: Record<string, MilestoneAttachment[]> = {};
        milestones.forEach((m, i) => {
          attachmentsMap[m.id] = allData[i] as MilestoneAttachment[];
        });
        setAttachments(attachmentsMap);
      } else {
        setAttachments(
          Object.fromEntries(milestones.map((m) => [m.id, [] as MilestoneAttachment[]])),
        );
      }
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setLoadingAttachments(false);
    }
  }, [milestones]);

  useEffect(() => {
    if (milestones.length > 0) {
      loadAllAttachments();
    }
  }, [milestones, loadAllAttachments]);

  const handleUpload = async (milestoneId: string, formData: FormData) => {
    setUploadingId(milestoneId);
    setUploadError(null);
    try {
      const result = await uploadMilestoneAttachment(milestoneId, formData);
      if (result.success) {
        await loadAllAttachments();
      } else {
        setUploadError(result.error || "Upload failed");
      }
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    setApprovingId(milestoneId);
    try {
      const result = await approveMilestoneContent(milestoneId);
      if (result.success) {
        await loadMilestones();
        router.refresh();
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Delete this attachment?")) return;
    const result = await deleteMilestoneAttachment(attachmentId);
    if (result.success) {
      await loadAllAttachments();
    }
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
                        <ReviewStatus
                          status={
                            (milestone as { content_review_status?: "approved" | "needs_review" })
                              .content_review_status ?? "approved"
                          }
                          reviewedByEmail={
                            (milestone as { content_reviewed_by_email?: string | null })
                              .content_reviewed_by_email ?? null
                          }
                          reviewedAt={
                            (milestone as { content_reviewed_at?: Date | null })
                              .content_reviewed_at ?? null
                          }
                          isAdmin={isAdmin}
                          onApprove={() => handleApproveMilestone(milestone.id)}
                          approving={approvingId === milestone.id}
                        />
                        {milestone.deadline && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Calendar className="h-4 w-4" />
                            {new Date(milestone.deadline).toLocaleDateString()}
                          </div>
                        )}
                        <div onClick={(e) => e.stopPropagation()}>
                          <TagSelector
                            entityId={milestone.id}
                            entityType="milestone"
                            isAdmin={isAdmin}
                            initialTags={[]}
                          />
                        </div>
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

      {/* Attachments - single section below all milestones */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments
        </div>

        {loadingAttachments ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span className="text-sm text-slate-500">Loading…</span>
          </div>
        ) : canViewDocs ? (
          <div className="space-y-2">
            {(() => {
              const allAttachments = milestones.flatMap((m) =>
                (attachments[m.id] || []).map((att) => ({
                  ...att,
                  _milestoneLabel: getMilestoneTypeLabel(m.milestone_type),
                })),
              );
              return allAttachments.length > 0 ? (
                <ul className="space-y-1.5">
                  {allAttachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <a
                          href={`/api/milestone-attachments/${att.id}`}
                          download={att.file_name}
                          className="flex min-w-0 flex-1 items-center gap-2 truncate text-un-blue hover:underline"
                        >
                          <Download className="h-4 w-4 shrink-0" />
                          <span className="truncate">{att.file_name}</span>
                          {att.file_size && (
                            <span className="shrink-0 text-slate-400">
                              ({(att.file_size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </a>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {att._milestoneLabel}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No attachments yet
                </p>
              );
            })()}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {Object.values(attachmentCounts).reduce((a, b) => a + b, 0) > 0
              ? `${Object.values(attachmentCounts).reduce((a, b) => a + b, 0)} attachment(s). Viewing restricted to admins.`
              : "You can attach documents. Viewing is restricted to admins."}
          </p>
        )}

        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const milestoneId = form.querySelector<HTMLSelectElement>(
              "[name=attach-to-milestone]",
            )?.value;
            if (!fd.get("file") || !milestoneId) return;
            handleUpload(milestoneId, fd);
            form.reset();
          }}
        >
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px]">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Attach to
              </label>
              <select
                name="attach-to-milestone"
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                disabled={!!uploadingId}
              >
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {getMilestoneTypeLabel(m.milestone_type)}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex-1 min-w-[120px]">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                File
              </span>
              <input
                type="file"
                name="file"
                accept=".pdf,.doc,.docx,image/*,.txt,.csv"
                className="block w-full text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-un-blue/10 file:px-3 file:py-1.5 file:text-sm file:text-un-blue file:hover:bg-un-blue/20"
                disabled={!!uploadingId}
              />
            </label>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!!uploadingId}
              className="shrink-0"
            >
              {uploadingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Attach"
              )}
            </Button>
          </div>
          {uploadError && (
            <p className="mt-1 text-sm text-red-600">{uploadError}</p>
          )}
        </form>
      </div>
    </div>
  );
}
