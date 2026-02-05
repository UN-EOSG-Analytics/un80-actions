"use client";

import type { KeyboardEvent } from "react";

/**
 * Handle Ctrl+B / Cmd+B in a textarea: wrap selection in ** (markdown bold).
 * Returns the new value and cursor range, or null if the shortcut was not pressed.
 */
export function applyBoldShortcut(
  e: KeyboardEvent<HTMLTextAreaElement>,
  value: string,
): { newValue: string; cursorStart: number; cursorEnd: number } | null {
  if ((e.ctrlKey || e.metaKey) && e.key === "b" && !e.shiftKey) {
    e.preventDefault();
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.substring(0, start);
    const selected = value.substring(start, end);
    const after = value.substring(end);
    const newValue = before + "**" + selected + "**" + after;
    const cursorStart = start + 2;
    const cursorEnd = selected.length > 0 ? end + 2 : start + 2;
    return { newValue, cursorStart, cursorEnd };
  }
  return null;
}

/**
 * Handle Ctrl+Shift+S / Cmd+Shift+S in a textarea: wrap selection in ~~ (markdown strikethrough).
 * Returns the new value and cursor range, or null if the shortcut was not pressed.
 */
export function applyStrikethroughShortcut(
  e: KeyboardEvent<HTMLTextAreaElement>,
  value: string,
): { newValue: string; cursorStart: number; cursorEnd: number } | null {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
    e.preventDefault();
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.substring(0, start);
    const selected = value.substring(start, end);
    const after = value.substring(end);
    const newValue = before + "~~" + selected + "~~" + after;
    const cursorStart = start + 2;
    const cursorEnd = selected.length > 0 ? end + 2 : start + 2;
    return { newValue, cursorStart, cursorEnd };
  }
  return null;
}

/**
 * Renders text with **...** as bold and ~~...~~ as strikethrough, preserving whitespace (e.g. newlines).
 */
export function BoldText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  // First split by strikethrough markers (~~), then process bold within each part
  const strikethroughParts = children.split("~~");
  
  return (
    <span className={className}>
      {strikethroughParts.map((strikePart, strikeIndex) => {
        // Process bold within each strikethrough segment
        const boldParts = strikePart.split("**");
        const processedBold = boldParts.map((part, boldIndex) =>
          boldIndex % 2 === 1 ? <strong key={`bold-${boldIndex}`}>{part}</strong> : part,
        );
        
        // Apply strikethrough to odd-indexed segments (between ~~ markers)
        if (strikeIndex % 2 === 1) {
          return <del key={`strike-${strikeIndex}`}>{processedBold}</del>;
        }
        return <span key={`strike-${strikeIndex}`}>{processedBold}</span>;
      })}
    </span>
  );
}
