import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Date utility functions
 */

/**
 * Convert date string (ISO format or Excel serial) to Date object
 * @param dateStr - Date string in ISO format or Excel serial number
 * @returns Date object or null if invalid
 */
export const parseDate = (dateStr: string | null): Date | null => {
  if (!dateStr || dateStr.trim() === "") return null;

  // Try parsing as ISO date string first (e.g., "2026-02-28")
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try parsing as Excel serial number
  const serialNum = parseInt(dateStr);
  if (!isNaN(serialNum) && serialNum > 0) {
    const excelEpoch = new Date(1900, 0, 1);
    const days = serialNum - (serialNum > 59 ? 1 : 0) - 1;
    return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  }

  return null;
};

/**
 * Format date to DD/MM/YYYY
 * @param date - Date object to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format date to Month/Year (e.g., "January 2026")
 * @param date - Date object to format
 * @returns Formatted date string
 */
export const formatDateMonthYear = (date: Date): string => {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${month} ${year}`;
};

/**
 * Text formatting utility functions
 */

/**
 * Normalize leader names to standard format
 * Maps variations like "ASG UNITAR" to "ED UNITAR"
 * @param leader - Leader name to normalize
 * @returns Normalized leader name
 */
/**
 * Normalize team member name for counting
 * - Excludes "SA Reform"
 * - Treats "EOSG (ODSG)", "EOSG(USG Policy)", and "EOSG (SA)" as one (normalized to "EOSG")
 * @param teamMember - Team member name to normalize
 * @returns Normalized team member name or null if should be excluded
 */
export const normalizeTeamMember = (teamMember: string): string | null => {
  if (!teamMember || !teamMember.trim()) return null;
  
  const trimmed = teamMember.trim();
  
  // Exclude "SA Reform"
  if (trimmed === "SA Reform") {
    return null;
  }
  
  // Normalize EOSG variants to "EOSG"
  // Check for exact matches first, then check if it starts with "EOSG"
  if (trimmed === "EOSG (ODSG)" || 
      trimmed === "EOSG(USG Policy)" || 
      trimmed === "EOSG (USG Policy)" ||
      trimmed === "EOSG (SA)" ||
      trimmed === "EOSG ODSG" ||
      trimmed === "EOSG USG Policy" ||
      trimmed === "EOSG SA" ||
      trimmed === "EOSG") {
    return "EOSG";
  }
  
  // If it starts with "EOSG" but isn't one of the known variants, still normalize to "EOSG"
  if (trimmed.startsWith("EOSG")) {
    return "EOSG";
  }
  
  return trimmed;
};

export const normalizeLeaderName = (leader: string): string => {
  if (!leader) return leader;
  const trimmed = leader.trim();
  
  // Normalize "ASG UNITAR" to "ED UNITAR"
  if (trimmed === "ASG UNITAR") {
    return "ED UNITAR";
  }
  
  return trimmed;
};

/**
 * Format goal text: lowercase everything except first letter of each sentence
 * Preserves proper capitalization for "United Nations" and "Member States"
 * @param text - Text to format
 * @returns Formatted text with proper sentence capitalization
 */
export const formatGoalText = (text: string): string => {
  if (!text) return text;

  // Preserve proper capitalization for specific terms
  const preservedTerms = [
    { original: /United Nations/gi, replacement: "___UNITED_NATIONS___" },
    { original: /Member States/gi, replacement: "___MEMBER_STATES___" },
  ];

  // Replace preserved terms with placeholders
  let processedText = text;
  preservedTerms.forEach(({ original, replacement }) => {
    processedText = processedText.replace(original, replacement);
  });

  // Split by sentence boundaries (., !, ?) while preserving them
  const sentences = processedText.split(/([.!?]+(?:\s+|$))/);

  const formatted = sentences
    .map((sentence) => {
      // Skip if it's just punctuation/whitespace
      if (!sentence.trim() || /^[.!?\s]+$/.test(sentence)) {
        return sentence;
      }

      // Lowercase everything, then capitalize first letter
      const trimmed = sentence.trim();
      const lowercased = trimmed.toLowerCase();
      const capitalized =
        lowercased.charAt(0).toUpperCase() + lowercased.slice(1);

      // Preserve original whitespace
      const leadingWhitespace = sentence.match(/^\s*/)?.[0] || "";
      const trailingWhitespace = sentence.match(/\s*$/)?.[0] || "";

      return leadingWhitespace + capitalized + trailingWhitespace;
    })
    .join("");

  // Restore preserved terms with proper capitalization
  let result = formatted;
  result = result.replace(/___UNITED_NATIONS___/gi, "United Nations");
  result = result.replace(/___MEMBER_STATES___/gi, "Member States");

  return result;
};
