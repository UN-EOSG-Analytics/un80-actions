/**
 * Document reference configuration for UN reports
 * Maps workstream reports to their official document numbers
 */

export const DOCUMENT_NUMBERS = {
  WS1: "A/80/400",
  WS2: "A/80/318",
  WS3: "A/80/392",
} as const;

/**
 * Gets the formatted document reference text for display
 * @param params - Document reference parameters
 * @returns Formatted document reference string (e.g., "A/80/392 para. 54")
 */
export function getDocumentReference({
  workPackageNumber,
  report,
  documentParagraph,
}: {
  workPackageNumber?: string;
  report?: string;
  documentParagraph?: string;
}): string | null {
  // Special case for work package 31 or WS1
  if (workPackageNumber === "31" || report === "WS1") {
    return DOCUMENT_NUMBERS.WS1;
  }

  // WS2 with paragraph
  if (report === "WS2" && documentParagraph) {
    return `${DOCUMENT_NUMBERS.WS2} para. ${documentParagraph}`;
  }

  // WS3 with paragraph
  if (report === "WS3" && documentParagraph) {
    return `${DOCUMENT_NUMBERS.WS3} para. ${documentParagraph}`;
  }

  return null;
}
