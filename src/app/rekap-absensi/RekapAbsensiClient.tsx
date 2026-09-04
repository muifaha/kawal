"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getMonthlyAttendanceMatrixAction,
  getSemesterAttendanceMatrixAction,
} from "@/app/actions/attendance";
import { CalendarCheck, RefreshCw, BarChart2, CheckCircle2 } from "lucide-react";

interface ClassOption {
  id: string;
  nama: string;
}

interface HolidayItem {
  date: string;
  keterangan: string;
}

interface RekapAbsensiClientProps {
  classes: ClassOption[];
  settings: Record<string, string>;
  holidays: HolidayItem[];
  userRole: string;
}

const INDONESIAN_MONTHS = [
  { value: 0, label: "Januari" },
  { value: 1, label: "Februari" },
  { value: 2, label: "Maret" },
  { value: 3, label: "April" },
  { value: 4, label: "Mei" },
  { value: 5, label: "Juni" },
  { value: 6, label: "Juli" },
  { value: 7, label: "Agustus" },
  { value: 8, label: "September" },
  { value: 9, label: "Oktober" },
  { value: 10, label: "November" },
  { value: 11, label: "Desember" },
];

export default function RekapAbsensiClient({
  classes,
  settings,
  holidays,
  userRole,
}: RekapAbsensiClientProps) {
  const [matrixMode, setMatrixMode] = useState<"monthly" | "semester">("monthly");
  const [semesterDisplayMode, setSemesterDisplayMode] = useState<"chips" | "rate">("chips");
  const [selectedClassId, setSelectedClassId] = useState<string>(() => classes[0]?.id || "");
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(() => {
    const currentMonth = new Date().getMonth();
    return currentMonth >= 6 ? 1 : 2;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [isPending, startTransition] = useTransition();

  const [monthlyData, setMonthlyData] = useState<{
    className: string;
    students: any[];
    daysInMonth: number;
    matrix: Record<string, Record<number, string>>;
    studentPoinMap: Record<string, number>;
  } | null>(null);

  const [semesterData, setSemesterData] = useState<{
    className: string;
    students: any[];
    semester: 1 | 2;
    year: number;
    months: Array<{ index: number; label: string }>;
    matrix: Record<string, Record<number, { H: number; S: number; I: number; A: number; D: number }>>;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Matrix Data when class, mode, month, semester, or year changes
  useEffect(() => {
    if (!selectedClassId) return;

    setErrorMsg(null);
    startTransition(async () => {
      if (matrixMode === "monthly") {
        const res = await getMonthlyAttendanceMatrixAction(
          selectedClassId,
          selectedMonth,
          selectedYear
        );

        if (res.error) {
          setErrorMsg(res.error);
          setMonthlyData(null);
        } else if (res.data) {
          setMonthlyData(res.data);
        }
      } else {
        const res = await getSemesterAttendanceMatrixAction(
          selectedClassId,
          selectedSemester,
          selectedYear
        );

        if (res.error) {
          setErrorMsg(res.error);
          setSemesterData(null);
        } else if (res.data) {
          setSemesterData(res.data);
        }
      }
    });
  }, [selectedClassId, matrixMode, selectedMonth, selectedSemester, selectedYear]);

  // Check Holiday Info
  const getHolidayInfo = (dateStr: string) => {
    const holidayMatch = holidays.find((h) => h.date === dateStr);
    if (holidayMatch) {
      return { isHoliday: true, name: holidayMatch.keterangan };
    }

    const dayOfWeek = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
    const isSabtuLibur = settings?.libur_sabtu === "true";
    const isMingguLibur = settings?.libur_minggu !== "false";

    if (dayOfWeek === 6 && isSabtuLibur) {
      return { isHoliday: true, name: "Libur Akhir Pekan (Sabtu)" };
    }
    if (dayOfWeek === 0 && isMingguLibur) {
      return { isHoliday: true, name: "Libur Akhir Pekan (Minggu)" };
    }

    return { isHoliday: false, name: "" };
  };

  const showPoinColumn = userRole !== "SEKRETARIS" && userRole !== "WALAS";

  return (
    <div className="space-y-6">
      {/* Mode Switcher & Filter Controls */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Toggle Mode */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setMatrixMode("monthly")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  matrixMode === "monthly"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Matriks Bulanan
              </button>
              <button
                onClick={() => setMatrixMode("semester")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  matrixMode === "semester"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Matriks Semester
              </button>
            </div>

            {/* Sub-mode switcher for Semester */}
            {matrixMode === "semester" && (
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800/80">
                <button
                  onClick={() => setSemesterDisplayMode("chips")}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                    semesterDisplayMode === "chips"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Chip Rincian (H/S/I/A/D)
                </button>
                <button
                  onClick={() => setSemesterDisplayMode("rate")}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                    semesterDisplayMode === "rate"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Persentase Bulanan (%)
                </button>
              </div>
            )}
          </div>

          {isPending && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Memuat Matriks...</span>
            </div>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Filter Kelas */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Pilih Kelas
            </label>
            <select
              disabled={classes.length <= 1 || userRole === "SEKRETARIS"}
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {classes.length === 0 ? (
                <option value="">-- Tidak Ada Kelas --</option>
              ) : (
                classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Filter Periode (Bulan / Semester) */}
          {matrixMode === "monthly" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                {INDONESIAN_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10) as 1 | 2)}
                className="w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <option value={1}>Semester 1 / Ganjil (Juli - Des)</option>
                <option value={2}>Semester 2 / Genap (Jan - Jun)</option>
              </select>
            </div>
          )}

          {/* Filter Tahun */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Empty State */}
      {!selectedClassId && (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
          <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">Belum Ada Kelas Terpilih</h4>
        </div>
      )}

      {/* Monthly Matriks Table View */}
      {matrixMode === "monthly" && selectedClassId && monthlyData && (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-900 rounded-2xl bg-slate-950/30">
            <table className="divide-y divide-slate-800 border-collapse min-w-max w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/60">
                  <th className="py-3 px-3 w-12 sticky left-0 z-20 bg-slate-950 border-r border-slate-800 text-center">
                    No
                  </th>
                  <th className="py-3 px-4 w-48 sm:w-56 sticky left-12 z-20 bg-slate-950 border-r border-slate-800">
                    Siswa
                  </th>

                  {/* Day Columns */}
                  {Array.from({ length: monthlyData.daysInMonth }, (_, i) => i + 1).map((d) => {
                    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const { isHoliday, name: holidayName } = getHolidayInfo(dateStr);
                    return (
                      <th
                        key={d}
                        title={isHoliday ? `Libur: ${holidayName}` : undefined}
                        className={`py-3 text-center w-9 text-[10px] font-bold min-w-[2.25rem] border-r border-slate-800/40 relative ${
                          isHoliday ? "text-rose-400 bg-rose-950/20" : ""
                        }`}
                      >
                        {d}
                        {isHoliday && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-400" />
                        )}
                      </th>
                    );
                  })}

                  {/* Totals Headers */}
                  <th className="py-3 text-center w-9 min-w-[2.25rem] text-emerald-400 border-l border-slate-800 font-bold">H</th>
                  <th className="py-3 text-center w-9 min-w-[2.25rem] text-amber-400 border-l border-slate-800/40 font-bold">S</th>
                  <th className="py-3 text-center w-9 min-w-[2.25rem] text-sky-400 border-l border-slate-800/40 font-bold">I</th>
                  <th className="py-3 text-center w-9 min-w-[2.25rem] text-rose-400 border-l border-slate-800/40 font-bold">A</th>
                  <th className="py-3 text-center w-9 min-w-[2.25rem] text-purple-400 border-l border-slate-800/40 font-bold">D</th>
                  {showPoinColumn && (
                    <th className="py-3 text-center w-12 min-w-[3rem] text-amber-300 border-l border-slate-800 font-bold">Poin</th>
                  )}
                  <th className="py-3 text-center w-16 min-w-[4rem] text-emerald-400 border-l border-slate-800 font-bold">Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs">
                {monthlyData.students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={monthlyData.daysInMonth + (showPoinColumn ? 8 : 7)}
                      className="py-12 text-center text-slate-500"
                    >
                      Belum ada data siswa di kelas ini.
                    </td>
                  </tr>
                ) : (
                  monthlyData.students.map((student, idx) => {
                    const studentMatrix = monthlyData.matrix[student.id] || {};
                    let totalH = 0,
                      totalS = 0,
                      totalI = 0,
                      totalA = 0,
                      totalD = 0;

                    for (let d = 1; d <= monthlyData.daysInMonth; d++) {
                      const st = studentMatrix[d];
                      if (st === "H") totalH++;
                      else if (st === "S") totalS++;
                      else if (st === "I") totalI++;
                      else if (st === "A") totalA++;
                      else if (st === "D") totalD++;
                    }

                    const absenceWeight = totalA * 1.0 + totalI * 0.7 + totalS * 0.5;
                    const effectiveDays = Math.max(1, monthlyData.daysInMonth);
                    const rate = Math.max(0, Math.min(100, Math.round((1 - absenceWeight / effectiveDays) * 100)));

                    const poinPelanggaran = monthlyData.studentPoinMap[student.id] || 0;

                    let rateColorClass = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                    if (rate < 80) rateColorClass = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                    else if (rate < 90) rateColorClass = "text-amber-400 border-amber-500/30 bg-amber-500/10";

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center sticky left-0 z-10 bg-slate-950 border-r border-slate-800/80 font-medium text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-white sticky left-12 z-10 bg-slate-950 border-r border-slate-800/80 truncate max-w-[14rem]">
                          {student.nama}
                        </td>

                        {/* Days 1..31 cells */}
                        {Array.from({ length: monthlyData.daysInMonth }, (_, i) => i + 1).map((d) => {
                          const st = studentMatrix[d];
                          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const { isHoliday } = getHolidayInfo(dateStr);

                          const statusColors: Record<string, string> = {
                            H: "text-emerald-400 font-bold",
                            S: "text-amber-400 font-bold bg-amber-500/10",
                            I: "text-sky-400 font-bold bg-sky-500/10",
                            A: "text-rose-400 font-bold bg-rose-500/20",
                            D: "text-purple-400 font-bold bg-purple-500/10",
                          };

                          return (
                            <td
                              key={d}
                              className={`py-2.5 text-center font-mono text-[11px] border-r border-slate-800/40 ${
                                isHoliday ? "bg-rose-950/10" : ""
                              } ${st ? statusColors[st] || "text-slate-500" : "text-slate-600"}`}
                            >
                              {st || "-"}
                            </td>
                          );
                        })}

                        {/* Totals */}
                        <td className="py-2.5 text-center font-bold text-emerald-400 border-l border-slate-800">{totalH}</td>
                        <td className="py-2.5 text-center font-bold text-amber-400 border-l border-slate-800/40">{totalS}</td>
                        <td className="py-2.5 text-center font-bold text-sky-400 border-l border-slate-800/40">{totalI}</td>
                        <td className="py-2.5 text-center font-bold text-rose-400 border-l border-slate-800/40">{totalA}</td>
                        <td className="py-2.5 text-center font-bold text-purple-400 border-l border-slate-800/40">{totalD}</td>

                        {showPoinColumn && (
                          <td className="py-2.5 text-center font-mono font-bold text-amber-300 border-l border-slate-800">
                            {poinPelanggaran > 0 ? poinPelanggaran : "-"}
                          </td>
                        )}

                        <td className="py-2.5 px-2 text-center border-l border-slate-800">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${rateColorClass}`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Legend Footer */}
          <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-white">Keterangan Status:</span>
              <span className="text-emerald-400 font-bold">H: Hadir</span>
              <span className="text-amber-400 font-bold">S: Sakit</span>
              <span className="text-sky-400 font-bold">I: Izin</span>
              <span className="text-rose-400 font-bold">A: Alpha</span>
              <span className="text-purple-400 font-bold">D: Dispensasi</span>
            </div>
            <div className="text-[11px] text-slate-500 italic">
              * Hari Libur/Akhir Pekan ditandai dengan warna merah di nomor tanggal.
            </div>
          </div>
        </div>
      )}

      {/* Semester Matriks Table View */}
      {matrixMode === "semester" && selectedClassId && semesterData && (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-900 rounded-2xl bg-slate-950/30">
            <table className="divide-y divide-slate-800 border-collapse min-w-max w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/60">
                  <th className="py-3 px-3 w-12 sticky left-0 z-20 bg-slate-950 border-r border-slate-800 text-center">
                    No
                  </th>
                  <th className="py-3 px-4 w-48 sm:w-56 sticky left-12 z-20 bg-slate-950 border-r border-slate-800">
                    Siswa
                  </th>

                  {/* 6 Month Columns */}
                  {semesterData.months.map((m) => (
                    <th
                      key={m.index}
                      className="py-3 text-center px-4 text-xs font-bold border-r border-slate-800/40 text-slate-200 min-w-[7.5rem]"
                    >
                      {m.label}
                    </th>
                  ))}

                  {/* Semester Totals Headers */}
                  <th className="py-3 text-center w-10 min-w-[2.5rem] text-emerald-400 border-l border-slate-800 font-bold">H</th>
                  <th className="py-3 text-center w-10 min-w-[2.5rem] text-amber-400 border-l border-slate-800/40 font-bold">S</th>
                  <th className="py-3 text-center w-10 min-w-[2.5rem] text-sky-400 border-l border-slate-800/40 font-bold">I</th>
                  <th className="py-3 text-center w-10 min-w-[2.5rem] text-rose-400 border-l border-slate-800/40 font-bold">A</th>
                  <th className="py-3 text-center w-10 min-w-[2.5rem] text-purple-400 border-l border-slate-800/40 font-bold">D</th>
                  <th className="py-3 text-center w-16 min-w-[4rem] text-emerald-400 border-l border-slate-800 font-bold">Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs">
                {semesterData.students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={semesterData.months.length + 8}
                      className="py-12 text-center text-slate-500"
                    >
                      Belum ada data siswa di kelas ini.
                    </td>
                  </tr>
                ) : (
                  semesterData.students.map((student, idx) => {
                    const studentMatrix = semesterData.matrix[student.id] || {};
                    let totalH = 0,
                      totalS = 0,
                      totalI = 0,
                      totalA = 0,
                      totalD = 0;

                    semesterData.months.forEach((m) => {
                      const mStats = studentMatrix[m.index] || { H: 0, S: 0, I: 0, A: 0, D: 0 };
                      totalH += mStats.H;
                      totalS += mStats.S;
                      totalI += mStats.I;
                      totalA += mStats.A;
                      totalD += mStats.D;
                    });

                    const totalRecordedDays = totalH + totalS + totalI + totalA + totalD;
                    const absenceWeight = totalA * 1.0 + totalI * 0.7 + totalS * 0.5;
                    const rate = totalRecordedDays > 0
                      ? Math.max(0, Math.min(100, Math.round((1 - absenceWeight / Math.max(1, totalRecordedDays)) * 100)))
                      : 100;

                    let rateColorClass = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                    if (rate < 80) rateColorClass = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                    else if (rate < 90) rateColorClass = "text-amber-400 border-amber-500/30 bg-amber-500/10";

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-3 px-3 text-center sticky left-0 z-10 bg-slate-950 border-r border-slate-800/80 font-medium text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white sticky left-12 z-10 bg-slate-950 border-r border-slate-800/80 truncate max-w-[14rem]">
                          {student.nama}
                        </td>

                        {/* Month summary cells */}
                        {semesterData.months.map((m) => {
                          const mStats = studentMatrix[m.index] || { H: 0, S: 0, I: 0, A: 0, D: 0 };
                          const totalM = mStats.H + mStats.S + mStats.I + mStats.A + mStats.D;
                          const hasData = totalM > 0;
                          const isFullAttendance = hasData && mStats.S === 0 && mStats.I === 0 && mStats.A === 0 && mStats.D === 0;

                          if (!hasData) {
                            return (
                              <td key={m.index} className="py-3 px-2 text-center border-r border-slate-800/40 text-slate-600 font-mono text-[11px]">
                                -
                              </td>
                            );
                          }

                          if (semesterDisplayMode === "rate") {
                            const mAbsenceWeight = mStats.A * 1.0 + mStats.I * 0.7 + mStats.S * 0.5;
                            const mRate = Math.max(0, Math.min(100, Math.round((1 - mAbsenceWeight / totalM) * 100)));
                            let mBadgeColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                            if (mRate < 80) mBadgeColor = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                            else if (mRate < 90) mBadgeColor = "text-amber-400 border-amber-500/30 bg-amber-500/10";

                            return (
                              <td key={m.index} className="py-3 px-2 text-center border-r border-slate-800/40">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-[10px] border ${mBadgeColor}`}>
                                    {mRate}%
                                  </span>
                                  {!isFullAttendance && (
                                    <div className="flex items-center gap-1 text-[9px] font-mono">
                                      {mStats.S > 0 && <span className="text-amber-400 font-bold">{mStats.S}S</span>}
                                      {mStats.I > 0 && <span className="text-sky-400 font-bold">{mStats.I}I</span>}
                                      {mStats.A > 0 && <span className="text-rose-400 font-extrabold">{mStats.A}A</span>}
                                      {mStats.D > 0 && <span className="text-purple-400 font-bold">{mStats.D}D</span>}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={m.index} className="py-3 px-2 text-center border-r border-slate-800/40">
                              {isFullAttendance ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono text-[10px]">
                                  {mStats.H}H (100%)
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono text-[10px]">
                                    {mStats.H}H
                                  </span>
                                  {mStats.S > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold font-mono text-[10px]">
                                      {mStats.S}S
                                    </span>
                                  )}
                                  {mStats.I > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold font-mono text-[10px]">
                                      {mStats.I}I
                                    </span>
                                  )}
                                  {mStats.A > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-400 font-extrabold font-mono text-[10px] animate-pulse">
                                      {mStats.A}A
                                    </span>
                                  )}
                                  {mStats.D > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold font-mono text-[10px]">
                                      {mStats.D}D
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Semester Totals */}
                        <td className="py-3 text-center font-bold text-emerald-400 border-l border-slate-800">{totalH}</td>
                        <td className="py-3 text-center font-bold text-amber-400 border-l border-slate-800/40">{totalS}</td>
                        <td className="py-3 text-center font-bold text-sky-400 border-l border-slate-800/40">{totalI}</td>
                        <td className="py-3 text-center font-bold text-rose-400 border-l border-slate-800/40">{totalA}</td>
                        <td className="py-3 text-center font-bold text-purple-400 border-l border-slate-800/40">{totalD}</td>

                        <td className="py-3 px-2 text-center border-l border-slate-800">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${rateColorClass}`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Legend Footer */}
          <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-white">Keterangan Status Matriks Semester:</span>
              <span className="text-emerald-400 font-bold">H: Total Hadir Bulanan</span>
              <span className="text-amber-400 font-bold">S: Sakit</span>
              <span className="text-sky-400 font-bold">I: Izin</span>
              <span className="text-rose-400 font-bold">A: Alpha (Sangat Menonjol)</span>
              <span className="text-purple-400 font-bold">D: Dispensasi</span>
            </div>
            <div className="text-[11px] text-slate-500 italic">
              * Rekapitulasi absensi per bulan disajikan untuk {semesterData.semester === 1 ? "Semester 1 / Ganjil (Juli - Desember)" : "Semester 2 / Genap (Januari - Juni)"}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
