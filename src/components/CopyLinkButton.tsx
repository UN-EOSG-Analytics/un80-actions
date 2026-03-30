"use client";

import { Button } from "@/components/ui/button";
import { Check, Link } from "lucide-react";
import { useState } from "react";

/**
 * Copies a deep-link URL to the clipboard.
 * Pass `searchParams` as the raw query string (without leading "?").
 * The full URL is built lazily at click time so SSR is safe.
 *
 * variant="outline" — matches the Tags button (Notes/Questions top-right)
 * variant="icon"    — matches plain icon buttons (Milestone card action row)
 */
export function CopyLinkButton({
  searchParams,
  variant = "outline",
  className = "",
}: {
  searchParams: string;
  variant?: "outline" | "icon";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?${searchParams}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy link"}
        className={`rounded p-1.5 transition-colors ${
          copied
            ? "text-un-blue"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        } ${className}`}
      >
        {copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy link"}
      className={`h-7 w-7 px-0 text-slate-600 ${copied ? "text-un-blue" : ""} ${className}`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Link className="h-3 w-3" />}
    </Button>
  );
}
