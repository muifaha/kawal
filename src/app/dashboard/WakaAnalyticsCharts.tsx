"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Filter,
  Users,
} from "lucide-react";
import type { AttendanceRecapItem, ViolationRecapItem, DailyAttendanceItem } from "./DashboardClient";

interface WakaAnalyticsChartsProps {
  attendanceRecap: AttendanceRecapItem[];
  dailyAttendance: DailyAttendanceItem[];
  violationRecap: ViolationRecapItem[];
  classes: { id: string; nama: string }[];
  totalSiswa: number;
}

/**
 * Normalisasi nama kategori pelanggaran agar pengelompokan rapi dan konsisten
 */
function normalizeCategory(raw: string): string {
  if (!raw) return "Lainnya";
  const upper = raw.trim().toUpperCase();
  if (upper.includes("KEHADIRAN")) return "Kehadiran Siswa";
  if (upper.includes("PAKAIAN") || upper.includes("ATRIBUT") || upper.includes("SERAGAM") || upper.includes("KERAPIAN")) return "Kerapian & Pakaian";
  if (upper.includes("ETIKA") || upper.includes("PERILAKU")) return "Etika & Perilaku";
  if (upper.includes("BELAJAR") || upper.includes("KBM")) return "Kegiatan Belajar (KBM)";
  if (upper.includes("UPACARA")) return "Upacara Bendera";
  if (upper.includes("KETERTIBAN") || upper.includes("KEAMANAN")) return "Ketertiban & Keamanan";
  if (upper.includes("ROKOK")) return "Merokok";
  if (upper.includes("BERAT")) return "Pelanggaran Berat";
  if (upper.includes("MIGRASI")) return "Data Migrasi";
  return raw.trim();
}

/**
 * Palet warna modern untuk kategori pelanggaran
 */
const CATEGORY_COLORS = [
  { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/30", fill: "#f43f5e", bgSoft: "bg-rose-500/10" },
  { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30", fill: "#f59e0b", bgSoft: "bg-amber-500/10" },
  { bg: "bg-indigo-500", text: "text-indigo-400", border: "border-indigo-500/30", fill: "#6366f1", bgSoft: "bg-indigo-500/10" },
  { bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500/30", fill: "#a855f7", bgSoft: "bg-purple-500/10" },
  { bg: "bg-sky-500", text: "text-sky-400", border: "border-sky-500/30", fill: "#0ea5e9", bgSoft: "bg-sky-500/10" },
  { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30", fill: "#10b981", bgSoft: "bg-emerald-500/10" },
  { bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500/30", fill: "#f97316", bgSoft: "bg-orange-500/10" },
  { bg: "bg-pink-500", text: "text-pink-400", border: "border-pink-500/30", fill: "#ec4899", bgSoft: "bg-pink-500/10" },
  { bg: "bg-teal-500", text: "text-teal-400", border: "border-teal-500/30", fill: "#14b8a6", bgSoft: "bg-teal-500/10" },
  { bg: "bg-slate-500", text: "text-slate-400", border: "border-slate-500/30", fill: "#64748b", bgSoft: "bg-slate-500/10" },
];

export default function WakaAnalyticsCharts({
  attendanceRecap,
  dailyAttendance,
  violationRecap,
  classes,
  totalSiswa,
}: WakaAnalyticsChartsProps) {
  // Filter Waktu: 'all' | '30d' | '7d'
  const [timeFilter, setTimeFilter] = useState<"all" | "30d" | "7d">("all");
  const [activeAttendanceTab, setActiveAttendanceTab] = useState<"daily" | "grade">("daily");
  const [activeViolationTab, setActiveViolationTab] = useState<"category" | "topCases">("category");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Filter tanggal batas
  const cutoffDate = useMemo(() => {
    if (timeFilter === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - (timeFilter === "7d" ? 7 : 30));
    return d;
  }, [timeFilter]);

  // ==================== 1. DATA KEHADIRAN ====================
  const attendanceStats = useMemo(() => {
    let filteredDaily = dailyAttendance;
    if (cutoffDate) {
      filteredDaily = dailyAttendance.filter((a) => new Date(a.date) >= cutoffDate);
    }

    let h = 0, s = 0, i = 0, a = 0, d = 0;
    if (timeFilter === "all") {
      // Ambil dari attendanceRecap akumulatif
      attendanceRecap.forEach((r) => {
        h += r.H;
        s += r.S;
        i += r.I;
        a += r.A;
        d += r.D;
      });
    } else {
      // Hitung dari filteredDaily
      filteredDaily.forEach((item) => {
        if (item.status === "H") h++;
        else if (item.status === "S") s++;
        else if (item.status === "I") i++;
        else if (item.status === "A") a++;
        else if (item.status === "D") d++;
      });
    }

    const total = h + s + i + a + d;
    const rate = total > 0 ? Math.round((h / total) * 1000) / 10 : 100;

    // Distribusi status untuk Donut Chart
    const slices = [
      { key: "H", label: "Hadir", count: h, color: "#10b981", bg: "bg-emerald-500", text: "text-emerald-400" },
      { key: "S", label: "Sakit", count: s, color: "#f59e0b", bg: "bg-amber-500", text: "text-amber-400" },
      { key: "I", label: "Izin", count: i, color: "#0ea5e9", bg: "bg-sky-500", text: "text-sky-400" },
      { key: "A", label: "Alfa", count: a, color: "#f43f5e", bg: "bg-rose-500", text: "text-rose-400" },
      { key: "D", label: "Dispensasi", count: d, color: "#a855f7", bg: "bg-purple-500", text: "text-purple-400" },
    ].map((item) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0,
    }));

    // Tren Kehadiran per Hari (Ambil maksimal 12 hari terakhir yang ada data)
    const dailyMap: Record<string, { H: number; S: number; I: number; A: number; D: number; total: number }> = {};
    dailyAttendance.forEach((item) => {
      if (!dailyMap[item.date]) {
        dailyMap[item.date] = { H: 0, S: 0, I: 0, A: 0, D: 0, total: 0 };
      }
      if (item.status in dailyMap[item.date]) {
        dailyMap[item.date][item.status as "H" | "S" | "I" | "A" | "D"]++;
        dailyMap[item.date].total++;
      }
    });

    const sortedDates = Object.keys(dailyMap).sort();
    const recentDates = (timeFilter === "7d" ? sortedDates.slice(-7) : sortedDates.slice(-12));

    const dailyTrend = recentDates.map((dateStr) => {
      const dayData = dailyMap[dateStr];
      const dayRate = dayData.total > 0 ? Math.round((dayData.H / dayData.total) * 100) : 0;
      const dObj = new Date(`${dateStr}T12:00:00Z`);
      const dayName = dObj.toLocaleDateString("id-ID", { weekday: "short" });
      const dayNum = dObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

      return {
        dateStr,
        label: `${dayName}, ${dayNum}`,
        ...dayData,
        rate: dayRate,
      };
    });

    // Kehadiran per Jenjang Kelas (X, XI, XII)
    const gradeMap: Record<string, { H: number; total: number; students: number }> = {
      "Kelas X": { H: 0, total: 0, students: 0 },
      "Kelas XI": { H: 0, total: 0, students: 0 },
      "Kelas XII": { H: 0, total: 0, students: 0 },
    };

    attendanceRecap.forEach((r) => {
      const upper = (r.kelasNama || "").toUpperCase();
      let grade = "Kelas X";
      if (upper.startsWith("XII") || upper.startsWith("12")) grade = "Kelas XII";
      else if (upper.startsWith("XI") || upper.startsWith("11")) grade = "Kelas XI";
      else if (upper.startsWith("X") || upper.startsWith("10")) grade = "Kelas X";

      if (gradeMap[grade]) {
        gradeMap[grade].H += r.H;
        gradeMap[grade].total += r.totalHari;
        gradeMap[grade].students += 1;
      }
    });

    const gradeBreakdown = Object.entries(gradeMap).map(([gradeName, data]) => ({
      gradeName,
      students: data.students,
      rate: data.total > 0 ? Math.round((data.H / data.total) * 1000) / 10 : 100,
      totalRecord: data.total,
    }));

    return {
      h, s, i, a, d, total, rate, slices, dailyTrend, gradeBreakdown,
    };
  }, [attendanceRecap, dailyAttendance, timeFilter, cutoffDate]);

  // ==================== 2. DATA PELANGGARAN BERDASARKAN JENIS ====================
  const violationStats = useMemo(() => {
    // Filter pelanggaran sah (bukan REMISI atau PENANGANAN)
    let validList = violationRecap.filter(
      (v) => v.status === "APPROVED" && v.kategoriNama !== "REMISI" && v.kategoriNama !== "PENANGANAN"
    );

    if (cutoffDate) {
      validList = validList.filter((v) => new Date(v.tanggal) >= cutoffDate);
    }

    const totalCases = validList.length;
    const totalPoints = validList.reduce((sum, v) => sum + (v.poin || 0), 0);

    // Grouping per Kategori (Jenis)
    const catMap: Record<string, { count: number; points: number }> = {};
    validList.forEach((v) => {
      const cat = normalizeCategory(v.kategoriNama || "Lainnya");
      if (!catMap[cat]) catMap[cat] = { count: 0, points: 0 };
      catMap[cat].count += 1;
      catMap[cat].points += v.poin || 0;
    });

    const categoryList = Object.entries(catMap)
      .map(([name, data], idx) => {
        const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
        return {
          name,
          count: data.count,
          points: Math.round(data.points * 10) / 10,
          percentage: totalCases > 0 ? Math.round((data.count / totalCases) * 1000) / 10 : 0,
          color,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Max count untuk skala bar
    const maxCatCount = categoryList.length > 0 ? Math.max(...categoryList.map((c) => c.count)) : 1;

    // Top 5 Kasus Spesifik yang Paling Sering Terjadi
    const caseMap: Record<string, { count: number; points: number; category: string }> = {};
    validList.forEach((v) => {
      const name = v.violationName || "Pelanggaran Umum";
      if (!caseMap[name]) caseMap[name] = { count: 0, points: v.poin || 0, category: v.kategoriNama };
      caseMap[name].count += 1;
    });

    const topCases = Object.entries(caseMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        points: data.points,
        category: normalizeCategory(data.category),
        percentage: totalCases > 0 ? Math.round((data.count / totalCases) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCases,
      totalPoints,
      categoryList,
      maxCatCount,
      topCases,
    };
  }, [violationRecap, cutoffDate]);

  // Radius dan Keliling Lingkaran SVG untuk Donut Chart
  const radius = 62;
  const circumference = 2 * Math.PI * radius; // ~389.56

  return (
    <div className="space-y-6">
      {/* HEADER SECTION ANALISIS EKSEKUTIF */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Analisis Visual Kehadiran & Pelanggaran</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Dashboard Waka
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Grafik terpadu pemantauan tingkat kehadiran dan distribusi pelanggaran siswa berdasarkan jenisnya.
            </p>
          </div>
        </div>

        {/* Filter Rentang Waktu */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setTimeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeFilter === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Semua Data
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter("30d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeFilter === "30d"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            30 Hari
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter("7d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeFilter === "7d"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            7 Hari
          </button>
        </div>
      </div>

      {/* GRID 2 KOLOM: GRAFIK KEHADIRAN & GRAFIK PELANGGARAN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ======================================================== */}
        {/* PANEL 1: GRAFIK TERKAIT KEHADIRAN SISWA                  */}
        {/* ======================================================== */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 sm:p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Box Kehadiran */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Grafik Kehadiran Siswa</h3>
                  <p className="text-[11px] text-slate-400">Tingkat kehadiran & tren absensi harian</p>
                </div>
              </div>

              {/* Sub-tab Switcher Kehadiran */}
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveAttendanceTab("daily")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activeAttendanceTab === "daily"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Tren Harian
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAttendanceTab("grade")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activeAttendanceTab === "grade"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Per Jenjang
                </button>
              </div>
            </div>

            {/* Donut Chart & Status Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-950/60 border border-slate-800/70 p-4 rounded-xl">
              {/* SVG Donut Chart */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 160 160">
                  {/* Background Circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="#1e293b"
                    strokeWidth="14"
                    fill="transparent"
                  />
                  {/* Slices */}
                  {(() => {
                    let accumulated = 0;
                    return attendanceStats.slices.map((slice) => {
                      if (slice.percentage <= 0) return null;
                      const strokeDash = (slice.percentage / 100) * circumference;
                      const offset = -(accumulated / 100) * circumference;
                      accumulated += slice.percentage;
                      return (
                        <circle
                          key={slice.key}
                          cx="80"
                          cy="80"
                          r={radius}
                          stroke={slice.color}
                          strokeWidth="14"
                          strokeDasharray={`${strokeDash} ${circumference}`}
                          strokeDashoffset={offset}
                          fill="transparent"
                          strokeLinecap="round"
                          className="transition-all duration-500 hover:opacity-80"
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Center Stats */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {attendanceStats.rate}%
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Hadir
                  </span>
                </div>
              </div>

              {/* Status Legend Pills */}
              <div className="sm:col-span-7 grid grid-cols-2 gap-2 text-xs">
                {attendanceStats.slices.map((slice) => (
                  <div
                    key={slice.key}
                    className="p-2 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${slice.bg} shrink-0`} />
                      <span className="text-slate-300 font-medium text-[11px] truncate">{slice.label}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-bold ${slice.text} text-xs`}>{slice.percentage}%</span>
                      <span className="text-[10px] text-slate-500 block">({slice.count.toLocaleString("id-ID")})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TAB CONTENT 1: TREN KEHADIRAN HARIAN */}
            {activeAttendanceTab === "daily" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tren Tingkat Kehadiran Harian</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Persentase Siswa Hadir</span>
                </div>

                {attendanceStats.dailyTrend.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-900">
                    Belum ada riwayat absensi harian pada rentang waktu ini.
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/60 border border-slate-800/70 rounded-xl space-y-2">
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 items-end h-28 pt-2">
                      {attendanceStats.dailyTrend.map((day) => {
                        const barHeight = Math.max(12, day.rate);
                        const isHigh = day.rate >= 90;
                        const isMid = day.rate >= 75 && day.rate < 90;
                        const barColor = isHigh ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-rose-500";

                        return (
                          <div
                            key={day.dateStr}
                            className="flex flex-col items-center justify-end h-full group relative cursor-pointer"
                          >
                            {/* Hover Tooltip */}
                            <div className="pointer-events-none absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-30">
                              <div className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-[10px] font-semibold shadow-xl whitespace-nowrap">
                                <p className="font-bold text-emerald-400">{day.label}</p>
                                <p>Kehadiran: <strong className="text-white">{day.rate}%</strong></p>
                                <p className="text-[9px] text-slate-400">H: {day.H} | S: {day.S} | I: {day.I} | A: {day.A}</p>
                              </div>
                              <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45 -mt-1"></div>
                            </div>

                            {/* Percentage Label */}
                            <span className="text-[9px] font-bold text-slate-400 mb-1 group-hover:text-white">
                              {day.rate}%
                            </span>

                            {/* Vertical Bar */}
                            <div className="w-full bg-slate-800/80 rounded-t-md h-full flex items-end overflow-hidden">
                              <div
                                style={{ height: `${barHeight}%` }}
                                className={`w-full ${barColor} rounded-t-md transition-all duration-300 group-hover:brightness-125`}
                              />
                            </div>

                            {/* Date Label */}
                            <span className="text-[8px] sm:text-[9px] font-medium text-slate-500 mt-1 truncate max-w-full">
                              {day.label.split(",")[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: KEHADIRAN PER JENJANG (X, XI, XII) */}
            {activeAttendanceTab === "grade" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Perbandingan Kehadiran per Jenjang</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Semester Berjalan</span>
                </div>

                <div className="space-y-2.5">
                  {attendanceStats.gradeBreakdown.map((item, idx) => {
                    const barColor =
                      item.rate >= 90
                        ? "from-emerald-500 to-teal-500"
                        : item.rate >= 80
                        ? "from-amber-500 to-yellow-500"
                        : "from-rose-500 to-red-500";

                    return (
                      <div
                        key={item.gradeName}
                        className="p-3 bg-slate-950/60 border border-slate-800/70 rounded-xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] font-black">
                              {idx + 1}
                            </span>
                            <span>{item.gradeName}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({item.students} siswa)</span>
                          </span>
                          <span className="font-extrabold text-white text-xs">{item.rate}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, Math.max(5, item.rate))}%` }}
                            className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Total Absensi Terhimpun: <strong className="text-slate-300">{attendanceStats.total.toLocaleString("id-ID")}</strong> data</span>
            <span className="text-emerald-400 font-semibold">Terkoneksi Real-time</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PANEL 2: GRAFIK PELANGGARAN BERDASARKAN JENIS (KATEGORI) */}
        {/* ======================================================== */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 sm:p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Box Pelanggaran */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Grafik Pelanggaran Berdasarkan Jenis</h3>
                  <p className="text-[11px] text-slate-400">Distribusi kategori & akumulasi poin pelanggaran</p>
                </div>
              </div>

              {/* Sub-tab Switcher Pelanggaran */}
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveViolationTab("category")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activeViolationTab === "category"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Kategori / Jenis
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViolationTab("topCases")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activeViolationTab === "topCases"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Top Pelanggaran
                </button>
              </div>
            </div>

            {/* Total Metric Highlights */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950/60 border border-slate-800/70 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Kasus Pelanggaran</span>
                  <span className="text-lg sm:text-xl font-black text-rose-400 mt-0.5 block">
                    {violationStats.totalCases.toLocaleString("id-ID")} Kasus
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xs">
                  {violationStats.categoryList.length} Kat.
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800/70 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Akumulasi Poin</span>
                  <span className="text-lg sm:text-xl font-black text-amber-400 mt-0.5 block">
                    {violationStats.totalPoints.toLocaleString("id-ID")} Poin
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                  Pts
                </div>
              </div>
            </div>

            {/* TAB CONTENT 1: DISTRIBUSI PER KATEGORI (HORIZONTAL BAR CHART) */}
            {activeViolationTab === "category" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-rose-400" />
                    <span>Peringkat Pelanggaran Berdasarkan Jenis / Kategori</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Urut Terbanyak</span>
                </div>

                {violationStats.categoryList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-900">
                    Tidak ada catatan pelanggaran pada rentang waktu ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {violationStats.categoryList.map((cat, idx) => {
                      const barWidth = Math.max(8, Math.round((cat.count / violationStats.maxCatCount) * 100));

                      return (
                        <div
                          key={cat.name}
                          className="p-2.5 bg-slate-950/60 border border-slate-800/70 rounded-xl space-y-1.5 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-2 truncate pr-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${cat.color.bg} shrink-0`} />
                              <span className="truncate">{cat.name}</span>
                            </span>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                {cat.count} Kasus ({cat.percentage}%)
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                {cat.points} Pts
                              </span>
                            </div>
                          </div>

                          {/* Horizontal Proportional Bar */}
                          <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${barWidth}%` }}
                              className={`h-full ${cat.color.bg} rounded-full transition-all duration-500`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: TOP 5 KASUS PELANGGARAN TERBANYAK */}
            {activeViolationTab === "topCases" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Top 5 Kasus Pelanggaran Paling Sering Terjadi</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Frekuensi Terbanyak</span>
                </div>

                {violationStats.topCases.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-900">
                    Belum ada data pelanggaran spesifik.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {violationStats.topCases.map((c, idx) => (
                      <div
                        key={c.name}
                        className="p-3 bg-slate-950/60 border border-slate-800/70 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-black shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate" title={c.name}>
                              {c.name}
                            </p>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Jenis: <strong className="text-slate-300">{c.category}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 block">
                            {c.count} Kali
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5 font-semibold">
                            Bobot: {c.points} Poin
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Filter Aktif: <strong className="text-slate-300">{timeFilter === "all" ? "Seluruh Semester" : timeFilter === "30d" ? "30 Hari Terakhir" : "7 Hari Terakhir"}</strong></span>
            <span className="text-rose-400 font-semibold">Data Pelanggaran Sah</span>
          </div>
        </div>

      </div>
    </div>
  );
}
