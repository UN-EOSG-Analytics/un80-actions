import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
