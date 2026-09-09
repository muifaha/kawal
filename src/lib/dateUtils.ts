/**
 * Centralized Date & Time Utility for Asia/Jakarta (WIB, UTC+7) Timezone
 */

export const TIMEZONE_JAKARTA = "Asia/Jakarta";

/**
 * Returns current date formatted as YYYY-MM-DD in Asia/Jakarta timezone.
 */
export function getTodayWibStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Formats a Date or date string to YYYY-MM-DD in Asia/Jakarta timezone.
 */
export function formatDateWib(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "object" && date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Formats a Date or date string to human-readable Indonesian format (e.g. "Rabu, 9 September 2026") in Asia/Jakarta timezone.
 */
export function formatFullDateIndonesian(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "object" && date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TIMEZONE_JAKARTA,
  });
}

/**
 * Returns current time formatted as HH.MM in Asia/Jakarta timezone.
 */
export function getCurrentTimeWib(): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE_JAKARTA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date()).replace(":", ".");
}
