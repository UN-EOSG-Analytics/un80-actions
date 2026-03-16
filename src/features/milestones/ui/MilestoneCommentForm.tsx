"use client";

import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Scale } from "lucide-react";

interface MilestoneCommentFormProps {
  isPublic: boolean;
  isAdmin: boolean;
  commentText: string;
  commentIsLegal: boolean;
  commentIsInternal: boolean;
  saving: boolean;
  error: string | null;
  onTextChange: (text: string) => void;
  onIsLegalChange: (v: boolean) => void;
  onIsInternalChange: (v: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function MilestoneCommentForm({
  isPublic,
  isAdmin,
  commentText,
  commentIsLegal,
  commentIsInternal,
  saving,
  error,
  onTextChange,
  onIsLegalChange,
  onIsInternalChange,
  onSubmit,
  onCancel,
}: MilestoneCommentFormProps) {
  return (
    <div className="rounded-lg border border-un-blue/20 bg-un-blue/5 p-3">
      <div className="space-y-2">
        {/* Channel selector: public milestones → Team vs Legal */}
        {isPublic && isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Post to:</span>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => onIsLegalChange(false)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  !commentIsLegal
                    ? "bg-un-blue text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Team updates & comments
              </button>
              <button
                type="button"
                onClick={() => onIsLegalChange(true)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  commentIsLegal
                    ? "bg-amber-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Scale className="h-3 w-3" />
                Legal updates & comments
              </button>
            </div>
          </div>
        )}

        {/* Channel selector: internal milestones → Team vs Internal */}
        {!isPublic && isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Post to:</span>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => onIsInternalChange(false)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  !commentIsInternal
                    ? "bg-un-blue text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Team updates & comments
              </button>
              <button
                type="button"
                onClick={() => onIsInternalChange(true)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  commentIsInternal
                    ? "bg-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                Internal comments
              </button>
            </div>
          </div>
        )}

        <textarea
          value={commentText}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
          rows={3}
          placeholder="Add a status update or comment..."
          disabled={saving}
          autoFocus
        />

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
            onClick={onSubmit}
            disabled={saving || !commentText.trim()}
            className="bg-un-blue hover:bg-un-blue/90"
          >
            {saving ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <MessageSquare className="mr-1 h-3 w-3" />
            )}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
