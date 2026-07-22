"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import Link from "next/link";
import {
  Users,
  AlertTriangle,
  Clock,
  Sparkles,
  Plus,
  CalendarCheck,
  CheckSquare,
  Settings,
  Search,
  BookOpen,
  TrendingUp,
  AlertOctagon,
  UserX,
  Printer,
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowLeft,
  User,
  UserPlus,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History,
} from "lucide-react";
import { resolveSummonsAction } from "@/app/actions/kesiswaan";
import { printSingleSummons, printBulkSummons } from "@/lib/printUtils";
import { toggleCensorViolationAction } from "@/app/actions/violation";
import * as XLSX from "xlsx";

interface UserInfo {
  id: string;
  username: string;
  role: string;
  nama: string;
}

interface ActiveTA {
  id: string;
  nama: string;
  semesterAktif?: string;
  ganjilMulai?: Date | string | null;
  ganjilSelesai?: Date | string | null;
  genapMulai?: Date | string | null;
  genapSelesai?: Date | string | null;
}

const formatDate = (dateVal: Date | string | null | undefined) => {
  if (!dateVal) return "";
  const dateObj = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  return dateObj.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

interface ClassOption {
  id: string;
  nama: string;
}

interface StatInfo {
  totalSiswa: number;
  attendanceRate: number | string;
  violationsMonthCount: number;
  threatStudentsCount: number;
}

interface StudentRanking {
  id: string;
  nama: string;
  nis: string;
  kelas: string;
  points: number;
}

interface AttendanceRecapItem {
  studentId: string;
  nama: string;
  nis: string;
  kelasNama: string;
  H: number;
  S: number;
  I: number;
  A: number;
  D: number;
  totalHari: number;
}

interface ViolationRecapItem {
  id: string;
  studentName: string;
  studentNis: string;
  kelasNama: string;
  violationName: string;
  kategoriNama: string;
  poin: number;
  tanggal: string;
  status: string;
  pelaporName: string;
  notes: string | null;
  isCensored: boolean;
}

interface DailyAttendanceItem {
  studentId: string;
  date: string;
  status: string;
}

interface TopAbsentClassItem {
  nama: string;
  count: number;
}

interface TopAlphaStudentItem {
  nama: string;
  nis: string;
  kelas: string;
  count: number;
}

interface TopViolationClassItem {
  nama: string;
  count: number;
}

interface HolidayItem {
  date: string;
  keterangan: string;
}

export interface SummonsItem {
  id: string;
  studentId: string;
  nama: string;
  nis: string;
  kelas: string;
  points: number;
  thresholdPoints: number;
  level: number;
  status: string;
  bkNama?: string | null;
  bkNip?: string | null;
  type?: "POIN" | "ALFA";
  alphaCount?: number;
}

export interface Thresholds {
  threshold1: number;
  threshold2: number;
  threshold3: number;
}

interface ReferralSummaryItem {
  id: string;
  siswaId: string;
  studentName: string;
  studentNis: string;
  kelasNama: string;
  pembuatNama: string;
  pembuatRole: string;
  kategori: string;
  deskripsi: string;
  status: string;
  tanggal: Date;
}

interface TodayScheduleItem {
  id: string;
  kelasNama: string;
  mapelNama: string;
  hari: number;
  jamMulai: number;
  jamSelesai: number;
  filled: boolean;
}

interface PeriodItem {
  id: string;
  hariTipe: string;
  jamKe: number;
  waktuMulai: string;
  waktuSelesai: string;
  isIstirahat: boolean;
  keterangan: string | null;
}

interface ClassNotSubmitted {
  id: string;
  nama: string;
  walasNama: string;
}

interface DashboardClientProps {
  user: UserInfo;
  activeTA: ActiveTA | null;
  wakaUser?: { nama: string; nip: string | null } | null;
  classes: ClassOption[];
  stats: StatInfo;
  studentRankings: StudentRanking[];
  attendanceRecap: AttendanceRecapItem[];
  violationRecap: ViolationRecapItem[];
  dailyAttendance: DailyAttendanceItem[];
  holidays: HolidayItem[];
  topAbsentClasses: TopAbsentClassItem[];
  topAlphaStudents: TopAlphaStudentItem[];
  topViolationClasses: TopViolationClassItem[];
  summonsList: SummonsItem[];
  thresholds: Thresholds;
  settings: Record<string, string>;
  pendingReferrals?: ReferralSummaryItem[];
  todaySchedules?: TodayScheduleItem[];
  periods?: PeriodItem[];
  classesNotSubmittedToday?: ClassNotSubmitted[];
  unsubmittedPastDates?: Array<{
    dateStr: string;
    formattedDate: string;
    classes: ClassNotSubmitted[];
  }>;
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

export default function DashboardClient({
  user,
  activeTA,
  wakaUser,
  classes,
  stats,
  studentRankings,
  attendanceRecap,
  violationRecap,
  dailyAttendance,
  holidays,
  topAbsentClasses,
  topAlphaStudents,
  topViolationClasses,
  summonsList,
  thresholds,
  settings,
  pendingReferrals = [],
  todaySchedules = [],
  periods = [],
  classesNotSubmittedToday = [],
  unsubmittedPastDates = [],
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "absen_rekap" | "pelanggaran_rekap">("summary");
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<"cumulative" | "monthly">("cumulative");

  const getTimeStringDashboard = (day: number, start: number, end: number) => {
    const HARI_MAP_LOCAL: Record<number, string> = {
      1: "Senin",
      2: "Selasa",
      3: "Rabu",
      4: "Kamis",
      5: "Jumat",
      6: "Sabtu",
    };
    const type = (HARI_MAP_LOCAL[day] || "").toUpperCase();
    const startPeriod = periods.find((p) => p.hariTipe.toUpperCase() === type && p.jamKe === start && !p.isIstirahat);
    const endPeriod = periods.find((p) => p.hariTipe.toUpperCase() === type && p.jamKe === end && !p.isIstirahat);

    if (startPeriod && endPeriod) {
      return `${startPeriod.waktuMulai} - ${endPeriod.waktuSelesai}`;
    }
    return `Jam ke-${start} s/d ${end}`;
  };

  const mergedSettings = useMemo<Record<string, string>>(() => {
    return {
      ...settings,
      waka_name: settings.waka_name || wakaUser?.nama || "",
      waka_nip: settings.waka_nip || wakaUser?.nip || "",
    };
  }, [settings, wakaUser]);

  // Helper to determine if a date is a holiday or weekend
  const getHolidayInfo = (dateStr: string) => {
    if (holidayMap.has(dateStr)) {
      return { isHoliday: true, name: holidayMap.get(dateStr)! };
    }
    const dateObj = new Date(dateStr);
    const day = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
    if (day === 6 && settings?.libur_sabtu === "true") {
      return { isHoliday: true, name: "Sabtu (Libur Akhir Pekan)" };
    }
    if (day === 0 && settings?.libur_minggu !== "false") {
      return { isHoliday: true, name: "Minggu (Libur Akhir Pekan)" };
    }
    return { isHoliday: false, name: "" };
  };

  // Censor/Blur states for taboo violations
  const [localViolationRecap, setLocalViolationRecap] = useState<ViolationRecapItem[]>(violationRecap);
  const [revealedReports, setRevealedReports] = useState<Record<string, boolean>>({});
  const [selectedStudentNis, setSelectedStudentNis] = useState<string | null>(null);
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<string>("ALL");
  const [, startTransitionCensor] = useTransition();

  useEffect(() => {
    setLocalViolationRecap(violationRecap);
  }, [violationRecap]);

  const toggleCensor = async (reportId: string, currentCensored: boolean) => {
    startTransitionCensor(async () => {
      const res = await toggleCensorViolationAction(reportId, !currentCensored);
      if (res.success) {
        setLocalViolationRecap((prev) =>
          prev.map((item) =>
            item.id === reportId ? { ...item, isCensored: !currentCensored } : item
          )
        );
      }
    });
  };

  // Summons states
  const [selectedSummonsIds, setSelectedSummonsIds] = useState<string[]>([]);

  // Print Letter states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printStudent, setPrintStudent] = useState<SummonsItem | null>(null);
  const [inputHariTanggal, setInputHariTanggal] = useState("");
  const [inputWaktu, setInputWaktu] = useState("08:00 WIB s.d Selesai");
  const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);
  const [printPaperSize, setPrintPaperSize] = useState(mergedSettings.print_paper_size || "A4");

  useEffect(() => {
    const activeIds = new Set(summonsList.map((s) => s.id));
    setSelectedSummonsIds((prev) => prev.filter((id) => activeIds.has(id)));
  }, [summonsList]);

  const handleBulkPrintSummons = () => {
    if (selectedSummonsIds.length === 0) return;
    setIsBulkPrintMode(true);
    setPrintStudent(null);
    setInputHariTanggal("");
    setInputWaktu("08:00 WIB s.d Selesai");
    setIsPrintModalOpen(true);
  };

  const handlePrintSummons = (student: SummonsItem) => {
    setPrintStudent(student);
    setIsBulkPrintMode(false);
    setInputHariTanggal("");
    setInputWaktu("08:00 WIB s.d Selesai");
    setIsPrintModalOpen(true);
  };
  
  // States for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(() => {
    return classes.length === 1 ? classes[0].nama : "";
  });
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [violationViewMode, setViolationViewMode] = useState<"summary" | "log">("summary");
  const [absenViewMode, setAbsenViewMode] = useState<"cumulative" | "monthly">("cumulative");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Pagination states for Cumulative Attendance Recap
  const [absenCurrentPage, setAbsenCurrentPage] = useState(1);
  const [absenPageSize, setAbsenPageSize] = useState(50);

  // Pagination states for Violation Akumulasi Poin
  const [violationSummaryCurrentPage, setViolationSummaryCurrentPage] = useState(1);
  const [violationSummaryPageSize, setViolationSummaryPageSize] = useState(50);

  // Pagination states for Violation Logs
  const [violationLogCurrentPage, setViolationLogCurrentPage] = useState(1);
  const [violationLogPageSize, setViolationLogPageSize] = useState(50);

  // Reset pagination pages to 1 when filters change
  useEffect(() => {
    setAbsenCurrentPage(1);
    setViolationSummaryCurrentPage(1);
    setViolationLogCurrentPage(1);
  }, [searchQuery, selectedClassId, selectedStatus, selectedMonth, selectedYear, activeTab, absenViewMode, violationViewMode]);

  // Sort states and handler for cumulative attendance recap
  const [sortField, setSortField] = useState<string>("nama");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Show all toggle states for dashboard tables
  const [showAllSummons, setShowAllSummons] = useState(false);
  const [showAllHighRisk, setShowAllHighRisk] = useState(false);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      if (field === "nama" || field === "kelasNama") {
        setSortDirection("asc");
      } else {
        setSortDirection("desc");
      }
    }
  };

  const isWakaOrBK = user.role === "WAKA" || user.role === "BK";
  const isWakaOrBKOrWalas = user.role === "WAKA" || user.role === "BK" || user.role === "WALAS";

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // Map of holidayDate -> keterangan
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach((h) => {
      map.set(h.date, h.keterangan);
    });
    return map;
  }, [holidays]);

  // Helper to get days in month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Filtered Attendance Recap
  const filteredAttendance = useMemo(() => {
    return attendanceRecap.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nis.includes(searchQuery);
      const matchClass = selectedClassId === "" || item.kelasNama === selectedClassId;
      return matchSearch && matchClass;
    });
  }, [attendanceRecap, searchQuery, selectedClassId]);

  // Sorted Attendance Recap (for Cumulative Semester view)
  const sortedAttendance = useMemo(() => {
    const sorted = [...filteredAttendance];
    sorted.sort((a, b) => {
      let valA: any = a[sortField as keyof AttendanceRecapItem];
      let valB: any = b[sortField as keyof AttendanceRecapItem];

      if (sortField === "rate") {
        valA = a.totalHari > 0 ? (a.H / a.totalHari) * 100 : 100;
        valB = b.totalHari > 0 ? (b.H / b.totalHari) * 100 : 100;
      }

      if (valA === undefined) valA = "";
      if (valB === undefined) valB = "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB, "id")
          : valB.localeCompare(valA, "id");
      } else {
        return sortDirection === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });
    return sorted;
  }, [filteredAttendance, sortField, sortDirection]);

  const paginatedAttendance = useMemo(() => {
    return sortedAttendance.slice(
      (absenCurrentPage - 1) * absenPageSize,
      absenCurrentPage * absenPageSize
    );
  }, [sortedAttendance, absenCurrentPage, absenPageSize]);

  // Map of studentId -> dateString -> status
  const attendanceMatrix = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    dailyAttendance.forEach((record) => {
      if (!map[record.studentId]) {
        map[record.studentId] = {};
      }
      map[record.studentId][record.date] = record.status;
    });
    return map;
  }, [dailyAttendance]);

  // Calculate monthly totals for filtered students
  const studentMonthlyTotals = useMemo(() => {
    const totals: Record<string, { H: number; S: number; I: number; A: number; D: number }> = {};
    
    filteredAttendance.forEach((student) => {
      totals[student.studentId] = { H: 0, S: 0, I: 0, A: 0, D: 0 };
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const status = attendanceMatrix[student.studentId]?.[dateStr];
        if (status === "H") totals[student.studentId].H++;
        else if (status === "S") totals[student.studentId].S++;
        else if (status === "I") totals[student.studentId].I++;
        else if (status === "A") totals[student.studentId].A++;
        else if (status === "D") totals[student.studentId].D++;
      }
    });
    
    return totals;
  }, [filteredAttendance, selectedMonth, selectedYear, attendanceMatrix, daysInMonth]);
  
  // Date range formatted string helper for Excel
  const dateRangeStr = useMemo(() => {
    if (!activeTA) return "";
    const isGanjil = activeTA.semesterAktif === "GANJIL";
    const startVal = isGanjil ? activeTA.ganjilMulai : activeTA.genapMulai;
    const endVal = isGanjil ? activeTA.ganjilSelesai : activeTA.genapSelesai;
    if (!startVal || !endVal) return "";
    return `${formatDate(startVal)} s.d. ${formatDate(endVal)}`;
  }, [activeTA]);

  // Excel Export: Cumulative Mode
  const exportCumulativeToExcel = async () => {
    if (filteredAttendance.length === 0) return;

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Akumulasi Kehadiran");
    const taName = activeTA ? `TA ${activeTA.nama} (${activeTA.semesterAktif})` : "";
    const rangeText = dateRangeStr ? `Periode: ${dateRangeStr}` : "";

    const schoolName = settings?.school_name || "SMK NEGERI KAWAL";
    const classText = selectedClassId === "" ? "Semua Kelas" : `Kelas ${selectedClassId}`;

    // Add Titles
    worksheet.addRow([`LAPORAN AKUMULASI KEHADIRAN SISWA - ${schoolName.toUpperCase()}`]);
    worksheet.addRow([`${taName} | ${classText}`]);
    if (rangeText) {
      worksheet.addRow([rangeText]);
    } else {
      worksheet.addRow([]);
    }
    worksheet.addRow([]); // Spacing

    // Format Title Rows
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E293B' } };
    
    const subtitleRow = worksheet.getRow(2);
    subtitleRow.getCell(1).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF64748B' } };

    if (rangeText) {
      const rangeRow = worksheet.getRow(3);
      rangeRow.getCell(1).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF64748B' } };
    }

    // Merge cells for title block
    worksheet.mergeCells('A1:K1');
    worksheet.mergeCells('A2:K2');
    if (rangeText) {
      worksheet.mergeCells('A3:K3');
    }

    // Headers
    const headers = [
      "No",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Hadir (H)",
      "Sakit (S)",
      "Izin (I)",
      "Alpha (A)",
      "Dispensasi (D)",
      "Total Hari Efektif",
      "Persentase Kehadiran (%)"
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate 800
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        right: { style: 'thin', color: { argb: 'FF475569' } }
      };
    });

    // Populate data
    filteredAttendance.forEach((item, index) => {
      const rate = item.totalHari > 0 ? Math.round((item.H / item.totalHari) * 100) : 100;
      const rowData = [
        index + 1,
        item.nis,
        item.nama,
        item.kelasNama,
        item.H,
        item.S === 0 ? "" : item.S,
        item.I === 0 ? "" : item.I,
        item.A === 0 ? "" : item.A,
        item.D === 0 ? "" : item.D,
        item.totalHari,
        `${rate}%`
      ];

      const row = worksheet.addRow(rowData);
      row.height = 22;

      const isEven = index % 2 === 0;

      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9.5 };
        
        // Alignments
        if (colNum === 1 || colNum === 2 || colNum === 4 || colNum >= 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // Zebra background fill
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } // White vs Slate 50
        };

        // Borders
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Format highlights
        if (colNum === 8 && item.A > 0) {
          // Highlight Alpha cell
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' } // Soft Red
          };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
        }

        if (colNum === 11) {
          if (rate < 85) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEE2E2' } // Soft Red
            };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
          } else if (rate >= 95) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD1FAE5' } // Soft Green
            };
            cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF065F46' } };
          }
        }
      });
    });

    // Set Column Widths
    const widths = [6, 16, 32, 12, 11, 10, 10, 10, 14, 18, 24];
    widths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Write file & trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const cleanClass = selectedClassId === "" ? "Semua_Kelas" : selectedClassId.replace(/\s+/g, "_");
    
    anchor.href = url;
    anchor.download = `Rekap_Kehadiran_Akumulasi_${cleanClass}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  // Excel Export: Monthly Matrix Mode
  const exportMonthlyMatrixToExcel = async () => {
    if (filteredAttendance.length === 0) return;

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Matriks Bulanan");

    const schoolName = settings?.school_name || "SMK NEGERI KAWAL";
    const monthLabel = INDONESIAN_MONTHS.find((m) => m.value === selectedMonth)?.label || "";
    const periodText = `Bulan: ${monthLabel} ${selectedYear}`;
    const classText = selectedClassId === "" ? "Semua Kelas" : `Kelas ${selectedClassId}`;

    // Add Titles
    worksheet.addRow([`LAPORAN MATRIKS KEHADIRAN SISWA BULANAN - ${schoolName.toUpperCase()}`]);
    worksheet.addRow([`${periodText} | ${classText}`]);
    worksheet.addRow([]); // Spacing

    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E293B' } };
    
    const subtitleRow = worksheet.getRow(2);
    subtitleRow.getCell(1).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF64748B' } };

    // Headers
    const headers = ["No", "NIS", "Nama Siswa", "Kelas"];
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(String(d));
    }
    headers.push("H", "S", "I", "A", "D", "%");

    const totalCols = headers.length;

    // Merge titles across columns
    worksheet.mergeCells(1, 1, 1, totalCols);
    worksheet.mergeCells(2, 1, 2, totalCols);

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate 800
      };
      cell.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        right: { style: 'thin', color: { argb: 'FF475569' } }
      };
    });

    // Populate data
    filteredAttendance.forEach((item, index) => {
      const totals = studentMonthlyTotals[item.studentId] || { H: 0, S: 0, I: 0, A: 0, D: 0 };
      const totalRecorded = totals.H + totals.S + totals.I + totals.A + totals.D;
      const rate = totalRecorded > 0 ? Math.round((totals.H / totalRecorded) * 100) : 100;

      const rowData: any[] = [index + 1, item.nis, item.nama, item.kelasNama];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const status = attendanceMatrix[item.studentId]?.[dateStr] || "-";
        rowData.push(status);
      }

      rowData.push(
        totals.H,
        totals.S === 0 ? "" : totals.S,
        totals.I === 0 ? "" : totals.I,
        totals.A === 0 ? "" : totals.A,
        totals.D === 0 ? "" : totals.D,
        `${rate}%`
      );

      const row = worksheet.addRow(rowData);
      row.height = 22;

      const isEven = index % 2 === 0;

      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9 };
        
        // Alignment
        if (colNum === 1 || colNum === 2 || colNum === 4 || colNum >= 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // Zebra base background
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
        };

        // Borders
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Highlight weekend columns
        if (colNum >= 5 && colNum <= 4 + daysInMonth) {
          const dayNum = colNum - 4;
          const dayOfWeek = new Date(selectedYear, selectedMonth, dayNum).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          const val = cell.value;

          if (isWeekend) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF1F5F9' } // Slate 100 weekend
            };
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF94A3B8' } };
          }

          // Render soft color highlights based on status values
          if (val === "H") {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Soft Green
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
          } else if (val === "A") {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Soft Red
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
          } else if (val === "S" || val === "I" || val === "D") {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Soft Amber/Yellow
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF92400E' } };
          }
        }

        // Summary columns (H, S, I, A, D) values formatting
        const summaryColsStart = 5 + daysInMonth;
        if (colNum >= summaryColsStart && colNum < totalCols) {
          const valStr = headers[colNum - 1]; // "H", "S", "I", "A", or "D"
          const cellVal = Number(cell.value) || 0;
          if (cellVal > 0) {
            if (valStr === "A") {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
              cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
            } else if (valStr === "H") {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
              cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
              cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF92400E' } };
            }
          }
        }

        // Percentage column rate styles
        if (colNum === totalCols) {
          const rateVal = parseInt(String(cell.value).replace("%", ""), 10) || 100;
          if (rateVal < 85) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
          } else if (rateVal >= 95) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
          }
        }
      });
    });

    // Add spacing & Legends
    worksheet.addRow([]);
    worksheet.addRow(["Keterangan Warna & Status Kehadiran:"]).getCell(1).font = { name: 'Segoe UI', size: 10, bold: true };
    
    const legends = [
      ["• H : Hadir", "Hijau Muda (Aman)"],
      ["• S : Sakit", "Kuning/Oranye Muda (Perlu Perhatian)"],
      ["• I : Izin", "Kuning/Oranye Muda (Perlu Perhatian)"],
      ["• A : Alpha (Tanpa Keterangan)", "Merah Muda (Risiko/Evaluasi)"],
      ["• D : Dispensasi", "Kuning/Oranye Muda (Perlu Perhatian)"],
      ["• - : Belum Ada Catatan / Hari Libur", "Putih (Kosong)"],
      ["• Hari Berwarna Abu-Abu", "Hari Sabtu / Minggu (Hari Libur Akhir Pekan)"]
    ];

    legends.forEach((leg) => {
      worksheet.addRow([`${leg[0]} → Warna ${leg[1]}`]);
    });

    const lastRowIdx = worksheet.rowCount;
    for (let r = lastRowIdx - legends.length + 1; r <= lastRowIdx; r++) {
      worksheet.getRow(r).getCell(1).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };
    }

    // Set Column Widths
    const widths = [6, 16, 32, 12];
    for (let d = 1; d <= daysInMonth; d++) {
      widths.push(4.5);
    }
    widths.push(6, 6, 6, 6, 6, 8);
    
    widths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Write file & trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const cleanClass = selectedClassId === "" ? "Semua_Kelas" : selectedClassId.replace(/\s+/g, "_");
    const monthName = monthLabel.replace(/\s+/g, "_");
    
    anchor.href = url;
    anchor.download = `Rekap_Kehadiran_Matriks_${monthName}_${selectedYear}_${cleanClass}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  // Grouped violation points per student
  const studentViolationSummaries = useMemo(() => {
    // violationRecap contains individual reports (and remissions). We can group by student.
    const studentMap: Record<
      string,
      {
        id: string;
        nama: string;
        nis: string;
        kelasNama: string;
        totalPoin: number;
        countApproved: number;
        countPending: number;
      }
    > = {};

    localViolationRecap.forEach((v) => {
      const key = v.studentNis;
      if (!studentMap[key]) {
        studentMap[key] = {
          id: v.id,
          nama: v.studentName,
          nis: v.studentNis,
          kelasNama: v.kelasNama,
          totalPoin: 0,
          countApproved: 0,
          countPending: 0,
        };
      }
      if (v.status === "APPROVED") {
        studentMap[key].totalPoin += v.poin;
        if (v.kategoriNama !== "REMISI" && v.kategoriNama !== "PENANGANAN") {
          studentMap[key].countApproved++;
        }
      } else if (v.status === "PENDING") {
        studentMap[key].countPending++;
      }
    });

    const result = Object.values(studentMap).map((student) => ({
      ...student,
      totalPoin: Math.max(0, student.totalPoin),
    }));

    return result.sort((a, b) => b.totalPoin - a.totalPoin);
  }, [localViolationRecap]);

  // Consolidated student risk list
  const highRiskStudents = useMemo(() => {
    // Build a map of violation points for fast lookup
    const violationPointsMap: Record<string, number> = {};
    localViolationRecap.forEach((v) => {
      if (v.status === "APPROVED") {
        violationPointsMap[v.studentNis] = (violationPointsMap[v.studentNis] || 0) + v.poin;
      }
    });

    // Build the consolidated risk array
    return attendanceRecap.map((att) => {
      const points = Math.max(0, violationPointsMap[att.nis] || 0);
      const alphaCount = att.A || 0;
      // Combined Risk Score = Points + (Alpha Count * 10)
      const riskScore = points + (alphaCount * 10);

      return {
        studentId: att.studentId,
        nama: att.nama,
        nis: att.nis,
        kelasNama: att.kelasNama,
        points,
        alphaCount,
        riskScore
      };
    })
    .filter((student) => student.points > 0 || student.alphaCount > 0) // Only show students with some risk
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5); // Top 5 high-risk students
  }, [attendanceRecap, localViolationRecap]);

  // Consolidated class risk list
  const classRiskSummaries = useMemo(() => {
    const classMap: Record<string, { nama: string; absentCount: number; violationCount: number; totalRisk: number }> = {};
    
    // Initialize or populate from topAbsentClasses
    topAbsentClasses.forEach((c) => {
      classMap[c.nama] = {
        nama: c.nama,
        absentCount: c.count,
        violationCount: 0,
        totalRisk: c.count * 5 // Weighting absent count
      };
    });

    // Populate from topViolationClasses
    topViolationClasses.forEach((c) => {
      if (!classMap[c.nama]) {
        classMap[c.nama] = {
          nama: c.nama,
          absentCount: 0,
          violationCount: c.count,
          totalRisk: c.count * 10 // Weighting violation count
        };
      } else {
        classMap[c.nama].violationCount = c.count;
        classMap[c.nama].totalRisk += c.count * 10;
      }
    });

    return Object.values(classMap)
      .sort((a, b) => b.totalRisk - a.totalRisk)
      .slice(0, 5);
  }, [topAbsentClasses, topViolationClasses]);

  // Info for currently selected student in detail view
  const selectedStudentInfo = useMemo(() => {
    if (!selectedStudentNis) return null;
    const summary = studentViolationSummaries.find((s) => s.nis === selectedStudentNis);
    const attendance = attendanceRecap.find((a) => a.nis === selectedStudentNis);
    return {
      nis: selectedStudentNis,
      id: attendance?.studentId || "",
      nama: summary?.nama || attendance?.nama || "Tidak Dikhawatirkan",
      kelasNama: summary?.kelasNama || attendance?.kelasNama || "-",
      totalPoin: summary?.totalPoin ?? 0,
      countApproved: summary?.countApproved ?? 0,
      countPending: summary?.countPending ?? 0,
      S: attendance?.S ?? 0,
      I: attendance?.I ?? 0,
      A: attendance?.A ?? 0,
      D: attendance?.D ?? 0,
    };
  }, [selectedStudentNis, studentViolationSummaries, attendanceRecap]);

  // Logs for currently selected student in detail view
  const selectedStudentLogs = useMemo(() => {
    if (!selectedStudentNis) return [];
    return localViolationRecap
      .filter((log) => log.studentNis === selectedStudentNis)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [selectedStudentNis, localViolationRecap]);

  // Filtered student violation summary
  const filteredViolationSummaries = useMemo(() => {
    return studentViolationSummaries.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nis.includes(searchQuery);
      const matchClass = selectedClassId === "" || item.kelasNama === selectedClassId;
      return matchSearch && matchClass;
    });
  }, [studentViolationSummaries, searchQuery, selectedClassId]);

  // Sort state for violation summary table
  const [violationSortField, setViolationSortField] = useState<string>("totalPoin");
  const [violationSortDirection, setViolationSortDirection] = useState<"asc" | "desc">("desc");

  const handleViolationSort = (field: string) => {
    if (violationSortField === field) {
      setViolationSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setViolationSortField(field);
      setViolationSortDirection(field === "nama" || field === "kelasNama" ? "asc" : "desc");
    }
  };

  const sortedViolationSummaries = useMemo(() => {
    const sorted = [...filteredViolationSummaries];
    sorted.sort((a, b) => {
      const valA = a[violationSortField as keyof typeof a] ?? "";
      const valB = b[violationSortField as keyof typeof b] ?? "";
      if (typeof valA === "string" && typeof valB === "string") {
        return violationSortDirection === "asc"
          ? valA.localeCompare(valB, "id")
          : valB.localeCompare(valA, "id");
      }
      return violationSortDirection === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });
    return sorted;
  }, [filteredViolationSummaries, violationSortField, violationSortDirection]);

  // Filtered detailed violation logs
  const filteredViolationLogs = useMemo(() => {
    return localViolationRecap.filter((item) => {
      const matchSearch =
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentNis.includes(searchQuery) ||
        item.violationName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = selectedClassId === "" || item.kelasNama === selectedClassId;
      const matchStatus = selectedStatus === "ALL" || item.status === selectedStatus;
      return matchSearch && matchClass && matchStatus;
    });
  }, [localViolationRecap, searchQuery, selectedClassId, selectedStatus]);

  const paginatedViolationSummaries = useMemo(() => {
    return sortedViolationSummaries.slice(
      (violationSummaryCurrentPage - 1) * violationSummaryPageSize,
      violationSummaryCurrentPage * violationSummaryPageSize
    );
  }, [sortedViolationSummaries, violationSummaryCurrentPage, violationSummaryPageSize]);

  const paginatedViolationLogs = useMemo(() => {
    return filteredViolationLogs.slice(
      (violationLogCurrentPage - 1) * violationLogPageSize,
      violationLogCurrentPage * violationLogPageSize
    );
  }, [filteredViolationLogs, violationLogCurrentPage, violationLogPageSize]);

  const statusColors = {
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  const statusLabels = {
    APPROVED: "Disetujui",
    PENDING: "Menunggu",
    REJECTED: "Ditolak",
  };

  const renderDashboardPagination = (
    currentPage: number,
    pageSize: number,
    totalItems: number,
    setCurrentPage: (p: number) => void,
    setPageSize: (s: number) => void
  ) => {
    if (totalItems <= 50 && pageSize === 50) return null;

    const totalPages = Math.ceil(totalItems / pageSize);
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-900/60 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Tampilkan:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="py-1 px-2 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-xs"
          >
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
            <option value={500}>500 Baris</option>
          </select>
          <span>
            Menampilkan {startItem}-{endItem} dari {totalItems} data
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-semibold"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 font-semibold text-slate-300">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-semibold"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <SidebarLayout user={user}>
      {/* Welcome Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
            Selamat Datang, {user.nama}
          </h1>
          <p className="mt-1 text-sm text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Tahun Ajaran Aktif:</span>
            <span className="text-emerald-400 font-semibold">{activeTA?.nama || "Belum Aktif"}</span>
            {activeTA && (
              <>
                <span className="text-slate-600">|</span>
                <span>Semester Aktif:</span>
                <span className="text-emerald-400 font-semibold">{activeTA.semesterAktif}</span>
                {(() => {
                  const isGanjil = activeTA.semesterAktif === "GANJIL";
                  const start = isGanjil ? activeTA.ganjilMulai : activeTA.genapMulai;
                  const end = isGanjil ? activeTA.ganjilSelesai : activeTA.genapSelesai;
                  if (start || end) {
                    return (
                      <span className="text-xs text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800">
                        {start ? formatDate(start) : "Mulai ?"} s/d {end ? formatDate(end) : "Selesai ?"}
                      </span>
                    );
                  }
                  return null;
                })()}
              </>
            )}
            {user.role === "WALAS" && (
              <>
                <span className="text-slate-600">|</span>
                <span>Wali Kelas terdaftar</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Alert Absensi Belum Diisi Tanggal-Tanggal Sebelumnya */}
      {unsubmittedPastDates.length > 0 && (
        <div className="space-y-3 mb-4">
          {unsubmittedPastDates.map((pastItem) => (
            <div
              key={pastItem.dateStr}
              className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4 text-amber-300 animate-fade-in"
            >
              <AlertOctagon className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-amber-300">
                    Pemberitahuan Absensi {pastItem.formattedDate}
                  </h4>
                  <span className="text-[11px] font-bold text-amber-400/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    {pastItem.classes.length} kelas belum input absensi
                  </span>
                </div>
                {user.role === "WALAS" ? (
                  <div className="text-xs text-amber-300 leading-relaxed pt-1">
                    Kelas Anda (<strong className="text-white font-bold">{pastItem.classes[0].nama}</strong>) belum melakukan pencatatan absensi harian pada tanggal ini.
                    Silakan segera catat absensi kelas di menu{" "}
                    <Link href={`/absensi?classId=${pastItem.classes[0].id}&date=${pastItem.dateStr}`} className="underline hover:text-white font-bold transition-all">
                      Catat Absensi
                    </Link>.
                  </div>
                ) : (
                  <div className="text-xs text-amber-300 leading-relaxed space-y-1.5 pt-1">
                    <p>
                      Terdapat <strong className="text-white font-bold">{pastItem.classes.length} kelas</strong> {user.role === "BK" ? "binaan Anda " : ""}yang belum melakukan pencatatan absensi harian pada <strong className="text-white font-bold">{pastItem.formattedDate}</strong>:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {pastItem.classes.map((c) => (
                        <Link
                          key={c.id}
                          href={`/absensi?classId=${c.id}&date=${pastItem.dateStr}`}
                          className="px-2.5 py-1 bg-slate-950/80 border border-amber-500/30 hover:border-amber-500/50 hover:bg-slate-950 rounded-lg text-[10px] font-bold text-amber-300 flex items-center gap-1.5 transition-all cursor-pointer"
                          title={`Klik untuk mengisi absensi kelas ${c.nama} tanggal ${pastItem.formattedDate}`}
                        >
                          <span className="bg-amber-500 text-slate-950 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold font-mono shrink-0">!</span>
                          <span>{c.nama}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert Absensi Belum Diisi Hari Ini */}
      {classesNotSubmittedToday.length > 0 && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4 text-amber-300 animate-fade-in">
          <AlertOctagon className="w-5 h-5 mt-0.5 shrink-0 text-amber-300" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-300">Pemberitahuan Absensi Hari Ini</h4>
            {user.role === "WALAS" ? (
              <div className="text-xs text-amber-300 leading-relaxed">
                Kelas Anda (<strong className="text-white font-bold">{classesNotSubmittedToday[0].nama}</strong>) belum melakukan pencatatan absensi harian untuk hari ini.
                Silakan segera catat absensi kelas Anda di menu <Link href="/absensi" className="underline hover:text-white font-bold transition-all">Catat Absensi</Link>.
              </div>
            ) : (
              <div className="text-xs text-amber-300 leading-relaxed space-y-1.5">
                <p>
                  Terdapat <strong className="text-white font-bold">{classesNotSubmittedToday.length} kelas</strong> {user.role === "BK" ? "binaan Anda " : ""}yang belum melakukan pencatatan absensi harian hari ini:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {classesNotSubmittedToday.map((c) => (
                    <Link
                      key={c.id}
                      href={`/absensi?classId=${c.id}`}
                      className="px-2.5 py-1 bg-slate-950/80 border border-amber-500/30 hover:border-amber-500/50 hover:bg-slate-950 rounded-lg text-[10px] font-bold text-amber-300 flex items-center gap-1.5 transition-all cursor-pointer"
                      title={`Klik untuk mengisi absensi kelas ${c.nama}`}
                    >
                      <span className="bg-amber-500 text-slate-950 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold font-mono shrink-0">!</span>
                      <span>{c.nama}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-900 mb-8 gap-4 overflow-x-auto pb-px">
        <button
          onClick={() => {
            setActiveTab("summary");
            setSearchQuery("");
            setSelectedClassId("");
          }}
          className={`pb-4 px-1 text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === "summary"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Ringkasan
        </button>
        {isWakaOrBKOrWalas && (
          <>
            <button
              onClick={() => {
                setActiveTab("absen_rekap");
                setSearchQuery("");
                setSelectedClassId(classes.length === 1 ? classes[0].nama : "");
              }}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 transition-all shrink-0 ${
                activeTab === "absen_rekap"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Rekap Absensi
            </button>
            <button
              onClick={() => {
                setActiveTab("pelanggaran_rekap");
                setSearchQuery("");
                setSelectedClassId(classes.length === 1 ? classes[0].nama : "");
              }}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 transition-all shrink-0 ${
                activeTab === "pelanggaran_rekap"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Rekap Pelanggaran
            </button>
          </>
        )}
      </div>

      {/* 1. Tab Summary & Statistics */}
      {activeTab === "summary" && (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card Total Siswa */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex items-center gap-5">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/10">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Siswa Aktif</p>
                <p className="text-2xl font-semibold text-white mt-1">{stats.totalSiswa}</p>
              </div>
            </div>

            {/* Card Persentase Kehadiran */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex items-center gap-5">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
                <Clock className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Kehadiran (Hari Ini)</p>
                <p className={`font-semibold text-white mt-1 ${typeof stats.attendanceRate === "number" ? "text-2xl" : "text-lg"}`}>
                  {typeof stats.attendanceRate === "number" ? `${stats.attendanceRate}%` : stats.attendanceRate}
                </p>
              </div>
            </div>

            {/* Card Pelanggaran Bulan Ini */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex items-center gap-5">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/10">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Pelanggaran (30 Hari Terakhir)</p>
                <p className="text-2xl font-semibold text-white mt-1">{stats.violationsMonthCount}</p>
              </div>
            </div>

            {/* Card Siswa Terancam */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex items-center gap-5">
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/10">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Siswa Terancam (&ge;50 Poin)</p>
                <p className="text-2xl font-semibold text-white mt-1">{stats.threatStudentsCount}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left/Middle Column (lg:col-span-2) */}
            <div className="space-y-8 lg:col-span-2">
              {/* Jadwal Hari Ini (Guru & Walas Only) */}
              {(user.role === "GURU" || user.role === "WALAS") && (
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-indigo-400" />
                      Jadwal Mengajar Hari Ini
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Agenda kelas Anda hari ini. Klik tombol isi jurnal untuk melaporkan kegiatan pembelajaran.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {todaySchedules.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-slate-500 bg-slate-950/20 border border-slate-900 rounded-2xl">
                        Tidak ada agenda mengajar untuk Anda hari ini.
                      </div>
                    ) : (
                      todaySchedules.map((sched) => {
                        return (
                          <div
                            key={sched.id}
                            className={`p-4 rounded-xl border flex flex-col justify-between min-h-[140px] ${
                              sched.filled
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-slate-950/40 border-slate-800"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/20">
                                  Kelas {sched.kelasNama}
                                </span>
                                <span
                                  className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                    sched.filled
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  }`}
                                >
                                  {sched.filled ? "Selesai" : "Belum Diisi"}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white leading-tight mb-1">{sched.mapelNama}</h4>
                              <div className="text-slate-400 text-xs flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{getTimeStringDashboard(sched.hari, sched.jamMulai, sched.jamSelesai)}</span>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-800/50 mt-3">
                              {sched.filled ? (
                                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Jurnal terlaporkan
                                </span>
                              ) : (
                                <Link
                                  href={`/jadwal/jurnal/isi?jadwalId=${sched.id}`}
                                  className="w-full inline-flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-all"
                                >
                                  Isi Jurnal Mengajar
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              {/* Peringatan & Pemanggilan Section */}
              {isWakaOrBK && (
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      Peringatan & Pemanggilan
                    </h3>
                  </div>
                  {summonsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">Semua Siswa Kondusif</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Tidak ada siswa dengan akumulasi poin pelanggaran yang melebihi batas aktif saat ini.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
                      <table className="min-w-[600px] w-full divide-y divide-slate-800">
                        <thead className="bg-slate-900/60">
                          <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">Siswa</th>
                            <th className="py-3 px-4">Kelas</th>
                            <th className="py-3 px-4 text-center">Poin / Alfa</th>
                            <th className="py-3 px-4 text-center">Peringatan</th>
                            {isWakaOrBK && <th className="py-3 px-4 text-right">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {(showAllSummons ? summonsList : summonsList.slice(0, 10)).map((summons) => (
                            <tr key={summons.id} className="text-sm">
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedStudentNis(summons.nis)}
                                  className="font-semibold text-white hover:text-rose-400 transition-colors text-left focus:outline-none"
                                >
                                  {summons.nama}
                                </button>
                                <div className="text-xs text-slate-400 font-mono">NIS: {summons.nis}</div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">{summons.kelas}</td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    summons.type === "ALFA"
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      : summons.points >= 50
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}
                                >
                                  {summons.type === "ALFA" ? `${summons.alphaCount} Alfa` : `${summons.points} Poin`}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <div className="relative group inline-block">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold cursor-help ${
                                    summons.level === 3 
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                      : summons.level === 2 
                                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}>
                                    {summons.level === 3 ? "Ketiga" : summons.level === 2 ? "Kedua" : "Pertama"}
                                  </span>
                                  {/* Policy Action Tooltip */}
                                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 z-30 font-medium leading-relaxed">
                                    <p className="font-bold text-white mb-1">
                                      Kebijakan Pemanggilan {summons.type === "ALFA" ? "Alfa" : "Poin"} {summons.level === 3 ? "Ketiga" : summons.level === 2 ? "Kedua" : "Pertama"}
                                    </p>
                                    {summons.type === "ALFA" ? (
                                      <>
                                        {summons.level === 1 && <p>Ketidakhadiran alfa berlebih (Teguran I). Bimbingan konseling pertama & peringatan wali kelas.</p>}
                                        {summons.level === 2 && <p>Ketidakhadiran alfa kritis (Teguran II). Pemanggilan orang tua ke sekolah & surat perjanjian kehadiran.</p>}
                                        {summons.level === 3 && <p>Batas ketidakhadiran alfa maksimal (Teguran III). Konferensi kasus dengan kepala sekolah/komite & skorsing.</p>}
                                      </>
                                    ) : (
                                      <>
                                        {summons.level === 1 && <p>Batas awal pembinaan (Teguran I). Bimbingan konseling pertama & penerbitan surat binaan khusus.</p>}
                                        {summons.level === 2 && <p>Batas pembinaan menengah (Teguran II). Pemanggilan orang tua wajib & penyusunan surat perjanjian tertulis.</p>}
                                        {summons.level === 3 && <p>Batas pembinaan kritis (Teguran III). Pertemuan berkala komite sekolah, evaluasi status murid & skorsing.</p>}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {isWakaOrBK && (
                                <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                  {summons.status === "SELESAI" ? (
                                    <span 
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                      title="Selesai / Tertangani"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handlePrintSummons(summons)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 transition-all cursor-pointer"
                                        title="Cetak Surat Panggilan"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                      <Link
                                        href={`/penanganan?studentId=${summons.studentId}&thresholdPoints=${summons.thresholdPoints}`}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-300 transition-all cursor-pointer"
                                        title="Catat Penanganan Siswa"
                                      >
                                        <BookOpen className="w-3.5 h-3.5" />
                                      </Link>
                                    </>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {summonsList.length > 10 && (
                    <div className="text-center pt-4 border-t border-slate-800/60 mt-4">
                      <button
                        onClick={() => setShowAllSummons(!showAllSummons)}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        {showAllSummons ? "Tampilkan Lebih Sedikit (Maks 10)" : `Lihat Semua (${summonsList.length} Siswa) »`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Rujukan BK Menunggu Tindak Lanjut (BK/Waka Only) */}
              {isWakaOrBK && pendingReferrals && pendingReferrals.length > 0 && (
                <div className="bg-slate-900/40 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-indigo-500/20">
                    Rujukan Baru
                  </div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-400" />
                    Rujukan Siswa Menunggu Tindak Lanjut ({pendingReferrals.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingReferrals.slice(0, 3).map((ref) => (
                      <div key={ref.id} className="p-3 bg-slate-950/50 border border-slate-900 rounded-xl flex items-center justify-between gap-4 text-sm">
                        <div className="space-y-1">
                          <span className="font-semibold text-white">{ref.studentName}</span>
                          <span className="text-slate-400 text-xs ml-2">({ref.kelasNama})</span>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            Dirujuk oleh <strong className="text-slate-300">{ref.pembuatNama}</strong>: {ref.deskripsi}
                          </p>
                        </div>
                        <Link
                          href="/rujukan"
                          className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/20 transition-all shrink-0"
                        >
                          Tindak Lanjuti
                        </Link>
                      </div>
                    ))}
                    {pendingReferrals.length > 3 && (
                      <div className="text-right">
                        <Link href="/rujukan" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                          Lihat semua rujukan &raquo;
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Siswa Berisiko Tinggi Section (Consolidated) */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  Siswa Berisiko Tinggi
                </h3>
                {highRiskStudents.length === 0 ? (
                  <p className="text-slate-500 text-sm">Tidak ada siswa berisiko terdeteksi saat ini.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
                    <table className="min-w-[600px] w-full divide-y divide-slate-800">
                      <thead className="bg-slate-900/60">
                        <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Siswa</th>
                          <th className="py-3 px-4">Kelas</th>
                          <th className="py-3 px-4 text-center">Akumulasi Poin</th>
                          <th className="py-3 px-4 text-center">Jumlah Alfa</th>
                          <th className="py-3 px-4 text-right">Tingkat Risiko</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(showAllHighRisk ? highRiskStudents : highRiskStudents.slice(0, 10)).map((student) => (
                          <tr key={student.studentId} className="text-sm">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-white">{student.nama}</div>
                              <div className="text-xs text-slate-400 font-mono">NIS: {student.nis}</div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">{student.kelasNama}</td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  student.points >= 50
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : student.points >= 20
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {student.points} Poin
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  student.alphaCount >= 3
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : student.alphaCount >= 1
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {student.alphaCount} Hari
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ${
                                  student.riskScore >= 50
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : student.riskScore >= 20
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                                }`}
                              >
                                {student.riskScore >= 50 ? "Tinggi" : student.riskScore >= 20 ? "Sedang" : "Rendah"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {highRiskStudents.length > 10 && (
                  <div className="text-center pt-4 border-t border-slate-800/60 mt-4">
                    <button
                      onClick={() => setShowAllHighRisk(!showAllHighRisk)}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      {showAllHighRisk ? "Tampilkan Lebih Sedikit (Maks 10)" : `Lihat Semua (${highRiskStudents.length} Siswa) »`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (lg:col-span-1) */}
            <div className="space-y-6">
              {/* Quick Actions Panel */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Aksi Cepat</h3>
                <div className="space-y-3">
                  {user.role === "WAKA" && (
                    <Link
                      href="/kesiswaan"
                      className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 text-sm font-semibold rounded-xl transition-all"
                    >
                      <Settings className="w-5 h-5 shrink-0" />
                      Manajemen Kesiswaan
                    </Link>
                  )}
                  {user.role === "BK" && (
                    <>
                      <Link
                        href="/absensi"
                        className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-300 text-sm font-semibold rounded-xl transition-all"
                      >
                        <CalendarCheck className="w-5 h-5 shrink-0" />
                        Catat Absensi Kelas
                      </Link>
                      <Link
                        href="/approval"
                        className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-300 text-sm font-semibold rounded-xl transition-all"
                      >
                        <CheckSquare className="w-5 h-5 shrink-0" />
                        Persetujuan Pelanggaran
                      </Link>
                    </>
                  )}
                  <Link
                    href="/pelanggaran"
                    className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 text-sm font-semibold rounded-xl transition-all"
                  >
                    <Plus className="w-5 h-5 shrink-0" />
                    Laporkan Pelanggaran
                  </Link>
                </div>
              </div>

              {/* Analisis Risiko Kelas Section (Consolidated) */}
              {isWakaOrBK && (
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    Analisis Risiko Kelas
                  </h3>
                  {classRiskSummaries.length === 0 ? (
                    <p className="text-slate-500 text-sm">Belum ada data risiko kelas.</p>
                  ) : (
                    <div className="space-y-4">
                      {classRiskSummaries.map((item, idx) => (
                        <div key={`${item.nama}-${idx}`} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-white text-sm">{item.nama}</span>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                item.totalRisk >= 35
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : item.totalRisk >= 15
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {item.totalRisk >= 35 ? "Tinggi" : item.totalRisk >= 15 ? "Sedang" : "Rendah"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-semibold">
                            <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                              Absen Hari Ini: <span className="text-indigo-400 font-bold">{item.absentCount}</span>
                            </span>
                            <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                              Kasus Pelanggaran: <span className="text-rose-400 font-bold">{item.violationCount}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Tab Rekap Absensi Siswa */}
      {activeTab === "absen_rekap" && isWakaOrBKOrWalas && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-xl animate-fade-in space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* View mode toggle & title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-400" />
                  Rekapitulasi Kehadiran Siswa
                </h3>

                {/* View mode toggle */}
                <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 w-fit">
                  <button
                    onClick={() => {
                      setAbsenViewMode("cumulative");
                      setSearchQuery("");
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      absenViewMode === "cumulative"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Kumulatif (Semester)
                  </button>
                  <button
                    onClick={() => {
                      setAbsenViewMode("monthly");
                      setSearchQuery("");
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      absenViewMode === "monthly"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Matriks Bulanan
                  </button>
                </div>
              </div>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 lg:justify-end">
              {/* Export Button */}
              <div className="flex items-center shrink-0">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 border border-slate-800 rounded-xl bg-slate-950 hover:bg-slate-900 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                  title="Pilih tipe ekspor Excel (.xlsx)"
                >
                  <Upload className="w-3.5 h-3.5 rotate-180 text-emerald-400" />
                  <span>Ekspor Excel</span>
                </button>
              </div>

              {/* Vertical line divider (hidden on mobile, visible on tablet/desktop) */}
              <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>

              {/* Input Cari */}
              <div className="relative rounded-xl w-full sm:w-60">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Cari siswa atau NIS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 sm:py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filter Kelas */}
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="py-2 sm:py-1.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-36"
              >
                <option value="">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.nama}>
                    {c.nama}
                  </option>
                ))}
              </select>

              {/* Combined Dropdown for Month and Year (Only in Monthly Matrix mode) */}
              {absenViewMode === "monthly" && (
                <select
                  value={`${selectedMonth}-${selectedYear}`}
                  onChange={(e) => {
                    const [m, y] = e.target.value.split("-").map(Number);
                    setSelectedMonth(m);
                    setSelectedYear(y);
                  }}
                  className="py-2 sm:py-1.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-44"
                >
                  {years.flatMap((y) =>
                    INDONESIAN_MONTHS.map((m) => (
                      <option key={`${m.value}-${y}`} value={`${m.value}-${y}`}>
                        {m.label} {y}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>

          {/* Render Cumulative Mode */}
          {absenViewMode === "cumulative" && (
            <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
              <table className="min-w-[750px] w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/60">
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th
                      onClick={() => handleSort("nama")}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-all whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        Siswa
                        {sortField === "nama" ? (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("kelasNama")}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-all whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        Kelas
                        {sortField === "kelasNama" ? (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("H")}
                      className="py-3 px-3 cursor-pointer hover:text-white transition-all text-center whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Hadir
                        {sortField === "H" ? (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("S")}
                      className="py-3 px-3 cursor-pointer hover:text-white transition-all text-center whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Sakit
                        {sortField === "S" ? (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("I")}
                      className="py-3 px-3 cursor-pointer hover:text-white transition-all text-center whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Izin
                        {sortField === "I" ? (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("A")}
                      className="py-3 px-3 cursor-pointer hover:text-white transition-all text-center whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Alpha
                        {sortField === "A" ? (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("D")}
                      className="py-3 px-3 cursor-pointer hover:text-white transition-all text-center whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Disp
                        {sortField === "D" ? (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("rate")}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-all text-center whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Persentase
                        {sortField === "rate" ? (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sortedAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-20 text-slate-500 text-sm">
                        Tidak ada data rekapitulasi absensi siswa.
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendance.map((item, index) => {
                      const absoluteIndex = (absenCurrentPage - 1) * absenPageSize + index + 1;
                      const rate =
                        item.totalHari > 0 ? Math.round((item.H / item.totalHari) * 100) : 100;
                      return (
                        <tr key={item.studentId} className="text-sm">
                          <td className="py-3.5 px-3 text-slate-500 font-medium text-center whitespace-nowrap">{absoluteIndex}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-white">{item.nama}</div>
                            <div className="text-xs text-slate-400 font-mono">NIS: {item.nis}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">{item.kelasNama}</td>
                          <td className="py-3.5 px-3 text-center text-emerald-400 font-bold whitespace-nowrap">{item.H}</td>
                          <td className="py-3.5 px-3 text-center text-amber-400 font-bold whitespace-nowrap">{item.S === 0 ? "-" : item.S}</td>
                          <td className="py-3.5 px-3 text-center text-sky-400 font-bold whitespace-nowrap">{item.I === 0 ? "-" : item.I}</td>
                          <td className="py-3.5 px-3 text-center text-rose-400 font-bold whitespace-nowrap">{item.A === 0 ? "-" : item.A}</td>
                          <td className="py-3.5 px-3 text-center text-purple-400 font-bold whitespace-nowrap">{item.D === 0 ? "-" : item.D}</td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                rate >= 90
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : rate >= 80
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {rate}% ({item.totalHari} Hari)
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {renderDashboardPagination(
                absenCurrentPage,
                absenPageSize,
                sortedAttendance.length,
                setAbsenCurrentPage,
                setAbsenPageSize
              )}
            </div>
          )}

          {/* Render Monthly Matrix Mode */}
          {absenViewMode === "monthly" && (
            selectedClassId === "" ? (
              <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">Pilih Kelas Terlebih Dahulu</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Silakan pilih kelas pada filter di atas untuk memuat data rekap matriks kehadiran bulanan siswa.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
                  <table className="divide-y divide-slate-800 border-collapse min-w-max">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/60">
                        {/* Sticky headers */}
                        <th className="py-3 px-3 w-12 sticky left-0 z-20 bg-slate-950 border-r border-slate-800/80 text-center">No</th>
                        <th className="py-3 px-4 w-44 sm:w-52 sticky left-12 z-20 bg-slate-950 border-r border-slate-800/80">Siswa</th>
                        
                        {/* Day columns */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const { isHoliday, name: holidayName } = getHolidayInfo(dateStr);
                          return (
                            <th
                              key={d}
                              title={isHoliday ? `Libur: ${holidayName}` : undefined}
                              className={`py-3 text-center w-10 text-[10px] font-bold min-w-[2.5rem] border-r border-slate-800/40 relative group/th ${
                                isHoliday ? "text-rose-400 bg-rose-950/20" : ""
                              }`}
                            >
                              {d}
                              {isHoliday && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-400" />
                              )}
                              
                              {/* Holiday Tooltip */}
                              {isHoliday && (
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/th:block w-40 p-2 text-[10px] bg-slate-900 border border-slate-800 rounded-lg text-rose-300 normal-case z-30 font-medium">
                                  {holidayName}
                                </span>
                              )}
                            </th>
                          );
                        })}
                        
                        {/* Totals headers */}
                        <th className="py-3 text-center w-10 min-w-[2.5rem] text-emerald-400 border-l border-slate-800 font-bold">H</th>
                        <th className="py-3 text-center w-10 min-w-[2.5rem] text-amber-400 border-l border-slate-800/40 font-bold">S</th>
                        <th className="py-3 text-center w-10 min-w-[2.5rem] text-sky-400 border-l border-slate-800/40 font-bold">I</th>
                        <th className="py-3 text-center w-10 min-w-[2.5rem] text-rose-400 border-l border-slate-800/40 font-bold">A</th>
                        <th className="py-3 text-center w-10 min-w-[2.5rem] text-purple-400 border-l border-slate-800/40 font-bold">D</th>
                        <th className="py-3 text-center w-20 min-w-[5rem] text-indigo-400 border-l border-slate-800 font-bold">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={daysInMonth + 7} className="text-center py-20 text-slate-500 text-sm">
                            Tidak ada data rekapitulasi absensi untuk kelas ini.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map((item, index) => {
                          const totals = studentMonthlyTotals[item.studentId] || { H: 0, S: 0, I: 0, A: 0, D: 0 };
                          return (
                            <tr key={item.studentId} className="text-sm hover:bg-slate-900/20 group">
                              {/* Sticky column cells */}
                              <td className="py-3 px-3 sticky left-0 z-10 bg-slate-950 text-center font-medium text-slate-500 border-r border-slate-800/80 group-hover:bg-slate-900 transition-colors">
                                {index + 1}
                              </td>
                              <td className="py-3 px-4 sticky left-12 z-10 bg-slate-950 border-r border-slate-800/80 group-hover:bg-slate-900 transition-colors">
                                <div className="font-semibold text-white truncate max-w-[10rem] sm:max-w-[12rem]">{item.nama}</div>
                                <div className="text-[10px] text-slate-400 font-mono">NIS: {item.nis}</div>
                              </td>
                              
                              {/* Day cells */}
                              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                                const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                                const status = attendanceMatrix[item.studentId]?.[dateStr] || "-";
                                const { isHoliday } = getHolidayInfo(dateStr);
                                return (
                                  <td
                                    key={d}
                                    className={`py-3 text-center border-r border-slate-800/40 relative ${
                                      isHoliday ? "bg-rose-500/5" : ""
                                    }`}
                                  >
                                    {status === "H" && (
                                      <span className="text-emerald-400 font-extrabold text-base select-none leading-none">•</span>
                                    )}
                                    {status === "S" && (
                                      <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold select-none">
                                        S
                                      </span>
                                    )}
                                    {status === "I" && (
                                      <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold select-none">
                                        I
                                      </span>
                                    )}
                                    {status === "A" && (
                                      <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold select-none">
                                        A
                                      </span>
                                    )}
                                    {status === "D" && (
                                      <span className="inline-flex w-6 h-6 items-center justify-center rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold select-none">
                                        D
                                      </span>
                                    )}
                                    {status === "-" && (
                                      <span className={`font-medium text-xs select-none ${isHoliday ? "text-rose-400/40" : "text-slate-700"}`}>
                                        {isHoliday ? "x" : "-"}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              
                              {/* Monthly totals cells */}
                              <td className="py-3 text-center w-10 min-w-[2.5rem] text-emerald-400 font-bold border-l border-slate-800">
                                {totals.H}
                              </td>
                              <td className="py-3 text-center w-10 min-w-[2.5rem] text-amber-400 font-bold border-l border-slate-800/40">
                                {totals.S === 0 ? "-" : totals.S}
                              </td>
                              <td className="py-3 text-center w-10 min-w-[2.5rem] text-sky-400 font-bold border-l border-slate-800/40">
                                {totals.I === 0 ? "-" : totals.I}
                              </td>
                              <td className="py-3 text-center w-10 min-w-[2.5rem] text-rose-400 font-bold border-l border-slate-800/40">
                                {totals.A === 0 ? "-" : totals.A}
                              </td>
                              <td className="py-3 text-center w-10 min-w-[2.5rem] text-purple-400 font-bold border-l border-slate-800/40">
                                {totals.D === 0 ? "-" : totals.D}
                              </td>
                              <td className="py-3 text-center w-20 min-w-[5rem] text-indigo-400 font-bold border-l border-slate-800">
                                {(() => {
                                  const totalDays = totals.H + totals.S + totals.I + totals.A + totals.D;
                                  return totalDays > 0 ? Math.round((totals.H / totalDays) * 100) : 100;
                                })()}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 bg-slate-950/10 p-4 border border-slate-900/60 rounded-xl">
                  <span className="font-semibold text-slate-300">Keterangan Status:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-extrabold text-base select-none leading-none">•</span>
                    <span>Hadir (H)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">S</span>
                    <span>Sakit (S)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">I</span>
                    <span>Izin (I)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">A</span>
                    <span>Alpha (A)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">D</span>
                    <span>Dispensasi (D)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-bold">-</span>
                    <span>Belum Ada Catatan / Libur</span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* 3. Tab Rekap Pelanggaran Siswa */}
      {activeTab === "pelanggaran_rekap" && isWakaOrBKOrWalas && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-xl animate-fade-in space-y-6">
          {selectedStudentNis && selectedStudentInfo ? (
            /* Dedicated Student Profile Detail View */
            <div className="space-y-6 animate-fade-in">
              {/* Header with Back Button */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
                <button
                  onClick={() => setSelectedStudentNis(null)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Rekapitulasi
                </button>
                <span className="text-xs text-slate-500 font-medium">Profil Detail Siswa</span>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
                {/* Left Column: Student Stats Card */}
                <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-900/80 space-y-6">
                  {/* Initials & Name */}
                  <div className="text-center space-y-3">
                    <div className="inline-flex w-16 h-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xl font-bold uppercase">
                      {selectedStudentInfo.nama.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight">{selectedStudentInfo.nama}</h4>
                      <p className="text-xs text-slate-500 mt-1">NIS: {selectedStudentInfo.nis}</p>
                      <p className="text-xs text-slate-400 font-medium bg-slate-900/60 inline-block px-2.5 py-1 rounded-lg border border-slate-800/40 mt-2">
                        Kelas {selectedStudentInfo.kelasNama}
                      </p>
                    </div>
                  </div>

                  {/* Active Points Badge */}
                  <div className="p-4 bg-slate-900/40 border border-slate-800/40 rounded-xl text-center space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Akumulasi Poin Aktif</p>
                    <p className={`text-2xl font-black ${
                      selectedStudentInfo.totalPoin >= 50
                        ? "text-rose-400"
                        : selectedStudentInfo.totalPoin >= 20
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}>
                      {selectedStudentInfo.totalPoin} Poin
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {selectedStudentInfo.countApproved} Pelanggaran Sah
                    </p>
                  </div>

                  {/* Absence Summary (S, I, A, D) */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ringkasan Ketidakhadiran</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl text-center">
                        <p className="text-lg font-black text-amber-400">{selectedStudentInfo.S}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Sakit</p>
                      </div>
                      <div className="bg-sky-500/5 border border-sky-500/20 p-2.5 rounded-xl text-center">
                        <p className="text-lg font-black text-sky-400">{selectedStudentInfo.I}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Izin</p>
                      </div>
                      <div className="bg-rose-500/5 border border-rose-500/20 p-2.5 rounded-xl text-center">
                        <p className="text-lg font-black text-rose-400">{selectedStudentInfo.A}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Alfa</p>
                      </div>
                      <div className="bg-purple-500/5 border border-purple-500/20 p-2.5 rounded-xl text-center">
                        <p className="text-lg font-black text-purple-400">{selectedStudentInfo.D}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Disp.</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Timeline Logs */}
                <div className="bg-slate-950/20 p-6 rounded-2xl border border-slate-900 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                      <Clock className="w-4 h-4 text-rose-400" />
                      Timeline Aktivitas & Laporan
                    </h4>
                    <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                      {[
                        { value: "ALL", label: "Semua" },
                        { value: "PELANGGARAN", label: "Pelanggaran" },
                        { value: "REMISI", label: "Remisi" },
                        { value: "PENANGANAN", label: "Penanganan" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setTimelineCategoryFilter(opt.value)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            timelineCategoryFilter === opt.value
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const filteredLogs = timelineCategoryFilter === "ALL"
                      ? selectedStudentLogs
                      : selectedStudentLogs.filter((item) => {
                          if (timelineCategoryFilter === "PELANGGARAN") return item.kategoriNama !== "REMISI" && item.kategoriNama !== "PENANGANAN";
                          return item.kategoriNama === timelineCategoryFilter;
                        });
                    return filteredLogs.length === 0 ? (
                    <p className="text-slate-500 text-xs py-10 text-center">Tidak ada catatan {timelineCategoryFilter === "ALL" ? "pelanggaran, remisi, atau penanganan" : timelineCategoryFilter.toLowerCase()} siswa.</p>
                  ) : (
                    <div className="space-y-4">
                      {filteredLogs.map((item) => {
                        const isBKoWaka = user.role === "BK" || user.role === "WAKA";
                        const isRevealed = revealedReports[item.id] || false;
                        const shouldBlur = item.isCensored && (!isBKoWaka || !isRevealed);

                        let nodeDotColor = "bg-rose-500";
                        let nodeTitleColor = "text-rose-400";
                        let nodeTypeLabel = "Pelanggaran";
                        if (item.kategoriNama === "REMISI") {
                          nodeDotColor = "bg-emerald-500";
                          nodeTitleColor = "text-emerald-400";
                          nodeTypeLabel = "Remisi";
                        } else if (item.kategoriNama === "PENANGANAN") {
                          nodeDotColor = "bg-indigo-500";
                          nodeTitleColor = "text-indigo-400";
                          nodeTypeLabel = "Penanganan";
                        }

                        return (
                          <div key={item.id} className="space-y-1.5">

                            {/* Node Metadata */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${nodeDotColor}`} />
                                <span className={`font-black uppercase tracking-wider text-[10px] ${nodeTitleColor}`}>
                                  {nodeTypeLabel}
                                </span>
                                <span className="text-slate-600">&bull;</span>
                                <span className="text-slate-400">
                                  {new Date(item.tanggal).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="text-slate-600">&bull;</span>
                                <span className="text-slate-500">
                                  {new Date(item.tanggal).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 text-[10px]">Oleh: {item.pelaporName}</span>
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                  item.poin > 0 
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                    : item.poin < 0 
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                    : "bg-slate-800 text-slate-400"
                                }`}>
                                  {item.poin > 0 ? `+${item.poin} Poin` : item.poin < 0 ? `${item.poin} Poin` : "0 Poin"}
                                </span>
                              </div>
                            </div>

                            {/* Details */}
                            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 space-y-2">
                              {item.kategoriNama !== "REMISI" && item.kategoriNama !== "PENANGANAN" && (
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                  {item.kategoriNama} : <span className={`normal-case text-slate-300 ${shouldBlur ? "filter blur-sm select-none pointer-events-none opacity-40" : ""}`}>{item.violationName}</span>
                                </p>
                              )}
                              {(item.kategoriNama === "REMISI" || item.kategoriNama === "PENANGANAN") && (
                                <p className={`text-slate-100 font-medium text-xs whitespace-normal break-words leading-relaxed ${
                                  shouldBlur ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all" : "transition-all"
                                }`}>
                                  {item.violationName}
                                </p>
                              )}
                              {item.notes && (
                                <p className={`text-xs text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-900/30 whitespace-normal break-words leading-relaxed ${
                                  shouldBlur ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all" : "transition-all"
                                }`}>
                                  <strong className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                                    {item.kategoriNama === "PENANGANAN" ? "Solusi / Tindak Lanjut" : "Catatan / Keterangan"}
                                  </strong>
                                  &ldquo;{item.notes}&rdquo;
                                </p>
                              )}

                              {item.kategoriNama !== "REMISI" && item.kategoriNama !== "PENANGANAN" && (
                                <div className="flex items-center justify-end gap-1.5 pt-1">
                                  {item.isCensored && !isBKoWaka && (
                                    <span className="p-1 text-amber-500" title="Laporan disensor untuk publik">
                                      <EyeOff className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                  {item.isCensored && isBKoWaka && (
                                    <button
                                      onClick={() => setRevealedReports((prev) => ({ ...prev, [item.id]: !isRevealed }))}
                                      className={`p-1 rounded transition-colors ${
                                        isRevealed ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-slate-900 text-amber-400 hover:bg-slate-800"
                                      }`}
                                      title={isRevealed ? "Sembunyikan Nama (Sensor)" : "Tampilkan Nama (Buka Sensor)"}
                                    >
                                      {isRevealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                  {isBKoWaka && (
                                    <button
                                      onClick={() => toggleCensor(item.id, item.isCensored)}
                                      className={`p-1 rounded transition-colors ${
                                        item.isCensored
                                          ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                          : "bg-slate-900 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                      }`}
                                      title={item.isCensored ? "Batalkan Sensor Laporan" : "Sensor Laporan Ini (Tabu)"}
                                    >
                                      <ShieldAlert className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* Normal Recap View */
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    Rekapitulasi Pelanggaran Siswa
                  </h3>

                  {/* View mode toggle */}
                  <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                    <button
                      onClick={() => {
                        setViolationViewMode("summary");
                        setSearchQuery("");
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        violationViewMode === "summary"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Akumulasi Poin
                    </button>
                    <button
                      onClick={() => {
                        setViolationViewMode("log");
                        setSearchQuery("");
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        violationViewMode === "log"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Riwayat Laporan
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                  {/* Input Cari */}
                  <div className="relative rounded-xl w-44 sm:w-64 shrink-0">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      placeholder={
                        violationViewMode === "summary"
                          ? "Cari nama siswa..."
                          : "Cari siswa, kasus..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-9 pr-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {/* Filter Kelas */}
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="py-1.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 shrink-0 w-32 sm:w-40"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.nama}>
                        {c.nama}
                      </option>
                    ))}
                  </select>

                  {/* Filter Status (Only for Logs mode) */}
                  {violationViewMode === "log" && (
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="py-1.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 shrink-0 w-32 sm:w-40"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="APPROVED">Disetujui</option>
                      <option value="PENDING">Menunggu</option>
                      <option value="REJECTED">Ditolak</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Render Summary Mode */}
              {violationViewMode === "summary" && (
                <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
                  <table className="min-w-[650px] w-full divide-y divide-slate-800">
                    <thead className="bg-slate-900/60">
                      <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                        <th className="pb-3 px-4 w-12">No</th>
                        <th
                          onClick={() => handleViolationSort("nama")}
                          className="pb-3 px-4 cursor-pointer hover:text-white transition-all w-[28%]"
                        >
                          <div className="flex items-center gap-1">
                            Siswa
                            {violationSortField === "nama" ? (
                              violationSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-rose-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleViolationSort("kelasNama")}
                          className="pb-3 px-4 cursor-pointer hover:text-white transition-all w-[15%]"
                        >
                          <div className="flex items-center gap-1">
                            Kelas
                            {violationSortField === "kelasNama" ? (
                              violationSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-rose-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleViolationSort("countApproved")}
                          className="pb-3 px-4 cursor-pointer hover:text-white transition-all text-center"
                        >
                          <div className="flex items-center justify-center gap-1">
                            Total Kasus Sah
                            {violationSortField === "countApproved" ? (
                              violationSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-rose-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleViolationSort("countPending")}
                          className="pb-3 px-4 cursor-pointer hover:text-white transition-all text-center"
                        >
                          <div className="flex items-center justify-center gap-1">
                            Kasus Tertunda
                            {violationSortField === "countPending" ? (
                              violationSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-rose-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleViolationSort("totalPoin")}
                          className="pb-3 px-4 cursor-pointer hover:text-white transition-all text-right"
                        >
                          <div className="flex items-center justify-end gap-1">
                            Akumulasi Poin Aktif
                            {violationSortField === "totalPoin" ? (
                              violationSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-rose-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </div>
                        </th>
                        <th className="pb-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sortedViolationSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-20 text-slate-500 text-sm">
                            Tidak ada data akumulasi pelanggaran siswa.
                          </td>
                        </tr>
                      ) : (
                        paginatedViolationSummaries.map((item, index) => {
                          const absoluteIndex = (violationSummaryCurrentPage - 1) * violationSummaryPageSize + index + 1;
                          return (
                            <tr key={item.nis} className="text-sm hover:bg-slate-900/10 transition-colors">
                              <td className="py-3 px-4 text-slate-500 font-medium">{absoluteIndex}</td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => {
                                    setSelectedStudentNis(item.nis);
                                  }}
                                  className="font-semibold text-white hover:text-rose-400 transition-colors text-left focus:outline-none"
                                >
                                  {item.nama}
                                </button>
                                <div className="text-xs text-slate-400">NIS: {item.nis}</div>
                              </td>
                              <td className="py-3 px-4 text-slate-300">{item.kelasNama}</td>
                              <td className="py-3 px-4 text-center text-rose-400 font-semibold">
                                {item.countApproved} Kasus
                              </td>
                              <td className="py-3 px-4 text-center text-amber-400 font-semibold">
                                {item.countPending} Pending
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                    item.totalPoin >= 50
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                                      : item.totalPoin >= 20
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-slate-800 text-slate-300"
                                  }`}
                                >
                                  {item.totalPoin} Poin
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setSelectedStudentNis(item.nis)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 hover:text-rose-300 rounded transition-colors"
                                  title="Lihat Histori Pelanggaran Siswa"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  Histori
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {renderDashboardPagination(
                    violationSummaryCurrentPage,
                    violationSummaryPageSize,
                    sortedViolationSummaries.length,
                    setViolationSummaryCurrentPage,
                    setViolationSummaryPageSize
                  )}
                </div>
              )}

              {/* Render Detail Log Mode */}
              {violationViewMode === "log" && (
                <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
                  <table className="min-w-[700px] w-full divide-y divide-slate-800">
                    <thead className="bg-slate-900/60">
                      <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                        <th className="pb-3 px-4 w-12">No</th>
                        <th className="pb-3 px-4">Tanggal</th>
                        <th className="pb-3 px-4">Siswa</th>
                        <th className="pb-3 px-4">Pelanggaran</th>
                        <th className="pb-3 px-4 text-center">Poin</th>
                        <th className="pb-3 px-4">Pelapor</th>
                        <th className="pb-3 px-4 text-center">Status</th>
                        <th className="pb-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredViolationLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-20 text-slate-500 text-sm">
                            Tidak ada log laporan pelanggaran yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        paginatedViolationLogs.map((item, index) => {
                          const absoluteIndex = (violationLogCurrentPage - 1) * violationLogPageSize + index + 1;
                          const isBKoWaka = user.role === "BK" || user.role === "WAKA";
                          const isRevealed = revealedReports[item.id] || false;
                          const shouldBlur = item.isCensored && (!isBKoWaka || !isRevealed);

                          return (
                            <tr key={item.id} className="text-xs hover:bg-slate-900/10 transition-colors">
                              <td className="py-3 px-4 text-slate-500 font-medium">{absoluteIndex}</td>
                              <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                                {new Date(item.tanggal).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                                <div className="text-[10px] text-slate-600">
                                  {new Date(item.tanggal).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => setSelectedStudentNis(item.studentNis)}
                                  className="font-semibold text-white hover:text-rose-400 transition-colors text-left focus:outline-none block"
                                >
                                  {item.studentName}
                                </button>
                                <div className="text-[10px] text-slate-400">
                                  {item.kelasNama} • NIS: {item.studentNis}
                                </div>
                              </td>
                              <td className="py-3 px-4 max-w-xs">
                                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                                  {item.kategoriNama}
                                </div>
                                <div className={`text-slate-200 font-semibold leading-snug whitespace-normal break-words ${
                                  shouldBlur ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all" : "transition-all"
                                }`}>
                                  {item.violationName}
                                </div>
                                {item.notes && (
                                  <div className={`text-[10px] text-slate-400 italic mt-1 whitespace-normal break-words ${
                                    shouldBlur ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all" : "transition-all"
                                  }`}>
                                    &ldquo;{item.notes}&rdquo;
                                  </div>
                                )}
                              </td>
                              <td className={`py-3 px-4 text-center font-bold ${
                                item.poin > 0 
                                  ? "text-rose-400" 
                                  : item.poin < 0 
                                  ? "text-emerald-400" 
                                  : "text-slate-400"
                              }`}>
                                {item.poin > 0 ? `+${item.poin}` : item.poin}
                              </td>
                              <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                                {item.pelaporName}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {item.kategoriNama === "PENANGANAN" ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                    Tertangani
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      statusColors[item.status as "APPROVED" | "PENDING" | "REJECTED"]
                                    }`}
                                  >
                                    {statusLabels[item.status as "APPROVED" | "PENDING" | "REJECTED"] || item.status}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  {item.isCensored && !isBKoWaka && (
                                    <span className="p-1 text-amber-500" title="Laporan disensor untuk publik">
                                      <EyeOff className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                  {item.isCensored && isBKoWaka && (
                                    <button
                                      onClick={() => setRevealedReports((prev) => ({ ...prev, [item.id]: !isRevealed }))}
                                      className={`p-1 rounded transition-colors ${
                                        isRevealed ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-slate-800 text-amber-400 hover:bg-slate-750"
                                      }`}
                                      title={isRevealed ? "Sembunyikan Nama (Sensor)" : "Tampilkan Nama (Buka Sensor)"}
                                    >
                                      {isRevealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                  {isBKoWaka && item.kategoriNama !== "REMISI" && item.kategoriNama !== "PENANGANAN" && (
                                    <button
                                      onClick={() => toggleCensor(item.id, item.isCensored)}
                                      className={`p-1 rounded transition-colors ${
                                        item.isCensored
                                          ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                          : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-750"
                                      }`}
                                      title={item.isCensored ? "Batalkan Sensor Laporan" : "Sensor Laporan Ini (Tabu)"}
                                    >
                                      <ShieldAlert className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {renderDashboardPagination(
                    violationLogCurrentPage,
                    violationLogPageSize,
                    filteredViolationLogs.length,
                    setViolationLogCurrentPage,
                    setViolationLogPageSize
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}



      {/* Modal Cetak Surat Undangan */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                Cetak Surat Undangan
              </h3>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Sesuaikan rincian jadwal kehadiran di bawah ini untuk dicantumkan pada surat undangan.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Hari / Tanggal Pertemuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputHariTanggal}
                  onChange={(e) => setInputHariTanggal(e.target.value)}
                  placeholder="Contoh: Senin, 29 Juni 2026"
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Waktu Pertemuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputWaktu}
                  onChange={(e) => setInputWaktu(e.target.value)}
                  placeholder="Contoh: 08:00 WIB s.d Selesai"
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Ukuran Kertas
                </label>
                <div className="flex gap-2">
                  {["A4", "F4"].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setPrintPaperSize(sz)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        printPaperSize === sz
                          ? "bg-indigo-600 border-indigo-500 text-white-indigo-600/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      {sz} {sz === "A4" ? "(210×297mm)" : "(215×330mm)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-2 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pratinjau Penandatangan & Kop</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/40 p-2.5 border border-slate-800 rounded-xl">
                  <div>
                    <span className="text-slate-500 block">Kop Surat:</span>
                    <span className="text-slate-300 font-semibold truncate block">
                      {mergedSettings.school_header ? "Gambar Kop Kustom" : mergedSettings.school_name || "SMK NEGERI KAWAL"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nama Instansi:</span>
                    <span className="text-slate-300 font-semibold truncate block">
                      {mergedSettings.school_name || "SMK NEGERI KAWAL"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kota Tanda Tangan:</span>
                    <span className="text-slate-300 font-semibold truncate block">
                      {mergedSettings.school_city || "Kawal"}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500 block">Waka Kesiswaan:</span>
                    <span className="text-slate-300 font-semibold truncate block">
                      {mergedSettings.waka_name || "Belum diatur"}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500 block">Guru BK Penanggungjawab:</span>
                    <span className="text-slate-300 font-semibold truncate block">
                      {isBulkPrintMode 
                        ? "(Menyesuaikan tiap kelas)" 
                        : (printStudent?.bkNama || "Belum diatur")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isBulkPrintMode) {
                    printBulkSummons(summonsList, selectedSummonsIds, inputHariTanggal, inputWaktu, mergedSettings, printPaperSize);
                  } else if (printStudent) {
                    printSingleSummons(printStudent, inputHariTanggal, inputWaktu, mergedSettings, printPaperSize);
                  }
                  setIsPrintModalOpen(false);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all-indigo-600/10 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak Surat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Selection Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h4 className="text-base font-bold text-white mb-2">Pilih Tipe Ekspor Excel</h4>
              <p className="text-xs text-slate-400">
                Silakan pilih jenis laporan absensi yang ingin Anda unduh untuk kelas yang aktif.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Cumulative */}
              <div 
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedExportType === "cumulative"
                    ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                    : "bg-slate-950 border-slate-900/60 text-slate-400 hover:border-slate-800"
                }`}
                onClick={() => setSelectedExportType("cumulative")}
              >
                <input
                  type="radio"
                  name="exportType"
                  checked={selectedExportType === "cumulative"}
                  onChange={() => setSelectedExportType("cumulative")}
                  className="mt-0.5 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-sm block">Rekap Akumulasi Keseluruhan</span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Menampilkan total Hadir, Sakit, Izin, Alfa, Disp, & % persentase kehadiran sepanjang semester aktif.
                  </span>
                  {dateRangeStr && (
                    <span className="inline-flex mt-2 text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">
                      {dateRangeStr}
                    </span>
                  )}
                </div>
              </div>

              {/* Option 2: Monthly Matrix */}
              <div 
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedExportType === "monthly"
                    ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                    : "bg-slate-950 border-slate-900/60 text-slate-400 hover:border-slate-800"
                }`}
                onClick={() => setSelectedExportType("monthly")}
              >
                <input
                  type="radio"
                  name="exportType"
                  checked={selectedExportType === "monthly"}
                  onChange={() => setSelectedExportType("monthly")}
                  className="mt-0.5 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-sm block">Matriks Kehadiran Bulanan</span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Menampilkan matriks status absensi harian (1 s.d. 30/31) beserta total rekap bulanan.
                  </span>
                  <span className="inline-flex mt-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                    Bulan: {INDONESIAN_MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-slate-800 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (selectedExportType === "cumulative") {
                    exportCumulativeToExcel();
                  } else {
                    exportMonthlyMatrixToExcel();
                  }
                  setShowExportModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
              >
                Ekspor Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
