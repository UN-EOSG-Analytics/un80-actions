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
  if ((e.ctrlKey || e.metaKey) && e.key === "b") {
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
 * Renders text with **...** as bold, preserving whitespace (e.g. newlines).
 */
export function BoldText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const parts = children.split("**");
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
      )}
    </span>
  );
}
