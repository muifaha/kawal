export interface AttendanceCounts {
  H: number;
  S: number;
  I: number;
  A: number;
  D?: number;
}

/**
 * Ketentuan Bobot Poin Ketidakhadiran & Persentase Kehadiran:
 * - Alpa (A) = 1.0 poin per ketidakhadiran
 * - Izin (I) = 0.7 poin per ketidakhadiran
 * - Sakit (S) = 0.5 poin per ketidakhadiran
 * - Dispensasi (D) = 0 poin (tidak mengurangi persentase / tidak masuk penyebut)
 * 
 * Ambang batas: Siswa dengan persentase < 90% terancam tidak naik kelas / mengundurkan diri.
 */
export function calculateAttendanceRate(counts: AttendanceCounts): number {
  const effectiveDays = (counts.H || 0) + (counts.S || 0) + (counts.I || 0) + (counts.A || 0);
  if (effectiveDays <= 0) return 100;

  const absencePoints = ((counts.A || 0) * 1.0) + ((counts.I || 0) * 0.7) + ((counts.S || 0) * 0.5);
  const presentDays = Math.max(0, effectiveDays - absencePoints);
  const percentage = (presentDays / effectiveDays) * 100;

  return Math.round(percentage * 10) / 10;
}

export function getAttendanceAbsencePoints(counts: AttendanceCounts): number {
  return Math.round((((counts.A || 0) * 1.0) + ((counts.I || 0) * 0.7) + ((counts.S || 0) * 0.5)) * 10) / 10;
}
