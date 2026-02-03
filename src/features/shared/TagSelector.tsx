"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  addTagToMilestone,
  addTagToNote,
  addTagToQuestion,
  addTagToLegalComment,
  removeTagFromMilestone,
  removeTagFromNote,
  removeTagFromQuestion,
  removeTagFromLegalComment,
} from "@/features/tags/commands";
import {
  getAllTags,
  getTagsForMilestone,
  getTagsForNote,
  getTagsForQuestion,
  getTagsForLegalComment,
  type Tag,
} from "@/features/tags/queries";
import { Tags, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type TagEntityType = "milestone" | "note" | "question" | "legal_comment";

interface TagSelectorProps {
  entityId: string;
  entityType: TagEntityType;
  isAdmin: boolean;
  initialTags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
  className?: string;
  /** When true, do not render tags inline (parent shows them next to title/name). */
  hideInlineTags?: boolean;
}

export function TagSelector({
  entityId,
  entityType,
  isAdmin,
  initialTags,
  onTagsChange,
  className = "",
  hideInlineTags = false,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to avoid dependency issues in effects
  const onTagsChangeRef = useRef(onTagsChange);
  
  // Keep ref up to date
  useEffect(() => {
    onTagsChangeRef.current = onTagsChange;
  }, [onTagsChange]);

  const loadTagsForEntity = useCallback(async () => {
    if (entityType === "milestone") {
      return getTagsForMilestone(entityId);
    }
    if (entityType === "note") {
      return getTagsForNote(entityId);
    }
    if (entityType === "legal_comment") {
      return getTagsForLegalComment(entityId);
    }
    return getTagsForQuestion(entityId);
  }, [entityId, entityType]);

  const loadAllTags = useCallback(() => getAllTags(), []);

  const refresh = useCallback(async () => {
    const [entityTags, globalTags] = await Promise.all([
      loadTagsForEntity(),
      loadAllTags(),
    ]);
    setTags(entityTags);
    setAllTags(globalTags);
    onTagsChangeRef.current?.(entityTags);
  }, [loadTagsForEntity, loadAllTags]);

  // Sync from parent only when entity changes (avoid loop from new initialTags ref every render)
  useEffect(() => {
    setTags(initialTags);
  }, [entityId, entityType]);

  // Load tags when entity changes; use ref for callback so deps stay stable
  useEffect(() => {
    loadTagsForEntity().then((t) => {
      setTags(t);
      onTagsChangeRef.current?.(t);
    });
  }, [entityId, entityType, loadTagsForEntity]);

  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

  const addTag = async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || !isAdmin) return;

    setLoading(true);
    setError(null);
    try {
      let result;
      if (entityType === "milestone") {
        result = await addTagToMilestone(entityId, trimmed);
      } else if (entityType === "note") {
        result = await addTagToNote(entityId, trimmed);
      } else if (entityType === "legal_comment") {
        result = await addTagToLegalComment(entityId, trimmed);
      } else {
        result = await addTagToQuestion(entityId, trimmed);
      }

      if (result.success && result.tags) {
        setTags(result.tags);
        onTagsChangeRef.current?.(result.tags);
        setNewTagInput("");
        await refresh();
      } else {
        setError(result.error || "Failed to add tag");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setLoading(false);
    }
  };

  const removeTag = async (tagId: string) => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);
    try {
      let result;
      if (entityType === "milestone") {
        result = await removeTagFromMilestone(entityId, tagId);
      } else if (entityType === "note") {
        result = await removeTagFromNote(entityId, tagId);
      } else if (entityType === "legal_comment") {
        result = await removeTagFromLegalComment(entityId, tagId);
      } else {
        result = await removeTagFromQuestion(entityId, tagId);
      }

      if (result.success && result.tags) {
        setTags(result.tags);
        onTagsChangeRef.current?.(result.tags);
        setError(null);
      } else {
        setError(result?.error || "Failed to remove tag");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove tag");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    if (newTagInput.trim()) {
      addTag(newTagInput);
    }
  };

  const availableToAdd = allTags.filter(
    (t) => !tags.some((ct) => ct.id === t.id),
  );

  if (!isAdmin) {
    if (hideInlineTags) return null;
    return (
      <div className={`flex flex-wrap justify-end gap-1.5 ${className}`}>
        {tags.map((t) => (
          <Badge
            key={t.id}
            variant="outline"
            className="border-slate-400 bg-slate-100 text-slate-700"
          >
            {t.name}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs text-slate-600"
          >
            <Tags className="h-3 w-3" />
            Add tags
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          <div className="space-y-3">
            <div className="text-xs font-medium text-slate-700">
              Tags on this item
            </div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className="gap-1 border-slate-400 bg-slate-100 pr-1 text-slate-700"
                  >
                    {t.name}
                    <button
                      type="button"
                      onClick={() => removeTag(t.id)}
                      disabled={loading}
                      className="rounded p-0.5 hover:bg-slate-200"
                      aria-label={`Remove ${t.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No tags yet</p>
            )}

            <div className="border-t border-slate-200 pt-2">
              <div className="mb-2 text-xs font-medium text-slate-700">
                Add from existing or create new
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableToAdd.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => addTag(t.name)}
                    disabled={loading}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    + {t.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNew();
                    }
                  }}
                  placeholder="New tag name..."
                  className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-un-blue focus:ring-1 focus:ring-un-blue"
                  disabled={loading}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddNew}
                  disabled={loading || !newTagInput.trim()}
                  className="h-7 text-xs"
                >
                  Add
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {!hideInlineTags && tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
          {tags.map((t) => (
            <Badge
              key={t.id}
              variant="outline"
              className="border-slate-400 bg-slate-100 text-slate-700"
            >
              {t.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
