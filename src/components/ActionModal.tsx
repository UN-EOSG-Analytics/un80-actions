"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatusStyles } from "@/constants/actionStatus";
import { getActionMilestones, updateMilestone } from "@/lib/milestones";
import { createNote, getActionNotes } from "@/lib/notes";
import { createQuestion, getActionQuestions } from "@/lib/questions";
import type {
  Action,
  ActionMilestone,
  ActionNote,
  ActionQuestion,
} from "@/types";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Lightbulb,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  StickyNote,
  Target,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

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
    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <div className="text-sm text-slate-700">{children}</div>
  </div>
);

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
// TAB CONTENT COMPONENTS
// =========================================================

function OverviewTab({ action }: { action: Action }) {
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
            <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
              Big Ticket
            </Badge>
          )}
          {action.needs_member_state_engagement && (
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
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
          {action.work_package_leads && action.work_package_leads.length > 0 && (
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
          <InfoRow label="Indicative Activity">
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
                    className="bg-un-blue/10 text-un-blue border border-un-blue/20"
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
                {action.action_entities.split(";").filter(Boolean).map((entity) => (
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
              <div className="border-l-2 border-slate-300 bg-slate-50 py-2 pl-3 pr-2">
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
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {action.updates}
          </p>
        </SectionCard>
      )}
    </div>
  );
}

function MilestonesTab({ action }: { action: Action }) {
  const [milestones, setMilestones] = useState<ActionMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", deadline: "", updates: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canEdit = (status: string) => status === "draft" || status === "rejected";

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
      } else {
        setError(result.error || "Failed to save milestone");
      }
    } catch (err) {
      setError("Failed to save milestone");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  if (milestones.length === 0) {
    return <EmptyState message="No milestones have been added yet." />;
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          {editingId === milestone.id ? (
            // Edit Mode
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getMilestoneTypeLabel(milestone.milestone_type)}
                </Badge>
                <Badge className={getStatusBadge(milestone.status)}>
                  {milestone.status.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue resize-none"
                  rows={2}
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Deadline</label>
                  <input
                    type="date"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Updates</label>
                  <input
                    type="text"
                    value={editForm.updates}
                    onChange={(e) => setEditForm({ ...editForm, updates: e.target.value })}
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
            // View Mode
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getMilestoneTypeLabel(milestone.milestone_type)}
                  </Badge>
                  <Badge className={getStatusBadge(milestone.status)}>
                    {milestone.status.replace("_", " ")}
                  </Badge>
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
              </div>
              <div className="flex items-center gap-2">
                {milestone.deadline && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Calendar className="h-4 w-4" />
                    {new Date(milestone.deadline).toLocaleDateString()}
                  </div>
                )}
                {canEdit(milestone.status) && (
                  <button
                    onClick={() => startEditing(milestone)}
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    title="Edit milestone"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QuestionsTab({ action }: { action: Action }) {
  const [questions, setQuestions] = useState<ActionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActionQuestions(action.id, action.sub_id);
      setQuestions(data);
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setLoading(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createQuestion({
        action_id: action.id,
        action_sub_id: action.sub_id,
        question: newQuestion.trim(),
      });

      if (result.success) {
        setNewQuestion("");
        await loadQuestions();
      } else {
        setError(result.error || "Failed to submit question");
      }
    } catch (err) {
      setError("Failed to submit question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Ask Question Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Ask a question
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
            disabled={submitting}
          />
          <Button
            type="submit"
            disabled={submitting || !newQuestion.trim()}
            className="bg-un-blue hover:bg-un-blue/90"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </form>

      {/* Questions List */}
      {loading ? (
        <LoadingState />
      ) : questions.length === 0 ? (
        <EmptyState message="No questions have been asked yet." />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-un-blue" />
                  <p className="text-sm font-medium text-slate-700">{q.question}</p>
                </div>
                {q.answer ? (
                  <div className="ml-6 border-l-2 border-green-200 bg-green-50 py-2 pl-3 pr-2">
                    <p className="text-sm text-slate-600">{q.answer}</p>
                    {q.answered_at && (
                      <p className="mt-1 text-xs text-slate-400">
                        Answered on{" "}
                        {new Date(q.answered_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="ml-6">
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                      Awaiting answer
                    </Badge>
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  Asked on {new Date(q.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesTab({ action }: { action: Action }) {
  const [notes, setNotes] = useState<ActionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActionNotes(action.id, action.sub_id);
      setNotes(data);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoading(false);
    }
  }, [action.id, action.sub_id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createNote({
        action_id: action.id,
        action_sub_id: action.sub_id,
        content: newNote.trim(),
      });

      if (result.success) {
        setNewNote("");
        await loadNotes();
      } else {
        setError(result.error || "Failed to add note");
      }
    } catch (err) {
      setError("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Add a note
        </label>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write your note..."
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue resize-none"
          disabled={submitting}
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !newNote.trim()}
            className="bg-un-blue hover:bg-un-blue/90"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Note
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </form>

      {/* Notes List */}
      {loading ? (
        <LoadingState />
      ) : notes.length === 0 ? (
        <EmptyState message="No notes have been added yet." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start gap-2">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {note.content}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// MAIN MODAL COMPONENT
// =========================================================

interface ActionModalProps {
  action: Action | null;
  onClose: () => void;
  loading: boolean;
}

export default function ActionModal({
  action,
  onClose,
  loading,
}: ActionModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
                  {copied && (
                    <span className="ml-1.5 text-green-600">✓</span>
                  )}
                </button>
              </div>
              {/* Title */}
              <h2 className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
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
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-6">
              <TabsContent value="overview" className="mt-0">
                <OverviewTab action={action} />
              </TabsContent>
              <TabsContent value="milestones" className="mt-0">
                <MilestonesTab action={action} />
              </TabsContent>
              <TabsContent value="questions" className="mt-0">
                <QuestionsTab action={action} />
              </TabsContent>
              <TabsContent value="notes" className="mt-0">
                <NotesTab action={action} />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
