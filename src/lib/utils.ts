import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Natural sort that handles strings with numbers correctly.
 * E.g., sorts "WS1", "WS2", "WS10" instead of "WS1", "WS10", "WS2"
 * @param items Array of strings to sort
 * @returns Sorted array (new array, does not mutate input)
 */
export function naturalSort(items: string[]): string[] {
  return [...items].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

/**
 * Normalize team member names for display.
 * Trims whitespace and handles common formatting issues.
 */
export function normalizeTeamMemberForDisplay(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Decode URL parameter (handles common encoding issues)
 */
export function decodeUrlParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}
