import { FileText } from "lucide-react";
import { getDocumentReference } from "@/constants/documents";

interface DocumentBadgeProps {
  documentParagraphNumber?: string;
  report?: string;
  workPackageNumber?: string;
}

export function DocumentBadge({
  documentParagraphNumber: documentParagraph,
  report,
  workPackageNumber,
}: DocumentBadgeProps) {
  // Don't render if no document information is available
  if (!documentParagraph && report !== "WS1" && workPackageNumber !== "31") {
    return null;
  }

  const documentText = getDocumentReference({
    workPackageNumber,
    report,
    documentParagraph,
  });

  if (!documentText) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <FileText className="h-4 w-4 shrink-0 text-slate-600" />
      <span className="text-sm leading-tight text-slate-600 font-mono">
        {documentText}
      </span>
    </div>
  );
}
