/**
 * Utility functions for handling holidays with grade/jenjang specificity (ALL, X, XI, XII).
 */

export type GradeLevel = "X" | "XI" | "XII";

/**
 * Extracts grade level (X, XI, XII) from class name.
 * e.g., "XII C3" -> "XII", "Kelas X 1" -> "X", "11 MIPA 2" -> "XI"
 */
export function extractJenjang(className?: string | null): GradeLevel | null {
  if (!className) return null;
  const clean = className.trim().toUpperCase().replace(/^KELAS\s+/i, "");
  if (clean.startsWith("XII") || clean.startsWith("12")) return "XII";
  if (clean.startsWith("XI") || clean.startsWith("11")) return "XI";
  if (clean.startsWith("X") || clean.startsWith("10")) return "X";
  return null;
}

export interface HolidayRecord {
  date?: string; // YYYY-MM-DD
  tanggal?: Date | string;
  keterangan: string;
  jenjang?: string | null; // "ALL", "X", "XI", "XII"
}

export function formatHolidayDateStr(dateOrStr: Date | string | undefined): string {
  if (!dateOrStr) return "";
  if (dateOrStr instanceof Date) {
    const year = dateOrStr.getFullYear();
    const month = String(dateOrStr.getMonth() + 1).padStart(2, "0");
    const day = String(dateOrStr.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(dateOrStr).slice(0, 10);
}

/**
 * Check whether a class is on holiday on a given date.
 */
export function checkClassHoliday(
  dateStr: string, // YYYY-MM-DD
  className?: string | null,
  holidays: HolidayRecord[] = [],
  settings: Record<string, string> = {}
): { isHoliday: boolean; name: string; jenjang?: string } {
  // 1. Weekend check
  const dateObj = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00Z`);
  const day = dateObj.getUTCDay();
  if (day === 6 && settings["libur_sabtu"] === "true") {
    return { isHoliday: true, name: "Hari Sabtu (Libur Akhir Pekan)", jenjang: "ALL" };
  }
  if (day === 0 && settings["libur_minggu"] !== "false") {
    return { isHoliday: true, name: "Hari Minggu (Libur Akhir Pekan)", jenjang: "ALL" };
  }

  // 2. Specific / national holidays
  const grade = extractJenjang(className);

  for (const h of holidays) {
    const hDateStr = h.date || formatHolidayDateStr(h.tanggal);
    if (hDateStr !== dateStr) continue;

    const hJenjang = (h.jenjang || "ALL").toUpperCase();
    if (hJenjang === "ALL") {
      return { isHoliday: true, name: h.keterangan, jenjang: "ALL" };
    }

    if (grade && hJenjang === grade) {
      return {
        isHoliday: true,
        name: `${h.keterangan} (Khusus Kelas ${hJenjang})`,
        jenjang: hJenjang,
      };
    }

    // If no class specified but holiday exists for a specific grade
    if (!className && (hJenjang === "X" || hJenjang === "XI" || hJenjang === "XII")) {
      return {
        isHoliday: true,
        name: `${h.keterangan} (Khusus Kelas ${hJenjang})`,
        jenjang: hJenjang,
      };
    }
  }

  return { isHoliday: false, name: "" };
}
