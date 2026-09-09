"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import {
  saveJamPelajaranAction,
  deleteJamPelajaranAction,
  saveMataPelajaranAction,
  deleteMataPelajaranAction,
  bulkDeleteMataPelajaranAction,
  saveJadwalAction,
  deleteJadwalAction,
  bulkDeleteJadwalAction,
  importJadwalExcelAction,
  createCustomActivityJurnalAction,
  getJurnalFullDetailAction,
  getDailyAttendanceMatrixAction,
  deleteCustomActivityJurnalAction,
} from "@/app/actions/schedule";
import {
  printJurnalMengajarPDF,
  printJurnalMengajarDailyPDF,
  exportKehadiranJurnalExcelMatrix,
  sortJournalsByKelasAndJam,
} from "@/lib/printUtils";
import { RENCANA_AKSI_OPTIONS } from "@/lib/rencanaAksiService";
import { compressImageFile } from "@/lib/imageUtils";
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
  Image as ImageIcon,
  Upload,
  FileUp,
  Loader2,
  School,
  Award,
  Eye,
  Edit3,
  Download,
  Printer,
  UserX,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import PenilaianManager from "@/components/PenilaianManager";

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
  0: "Minggu",
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

const DAY_ORDER: Record<string, number> = {
  SENIN: 1,
  SELASA: 2,
  RABU: 3,
  KAMIS: 4,
  JUMAT: 5,
  SABTU: 6,
  MINGGU: 7,
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

  // Print & Pending Jurnal state for WAKA
  const [printDate, setPrintDate] = useState<string>(() => {
    const today = new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(today);
  });
  const [showPendingTeachers, setShowPendingTeachers] = useState(false);

  // Compute today's string in WIB (Asia/Jakarta)
  const todayWibStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  // Selected Date for "Jadwal Mengajar" tab (Default: Today / todayWibStr)
  const [selectedTeacherDate, setSelectedTeacherDate] = useState<string>(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });

  const selectedTeacherDateObj = useMemo(() => {
    if (!selectedTeacherDate) return new Date();
    return new Date(`${selectedTeacherDate}T12:00:00.000Z`);
  }, [selectedTeacherDate]);

  const selectedTeacherDayNumber = useMemo(() => {
    const day = selectedTeacherDateObj.getUTCDay();
    return day === 0 ? 7 : day; // 1 = Senin, ..., 7 = Minggu
  }, [selectedTeacherDateObj]);

  const selectedTeacherDayName = useMemo(() => {
    const dayNames: Record<number, string> = {
      1: "Senin",
      2: "Selasa",
      3: "Rabu",
      4: "Kamis",
      5: "Jumat",
      6: "Sabtu",
      7: "Minggu",
    };
    return dayNames[selectedTeacherDayNumber] || "Senin";
  }, [selectedTeacherDayNumber]);

  const selectedTeacherDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(selectedTeacherDateObj);
  }, [selectedTeacherDateObj]);

  const teacherSchedulesForSelectedDate = useMemo(() => {
    return schedules
      .filter((sched) => {
        const schedGuruId = sched.guruId;
        if (user.role !== "WAKA" && schedGuruId !== user.id) return false;
        if (selectedTeacherDayNumber === 7 || selectedTeacherDayNumber === 0) {
          return sched.hari === 7 || sched.hari === 0;
        }
        return sched.hari === selectedTeacherDayNumber;
      })
      .sort((a, b) => a.jamMulai - b.jamMulai);
  }, [schedules, user.id, user.role, selectedTeacherDayNumber]);

  const journalsOnSelectedDate = useMemo(() => {
    return journals.filter((j) => {
      const jDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(j.tanggal));
      return jDateStr === selectedTeacherDate;
    });
  }, [journals, selectedTeacherDate]);

  const getJournalForScheduleOnSelectedDate = (sched: ScheduleItem) => {
    let match = journalsOnSelectedDate.find((j) => j.jadwalId === sched.id);
    if (!match) {
      match = journalsOnSelectedDate.find(
        (j) => j.kelasId === sched.kelasId && (j.guruId === user.id || j.guruId === sched.guruId)
      );
    }
    return match;
  };

  // Compute journals submitted today
  const todayJournals = useMemo(() => {
    return journals.filter((j) => {
      const jDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(j.tanggal));
      return jDateStr === todayWibStr;
    });
  }, [journals, todayWibStr]);

  const todayFilledJadwalIds = useMemo(() => {
    return new Set(todayJournals.map((j) => j.jadwalId).filter(Boolean));
  }, [todayJournals]);

  const todayFilledGuruKeySet = useMemo(() => {
    return new Set(todayJournals.map((j) => `${j.guruId}_${j.kelasId}`));
  }, [todayJournals]);

  const pendingSchedulesToday = useMemo(() => {
    return todaySchedules.filter((sched) => {
      if (sched.id && todayFilledJadwalIds.has(sched.id)) return false;
      if (todayFilledGuruKeySet.has(`${sched.guruId}_${sched.kelasId}`)) return false;
      return true;
    });
  }, [todaySchedules, todayFilledJadwalIds, todayFilledGuruKeySet]);

  const pendingTeachersList = useMemo(() => {
    const map = new Map<
      string,
      { guruNama: string; items: Array<{ kelasNama: string; mapelNama: string; jamMulai: number; jamSelesai: number }> }
    >();
    pendingSchedulesToday.forEach((sched) => {
      const guruId = sched.guruId || sched.guru?.nama;
      if (!guruId) return;
      if (!map.has(guruId)) {
        map.set(guruId, {
          guruNama: sched.guru?.nama || "Guru",
          items: [],
        });
      }
      map.get(guruId)!.items.push({
        kelasNama: sched.kelas?.nama?.replace(/^Kelas\s+/i, "") || sched.kelas?.nama || "-",
        mapelNama: sched.mapel?.nama || "-",
        jamMulai: sched.jamMulai,
        jamSelesai: sched.jamSelesai,
      });
    });
    return Array.from(map.values());
  }, [pendingSchedulesToday]);

  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const getFullJournalsForPrintDate = async () => {
    if (!printDate) {
      alert("Silakan pilih tanggal terlebih dahulu.");
      return null;
    }

    const targetJournals = journals.filter((j) => {
      const jDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(j.tanggal));
      return jDateStr === printDate;
    });

    if (targetJournals.length === 0) {
      alert(`Tidak ada laporan jurnal mengajar pada tanggal ${printDate}`);
      return null;
    }

    const dateObj = new Date(`${printDate}T12:00:00Z`);
    const dateLabel = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(dateObj);

    // Fetch full details (attendance lists & school settings)
    const resList = await Promise.all(targetJournals.map((j) => getJurnalFullDetailAction(j.id)));
    const fullJournals = resList.filter((r) => r.success && r.jurnal).map((r) => r.jurnal);
    const schoolSettings = resList[0]?.schoolSettings || { school_name: "SMA NEGERI 6 TANGERANG" };

    const sortedJournals = sortJournalsByKelasAndJam(fullJournals.length > 0 ? fullJournals : targetJournals);
    return { sortedJournals, dateLabel, schoolSettings };
  };

  const handlePrintAllJournalsForDate = async () => {
    try {
      setIsBulkProcessing(true);
      const data = await getFullJournalsForPrintDate();
      if (!data) return;
      printJurnalMengajarDailyPDF(data.sortedJournals, data.dateLabel, data.schoolSettings);
    } catch (e) {
      alert("Terjadi kesalahan saat memuat data untuk cetak PDF.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExportKehadiranExcelForDate = async () => {
    if (!printDate) {
      alert("Silakan pilih tanggal terlebih dahulu.");
      return;
    }

    try {
      setIsBulkProcessing(true);
      const res = await getDailyAttendanceMatrixAction(printDate);
      if (!res || !res.success || !res.classes) {
        alert(res?.error || "Gagal memuat data matriks kehadiran.");
        return;
      }

      const dateObj = new Date(`${printDate}T12:00:00Z`);
      const dateLabel = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(dateObj);

      await exportKehadiranJurnalExcelMatrix(res as any, dateLabel);
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat mengekspor data matriks kehadiran ke Excel.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

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
  const [schedJamSelesai, setSchedJamSelesai] = useState<number>(1);
  const [editSchedId, setEditSchedId] = useState("");

  // Excel Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError("Pilih file Excel (.xlsx / .xls) terlebih dahulu.");
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await importJadwalExcelAction(base64);
        setIsImporting(false);
        if (res.error) {
          setImportError(res.error);
        } else {
          setImportSuccess(res.message || "Import jadwal Excel berhasil!");
          setTimeout(() => {
            setShowImportModal(false);
            window.location.reload();
          }, 1500);
        }
      };
      reader.readAsDataURL(importFile);
    } catch (err: any) {
      setIsImporting(false);
      setImportError(`Gagal membaca file: ${err.message || err}`);
    }
  };

  // Bulk Selection States
  const [selectedSchedIds, setSelectedSchedIds] = useState<string[]>([]);
  const [selectedMapelIds, setSelectedMapelIds] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [selectedJournal, setSelectedJournal] = useState<JournalItem | null>(null);

  // Custom Activity Modal State
  const [editingCustomActivityId, setEditingCustomActivityId] = useState<string | null>(null);
  const [showCustomActivityModal, setShowCustomActivityModal] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split("T")[0]);
  const [activityJamMulai, setActivityJamMulai] = useState("07.00");
  const [activityJamSelesai, setActivityJamSelesai] = useState("16.00");
  const [activityRencanaAksi, setActivityRencanaAksi] = useState(RENCANA_AKSI_OPTIONS[0]);
  const [activityClassId, setActivityClassId] = useState("");
  const [activityMapelId, setActivityMapelId] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [modalCustomError, setModalCustomError] = useState("");

  interface CustomPhotoDoc {
    file: File | null;
    preview: string | null;
    caption: string;
  }
  const [activityPhotos, setActivityPhotos] = useState<CustomPhotoDoc[]>([
    { file: null, preview: null, caption: "" },
    { file: null, preview: null, caption: "" },
    { file: null, preview: null, caption: "" },
  ]);

  const parseCustomActivityTitle = (namaJurnal: string) => {
    let title = namaJurnal || "";
    let jamMulai = "07.00";
    let jamSelesai = "16.00";

    const match = title.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      title = match[1].trim();
      const timeRange = match[2].trim();
      const parts = timeRange.split("-").map((p) => p.trim());
      if (parts.length === 2) {
        jamMulai = parts[0];
        jamSelesai = parts[1];
      } else if (parts.length === 1 && parts[0]) {
        jamMulai = parts[0];
      }
    }

    return { title, jamMulai, jamSelesai };
  };

  const parseCustomActivityPhotos = (fotoStr?: string | null, ketStr?: string | null): CustomPhotoDoc[] => {
    const result: CustomPhotoDoc[] = [
      { file: null, preview: null, caption: "" },
      { file: null, preview: null, caption: "" },
      { file: null, preview: null, caption: "" },
    ];

    if (!fotoStr) return result;

    let urls: string[] = [];
    let kets: string[] = [];

    try {
      urls = fotoStr.startsWith("[") ? JSON.parse(fotoStr) : [fotoStr];
    } catch {
      urls = [fotoStr];
    }

    if (ketStr) {
      try {
        kets = ketStr.startsWith("[") ? JSON.parse(ketStr) : [ketStr];
      } catch {
        kets = [ketStr];
      }
    }

    urls.forEach((url, idx) => {
      if (idx < 3) {
        result[idx] = {
          file: null,
          preview: url,
          caption: kets[idx] || "",
        };
      }
    });

    return result;
  };

  const handleOpenAddCustomActivityModal = () => {
    if (classes.length > 0) setActivityClassId(classes[0].id);
    if (subjects.length > 0) setActivityMapelId(subjects[0].id);
    setEditingCustomActivityId(null);
    setActivityTitle("");
    setActivityDate(todayWibStr);
    setActivityJamMulai("07.00");
    setActivityJamSelesai("16.00");
    setActivityRencanaAksi(RENCANA_AKSI_OPTIONS[0]);
    setActivityDescription("");
    setActivityPhotos([
      { file: null, preview: null, caption: "" },
      { file: null, preview: null, caption: "" },
      { file: null, preview: null, caption: "" },
    ]);
    setModalCustomError("");
    setShowCustomActivityModal(true);
  };

  const handleEditCustomActivity = (item: any) => {
    const { title, jamMulai, jamSelesai } = parseCustomActivityTitle(item.namaJurnal || "");
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(item.tanggal));

    setEditingCustomActivityId(item.id);
    setActivityTitle(title);
    setActivityDate(dateStr);
    setActivityJamMulai(jamMulai);
    setActivityJamSelesai(jamSelesai);
    setActivityRencanaAksi(item.rencanaAksi || RENCANA_AKSI_OPTIONS[0]);
    setActivityDescription(item.kegiatan || "");
    setActivityPhotos(parseCustomActivityPhotos(item.foto, item.fotoKeterangan));
    if (item.kelasId) setActivityClassId(item.kelasId);
    if (item.mapelId) setActivityMapelId(item.mapelId);
    setModalCustomError("");
    setSelectedJournal(null);
    setShowCustomActivityModal(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const editCustomId = params.get("editCustomId");
      if (editCustomId) {
        const found = journals.find((j) => j.id === editCustomId);
        if (found) {
          handleEditCustomActivity(found);
        }
      }
    }
  }, [journals]);

  const handleCustomActivityPhotoChange = async (index: number, file: File | null) => {
    if (file) {
      try {
        const compressedBase64 = await compressImageFile(file, 1200, 0.75);
        setActivityPhotos((prev) => {
          const next = [...prev];
          next[index] = {
            file: null,
            preview: compressedBase64,
            caption: next[index].caption,
          };
          return next;
        });
      } catch (err) {
        console.error("Compression error:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setActivityPhotos((prev) => {
            const next = [...prev];
            next[index] = {
              file: null,
              preview: reader.result as string,
              caption: next[index].caption,
            };
            return next;
          });
        };
        reader.readAsDataURL(file);
      }
    } else {
      setActivityPhotos((prev) => {
        const next = [...prev];
        next[index] = {
          file: null,
          preview: null,
          caption: "",
        };
        return next;
      });
    }
  };

  const handleCustomActivityCaptionChange = (index: number, caption: string) => {
    setActivityPhotos((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        caption,
      };
      return next;
    });
  };

  const handleCustomActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle || !activityDescription) {
      setModalCustomError("Nama Kegiatan dan Deskripsi Kegiatan wajib diisi.");
      return;
    }

    setModalCustomError("");
    setActionError("");
    setActionSuccess("");

    const formData = new FormData();
    if (editingCustomActivityId) {
      formData.append("jurnalId", editingCustomActivityId);
    }
    formData.append("namaJurnal", activityTitle);
    formData.append("tanggal", activityDate);
    formData.append("jamMulai", activityJamMulai);
    formData.append("jamSelesai", activityJamSelesai);
    formData.append("waktu", `${activityJamMulai} - ${activityJamSelesai}`);
    formData.append("rencanaAksi", activityRencanaAksi);
    formData.append("kegiatan", activityDescription);
    if (activityClassId) formData.append("kelasId", activityClassId);
    if (activityMapelId) formData.append("mapelId", activityMapelId);

    activityPhotos.forEach((doc, idx) => {
      if (doc.file) {
        formData.append(`foto_${idx}`, doc.file);
        formData.append(`fotoKeterangan_${idx}`, doc.caption);
      } else if (doc.preview) {
        if (doc.preview.startsWith("data:image")) {
          formData.append(`fotoBase64_${idx}`, doc.preview);
        } else {
          formData.append(`fotoUrl_${idx}`, doc.preview);
        }
        formData.append(`fotoKeterangan_${idx}`, doc.caption);
      }
    });

    startTransition(async () => {
      try {
        const res = await createCustomActivityJurnalAction(formData);
        if (res.error) {
          setModalCustomError(res.error);
          setActionError(res.error);
        } else {
          setActionSuccess(res.message || (editingCustomActivityId ? "Kegiatan berhasil diperbarui." : "Kegiatan berhasil ditambahkan ke Jurnal."));
          setShowCustomActivityModal(false);
          setEditingCustomActivityId(null);
          setActivityTitle("");
          setActivityJamMulai("07.00");
          setActivityJamSelesai("16.00");
          setActivityRencanaAksi(RENCANA_AKSI_OPTIONS[0]);
          setActivityDescription("");
          setModalCustomError("");
          setActivityPhotos([
            { file: null, preview: null, caption: "" },
            { file: null, preview: null, caption: "" },
            { file: null, preview: null, caption: "" },
          ]);
          window.location.reload();
        }
      } catch (err: any) {
        console.error("Submit custom activity error:", err);
        setModalCustomError(
          err.message || "Gagal mengunggah foto. Silakan coba lagi."
        );
      }
    });
  };

  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [downloadingDailyDate, setDownloadingDailyDate] = useState<string | null>(null);
  const [deletingJournalId, setDeletingJournalId] = useState<string | null>(null);

  const handleDeleteCustomActivity = async (jurnalId: string, namaJurnal: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kegiatan tambahan "${namaJurnal}"?`)) {
      return;
    }
    setDeletingJournalId(jurnalId);
    try {
      const res = await deleteCustomActivityJurnalAction(jurnalId);
      if (res.success) {
        alert(res.message || "Kegiatan tambahan berhasil dihapus.");
        window.location.reload();
      } else {
        alert(res.error || "Gagal menghapus kegiatan tambahan.");
      }
    } catch (e) {
      alert("Terjadi kesalahan saat menghapus.");
    } finally {
      setDeletingJournalId(null);
    }
  };

  const handleDownloadJournalPDF = async (jurnalId: string) => {
    setDownloadingPdfId(jurnalId);
    try {
      const res = await getJurnalFullDetailAction(jurnalId);
      if (res.success && res.jurnal) {
        printJurnalMengajarPDF(res.jurnal, res.schoolSettings);
      } else {
        alert(res.error || "Gagal mengunduh berkas Jurnal.");
      }
    } catch (e) {
      alert("Terjadi kesalahan saat membuat dokumen PDF.");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleDownloadDailyJournalPDF = async (jurnalIds: string[], dateLabel: string) => {
    setDownloadingDailyDate(dateLabel);
    try {
      const resList = await Promise.all(jurnalIds.map((id) => getJurnalFullDetailAction(id)));
      const fullJournals = resList.filter((r) => r.success && r.jurnal).map((r) => r.jurnal);
      const schoolSettings = resList[0]?.schoolSettings || {};

      if (fullJournals.length > 0) {
        printJurnalMengajarDailyPDF(fullJournals, dateLabel, schoolSettings);
      } else {
        alert("Gagal memuat data jurnal harian.");
      }
    } catch (e) {
      alert("Terjadi kesalahan saat membuat dokumen PDF Harian.");
    } finally {
      setDownloadingDailyDate(null);
    }
  };

  // Bulk Delete Handlers
  const handleSelectAllSched = (filteredList: ScheduleItem[]) => {
    const allFilteredIds = filteredList.map((item) => item.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedSchedIds.includes(id));
    if (isAllSelected) {
      setSelectedSchedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedSchedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleToggleSchedSelect = (id: string) => {
    setSelectedSchedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteSched = async () => {
    if (selectedSchedIds.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedSchedIds.length} jadwal pelajaran terpilih?`)) return;

    setActionError("");
    setActionSuccess("");

    startTransition(async () => {
      const res = await bulkDeleteJadwalAction(selectedSchedIds);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Jadwal terpilih berhasil dihapus.");
        setSchedules((prev) => prev.filter((s) => !selectedSchedIds.includes(s.id)));
        setSelectedSchedIds([]);
      }
    });
  };

  const handleSelectAllMapel = (filteredList: SubjectOption[]) => {
    const allFilteredIds = filteredList.map((item) => item.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedMapelIds.includes(id));
    if (isAllSelected) {
      setSelectedMapelIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedMapelIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleToggleMapelSelect = (id: string) => {
    setSelectedMapelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteMapel = async () => {
    if (selectedMapelIds.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedMapelIds.length} mata pelajaran terpilih?`)) return;

    setActionError("");
    setActionSuccess("");

    startTransition(async () => {
      const res = await bulkDeleteMataPelajaranAction(selectedMapelIds);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Mata pelajaran terpilih berhasil dihapus.");
        setSubjectList((prev) => prev.filter((s) => !selectedMapelIds.includes(s.id)));
        setSelectedMapelIds([]);
      }
    });
  };

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

  const groupedJournalsByDate = useMemo(() => {
    const map = new Map<string, typeof filteredJournals>();

    filteredJournals.forEach((item) => {
      const dKey = new Date(item.tanggal).toISOString().split("T")[0];
      if (!map.has(dKey)) {
        map.set(dKey, []);
      }
      map.get(dKey)!.push(item);
    });

    const result: {
      dateKey: string;
      dateLabel: string;
      journals: typeof filteredJournals;
      groupIndex: number;
    }[] = [];

    let idx = 1;
    map.forEach((journals, dateKey) => {
      const dateLabel = new Date(journals[0].tanggal).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      });
      result.push({
        dateKey,
        dateLabel,
        journals,
        groupIndex: idx++,
      });
    });

    return result;
  }, [filteredJournals]);

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
              Jadwal Mengajar
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
              Riwayat Jurnal
            </button>
          </>
        )}
      </div>

      {/* Contents based on Active Tab */}

      {/* -------------------- TAB: GURU JADWAL MENGAJAR -------------------- */}
      {activeTab === "today" && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-400" />
                Jadwal Mengajar Hari {selectedTeacherDayName}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedTeacherDateLabel} • Menampilkan agenda mengajar sesuai tanggal yang dipilih.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Tanggal:</span>
                <input
                  type="date"
                  value={selectedTeacherDate}
                  onChange={(e) => setSelectedTeacherDate(e.target.value)}
                  className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
                />
              </div>

              {selectedTeacherDate !== todayWibStr && (
                <button
                  onClick={() => setSelectedTeacherDate(todayWibStr)}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Hari Ini
                </button>
              )}

              <button
                onClick={handleOpenAddCustomActivityModal}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kegiatan</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {teacherSchedulesForSelectedDate.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-950/20 border border-slate-900 rounded-2xl">
                Tidak ada agenda jadwal mengajar untuk hari <span className="font-bold text-slate-400">{selectedTeacherDayName}</span> ({selectedTeacherDateLabel}).
              </div>
            ) : (
              teacherSchedulesForSelectedDate.map((sched) => {
                const existingJournal = getJournalForScheduleOnSelectedDate(sched);
                const filled = !!existingJournal;
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
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Jurnal Terisi
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedJournal(existingJournal)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Lihat
                            </button>
                            <Link
                              href={`/jadwal/jurnal/isi?jurnalId=${existingJournal.id}&tanggal=${selectedTeacherDate}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={`/jadwal/jurnal/isi?jadwalId=${sched.id}&tanggal=${selectedTeacherDate}`}
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

      {/* -------------------- TAB: KELAS SAYA -------------------- */}
      {activeTab === "kelas" && (
        <PenilaianManager user={user} defaultMode="KELAS" />
      )}

      {/* -------------------- TAB: PENILAIAN SISWA -------------------- */}
      {activeTab === "penilaian" && (
        <PenilaianManager user={user} defaultMode="PENILAIAN" />
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

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="min-w-[850px] w-full divide-y divide-slate-800 border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-950">
                  <th className="px-4 py-3.5 w-12 text-center border-b border-r border-slate-800/60">No</th>
                  <th className="px-4 py-3.5 w-36 text-center border-b border-r border-slate-800/60">Tanggal</th>
                  <th className="px-4 py-3.5 w-64 border-b border-r border-slate-800/60">Nama Jurnal</th>
                  <th className="px-4 py-3.5 border-b border-r border-slate-800/60">Deskripsi</th>
                  <th className="px-4 py-3.5 w-52 text-center border-b border-r border-slate-800/60">Aksi Sesi</th>
                  <th className="px-4 py-3.5 w-40 text-center border-b border-slate-800/60">Aksi Per Hari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {groupedJournalsByDate.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      Belum ada data jurnal mengajar yang Anda catat.
                    </td>
                  </tr>
                ) : (
                  groupedJournalsByDate.map((group) =>
                    group.journals.map((item, itemIdx) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        {itemIdx === 0 && (
                          <>
                            <td rowSpan={group.journals.length} className="px-4 py-4 text-center font-medium text-slate-400 align-middle border-r border-slate-800/60">
                              {group.groupIndex}
                            </td>
                            <td rowSpan={group.journals.length} className="px-4 py-4 text-center font-bold text-white align-middle border-r border-slate-800/60 whitespace-nowrap">
                              {group.dateLabel}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-4 font-medium text-white border-r border-slate-800/60">
                          <div className="font-semibold text-white text-sm leading-snug">{item.namaJurnal}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {!item.jadwalId || item.kelas?.nama === "KEGIATAN UMUM" || item.mapel?.nama === "Kegiatan Pembelajaran" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                                Kegiatan Tambahan
                              </span>
                            ) : (
                              <>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                                  Kelas {item.kelas?.nama || "-"}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                                  Jam ke-{item.jamMulai}{item.jamMulai !== item.jamSelesai ? `-${item.jamSelesai}` : ""}
                                </span>
                                {item.mapel?.nama && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                                    {item.mapel.nama}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 border-r border-slate-800/60">
                          <p className="text-slate-300 line-clamp-2 text-xs sm:text-sm leading-relaxed" title={item.kegiatan}>
                            {item.kegiatan}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-center border-r border-slate-800/60 align-middle">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSelectedJournal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Lihat
                            </button>
                            {(!item.jadwalId || item.kelas?.nama === "KEGIATAN UMUM" || item.mapel?.nama === "Kegiatan Pembelajaran") ? (
                              <button
                                type="button"
                                onClick={() => handleEditCustomActivity(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                              </button>
                            ) : (
                              <Link
                                href={`/jadwal/jurnal/isi?jurnalId=${item.id}${item.jadwalId ? `&jadwalId=${item.jadwalId}` : ''}&tanggal=${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.tanggal))}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                              </Link>
                            )}
                            {(!item.jadwalId || item.kelas?.nama === "KEGIATAN UMUM" || item.mapel?.nama === "Kegiatan Pembelajaran") && (
                              <button
                                onClick={() => handleDeleteCustomActivity(item.id, item.namaJurnal)}
                                disabled={deletingJournalId === item.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white text-[11px] font-bold transition cursor-pointer"
                              >
                                {deletingJournalId === item.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Hapus
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadJournalPDF(item.id)}
                              disabled={downloadingPdfId === item.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-[11px] font-bold transition cursor-pointer"
                            >
                              {downloadingPdfId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              Download
                            </button>
                          </div>
                        </td>
                        {itemIdx === 0 && (
                          <td rowSpan={group.journals.length} className="px-4 py-4 text-center align-middle">
                            <button
                              onClick={() => handleDownloadDailyJournalPDF(group.journals.map((j) => j.id), group.dateLabel)}
                              disabled={downloadingDailyDate === group.dateLabel}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-sky-500/10 whitespace-nowrap"
                            >
                              {downloadingDailyDate === group.dateLabel ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Printer className="w-3.5 h-3.5 text-sky-200" />
                              )}
                              <span>Download Perhari</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB: WAKA JADWAL PELAJARAN -------------------- */}
      {activeTab === "jadwal" && user.role === "WAKA" && (
        <div className="space-y-6">
          {/* Banner Import Excel */}
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-indigo-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Import Jadwal Massal dari Excel (`JADWAL_PER_KELAS.xlsx`)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Otomatis membaca 32 sheet kelas (X 1 s/d XII D3), membuat kelas, akun guru, mapel, &amp; 1.300+ slot jadwal sekaligus.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportError(null);
                setImportSuccess(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import File Excel
            </button>
          </div>

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
                    <option value="7">Minggu</option>
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
                {selectedSchedIds.length > 0 && (
                  <button
                    onClick={handleBulkDeleteSched}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Terpilih ({selectedSchedIds.length})
                  </button>
                )}

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
                    <th className="pb-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredSchedules.length > 0 &&
                          filteredSchedules.every((s) => selectedSchedIds.includes(s.id))
                        }
                        onChange={() => handleSelectAllSched(filteredSchedules)}
                        className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Pilih Semua Jadwal"
                      />
                    </th>
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
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        Tidak ada data jadwal ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((item, index) => (
                      <tr key={item.id} className={selectedSchedIds.includes(item.id) ? "bg-indigo-500/10" : ""}>
                        <td className="py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedSchedIds.includes(item.id)}
                            onChange={() => handleToggleSchedSelect(item.id)}
                            className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-400" />
                Database Mata Pelajaran
              </h3>

              {selectedMapelIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteMapel}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Terpilih ({selectedMapelIds.length})
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          subjectList.length > 0 &&
                          subjectList.every((s) => selectedMapelIds.includes(s.id))
                        }
                        onChange={() => handleSelectAllMapel(subjectList)}
                        className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Pilih Semua Mapel"
                      />
                    </th>
                    <th className="pb-3 w-10">No</th>
                    <th className="pb-3 w-32">Kode Mapel</th>
                    <th className="pb-3">Nama Mata Pelajaran</th>
                    <th className="pb-3 w-20 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {subjectList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-500">
                        Belum ada data mata pelajaran.
                      </td>
                    </tr>
                  ) : (
                    subjectList.map((item, index) => (
                      <tr key={item.id} className={selectedMapelIds.includes(item.id) ? "bg-indigo-500/10" : ""}>
                        <td className="py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMapelIds.includes(item.id)}
                            onChange={() => handleToggleMapelSelect(item.id)}
                            className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
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
                  <option value="MINGGU">Minggu</option>
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
          {/* Header Controls & Bulk Print */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/60 pb-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                Semua Jurnal Mengajar Guru
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Laporan jurnal kegiatan KBM seluruh guru. Gunakan fitur filter dan cetak laporan per-tanggal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="w-full sm:w-56 relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Cari kelas, guru, mapel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Date selection & Action Buttons: PDF & Excel */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <input
                    type="date"
                    value={printDate}
                    onChange={(e) => setPrintDate(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  disabled={isBulkProcessing}
                  onClick={handlePrintAllJournalsForDate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  title="Cetak semua jurnal pada tanggal yang dipilih dalam 1 file PDF (Urut Kelas X-XII & Jam 1-9)"
                >
                  {isBulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  <span>Cetak PDF (1 File)</span>
                </button>

                <button
                  type="button"
                  disabled={isBulkProcessing}
                  onClick={handleExportKehadiranExcelForDate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  title="Ekspor rekap kehadiran siswa ke Excel (.xlsx) (Urut Kelas X-XII & Jam 1-9)"
                >
                  {isBulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  <span>Cetak Kehadiran (Excel)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Top Summary Banner: Status Pengisian Jurnal Hari Ini */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-400" />
                  Ringkasan Pengisian Jurnal Hari Ini
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pantau guru yang telah dan belum mengisi jurnal mengajar pada agenda KBM hari ini.
                </p>
              </div>

              {pendingTeachersList.length > 0 && (
                <button
                  onClick={() => setShowPendingTeachers(!showPendingTeachers)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold transition-all cursor-pointer w-fit"
                >
                  <UserX className="w-4 h-4" />
                  <span>{pendingTeachersList.length} Guru Belum Mengisi</span>
                  {showPendingTeachers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Agenda Sesi Hari Ini</p>
                  <p className="text-xl font-black text-white mt-0.5">{todaySchedules.length} Sesi</p>
                </div>
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Jurnal Terisi Hari Ini</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">{todayJournals.length} Sesi</p>
                </div>
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Belum Mengisi Hari Ini</p>
                  <p className={`text-xl font-black mt-0.5 ${pendingTeachersList.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {pendingTeachersList.length} Guru ({pendingSchedulesToday.length} Sesi)
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl border ${pendingTeachersList.length > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                  {pendingTeachersList.length > 0 ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <Check className="w-5 h-5 text-emerald-400" />}
                </div>
              </div>
            </div>

            {/* List of Teachers Pending Today */}
            {pendingTeachersList.length === 0 ? (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Semua guru yang memiliki agenda mengajar hari ini telah mengisikan jurnal! 🎉</span>
              </div>
            ) : (
              (showPendingTeachers || pendingTeachersList.length <= 5) && (
                <div className="pt-2 border-t border-slate-800/60 space-y-2">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Daftar Guru Belum Mengisi Jurnal Mengajar Hari Ini:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {pendingTeachersList.map((teacher, tIdx) => (
                      <div key={tIdx} className="bg-slate-900/80 p-3 rounded-xl border border-amber-500/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white truncate max-w-[180px]">{teacher.guruNama}</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-semibold border border-amber-500/20 shrink-0">
                            {teacher.items.length} Sesi Belum
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] text-slate-400">
                          {teacher.items.map((item, iIdx) => (
                            <div key={iIdx} className="flex items-center justify-between gap-1 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800">
                              <span className="font-semibold text-indigo-300 shrink-0">{item.kelasNama}</span>
                              <span className="truncate text-slate-300">{item.mapelNama}</span>
                              <span className="text-[9px] text-slate-500 shrink-0">Jam {item.jamMulai}-{item.jamSelesai}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Clean Table Section */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="min-w-[950px] w-full divide-y divide-slate-800 border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-950">
                  <th className="px-4 py-3.5 w-12 text-center border-b border-r border-slate-800/60">No</th>
                  <th className="px-4 py-3.5 w-36 text-center border-b border-r border-slate-800/60">Tanggal & Sesi</th>
                  <th className="px-4 py-3.5 w-28 text-center border-b border-r border-slate-800/60">Kelas</th>
                  <th className="px-4 py-3.5 w-48 border-b border-r border-slate-800/60">Guru Pengajar</th>
                  <th className="px-4 py-3.5 w-44 border-b border-r border-slate-800/60">Mata Pelajaran</th>
                  <th className="px-4 py-3.5 w-48 border-b border-r border-slate-800/60">Nama Jurnal</th>
                  <th className="px-4 py-3.5 border-b border-r border-slate-800/60">Uraian Kegiatan</th>
                  <th className="px-4 py-3.5 w-24 text-center border-b border-slate-800/60">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                {filteredJournals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-500">
                      Belum ada laporan jurnal yang dikirimkan oleh guru.
                    </td>
                  </tr>
                ) : (
                  sortJournalsByKelasAndJam(filteredJournals).map((item, index) => {
                    const isCustomActivityRow = !item.jadwalId || item.kelas?.nama === "KEGIATAN UMUM" || item.mapel?.nama === "Kegiatan Pembelajaran";
                    const cleanKelasNama = item.kelas?.nama?.replace(/^Kelas\s+/i, "") || "-";
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-3.5 text-center text-slate-500 font-medium border-r border-slate-800/60 align-middle">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3.5 text-center border-r border-slate-800/60 align-middle">
                          <div className="font-semibold text-white whitespace-nowrap">
                            {new Date(item.tanggal).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          {isCustomActivityRow ? (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-semibold border border-amber-500/20 whitespace-nowrap">
                              Non-KBM
                            </span>
                          ) : (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-mono border border-indigo-500/20 whitespace-nowrap">
                              Jam {item.jamMulai} - {item.jamSelesai}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center border-r border-slate-800/60 align-middle">
                          {isCustomActivityRow ? (
                            <span className="inline-flex px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs whitespace-nowrap">
                              Kegiatan Tambahan
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-xs whitespace-nowrap">
                              {cleanKelasNama}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-800/60 align-middle">
                          <span className="font-semibold text-white leading-tight block">{item.guru?.nama || "-"}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 border-r border-slate-800/60 align-middle font-medium">
                          {isCustomActivityRow ? "Kegiatan Tambahan" : item.mapel?.nama || "-"}
                        </td>
                        <td className="px-4 py-3.5 text-white font-medium border-r border-slate-800/60 align-middle">
                          {item.namaJurnal}
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-800/60 align-middle">
                          <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed" title={item.kegiatan}>
                            {item.kegiatan}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center align-middle">
                          <button
                            onClick={() => setSelectedJournal(item)}
                            className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition cursor-pointer whitespace-nowrap"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
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
            {(() => {
              const isCustomActivityModal = !selectedJournal.jadwalId || selectedJournal.kelas?.nama === "KEGIATAN UMUM" || selectedJournal.mapel?.nama === "Kegiatan Pembelajaran";
              return (
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-white">{selectedJournal.namaJurnal}</h4>
                    <p className="text-xs text-slate-400">
                      {isCustomActivityModal ? (
                        <span className="text-amber-400 font-semibold">Kegiatan Tambahan</span>
                      ) : (
                        <>{selectedJournal.mapel?.nama} &bull; Kelas {selectedJournal.kelas?.nama}</>
                      )}
                    </p>
                  </div>
                  {!isCustomActivityModal && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-[10px] font-mono border border-indigo-500/20">
                      Jam ke-{selectedJournal.jamMulai} - {selectedJournal.jamSelesai}
                    </span>
                  )}
                </div>
              );
            })()}

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
                    timeZone: "Asia/Jakarta",
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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              {(!selectedJournal.jadwalId || selectedJournal.kelas?.nama === "KEGIATAN UMUM" || selectedJournal.mapel?.nama === "Kegiatan Pembelajaran") && (
                <>
                  <button
                    type="button"
                    onClick={() => handleEditCustomActivity(selectedJournal)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Kegiatan
                  </button>
                  <button
                    onClick={() => {
                      const id = selectedJournal.id;
                      const nama = selectedJournal.namaJurnal;
                      setSelectedJournal(null);
                      handleDeleteCustomActivity(id, nama);
                    }}
                    disabled={deletingJournalId === selectedJournal.id}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {deletingJournalId === selectedJournal.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Hapus Kegiatan
                  </button>
                </>
              )}
              <button
                onClick={() => handleDownloadJournalPDF(selectedJournal.id)}
                disabled={downloadingPdfId === selectedJournal.id}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                {downloadingPdfId === selectedJournal.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5" />
                )}
                Cetak / Download PDF
              </button>
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

      {/* EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Import Jadwal Pelajaran Massal</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="p-6 space-y-5 text-xs">
              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="font-semibold text-slate-200">Ketentuan File Excel:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400 leading-relaxed">
                  <li>Format file: <code className="text-indigo-300 font-mono">JADWAL_PER_KELAS.xlsx</code> (.xlsx / .xls).</li>
                  <li>Setiap Sheet berisi jadwal kelas (<span className="text-slate-300">X 1, X 2, ..., XII D3</span>).</li>
                  <li>Sistem otomatis mendaftarkan Akun Guru baru &amp; Mata Pelajaran jika belum ada.</li>
                  <li>Sistem otomatis memasukkan 1.300+ slot jam mengajar secara instan.</li>
                </ul>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-2">Pilih File Excel Jadwal</label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setImportFile(e.target.files[0]);
                      setImportError(null);
                    }
                  }}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 border border-slate-800 rounded-xl bg-slate-950 p-2 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !importFile}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isImporting ? "Mengimpor Data..." : "Mulai Import Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH KEGIATAN BARU */}
      {showCustomActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl sm:max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-4 sm:p-6 space-y-4 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" />
                  {editingCustomActivityId ? "Edit Kegiatan Jurnal" : "Tambah Kegiatan Jurnal Baru"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingCustomActivityId
                    ? "Perbarui uraian kegiatan tambahan atau dokumentasi foto."
                    : "Tambahkan catatan kegiatan di luar jadwal reguler (Ekstrakurikuler, Pembinaan, KBM Tambahan, dll)."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomActivityModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalCustomError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalCustomError}</span>
              </div>
            )}

            <form onSubmit={handleCustomActivitySubmit} className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nama Kegiatan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pembinaan Siswa / KBM Tambahan"
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Tanggal (Otomatis Hari Ini) *
                  </label>
                  <input
                    type="date"
                    required
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* JAM MULAI & JAM AKHIR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Jam Mulai *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="07.00"
                      value={activityJamMulai}
                      onChange={(e) => setActivityJamMulai(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Jam Akhir *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="16.00"
                      value={activityJamSelesai}
                      onChange={(e) => setActivityJamSelesai(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Rencana Aksi Kinerja *
                  </label>
                  <select
                    value={activityRencanaAksi}
                    onChange={(e) => setActivityRencanaAksi(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {RENCANA_AKSI_OPTIONS.map((option, idx) => (
                      <option key={idx} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Deskripsi Kegiatan *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Uraikan jalannya kegiatan atau materi yang disampaikan..."
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Foto Kegiatan & Dokumentasi (Maksimal 3 Foto)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {activityPhotos.map((doc, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                        <span>Foto Dokumentasi #{idx + 1}</span>
                        {doc.preview && (
                          <button
                            type="button"
                            onClick={() => handleCustomActivityPhotoChange(idx, null)}
                            className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer text-[10px]"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      {doc.preview ? (
                        <div className="space-y-2">
                          <img src={doc.preview} alt={`Preview ${idx + 1}`} className="rounded-lg h-24 w-full object-cover border border-slate-800" />
                          <input
                            type="text"
                            placeholder="Keterangan foto..."
                            value={doc.caption}
                            onChange={(e) => handleCustomActivityCaptionChange(idx, e.target.value)}
                            className="block w-full px-2.5 py-1.5 border border-slate-800 rounded-lg bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-slate-800 rounded-xl cursor-pointer bg-slate-950/20 hover:bg-slate-950/40 transition-all gap-1.5 p-2 text-center">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-400">Upload Foto #{idx + 1}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleCustomActivityPhotoChange(idx, file);
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCustomActivityModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isPending ? "Menyimpan..." : (editingCustomActivityId ? "Simpan Perubahan Kegiatan" : "Simpan Kegiatan Jurnal")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
