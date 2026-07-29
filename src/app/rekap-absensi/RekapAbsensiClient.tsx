"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getMonthlyAttendanceMatrixAction } from "@/app/actions/attendance";
import { CalendarCheck, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

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
  const [selectedClassId, setSelectedClassId] = useState<string>(() => classes[0]?.id || "");
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [isPending, startTransition] = useTransition();

  const [matrixData, setMatrixData] = useState<{
    className: string;
    students: any[];
    daysInMonth: number;
    matrix: Record<string, Record<number, string>>;
    studentPoinMap: Record<string, number>;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Matrix Data when class, month, or year changes
  useEffect(() => {
    if (!selectedClassId) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await getMonthlyAttendanceMatrixAction(
        selectedClassId,
        selectedMonth,
        selectedYear
      );

      if (res.error) {
        setErrorMsg(res.error);
        setMatrixData(null);
      } else if (res.data) {
        setMatrixData(res.data);
      }
    });
  }, [selectedClassId, selectedMonth, selectedYear]);

  // Check Holiday Info
  const getHolidayInfo = (dateStr: string) => {
    const holidayMatch = holidays.find((h) => h.date === dateStr);
    if (holidayMatch) {
      return { isHoliday: true, name: holidayMatch.keterangan };
    }

    const d = new Date(`${dateStr}T00:00:00.000Z`);
    const dayOfWeek = d.getUTCDay();

    let weeklyHolidays = [0, 6];
    if (settings["weekly_holidays"]) {
      try {
        weeklyHolidays = JSON.parse(settings["weekly_holidays"]);
      } catch {}
    }

    if (weeklyHolidays.includes(dayOfWeek)) {
      const dayName = dayOfWeek === 0 ? "Minggu" : "Sabtu";
      return { isHoliday: true, name: `Libur Akhir Pekan (${dayName})` };
    }

    return { isHoliday: false, name: "" };
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
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

          {/* Filter Bulan */}
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

        {isPending && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-pulse self-center">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Memuat Matriks...</span>
          </div>
        )}
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

      {/* Matriks Table View */}
      {selectedClassId && matrixData && (
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
                  {Array.from({ length: matrixData.daysInMonth }, (_, i) => i + 1).map((d) => {
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
                  <th className="py-3 text-center w-12 min-w-[3rem] text-amber-300 border-l border-slate-800 font-bold">Poin</th>
                  <th className="py-3 text-center w-16 min-w-[4rem] text-emerald-400 border-l border-slate-800 font-bold">Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs">
                {matrixData.students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={matrixData.daysInMonth + 9}
                      className="py-12 text-center text-slate-500"
                    >
                      Belum ada data siswa di kelas ini.
                    </td>
                  </tr>
                ) : (
                  matrixData.students.map((student, idx) => {
                    const studentMatrix = matrixData.matrix[student.id] || {};
                    let totalH = 0,
                      totalS = 0,
                      totalI = 0,
                      totalA = 0,
                      totalD = 0;

                    for (let d = 1; d <= matrixData.daysInMonth; d++) {
                      const st = studentMatrix[d];
                      if (st === "H") totalH++;
                      else if (st === "S") totalS++;
                      else if (st === "I") totalI++;
                      else if (st === "A") totalA++;
                      else if (st === "D") totalD++;
                    }

                    const absenceWeight = totalA * 1.0 + totalI * 0.7 + totalS * 0.5;
                    const effectiveDays = Math.max(1, matrixData.daysInMonth);
                    const rate = Math.max(0, Math.min(100, Math.round((1 - absenceWeight / effectiveDays) * 100)));

                    const poinPelanggaran = matrixData.studentPoinMap[student.id] || 0;

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
                        {Array.from({ length: matrixData.daysInMonth }, (_, i) => i + 1).map((d) => {
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

                        {/* Poin Pelanggaran */}
                        <td className="py-2.5 text-center font-mono font-bold text-amber-300 border-l border-slate-800">
                          {poinPelanggaran > 0 ? poinPelanggaran : "-"}
                        </td>

                        {/* Kehadiran Rate */}
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
    </div>
  );
}
