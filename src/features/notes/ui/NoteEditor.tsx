"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import { BulletList, ListItem } from "@tiptap/extension-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import { useCallback, useEffect } from "react";
import { Bold as BoldIcon, List, Minus } from "lucide-react";

/**
 * Convert plain text / markdown to HTML for TipTap.
 * Preserves **bold** as <strong> and ~~strikethrough~~ as <s>.
 */
function toTipTapHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "<p></p>";
  if (trimmed.startsWith("<") && trimmed.includes(">")) return trimmed;
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withStrike = withBold.replace(/~~(.+?)~~/g, "<s>$1</s>");
  const paragraphs = withStrike.split(/\n/).map((p) => `<p>${p}</p>`).join("");
  return paragraphs || "<p></p>";
}

/**
 * Default HTML for empty note.
 */
const DEFAULT_HTML = "<p></p>";

/** Strip HTML tags and trim; use to detect empty content. */
export function isNoteContentEmpty(html: string): boolean {
  const text = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return !text;
}

export function NoteEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  minRows = 3,
  className = "",
  "data-testid": dataTestId,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
  className?: string;
  "data-testid"?: string;
}) {
  const initialContent = value.trim() ? toTipTapHtml(value) : DEFAULT_HTML;

  const editor = useEditor({
    extensions: [Document, Paragraph, Text, Bold, Strike, BulletList, ListItem],
    content: initialContent,
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "min-h-[5rem] w-full px-3 py-2 text-sm outline-none focus:outline-none prose prose-sm max-w-none text-slate-800",
      },
    },
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync when value changes externally (e.g. form reset or switching note)
  useEffect(() => {
    if (!editor) return;
    const next = value.trim() ? toTipTapHtml(value) : DEFAULT_HTML;
    const current = editor.getHTML();
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={`rounded-md border border-slate-300 focus-within:border-un-blue focus-within:ring-1 focus-within:ring-un-blue ${className}`}
      data-testid={dataTestId}
    >
      <div className="flex items-center gap-1 rounded-t-md border-b border-slate-200 bg-slate-50 px-2 py-1">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleBold();
          }}
          disabled={disabled}
          className={`rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 ${
            editor.isActive("bold") ? "bg-un-blue/10 text-un-blue" : ""
          }`}
          title="Toggle bold"
          aria-label="Toggle bold"
        >
          <BoldIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleBulletList();
          }}
          disabled={disabled}
          className={`rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 ${
            editor.isActive("bulletList") ? "bg-un-blue/10 text-un-blue" : ""
          }`}
          title="Toggle bullet list"
          aria-label="Toggle bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleStrike();
          }}
          disabled={disabled}
          className={`rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 ${
            editor.isActive("strike") ? "bg-un-blue/10 text-un-blue" : ""
          }`}
          title="Toggle strikethrough"
          aria-label="Toggle strikethrough"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
      <div
        className="rounded-b-md bg-white min-h-[8rem] resize-y overflow-auto border-t border-slate-200
                   [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-0.5"
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
