"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  saveJamPelajaranAction,
  deleteJamPelajaranAction,
  saveMataPelajaranAction,
  deleteMataPelajaranAction,
  saveJadwalAction,
  deleteJadwalAction
} from "@/app/actions/schedule";
import {
  Calendar,
  Clock,
  BookOpen,
  ClipboardList,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  CalendarDays,
  FileSpreadsheet,
  AlertCircle,
  Check,
  User,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";

interface ClassOption {
  id: string;
  nama: string;
}

interface TeacherOption {
  id: string;
  nama: string;
}

interface SubjectOption {
  id: string;
  kode: string;
  nama: string;
}

interface PeriodItem {
  id: string;
  hariTipe: string; // SENIN-KAMIS, JUMAT
  jamKe: number;
  waktuMulai: string;
  waktuSelesai: string;
  isIstirahat: boolean;
  keterangan: string | null;
}

interface ScheduleItem {
  id: string;
  kelasId: string;
  kelas: { nama: string };
  guruId: string;
  guru: { nama: string };
  mapelId: string;
  mapel: { nama: string; kode: string };
  hari: number; // 1 = Senin, ... 6 = Sabtu
  jamMulai: number;
  jamSelesai: number;
}

interface JournalItem {
  id: string;
  jadwalId: string | null;
  kelasId: string;
  kelas: { nama: string };
  guruId: string;
  guru: { nama: string };
  mapelId: string;
  mapel: { nama: string };
  jamMulai: number;
  jamSelesai: number;
  tanggal: Date;
  namaJurnal: string;
  kegiatan: string;
  foto: string | null;
  fotoKeterangan: string | null;
  _count: {
    absensi: number;
    penilaian: number;
  };
}

interface JadwalClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
  classes: ClassOption[];
  teachers: TeacherOption[];
  subjects: SubjectOption[];
  periods: PeriodItem[];
  initialSchedules: ScheduleItem[];
  initialJournals: JournalItem[];
  todaySchedules: ScheduleItem[];
}

const HARI_MAP: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
};

const DAY_ORDER: Record<string, number> = {
  SENIN: 1,
  SELASA: 2,
  RABU: 3,
  KAMIS: 4,
  JUMAT: 5,
  SABTU: 6,
};

export default function JadwalClient({
  user,
  classes,
  teachers,
  subjects,
  periods,
  initialSchedules,
  initialJournals,
  todaySchedules,
}: JadwalClientProps) {
  const [activeTab, setActiveTab] = useState<string>(
    user.role === "WAKA" ? "jadwal" : "today"
  );

  // States
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const [journals, setJournals] = useState<JournalItem[]>(initialJournals);
  const [subjectList, setSubjectList] = useState<SubjectOption[]>(subjects);
  const [periodList, setPeriodList] = useState<PeriodItem[]>(periods);

  const sortedPeriods = useMemo(() => {
    return [...periodList].sort((a, b) => {
      const orderA = DAY_ORDER[a.hariTipe.toUpperCase()] || 99;
      const orderB = DAY_ORDER[b.hariTipe.toUpperCase()] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.jamKe - b.jamKe;
    });
  }, [periodList]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");

  // Form states - Subject
  const [mapelKode, setMapelKode] = useState("");
  const [mapelNama, setMapelNama] = useState("");
  const [editMapelId, setEditMapelId] = useState("");

  // Form states - Period
  const [periodHariTipe, setPeriodHariTipe] = useState("SENIN");
  const [periodJamKe, setPeriodJamKe] = useState<number>(1);
  const [periodMulai, setPeriodMulai] = useState("");
  const [periodSelesai, setPeriodSelesai] = useState("");
  const [periodIsIstirahat, setPeriodIsIstirahat] = useState(false);
  const [periodKeterangan, setPeriodKeterangan] = useState("");
  const [editPeriodId, setEditPeriodId] = useState("");

  // Form states - Schedule
  const [schedKelas, setSchedKelas] = useState("");
  const [schedGuru, setSchedGuru] = useState("");
  const [schedMapel, setSchedMapel] = useState("");
  const [schedHari, setSchedHari] = useState<number>(1);
  const [schedJamMulai, setSchedJamMulai] = useState<number>(1);
  const [schedJamSelesai, setSchedJamSelesai] = useState<number>(2);
  const [editSchedId, setEditSchedId] = useState("");

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [selectedJournal, setSelectedJournal] = useState<JournalItem | null>(null);

  // Handlers - Subject CRUD
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    startTransition(async () => {
      const res = await saveMataPelajaranAction(mapelKode, mapelNama, editMapelId || undefined);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Mata pelajaran berhasil disimpan.");
        if (editMapelId) {
          setSubjectList((prev) =>
            prev.map((item) => (item.id === editMapelId ? { ...item, kode: mapelKode, nama: mapelNama } : item))
          );
        } else {
          setSubjectList((prev) => [...prev, { id: `temp-${Date.now()}`, kode: mapelKode, nama: mapelNama }]);
        }
        setMapelKode("");
        setMapelNama("");
        setEditMapelId("");
      }
    });
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus mata pelajaran ini?")) return;
    setActionError("");
    setActionSuccess("");

    startTransition(async () => {
      const res = await deleteMataPelajaranAction(id);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Mata pelajaran berhasil dihapus.");
        setSubjectList((prev) => prev.filter((item) => item.id !== id));
      }
    });
  };

  // Handlers - Period CRUD
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!periodJamKe || isNaN(periodJamKe)) {
      setActionError("Jam ke- harus berupa angka yang valid.");
      return;
    }

    startTransition(async () => {
      const res = await saveJamPelajaranAction(
        periodHariTipe,
        periodJamKe,
        periodMulai,
        periodSelesai,
        periodIsIstirahat,
        periodKeterangan,
        editPeriodId || undefined
      );
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Jam pelajaran berhasil disimpan.");
        // Reload page data or update state
        const updatedItem = {
          id: editPeriodId || `temp-${Date.now()}`,
          hariTipe: periodHariTipe,
          jamKe: periodJamKe,
          waktuMulai: periodMulai,
          waktuSelesai: periodSelesai,
          isIstirahat: periodIsIstirahat,
          keterangan: periodKeterangan || null,
        };
        if (editPeriodId) {
          setPeriodList((prev) => prev.map((item) => (item.id === editPeriodId ? updatedItem : item)));
        } else {
          setPeriodList((prev) => [...prev, updatedItem].sort((a, b) => a.hariTipe.localeCompare(b.hariTipe) || a.jamKe - b.jamKe));
        }
        setPeriodMulai("");
        setPeriodSelesai("");
        setPeriodIsIstirahat(false);
        setPeriodKeterangan("");
        setEditPeriodId("");
      }
    });
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jam pelajaran ini?")) return;
    setActionError("");
    setActionSuccess("");

    startTransition(async () => {
      const res = await deleteJamPelajaranAction(id);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Jam pelajaran berhasil dihapus.");
        setPeriodList((prev) => prev.filter((item) => item.id !== id));
      }
    });
  };

  // Handlers - Schedule CRUD
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!schedKelas || !schedGuru || !schedMapel) {
      setActionError("Kelas, Guru, dan Mata Pelajaran wajib ditentukan.");
      return;
    }

    startTransition(async () => {
      const res = await saveJadwalAction(
        schedKelas,
        schedGuru,
        schedMapel,
        schedHari,
        schedJamMulai,
        schedJamSelesai,
        editSchedId || undefined
      );
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Jadwal pelajaran berhasil disimpan.");
        // Fetch values
        const clsObj = classes.find((c) => c.id === schedKelas);
        const guruObj = teachers.find((t) => t.id === schedGuru);
        const mapelObj = subjectList.find((s) => s.id === schedMapel);

        const updatedItem: ScheduleItem = {
          id: editSchedId || `temp-${Date.now()}`,
          kelasId: schedKelas,
          kelas: { nama: clsObj?.nama || "" },
          guruId: schedGuru,
          guru: { nama: guruObj?.nama || "" },
          mapelId: schedMapel,
          mapel: { nama: mapelObj?.nama || "", kode: mapelObj?.kode || "" },
          hari: schedHari,
          jamMulai: schedJamMulai,
          jamSelesai: schedJamSelesai,
        };

        if (editSchedId) {
          setSchedules((prev) => prev.map((item) => (item.id === editSchedId ? updatedItem : item)));
        } else {
          setSchedules((prev) => [updatedItem, ...prev]);
        }
        
        // Reset form
        setSchedKelas("");
        setSchedGuru("");
        setSchedMapel("");
        setEditSchedId("");
      }
    });
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;
    setActionError("");
    setActionSuccess("");

    startTransition(async () => {
      const res = await deleteJadwalAction(id);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Jadwal pelajaran berhasil dihapus.");
        setSchedules((prev) => prev.filter((item) => item.id !== id));
      }
    });
  };

  // Helper: check if journal is already filled for a schedule today
  const hasJournalForToday = (schedId: string) => {
    const today = new Date().toISOString().split("T")[0];
    return journals.some((j) => {
      const journalDate = new Date(j.tanggal).toISOString().split("T")[0];
      return j.jadwalId === schedId && journalDate === today;
    });
  };

  // Filters
  const filteredSchedules = schedules.filter((s) => {
    const matchClass = selectedClassFilter === "ALL" || s.kelasId === selectedClassFilter;
    const matchSearch =
      s.guru.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mapel.nama.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClass && matchSearch;
  });

  const filteredJournals = journals.filter((j) => {
    const matchSearch =
      j.guru.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.mapel.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.kelas.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.namaJurnal.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  // Get time duration string from period database using start/end hours
  const getTimeString = (day: number, start: number, end: number) => {
    const type = (HARI_MAP[day] || "").toUpperCase();
    const startPeriod = periodList.find((p) => p.hariTipe.toUpperCase() === type && p.jamKe === start && !p.isIstirahat);
    const endPeriod = periodList.find((p) => p.hariTipe.toUpperCase() === type && p.jamKe === end && !p.isIstirahat);

    if (startPeriod && endPeriod) {
      return `${startPeriod.waktuMulai} - ${endPeriod.waktuSelesai}`;
    }
    return `Jam ke-${start} s/d ${end}`;
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-2xl flex items-start gap-3">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-800">
        {user.role === "WAKA" ? (
          <>
            <button
              onClick={() => {
                setActiveTab("jadwal");
                setActionError("");
                setActionSuccess("");
              }}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === "jadwal"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Jadwal Pelajaran
            </button>
            <button
              onClick={() => {
                setActiveTab("mapel");
                setActionError("");
                setActionSuccess("");
              }}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === "mapel"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Mata Pelajaran
            </button>
            <button
              onClick={() => {
                setActiveTab("jam");
                setActionError("");
                setActionSuccess("");
              }}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === "jam"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Pengaturan Jam
            </button>
            <button
              onClick={() => {
                setActiveTab("jurnal");
                setActionError("");
                setActionSuccess("");
              }}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === "jurnal"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Semua Jurnal
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setActiveTab("today");
                setActionError("");
                setActionSuccess("");
              }}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === "today"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Jadwal Hari Ini
            </button>
            <button
              onClick={() => {
                setActiveTab("jurnal_saya");
                setActionError("");
                setActionSuccess("");
              }}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === "jurnal_saya"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Riwayat Jurnal Mengajar
            </button>
          </>
        )}
      </div>

      {/* Contents based on Active Tab */}

      {/* -------------------- TAB: GURU TODAY AGENDA -------------------- */}
      {activeTab === "today" && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
              Agenda Jadwal Mengajar Hari Ini ({HARI_MAP[new Date().getDay()] || "Minggu"})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Daftar kelas mengajar Anda hari ini. Segera isi jurnal mengajar setelah sesi kelas selesai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {todaySchedules.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-900 rounded-2xl">
                Tidak ada agenda mengajar untuk Anda hari ini.
              </div>
            ) : (
              todaySchedules.map((sched) => {
                const filled = hasJournalForToday(sched.id);
                return (
                  <div
                    key={sched.id}
                    className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[170px] ${
                      filled
                        ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                        : "bg-slate-900/40 border-slate-800/80 hover:border-indigo-500/30"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-bold border border-indigo-500/20">
                          Kelas {sched.kelas.nama}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            filled
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {filled ? "Sudah Diisi" : "Belum Diisi"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white leading-tight">{sched.mapel.nama}</h4>
                        <div className="text-slate-400 text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{getTimeString(sched.hari, sched.jamMulai, sched.jamSelesai)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/50 mt-4">
                      {filled ? (
                        <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          Jurnal selesai dilaporkan hari ini.
                        </div>
                      ) : (
                        <Link
                          href={`/jadwal/jurnal/isi?jadwalId=${sched.id}`}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                        >
                          <ClipboardList className="w-4 h-4" />
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

      {/* -------------------- TAB: GURU JURNAL SAYA -------------------- */}
      {activeTab === "jurnal_saya" && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                Riwayat Jurnal Mengajar Saya
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Kumpulan log jurnal kegiatan pembelajaran yang telah berhasil Anda buat.
              </p>
            </div>
            <div className="w-full sm:w-64 relative rounded-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Cari jurnal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 w-10">No</th>
                  <th className="pb-3 w-32">Tanggal</th>
                  <th className="pb-3 w-24">Kelas</th>
                  <th className="pb-3 w-32">Mata Pelajaran</th>
                  <th className="pb-3 w-36">Nama Jurnal</th>
                  <th className="pb-3">Kegiatan Pembelajaran</th>
                  <th className="pb-3 w-28 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredJournals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500">
                      Belum ada data jurnal mengajar yang Anda catat.
                    </td>
                  </tr>
                ) : (
                  filteredJournals.map((item, index) => (
                    <tr key={item.id}>
                      <td className="py-4 text-slate-500">{index + 1}</td>
                      <td className="py-4 font-semibold text-white">
                        {new Date(item.tanggal).toLocaleDateString("id-ID", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        <div className="text-xs text-slate-400 font-normal">
                          Jam ke-{item.jamMulai} - {item.jamSelesai}
                        </div>
                      </td>
                      <td className="py-4 text-slate-300">Kelas {item.kelas.nama}</td>
                      <td className="py-4 text-slate-300">{item.mapel.nama}</td>
                      <td className="py-4 text-white font-medium">{item.namaJurnal}</td>
                      <td className="py-4 pr-4">
                        <p className="text-slate-300 line-clamp-2" title={item.kegiatan}>
                          {item.kegiatan}
                        </p>
                      </td>
                      <td className="py-4 text-center">
                        <button
                          onClick={() => setSelectedJournal(item)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xxs font-bold border border-indigo-500/20 cursor-pointer"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB: WAKA JADWAL PELAJARAN -------------------- */}
      {activeTab === "jadwal" && user.role === "WAKA" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Left Form: Add/Edit Schedule */}
          <div className="xl:col-span-1 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                {editSchedId ? "Edit Jadwal Pelajaran" : "Tambah Jadwal Pelajaran"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Atur relasi guru, mata pelajaran, kelas, hari, dan rentang jam mengajar.
              </p>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilih Kelas</label>
                <select
                  value={schedKelas}
                  onChange={(e) => setSchedKelas(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilih Guru Pengajar</label>
                <select
                  value={schedGuru}
                  onChange={(e) => setSchedGuru(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilih Mata Pelajaran</label>
                <select
                  value={schedMapel}
                  onChange={(e) => setSchedMapel(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Mapel --</option>
                  {subjectList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.kode} - {s.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hari</label>
                  <select
                    value={schedHari}
                    onChange={(e) => setSchedHari(parseInt(e.target.value, 10))}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1">Senin</option>
                    <option value="2">Selasa</option>
                    <option value="3">Rabu</option>
                    <option value="4">Kamis</option>
                    <option value="5">Jumat</option>
                    <option value="6">Sabtu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mulai Jam ke-</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={schedJamMulai}
                    onChange={(e) => setSchedJamMulai(parseInt(e.target.value, 10))}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Selesai Jam ke-</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={schedJamSelesai}
                    onChange={(e) => setSchedJamSelesai(parseInt(e.target.value, 10))}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {editSchedId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSchedKelas("");
                      setSchedGuru("");
                      setSchedMapel("");
                      setEditSchedId("");
                    }}
                    className="w-1/2 py-2.5 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className={`py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer ${
                    editSchedId
                      ? "w-1/2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800"
                      : "w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800"
                  }`}
                >
                  {editSchedId ? "Simpan Perubahan" : "Buat Jadwal"}
                </button>
              </div>
            </form>
          </div>

          {/* Right List: Schedule Database View */}
          <div className="xl:col-span-2 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-400" />
                  Database Jadwal Pelajaran
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Atur filter untuk menyaring data jadwal per kelas atau per guru.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="py-1.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative rounded-xl w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Cari berdasarkan nama guru atau mapel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 w-10">No</th>
                    <th className="pb-3 w-20">Hari</th>
                    <th className="pb-3 w-28">Jam Pelajaran</th>
                    <th className="pb-3 w-24">Kelas</th>
                    <th className="pb-3">Mata Pelajaran</th>
                    <th className="pb-3 w-36">Guru Pengajar</th>
                    <th className="pb-3 w-20 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        Tidak ada data jadwal ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((item, index) => (
                      <tr key={item.id}>
                        <td className="py-4 text-slate-500">{index + 1}</td>
                        <td className="py-4 font-bold text-white">{HARI_MAP[item.hari]}</td>
                        <td className="py-4 text-slate-300 font-mono text-xs">
                          {getTimeString(item.hari, item.jamMulai, item.jamSelesai)}
                        </td>
                        <td className="py-4 text-slate-300 font-semibold">{item.kelas.nama}</td>
                        <td className="py-4 text-slate-300">
                          {item.mapel.nama}
                          <div className="text-xs text-slate-500">{item.mapel.kode}</div>
                        </td>
                        <td className="py-4 text-slate-300">{item.guru.nama}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSchedKelas(item.kelasId);
                                setSchedGuru(item.guruId);
                                setSchedMapel(item.mapelId);
                                setSchedHari(item.hari);
                                setSchedJamMulai(item.jamMulai);
                                setSchedJamSelesai(item.jamSelesai);
                                setEditSchedId(item.id);
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 cursor-pointer"
                              title="Edit Jadwal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(item.id)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: WAKA MATA PELAJARAN -------------------- */}
      {activeTab === "mapel" && user.role === "WAKA" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Form Subject CRUD */}
          <div className="xl:col-span-1 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                {editMapelId ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Kelola nama dan kode mata pelajaran standar sekolah.
              </p>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kode Mapel (Unik)</label>
                <input
                  type="text"
                  placeholder="Contoh: MAT-XII"
                  value={mapelKode}
                  onChange={(e) => setMapelKode(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  placeholder="Contoh: Matematika Peminatan"
                  value={mapelNama}
                  onChange={(e) => setMapelNama(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                {editMapelId && (
                  <button
                    type="button"
                    onClick={() => {
                      setMapelKode("");
                      setMapelNama("");
                      setEditMapelId("");
                    }}
                    className="w-1/2 py-2.5 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className={`py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer ${
                    editMapelId
                      ? "w-1/2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800"
                      : "w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800"
                  }`}
                >
                  {editMapelId ? "Simpan Perubahan" : "Simpan Mapel"}
                </button>
              </div>
            </form>
          </div>

          {/* List Subject View */}
          <div className="xl:col-span-2 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              Database Mata Pelajaran
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 w-10">No</th>
                    <th className="pb-3 w-32">Kode Mapel</th>
                    <th className="pb-3">Nama Mata Pelajaran</th>
                    <th className="pb-3 w-20 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {subjectList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-500">
                        Belum ada data mata pelajaran.
                      </td>
                    </tr>
                  ) : (
                    subjectList.map((item, index) => (
                      <tr key={item.id}>
                        <td className="py-4 text-slate-500">{index + 1}</td>
                        <td className="py-4 font-mono text-xs font-bold text-white">{item.kode}</td>
                        <td className="py-4 text-slate-300">{item.nama}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setMapelKode(item.kode);
                                setMapelNama(item.nama);
                                setEditMapelId(item.id);
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 cursor-pointer"
                              title="Edit Mapel"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(item.id)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                              title="Hapus Mapel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: WAKA PENGATURAN JAM -------------------- */}
      {activeTab === "jam" && user.role === "WAKA" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Form Period CRUD */}
          <div className="xl:col-span-1 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                {editPeriodId ? "Edit Jam Pelajaran" : "Tambah Jam Pelajaran"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tentukan interval jam KBM (Kegiatan Belajar Mengajar) serta jeda jam istirahat.
              </p>
            </div>

            <form onSubmit={handleSavePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tipe Hari</label>
                <select
                  value={periodHariTipe}
                  onChange={(e) => setPeriodHariTipe(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="SENIN">Senin</option>
                  <option value="SELASA">Selasa</option>
                  <option value="RABU">Rabu</option>
                  <option value="KAMIS">Kamis</option>
                  <option value="JUMAT">Jumat</option>
                  <option value="SABTU">Sabtu</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Jam Ke-</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={isNaN(periodJamKe) ? "" : periodJamKe}
                    onChange={(e) => setPeriodJamKe(parseInt(e.target.value, 10))}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center mt-7">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={periodIsIstirahat}
                      onChange={(e) => setPeriodIsIstirahat(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    Jam Istirahat?
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Waktu Mulai</label>
                  <input
                    type="text"
                    placeholder="Contoh: 07:00"
                    value={periodMulai}
                    onChange={(e) => setPeriodMulai(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Waktu Selesai</label>
                  <input
                    type="text"
                    placeholder="Contoh: 07:45"
                    value={periodSelesai}
                    onChange={(e) => setPeriodSelesai(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Keterangan / Label Jam</label>
                <input
                  type="text"
                  placeholder="Contoh: Istirahat Tahap 1 (Opsional)"
                  value={periodKeterangan}
                  onChange={(e) => setPeriodKeterangan(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                {editPeriodId && (
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodMulai("");
                      setPeriodSelesai("");
                      setPeriodIsIstirahat(false);
                      setPeriodKeterangan("");
                      setEditPeriodId("");
                    }}
                    className="w-1/2 py-2.5 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className={`py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer ${
                    editPeriodId
                      ? "w-1/2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800"
                      : "w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800"
                  }`}
                >
                  {editPeriodId ? "Simpan Perubahan" : "Simpan Jam"}
                </button>
              </div>
            </form>
          </div>

          {/* List Period View */}
          <div className="xl:col-span-2 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              Timeline Jam Pelajaran Aktif
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 w-10">No</th>
                    <th className="pb-3 w-32">Kategori Hari</th>
                    <th className="pb-3 w-24">Jam Ke</th>
                    <th className="pb-3 w-36">Interval Waktu</th>
                    <th className="pb-3 w-28 text-center">Tipe Sesi</th>
                    <th className="pb-3">Keterangan</th>
                    <th className="pb-3 w-20 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {sortedPeriods.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        Belum ada konfigurasi jam pelajaran.
                      </td>
                    </tr>
                  ) : (
                    sortedPeriods.map((item, index) => (
                      <tr key={item.id} className={item.isIstirahat ? "bg-slate-950/20" : ""}>
                        <td className="py-4 text-slate-500">{index + 1}</td>
                        <td className="py-4 font-bold text-white">{item.hariTipe}</td>
                        <td className="py-4 text-slate-300 font-bold">{item.jamKe}</td>
                        <td className="py-4 font-mono text-xs text-indigo-300">{item.waktuMulai} - {item.waktuSelesai}</td>
                        <td className="py-4 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.isIstirahat
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {item.isIstirahat ? "Istirahat" : "Belajar"}
                          </span>
                        </td>
                        <td className="py-4 text-slate-400 italic text-xs">{item.keterangan || "-"}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setPeriodHariTipe(item.hariTipe);
                                setPeriodJamKe(item.jamKe);
                                setPeriodMulai(item.waktuMulai);
                                setPeriodSelesai(item.waktuSelesai);
                                setPeriodIsIstirahat(item.isIstirahat);
                                setPeriodKeterangan(item.keterangan || "");
                                setEditPeriodId(item.id);
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 cursor-pointer"
                              title="Edit Jam"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePeriod(item.id)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                              title="Hapus Jam"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: WAKA VIEW ALL JOURNALS -------------------- */}
      {activeTab === "jurnal" && user.role === "WAKA" && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                Semua Jurnal Mengajar Guru
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Laporan jurnal kegiatan KBM dari seluruh guru di setiap kelas.
              </p>
            </div>
            <div className="w-full sm:w-64 relative rounded-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Cari kelas, guru, mapel, judul..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 w-10">No</th>
                  <th className="pb-3 w-28">Tanggal</th>
                  <th className="pb-3 w-24">Kelas</th>
                  <th className="pb-3 w-28">Guru Pengajar</th>
                  <th className="pb-3 w-32">Mata Pelajaran</th>
                  <th className="pb-3 w-36">Nama Jurnal</th>
                  <th className="pb-3">Kegiatan</th>
                  <th className="pb-3 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredJournals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-500">
                      Belum ada laporan jurnal yang dikirimkan oleh guru.
                    </td>
                  </tr>
                ) : (
                  filteredJournals.map((item, index) => (
                    <tr key={item.id}>
                      <td className="py-4 text-slate-500">{index + 1}</td>
                      <td className="py-4 font-semibold text-white">
                        {new Date(item.tanggal).toLocaleDateString("id-ID", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        <div className="text-xs text-slate-400 font-normal">
                          Jam ke-{item.jamMulai} - {item.jamSelesai}
                        </div>
                      </td>
                      <td className="py-4 text-slate-300">Kelas {item.kelas.nama}</td>
                      <td className="py-4 font-medium text-white">{item.guru.nama}</td>
                      <td className="py-4 text-slate-300">{item.mapel.nama}</td>
                      <td className="py-4 text-white font-medium">{item.namaJurnal}</td>
                      <td className="py-4 pr-4">
                        <p className="text-slate-300 line-clamp-2" title={item.kegiatan}>
                          {item.kegiatan}
                        </p>
                      </td>
                      <td className="py-4 text-center">
                        <button
                          onClick={() => setSelectedJournal(item)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xxs font-bold border border-indigo-500/20 cursor-pointer"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- DETAIL JOURNAL DIALOG MODAL -------------------- */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-white">{selectedJournal.namaJurnal}</h4>
                <p className="text-xs text-slate-400">
                  {selectedJournal.mapel.nama} &bull; Kelas {selectedJournal.kelas.nama}
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-[10px] font-mono border border-indigo-500/20">
                Jam ke-{selectedJournal.jamMulai} - {selectedJournal.jamSelesai}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Guru Pengajar
                </span>
                <p className="text-sm font-semibold text-white">{selectedJournal.guru.nama}</p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Tanggal Kegiatan
                </span>
                <p className="text-sm text-slate-300">
                  {new Date(selectedJournal.tanggal).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Uraian Deskripsi Kegiatan
                </span>
                <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  {selectedJournal.kegiatan}
                </p>
              </div>

              {/* Photo & Photo description */}
              {(() => {
                const parseJurnalPhotos = (fotoStr: string | null): string[] => {
                  if (!fotoStr) return [];
                  if (fotoStr.startsWith("[")) {
                    try {
                      return JSON.parse(fotoStr) as string[];
                    } catch {
                      return [fotoStr];
                    }
                  }
                  return [fotoStr];
                };

                const parseJurnalPhotoCaptions = (captionStr: string | null): string[] => {
                  if (!captionStr) return [];
                  if (captionStr.startsWith("[")) {
                    try {
                      return JSON.parse(captionStr) as string[];
                    } catch {
                      return [captionStr];
                    }
                  }
                  return [captionStr];
                };

                const photos = parseJurnalPhotos(selectedJournal.foto);
                const captions = parseJurnalPhotoCaptions(selectedJournal.fotoKeterangan);

                if (photos.length === 0) return null;

                return (
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Foto Dokumentasi Kegiatan
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {photos.map((photoUrl, idx) => (
                        <div key={idx} className="space-y-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                          <img
                            src={photoUrl}
                            alt={`Dokumentasi Jurnal Mengajar ${idx + 1}`}
                            className="rounded-lg h-40 w-full object-cover border border-slate-850"
                          />
                          {captions[idx] && (
                            <p className="text-xs text-slate-400 italic px-1 leading-normal">
                              {captions[idx]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Counts information */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
                  <span className="block text-[10px] text-slate-400 font-semibold uppercase">Absensi Terisi</span>
                  <span className="text-lg font-bold text-indigo-400">{selectedJournal._count.absensi} Siswa</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
                  <span className="block text-[10px] text-slate-400 font-semibold uppercase">Nilai Terinput</span>
                  <span className="text-lg font-bold text-indigo-400">{selectedJournal._count.penilaian} Siswa</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedJournal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
