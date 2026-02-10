/**
 * Format dates and times according to UN Editorial Guidelines
 * @see https://www.un.org/dgacm/en/content/editorial-manual/numbers-dates-time#dates
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Format date according to UN style: "21 April 2004"
 * Date-only strings (YYYY-MM-DD) are treated as calendar dates to avoid timezone
 * shifting the day (e.g. "2026-02-12" must display as 12 February, not 11 in UTC-*).
 */
export function formatUNDate(date: Date | string): string {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const [y, m, d] = date.trim().split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  }
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format time according to UN English style (12-hour system):
 * - 9 a.m. (not 9:00 a.m.)
 * - 1.30 p.m.
 * - 9.05 p.m. (not 9.5 p.m.)
 * - noon
 * - midnight
 */
export function formatUNTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hours = d.getHours();
  const minutes = d.getMinutes();

  // Handle special cases
  if (hours === 12 && minutes === 0) return "noon";
  if (hours === 0 && minutes === 0) return "midnight";

  // Determine period and convert to 12-hour format
  const period = hours >= 12 ? "p.m." : "a.m.";
  const hour12 = hours % 12 || 12;

  // Format time
  if (minutes === 0) {
    return `${hour12} ${period}`;
  } else {
    const mins = minutes.toString().padStart(2, "0");
    return `${hour12}.${mins} ${period}`;
  }
}

/**
 * Format date and time together: "21 April 2004, 9.05 p.m."
 */
export function formatUNDateTime(date: Date | string): string {
  const formattedDate = formatUNDate(date);
  const formattedTime = formatUNTime(date);
  return `${formattedDate}, ${formattedTime}`;
}
