"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  AlertTriangle,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowLeft,
  Clock,
  History,
  ShieldAlert,
  Eye,
  EyeOff,
} from "lucide-react";
import { calculateAttendanceRate, formatPoin } from "@/lib/attendanceUtils";
import { toggleCensorViolationAction } from "@/app/actions/violation";

interface ClassOption {
  id: string;
  nama: string;
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
  netPoints?: number;
}

interface RekapPelanggaranClientProps {
  user: {
    id: string;
    nama: string;
    role: string;
  };
  classes: ClassOption[];
  violationRecap: ViolationRecapItem[];
  attendanceRecap: AttendanceRecapItem[];
}

const statusColors: Record<"APPROVED" | "PENDING" | "REJECTED", string> = {
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const statusLabels: Record<"APPROVED" | "PENDING" | "REJECTED", string> = {
  APPROVED: "Disetujui",
  PENDING: "Menunggu",
  REJECTED: "Ditolak",
};

export default function RekapPelanggaranClient({
  user,
  classes,
  violationRecap,
  attendanceRecap,
}: RekapPelanggaranClientProps) {
  const [violationViewMode, setViolationViewMode] = useState<"summary" | "log">("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedStudentNis, setSelectedStudentNis] = useState<string | null>(null);
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState("ALL");
  const [revealedReports, setRevealedReports] = useState<Record<string, boolean>>({});
  const [localViolationRecap, setLocalViolationRecap] = useState<ViolationRecapItem[]>(violationRecap);
  const [, startTransitionCensor] = useTransition();

  // Sorting for Summary view
  const [violationSortField, setViolationSortField] = useState<
    "nama" | "kelasNama" | "countApproved" | "countPending" | "totalPoin"
  >("totalPoin");
  const [violationSortDirection, setViolationSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [violationSummaryCurrentPage, setViolationSummaryCurrentPage] = useState(1);
  const [violationSummaryPageSize, setViolationSummaryPageSize] = useState(20);
  const [violationLogCurrentPage, setViolationLogCurrentPage] = useState(1);
  const [violationLogPageSize, setViolationLogPageSize] = useState(20);

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

  // Summarize per student from localViolationRecap
  const studentViolationSummaries = useMemo(() => {
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

    return Object.values(studentMap).map((student) => ({
      ...student,
      totalPoin: Math.max(0, Math.round(student.totalPoin * 100) / 100),
    }));
  }, [localViolationRecap]);

  const filteredViolationSummaries = useMemo(() => {
    return studentViolationSummaries.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nis.includes(searchQuery);
      const matchesClass = selectedClassId === "" || item.kelasNama === selectedClassId;
      return matchesSearch && matchesClass;
    });
  }, [studentViolationSummaries, searchQuery, selectedClassId]);

  const sortedViolationSummaries = useMemo(() => {
    return [...filteredViolationSummaries].sort((a, b) => {
      const valueA = a[violationSortField];
      const valueB = b[violationSortField];

      if (typeof valueA === "string" && typeof valueB === "string") {
        const comparison = valueA.localeCompare(valueB);
        return violationSortDirection === "asc" ? comparison : -comparison;
      }

      const numA = Number(valueA);
      const numB = Number(valueB);
      if (numA < numB) return violationSortDirection === "asc" ? -1 : 1;
      if (numA > numB) return violationSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredViolationSummaries, violationSortField, violationSortDirection]);

  const paginatedViolationSummaries = useMemo(() => {
    const startIndex = (violationSummaryCurrentPage - 1) * violationSummaryPageSize;
    return sortedViolationSummaries.slice(startIndex, startIndex + violationSummaryPageSize);
  }, [sortedViolationSummaries, violationSummaryCurrentPage, violationSummaryPageSize]);

  const filteredViolationLogs = useMemo(() => {
    return localViolationRecap.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentNis.includes(searchQuery) ||
        item.violationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kategoriNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesClass = selectedClassId === "" || item.kelasNama === selectedClassId;
      const matchesStatus = selectedStatus === "ALL" || item.status === selectedStatus;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [localViolationRecap, searchQuery, selectedClassId, selectedStatus]);

  const paginatedViolationLogs = useMemo(() => {
    const startIndex = (violationLogCurrentPage - 1) * violationLogPageSize;
    return filteredViolationLogs.slice(startIndex, startIndex + violationLogPageSize);
  }, [filteredViolationLogs, violationLogCurrentPage, violationLogPageSize]);

  const handleViolationSort = (
    field: "nama" | "kelasNama" | "countApproved" | "countPending" | "totalPoin"
  ) => {
    if (violationSortField === field) {
      setViolationSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setViolationSortField(field);
      setViolationSortDirection(field === "nama" || field === "kelasNama" ? "asc" : "desc");
    }
  };

  const selectedStudentInfo = useMemo(() => {
    if (!selectedStudentNis) return null;
    const summary = studentViolationSummaries.find((s) => s.nis === selectedStudentNis);
    const attendance = attendanceRecap.find((a) => a.nis === selectedStudentNis);
    const attendanceRate = attendance ? calculateAttendanceRate(attendance) : 100;
    return {
      nis: selectedStudentNis,
      id: attendance?.studentId || "",
      nama: summary?.nama || attendance?.nama || "Siswa",
      kelasNama: summary?.kelasNama || attendance?.kelasNama || "-",
      totalPoin: summary?.totalPoin ?? 0,
      countApproved: summary?.countApproved ?? 0,
      countPending: summary?.countPending ?? 0,
      S: attendance?.S ?? 0,
      I: attendance?.I ?? 0,
      A: attendance?.A ?? 0,
      D: attendance?.D ?? 0,
      attendanceRate,
    };
  }, [selectedStudentNis, studentViolationSummaries, attendanceRecap]);

  const selectedStudentLogs = useMemo(() => {
    if (!selectedStudentNis) return [];
    return localViolationRecap
      .filter((log) => log.studentNis === selectedStudentNis)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [selectedStudentNis, localViolationRecap]);

  const renderPagination = (
    currentPage: number,
    pageSize: number,
    totalItems: number,
    setCurrentPage: (p: number) => void,
    setPageSize: (s: number) => void
  ) => {
    if (totalItems <= pageSize && (pageSize === 20 || pageSize === 50)) return null;

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
            className="py-1 px-2 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer text-xs"
          >
            <option value={20}>20 Baris</option>
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
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-semibold text-white"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 font-semibold text-slate-300">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-semibold text-white"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
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
                  <h4 className="font-bold text-white text-base leading-tight">
                    {selectedStudentInfo.nama}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">NIS: {selectedStudentInfo.nis}</p>
                  <p className="text-xs text-slate-400 font-medium bg-slate-900/60 inline-block px-2.5 py-1 rounded-lg border border-slate-800/40 mt-2">
                    Kelas {selectedStudentInfo.kelasNama}
                  </p>
                </div>
              </div>

              {/* Active Points Badge */}
              <div className="p-4 bg-slate-900/40 border border-slate-800/40 rounded-xl text-center space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Akumulasi Poin Aktif
                </p>
                <p
                  className={`text-2xl font-black ${
                    selectedStudentInfo.totalPoin >= 50
                      ? "text-rose-400"
                      : selectedStudentInfo.totalPoin >= 20
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {formatPoin(selectedStudentInfo.totalPoin)} Poin
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  {selectedStudentInfo.countApproved} Pelanggaran Sah
                </p>
              </div>

              {/* Attendance Rate Badge */}
              <div className="p-4 bg-slate-900/40 border border-slate-800/40 rounded-xl text-center space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Persentase Kehadiran
                </p>
                <p
                  className={`text-2xl font-black ${
                    selectedStudentInfo.attendanceRate >= 90
                      ? "text-emerald-400"
                      : selectedStudentInfo.attendanceRate >= 80
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {selectedStudentInfo.attendanceRate}%
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Tingkat Kehadiran Semester Ini
                </p>
              </div>

              {/* Absence Summary (S, I, A, D) */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ringkasan Ketidakhadiran
                </p>
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
                const filteredLogs =
                  timelineCategoryFilter === "ALL"
                    ? selectedStudentLogs
                    : selectedStudentLogs.filter((item) => {
                        if (timelineCategoryFilter === "PELANGGARAN")
                          return item.kategoriNama !== "REMISI" && item.kategoriNama !== "PENANGANAN";
                        return item.kategoriNama === timelineCategoryFilter;
                      });
                return filteredLogs.length === 0 ? (
                  <p className="text-slate-500 text-xs py-10 text-center">
                    Tidak ada catatan{" "}
                    {timelineCategoryFilter === "ALL"
                      ? "pelanggaran, remisi, atau penanganan"
                      : timelineCategoryFilter.toLowerCase()}{" "}
                    siswa.
                  </p>
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
                              <span
                                className={`font-black uppercase tracking-wider text-[10px] ${nodeTitleColor}`}
                              >
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
                              <span className="text-slate-500 text-[10px]">
                                Oleh: {item.pelaporName}
                              </span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                  item.poin > 0
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : item.poin < 0
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {item.poin > 0
                                  ? `+${formatPoin(item.poin)} Poin`
                                  : item.poin < 0
                                  ? `${formatPoin(item.poin)} Poin`
                                  : "0 Poin"}
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 space-y-2">
                            {item.kategoriNama !== "REMISI" &&
                              item.kategoriNama !== "PENANGANAN" && (
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                  {item.kategoriNama} :{" "}
                                  <span
                                    className={`normal-case text-slate-300 ${
                                      shouldBlur
                                        ? "filter blur-sm select-none pointer-events-none opacity-40"
                                        : ""
                                    }`}
                                  >
                                    {item.violationName}
                                  </span>
                                </p>
                              )}
                            {(item.kategoriNama === "REMISI" ||
                              item.kategoriNama === "PENANGANAN") && (
                              <p
                                className={`text-slate-100 font-medium text-xs whitespace-normal break-words leading-relaxed ${
                                  shouldBlur
                                    ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all"
                                    : "transition-all"
                                }`}
                              >
                                {item.violationName}
                              </p>
                            )}
                            {item.notes && (
                              <p
                                className={`text-slate-400 text-xs italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/40 leading-relaxed ${
                                  shouldBlur
                                    ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all"
                                    : "transition-all"
                                }`}
                              >
                                &ldquo;{item.notes}&rdquo;
                              </p>
                            )}
                            {item.isCensored && (
                              <div className="flex items-center justify-between pt-1 border-t border-slate-900/40 text-[10px]">
                                <span className="text-amber-500 font-medium flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" /> Laporan Disensor untuk Publik
                                </span>
                                {isBKoWaka && (
                                  <button
                                    onClick={() =>
                                      setRevealedReports((prev) => ({
                                        ...prev,
                                        [item.id]: !isRevealed,
                                      }))
                                    }
                                    className="text-slate-400 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    {isRevealed ? (
                                      <>
                                        <EyeOff className="w-3 h-3 text-rose-400" /> Sembunyikan
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-3 h-3 text-emerald-400" /> Lihat Teks Asli
                                      </>
                                    )}
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
                    <th className="py-3 px-4 w-12">No</th>
                    <th
                      onClick={() => handleViolationSort("nama")}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-all w-[28%]"
                    >
                      <div className="flex items-center gap-1">
                        Siswa
                        {violationSortField === "nama" ? (
                          violationSortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-rose-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-rose-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleViolationSort("kelasNama")}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-all w-[15%]"
                    >
                      <div className="flex items-center gap-1">
                        Kelas
                        {violationSortField === "kelasNama" ? (
                          violationSortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-rose-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-rose-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleViolationSort("countApproved")}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-all text-center"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Total Kasus Sah
                        {violationSortField === "countApproved" ? (
                          violationSortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-rose-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-rose-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleViolationSort("countPending")}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-all text-center"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Kasus Tertunda
                        {violationSortField === "countPending" ? (
                          violationSortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-rose-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-rose-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleViolationSort("totalPoin")}
                      className="py-3 px-4 cursor-pointer hover:text-white transition-all text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Akumulasi Poin Aktif
                        {violationSortField === "totalPoin" ? (
                          violationSortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-rose-400" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-rose-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">Aksi</th>
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
                      const absoluteIndex =
                        (violationSummaryCurrentPage - 1) * violationSummaryPageSize + index + 1;
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
                              {formatPoin(item.totalPoin)} Poin
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
              {renderPagination(
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
                    <th className="py-3 px-4 w-12">No</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Siswa</th>
                    <th className="py-3 px-4">Pelanggaran</th>
                    <th className="py-3 px-4 text-center">Poin</th>
                    <th className="py-3 px-4">Pelapor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
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
                      const absoluteIndex =
                        (violationLogCurrentPage - 1) * violationLogPageSize + index + 1;
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
                            <div
                              className={`text-slate-200 font-semibold leading-snug whitespace-normal break-words ${
                                shouldBlur
                                  ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all"
                                  : "transition-all"
                              }`}
                            >
                              {item.violationName}
                            </div>
                            {item.notes && (
                              <div
                                className={`text-[10px] text-slate-400 italic mt-1 whitespace-normal break-words ${
                                  shouldBlur
                                    ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all"
                                    : "transition-all"
                                }`}
                              >
                                &ldquo;{item.notes}&rdquo;
                              </div>
                            )}
                          </td>
                          <td
                            className={`py-3 px-4 text-center font-bold ${
                              item.poin > 0
                                ? "text-rose-400"
                                : item.poin < 0
                                ? "text-emerald-400"
                                : "text-slate-400"
                            }`}
                          >
                            {item.poin > 0 ? `+${formatPoin(item.poin)}` : formatPoin(item.poin)}
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
                                {statusLabels[item.status as "APPROVED" | "PENDING" | "REJECTED"] ||
                                  item.status}
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
                                  onClick={() =>
                                    setRevealedReports((prev) => ({
                                      ...prev,
                                      [item.id]: !isRevealed,
                                    }))
                                  }
                                  className={`p-1 rounded transition-colors ${
                                    isRevealed
                                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                      : "bg-slate-800 text-amber-400 hover:bg-slate-750"
                                  }`}
                                  title={
                                    isRevealed ? "Sembunyikan Nama (Sensor)" : "Tampilkan Nama (Buka Sensor)"
                                  }
                                >
                                  {isRevealed ? (
                                    <Eye className="w-3.5 h-3.5" />
                                  ) : (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                              {isBKoWaka &&
                                item.kategoriNama !== "REMISI" &&
                                item.kategoriNama !== "PENANGANAN" && (
                                  <button
                                    onClick={() => toggleCensor(item.id, item.isCensored)}
                                    className={`p-1 rounded transition-colors ${
                                      item.isCensored
                                        ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                        : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-750"
                                    }`}
                                    title={
                                      item.isCensored ? "Batalkan Sensor Laporan" : "Sensor Laporan Ini (Tabu)"
                                    }
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
              {renderPagination(
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
  );
}
