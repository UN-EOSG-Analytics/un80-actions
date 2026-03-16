"use client";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/DatePicker";
import { Check, Loader2 } from "lucide-react";

export interface MilestoneEditForm {
  description: string;
  deadline: string;
}

interface MilestoneEditPanelProps {
  form: MilestoneEditForm;
  saving: boolean;
  error: string | null;
  onChange: (form: MilestoneEditForm) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function MilestoneEditPanel({
  form,
  saving,
  error,
  onChange,
  onSave,
  onCancel,
}: MilestoneEditPanelProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
          rows={3}
          disabled={saving}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Deadline
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
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
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
            <Check className="mr-1 h-3 w-3" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
