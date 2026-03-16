"use client";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/DatePicker";
import type { MilestoneType } from "@/types";
import { Loader2, Plus } from "lucide-react";

export interface NewMilestoneForm {
  milestone_type: MilestoneType;
  is_public: boolean;
  description: string;
  deadline: string;
}

interface MilestoneCreateFormProps {
  form: NewMilestoneForm;
  saving: boolean;
  error: string | null;
  onChange: (form: NewMilestoneForm) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function MilestoneCreateForm({
  form,
  saving,
  error,
  onChange,
  onSave,
  onCancel,
}: MilestoneCreateFormProps) {
  const isPublic = form.is_public;
  const title = isPublic
    ? "Create New Public Milestone"
    : "Create New Internal Milestone";
  const borderClass = isPublic ? "border-un-blue/20" : "border-slate-300";

  return (
    <div className={`rounded-lg border ${borderClass} bg-white p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <button
          onClick={onCancel}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
            rows={3}
            placeholder="Describe this milestone..."
            disabled={saving}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Deadline <span className="text-red-500">*</span>
          </label>
          <DatePicker
            value={form.deadline}
            onChange={(v) => onChange({ ...form, deadline: v })}
            disabled={saving}
            placeholder="Select deadline"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="bg-un-blue hover:bg-un-blue/90"
          >
            {saving ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Plus className="mr-1 h-3 w-3" />
            )}
            Create Milestone
          </Button>
        </div>
      </div>
    </div>
  );
}
