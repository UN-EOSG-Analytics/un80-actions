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
 * Base URL for UN documents
 */
const UN_DOCS_BASE_URL = "https://docs.un.org/en/";

/**
 * Converts a UN document number to a URL
 * @param documentNumber - The document number (e.g., "A/80/392")
 * @returns Full URL to the document
 */
export function getDocumentUrl(documentNumber: string): string {
  return `${UN_DOCS_BASE_URL}${documentNumber}`;
}

/**
 * Gets the formatted document reference text for display
 * @param params - Document reference parameters
 * @returns Object with formatted text and document number, or null
 */
export function getDocumentReference({
  workPackageNumber,
  report,
  documentParagraph,
}: {
  workPackageNumber?: number | "";
  report?: string;
  documentParagraph?: string;
}): { text: string; documentNumber: string } | null {
  // WS1 or special case for work package 31
  if (report === "WS1" || workPackageNumber === 31) {
    return {
      text: DOCUMENT_NUMBERS.WS1,
      documentNumber: DOCUMENT_NUMBERS.WS1,
    };
  }

  // WS2 with paragraph
  if (report === "WS2" && documentParagraph) {
    return {
      text: `${DOCUMENT_NUMBERS.WS2} para. ${documentParagraph}`,
      documentNumber: DOCUMENT_NUMBERS.WS2,
    };
  }

  // WS3 with paragraph
  if (report === "WS3" && documentParagraph) {
    return {
      text: `${DOCUMENT_NUMBERS.WS3} para. ${documentParagraph}`,
      documentNumber: DOCUMENT_NUMBERS.WS3,
    };
  }

  return null;
}
