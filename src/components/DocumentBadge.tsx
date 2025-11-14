import { FileText } from "lucide-react";
import { getDocumentReference, getDocumentUrl } from "@/constants/documents";

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

  const documentData = getDocumentReference({
    workPackageNumber,
    report,
    documentParagraph,
  });

  if (!documentData) {
    return null;
  }

  const documentUrl = getDocumentUrl(documentData.documentNumber);

  return (
    <a
      href={documentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 transition-colors hover:text-un-blue"
    >
      <FileText className="h-4 w-4 shrink-0 text-slate-600" />
      <span className="font-mono text-sm leading-tight text-slate-600">
        {documentData.text}
      </span>
    </a>
  );
}
