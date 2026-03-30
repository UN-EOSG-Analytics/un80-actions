"use client";

import { Button } from "@/components/ui/button";
import { Check, Clipboard } from "lucide-react";
import { useState } from "react";

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<s>([\s\S]*?)<\/s>/gi, "~~$1~~")
    .replace(/<li>([\s\S]*?)<\/li>/gi, (_, c) => `- ${c.trim()}\n`)
    .replace(/<\/?[uo]l>/gi, "")
    .replace(/<p>([\s\S]*?)<\/p>/gi, (_, c) => `${c.trim()}\n\n`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toHtml(content: string): string {
  if (content.trim().startsWith("<")) return content;
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/~~(.*?)~~/g, "<s>$1</s>")
    .split("\n")
    .map((line) => `<p>${line}</p>`)
    .join("");
}

/**
 * Copies rich content to the clipboard as text/html + text/plain (Markdown).
 *
 * meta    — top metadata line, e.g. "Task Force · 18 February 2026 · Milestone 3.1"
 * sections — labelled content blocks (TipTap HTML or plain text)
 * footer  — bottom attribution line, e.g. "putu.ustriyana@un.org · 22 Feb 2026"
 */
export function CopyContentButton({
  meta,
  sections,
  footer,
  variant = "outline",
  className = "",
}: {
  meta?: string;
  sections: { label?: string; content: string }[];
  footer?: string;
  variant?: "outline" | "icon";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // ── HTML ──────────────────────────────────────────────────────────────────
    const htmlBlocks: string[] = [];

    if (meta) {
      htmlBlocks.push(`<p><strong>${meta}</strong></p>`);
    }

    sections.forEach(({ label, content }) => {
      const html = toHtml(content);
      if (label) htmlBlocks.push(`<p><strong>${label}</strong></p>`);
      htmlBlocks.push(html);
    });

    if (footer) {
      htmlBlocks.push(
        `<p><span style="color:#64748b;font-size:0.85em">${footer}</span></p>`,
      );
    }

    const fullHtml = htmlBlocks.join("");

    // ── Plain text (Markdown) ─────────────────────────────────────────────────
    const textBlocks: string[] = [];

    if (meta) textBlocks.push(meta);

    sections.forEach(({ label, content }) => {
      const md = htmlToMarkdown(toHtml(content));
      if (label) textBlocks.push(`**${label}**`);
      textBlocks.push(md);
    });

    if (footer) textBlocks.push(`*${footer}*`);

    const fullText = textBlocks.join("\n\n");

    // ── Write to clipboard ────────────────────────────────────────────────────
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([fullHtml], { type: "text/html" }),
          "text/plain": new Blob([fullText], { type: "text/plain" }),
        }),
      ]);
    } catch {
      navigator.clipboard.writeText(fullText);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy content"}
        className={`rounded p-1.5 transition-colors ${
          copied
            ? "text-un-blue"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        } ${className}`}
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Clipboard className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy content"}
      className={`h-7 w-7 px-0 text-slate-600 ${copied ? "text-un-blue" : ""} ${className}`}
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Clipboard className="h-3 w-3" />
      )}
    </Button>
  );
}
