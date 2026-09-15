"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getTodayWibStr } from "@/lib/dateUtils";
import {
  getTeacherClassesAndSubjectsAction,
  getPenilaianKelasListAction,
  createPenilaianKelasAction,
  deletePenilaianKelasAction,
  getPenilaianDetailAndStudentsAction,
  savePenilaianSiswaAction,
  getRekapRaporKurikulumMerdekaAction,
  getTujuanPembelajaranListAction,
  createTujuanPembelajaranAction,
  deleteTujuanPembelajaranAction,
} from "@/app/actions/penilaian";
import {
  School,
  BookOpen,
  Plus,
  ArrowLeft,
  Calendar,
  FileText,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Award,
  ChevronRight,
  Download,
  Calculator,
  Sliders,
  Sparkles,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";

interface MapelItem {
  id: string;
  kode: string;
  nama: string;
}

interface ClassItem {
  id: string;
  nama: string;
  mapels: MapelItem[];
}

interface PenilaianHeader {
  id: string;
  namaPenilaian: string;
  jenisPenilaian?: string; // "FORMATIF" | "SUMATIF" | "PAS_UAS"
  materi?: string;
  tpCode?: string;
  tanggal: string;
  deskripsi: string;
  totalTerisi: number;
}

interface StudentGradeItem {
  siswaId: string;
  nis: string;
  nisn: string;
  nama: string;
  nilai: number | null;
  catatan: string;
}

interface PenilaianManagerProps {
  user: {
    id: string;
    role: string;
    nama: string;
  };
  defaultMode?: "KELAS" | "PENILAIAN";
}

export default function PenilaianManager({ user, defaultMode = "KELAS" }: PenilaianManagerProps) {
  const [activeTab, setActiveTab] = useState<"KELAS" | "PENILAIAN">(defaultMode);

  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Selected State
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedMapel, setSelectedMapel] = useState<MapelItem | null>(null);

  // Penilaian Headers State
  const [penilaianList, setPenilaianList] = useState<PenilaianHeader[]>([]);
  const [loadingPenilaian, setLoadingPenilaian] = useState(false);

  // Form State - Add New Penilaian Header
  const [showAddModal, setShowAddModal] = useState(false);
  const [namaPenilaian, setNamaPenilaian] = useState("");
  const [jenisPenilaian, setJenisPenilaian] = useState<"FORMATIF" | "SUMATIF" | "PAS_UAS">("FORMATIF");
  const [materiPenilaian, setMateriPenilaian] = useState("");
  const [tpCodePenilaian, setTpCodePenilaian] = useState("");
  const [tanggalPenilaian, setTanggalPenilaian] = useState(() => getTodayWibStr());
  const [deskripsiPenilaian, setDeskripsiPenilaian] = useState("");

  // Grade Entry State - Selected Penilaian Header
  const [activePenilaianId, setActivePenilaianId] = useState<string | null>(null);
  const [activePenilaianInfo, setActivePenilaianInfo] = useState<{
    id: string;
    kelasNama: string;
    mapelNama: string;
    namaPenilaian: string;
    jenisPenilaian?: string;
    materi?: string;
    tpCode?: string;
    tanggal: string;
    deskripsi: string;
  } | null>(null);
  const [studentGrades, setStudentGrades] = useState<StudentGradeItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Rekap Rapor Kurikulum Merdeka State
  const [showRekapRapor, setShowRekapRapor] = useState(false);
  const [rekapData, setRekapData] = useState<{
    materiList: string[];
    students: Array<{
      siswaId: string;
      nis: string;
      nisn: string;
      nama: string;
      naFormatif: number | null;
      sumatifMateriScores: Record<string, number | null>;
      avgSumatifMateri: number | null;
      uasScore: number | null;
      nilaiRapor: number | null;
      nilaiRaporBobot: number | null;
      deskripsiCapaian: string;
    }>;
  } | null>(null);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [useWeightedFormula, setUseWeightedFormula] = useState(false);

  // Bank TP & Materi State
  const [tpList, setTpList] = useState<Array<{ id: string; materi: string; kodeTp: string; deskripsi: string | null; semester: number; tingkatKelas: string }>>([]);
  const [tingkatKelas, setTingkatKelas] = useState<string>("X");
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<number>(0); // 0 = Semua, 1 = Ganjil, 2 = Genap
  const [loadingTp, setLoadingTp] = useState(false);
  const [showTpModal, setShowTpModal] = useState(false);
  const [newTpMateri, setNewTpMateri] = useState("");
  const [newTpKode, setNewTpKode] = useState("");
  const [newTpDeskripsi, setNewTpDeskripsi] = useState("");
  const [newTpSemester, setNewTpSemester] = useState<number>(1);
  const [fastPickerSemesterFilter, setFastPickerSemesterFilter] = useState<"ACTIVE" | "ALL">("ACTIVE");

  const availableTpOptions = React.useMemo(() => {
    if (fastPickerSemesterFilter === "ACTIVE") {
      const activeFiltered = tpList.filter((t) => t.semester === activeSemester);
      if (activeFiltered.length > 0) return activeFiltered;
    }
    return tpList;
  }, [tpList, fastPickerSemesterFilter, activeSemester]);

  // Auto Save State
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSavedRef = React.useRef<string>("");
  const isInitialLoadRef = React.useRef<boolean>(true);

  // Status & Transition
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load teacher classes & mapels on mount
  useEffect(() => {
    async function loadData() {
      setLoadingClasses(true);
      const res = await getTeacherClassesAndSubjectsAction();
      if (res.success && res.data) {
        setClassList(res.data);
      }
      setLoadingClasses(false);
    }
    loadData();
  }, []);

  // Fetch Penilaian List & TP List when (selectedClass, selectedMapel) changes
  useEffect(() => {
    if (selectedClass && selectedMapel) {
      fetchPenilaianList(selectedClass.id, selectedMapel.id);
      fetchTpList(selectedClass.id, selectedMapel.id);
    } else {
      setPenilaianList([]);
      setTpList([]);
    }
  }, [selectedClass, selectedMapel]);

  const fetchPenilaianList = async (kelasId: string, mapelId: string) => {
    setLoadingPenilaian(true);
    const res = await getPenilaianKelasListAction(kelasId, mapelId);
    if (res.success && res.data) {
      setPenilaianList(res.data);
    }
    setLoadingPenilaian(false);
  };

  const calculateNextTpNumber = (targetSem: number, targetMateri: string) => {
    if (!targetMateri.trim()) return 1;
    const existingInMateri = tpList.filter(
      (t) => t.semester === targetSem && t.materi.trim().toLowerCase() === targetMateri.trim().toLowerCase()
    );
    const numbers = existingInMateri.map((t) => {
      const match = t.kodeTp.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    return maxNum + 1;
  };

  useEffect(() => {
    const nextNum = calculateNextTpNumber(newTpSemester, newTpMateri);
    setNewTpKode(nextNum.toString());
  }, [newTpSemester, newTpMateri, tpList]);

  const fetchTpList = async (kelasId: string, mapelId: string) => {
    setLoadingTp(true);
    const res = await getTujuanPembelajaranListAction(kelasId, mapelId);
    if (res.success && res.data) {
      setTpList(res.data);
      if (res.tingkatKelas) setTingkatKelas(res.tingkatKelas);
      if (res.activeSemester) {
        setActiveSemester(res.activeSemester);
        setNewTpSemester(res.activeSemester);
      }
    }
    setLoadingTp(false);
  };

  const handleCreateTp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedMapel) return;
    setErrorMsg("");
    setSuccessMsg("");

    const cleanNum = newTpKode.replace(/\D/g, "");
    const finalKodeTp = cleanNum ? `TP ${cleanNum}` : `TP ${calculateNextTpNumber(newTpSemester, newTpMateri)}`;

    startTransition(async () => {
      const res = await createTujuanPembelajaranAction({
        kelasId: selectedClass.id,
        mapelId: selectedMapel.id,
        materi: newTpMateri,
        kodeTp: finalKodeTp,
        deskripsi: newTpDeskripsi,
        semester: newTpSemester,
        tingkatKelas: tingkatKelas,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "TP & Materi berhasil disimpan.");
        setNewTpMateri("");
        setNewTpDeskripsi("");
        fetchTpList(selectedClass.id, selectedMapel.id);
      }
    });
  };

  const handleDeleteTp = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus TP ini dari Bank Data?")) return;
    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await deleteTujuanPembelajaranAction(id);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "TP berhasil dihapus.");
        if (selectedClass && selectedMapel) {
          fetchTpList(selectedClass.id, selectedMapel.id);
        }
      }
    });
  };

  const fetchRekapRapor = async () => {
    if (!selectedClass || !selectedMapel) return;
    setLoadingRekap(true);
    setErrorMsg("");
    const res = await getRekapRaporKurikulumMerdekaAction(selectedClass.id, selectedMapel.id);
    if (res.success && res.students && res.materiList) {
      setRekapData({ materiList: res.materiList, students: res.students });
      setShowRekapRapor(true);
    } else {
      setErrorMsg(res.error || "Gagal memuat rekapitulasi nilai rapor.");
    }
    setLoadingRekap(false);
  };

  // Open Grade Entry Form for a specific Penilaian Header
  const handleOpenGradeEntry = async (penilaianId: string) => {
    setActivePenilaianId(penilaianId);
    setLoadingStudents(true);
    setErrorMsg("");
    setSuccessMsg("");
    setAutoSaveStatus("idle");
    isInitialLoadRef.current = true;

    const res = await getPenilaianDetailAndStudentsAction(penilaianId);
    if (res.success && res.header && res.students) {
      setActivePenilaianInfo(res.header);
      setStudentGrades(res.students);
      const validScores = res.students
        .filter((s) => s.nilai !== null && !isNaN(s.nilai))
        .map((s) => ({
          siswaId: s.siswaId,
          nilai: s.nilai!,
          catatan: s.catatan || "",
        }));
      lastSavedRef.current = JSON.stringify(validScores);
    } else {
      setErrorMsg(res.error || "Gagal memuat rincian siswa.");
    }
    setLoadingStudents(false);
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 150);
  };

  // Debounced Auto Save Effect
  useEffect(() => {
    if (!activePenilaianId || loadingStudents || isInitialLoadRef.current) return;

    const validScores = studentGrades
      .filter((s) => s.nilai !== null && !isNaN(s.nilai))
      .map((s) => ({
        siswaId: s.siswaId,
        nilai: s.nilai!,
        catatan: s.catatan || "",
      }));

    const currentJson = JSON.stringify(validScores);
    if (currentJson === lastSavedRef.current) return;

    setAutoSaveStatus("saving");

    const timer = setTimeout(async () => {
      const res = await savePenilaianSiswaAction({
        penilaianKelasId: activePenilaianId,
        scores: validScores,
      });

      if (res.error) {
        setAutoSaveStatus("error");
        setErrorMsg("Gagal menyimpan otomatis: " + res.error);
      } else {
        lastSavedRef.current = currentJson;
        setAutoSaveStatus("saved");
        if (selectedClass && selectedMapel) {
          fetchPenilaianList(selectedClass.id, selectedMapel.id);
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [studentGrades, activePenilaianId, loadingStudents, selectedClass, selectedMapel]);

  // Handle Grade Change locally
  const handleGradeChange = (siswaId: string, val: string) => {
    const num = val === "" ? null : parseFloat(val);
    setStudentGrades((prev) =>
      prev.map((s) => (s.siswaId === siswaId ? { ...s, nilai: num } : s))
    );
  };

  // Handle Note Change locally
  const handleNoteChange = (siswaId: string, val: string) => {
    setStudentGrades((prev) =>
      prev.map((s) => (s.siswaId === siswaId ? { ...s, catatan: val } : s))
    );
  };

  // Save All Student Grades (Manual Save Trigger)
  const handleSaveAllGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePenilaianId) return;

    setErrorMsg("");
    setSuccessMsg("");

    const validScores = studentGrades
      .filter((s) => s.nilai !== null && !isNaN(s.nilai))
      .map((s) => ({
        siswaId: s.siswaId,
        nilai: s.nilai!,
        catatan: s.catatan || "",
      }));

    if (validScores.length === 0) {
      setErrorMsg("Isi setidaknya satu nilai siswa sebelum menyimpan.");
      return;
    }

    setAutoSaveStatus("saving");

    startTransition(async () => {
      const res = await savePenilaianSiswaAction({
        penilaianKelasId: activePenilaianId,
        scores: validScores,
      });

      if (res.error) {
        setErrorMsg(res.error);
        setAutoSaveStatus("error");
      } else {
        lastSavedRef.current = JSON.stringify(validScores);
        setAutoSaveStatus("saved");
        setSuccessMsg(res.message || "Nilai berhasil disimpan!");
        if (selectedClass && selectedMapel) {
          fetchPenilaianList(selectedClass.id, selectedMapel.id);
        }
      }
    });
  };

  // Create New Penilaian Header
  const handleCreatePenilaian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedMapel) return;

    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await createPenilaianKelasAction({
        kelasId: selectedClass.id,
        mapelId: selectedMapel.id,
        namaPenilaian,
        jenisPenilaian,
        materi: materiPenilaian,
        tpCode: tpCodePenilaian,
        tanggal: tanggalPenilaian,
        deskripsi: deskripsiPenilaian,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "Penilaian baru dibuat.");
        setShowAddModal(false);
        setNamaPenilaian("");
        setMateriPenilaian("");
        setTpCodePenilaian("");
        setDeskripsiPenilaian("");
        fetchPenilaianList(selectedClass.id, selectedMapel.id);
        if (res.data?.id) {
          handleOpenGradeEntry(res.data.id);
        }
      }
    });
  };

  // Delete Penilaian Header
  const handleDeletePenilaian = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus penilaian ini beserta seluruh nilai siswanya?")) return;

    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await deletePenilaianKelasAction(id);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "Penilaian berhasil dihapus.");
        if (activePenilaianId === id) {
          setActivePenilaianId(null);
          setActivePenilaianInfo(null);
        }
        if (selectedClass && selectedMapel) {
          fetchPenilaianList(selectedClass.id, selectedMapel.id);
        }
      }
    });
  };

  // Export Rekap Rapor to Excel
  const handleExportExcelRekap = () => {
    if (!rekapData || !selectedClass || !selectedMapel) return;

    const dataForExcel = rekapData.students.map((s, idx) => {
      const row: Record<string, any> = {
        "No": idx + 1,
        "NIS": s.nis,
        "NISN": s.nisn,
        "Nama Siswa": s.nama,
        "Rata-rata Formatif (NA_F)": s.naFormatif !== null ? s.naFormatif : "-",
      };

      rekapData.materiList.forEach((m) => {
        row[`Sumatif: ${m}`] = s.sumatifMateriScores[m] !== null ? s.sumatifMateriScores[m] : "-";
      });

      row["Rata-rata Sumatif (NA_S)"] = s.avgSumatifMateri !== null ? s.avgSumatifMateri : "-";
      row["Nilai PAS/UAS"] = s.uasScore !== null ? s.uasScore : "-";
      row["Nilai Akhir Rapor"] = useWeightedFormula
        ? (s.nilaiRaporBobot !== null ? s.nilaiRaporBobot : "-")
        : (s.nilaiRapor !== null ? s.nilaiRapor : "-");
      row["Draft Deskripsi Capaian Kompetensi"] = s.deskripsiCapaian;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai Rapor");
    XLSX.writeFile(workbook, `Rekap_Rapor_Kurmer_${selectedClass.nama}_${selectedMapel.kode}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Main Mode Navigation (Tabs) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => {
            setActiveTab("KELAS");
            setSelectedClass(null);
            setSelectedMapel(null);
            setActivePenilaianId(null);
            setShowRekapRapor(false);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "KELAS"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <School className="w-4 h-4" />
          Kelas Saya
        </button>

        <button
          onClick={() => {
            setActiveTab("PENILAIAN");
            setSelectedClass(null);
            setSelectedMapel(null);
            setActivePenilaianId(null);
            setShowRekapRapor(false);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "PENILAIAN"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Award className="w-4 h-4" />
          Penilaian Siswa
        </button>
      </div>

      {/* VIEW LEVEL 4: INPUT NILAI SISWA */}
      {activePenilaianId && activePenilaianInfo ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActivePenilaianId(null);
                  setActivePenilaianInfo(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                title="Kembali ke Daftar Penilaian"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-indigo-400">
                  <span>{activePenilaianInfo.kelasNama}</span>
                  <span>•</span>
                  <span>{activePenilaianInfo.mapelNama}</span>
                  <span>•</span>
                  <span>{activePenilaianInfo.tanggal}</span>
                  {activePenilaianInfo.jenisPenilaian && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activePenilaianInfo.jenisPenilaian === "FORMATIF"
                        ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                        : activePenilaianInfo.jenisPenilaian === "SUMATIF"
                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                    }`}>
                      {activePenilaianInfo.jenisPenilaian === "FORMATIF" ? "Formatif (Proses)" : activePenilaianInfo.jenisPenilaian === "SUMATIF" ? "Sumatif (TP/Materi)" : "Sumatif Akhir (PAS/UAS)"}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">{activePenilaianInfo.namaPenilaian}</h3>
                {(activePenilaianInfo.materi || activePenilaianInfo.tpCode) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                    {activePenilaianInfo.materi && <span>Materi: {activePenilaianInfo.materi}</span>}
                    {activePenilaianInfo.tpCode && <span>• TP: {activePenilaianInfo.tpCode}</span>}
                  </div>
                )}
                {activePenilaianInfo.deskripsi && (
                  <p className="text-xs text-slate-400 mt-1">{activePenilaianInfo.deskripsi}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {autoSaveStatus === "saving" && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan otomatis...
                </span>
              )}
              {autoSaveStatus === "saved" && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tersimpan otomatis
                </span>
              )}
              {autoSaveStatus === "error" && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Gagal menyimpan
                </span>
              )}
              {autoSaveStatus === "idle" && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 text-slate-400 rounded-xl text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  Auto-save Aktif
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveAllGrades}
                disabled={isPending || loadingStudents}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isPending ? "Menyimpan..." : "Simpan Nilai"}
              </button>
            </div>
          </div>

          {loadingStudents ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2 bg-slate-900/40 border border-slate-900 rounded-2xl">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Memuat daftar siswa & nilai...</span>
            </div>
          ) : (
            <form onSubmit={handleSaveAllGrades} className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-xl space-y-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 w-12 text-center">No</th>
                      <th className="pb-3 w-36">NIS / NISN</th>
                      <th className="pb-3">Nama Siswa</th>
                      <th className="pb-3 w-32 text-center">Nilai (0-100)</th>
                      <th className="pb-3 w-64">Catatan / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {studentGrades.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-500">
                          Belum ada data siswa terdaftar di kelas ini.
                        </td>
                      </tr>
                    ) : (
                      studentGrades.map((s, index) => (
                        <tr key={s.siswaId} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 text-center text-slate-500 text-xs">{index + 1}</td>
                          <td className="py-3 font-mono text-xs text-slate-400">
                            {s.nis}
                          </td>
                          <td className="py-3 font-bold text-white text-xs">{s.nama}</td>
                          <td className="py-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              placeholder="Nilai"
                              value={s.nilai !== null && s.nilai !== undefined ? s.nilai : ""}
                              onChange={(e) => handleGradeChange(s.siswaId, e.target.value)}
                              className="block w-24 mx-auto px-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-center font-bold text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="py-3">
                            <input
                              type="text"
                              placeholder="Contoh: Sangat aktif..."
                              value={s.catatan}
                              onChange={(e) => handleNoteChange(s.siswaId, e.target.value)}
                              className="block w-full px-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isPending ? "Menyimpan..." : "Simpan Semua Nilai"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : showRekapRapor && selectedClass && selectedMapel ? (
        /* RENDER VIEW: REKAPITULASI RAPOR KURIKULUM MERDEKA */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRekapRapor(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                title="Kembali ke Daftar Penilaian"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                  <span>Kelas {selectedClass.nama}</span>
                  <span>•</span>
                  <span>{selectedMapel.nama} ({selectedMapel.kode})</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  Rekapitulasi Nilai Rapor Kurikulum Merdeka
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setUseWeightedFormula(!useWeightedFormula)}
                className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  useWeightedFormula
                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                }`}
                title="Ganti Metode Formula Pembobotan"
              >
                <Sliders className="w-3.5 h-3.5" />
                {useWeightedFormula ? "Formula: 60% Sumatif + 40% UAS" : "Formula: (Σ NA_S + UAS) / (N+1)"}
              </button>

              <button
                onClick={handleExportExcelRekap}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export Excel (.xlsx)
              </button>
            </div>
          </div>

          {loadingRekap ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2 bg-slate-900/40 border border-slate-900 rounded-2xl">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Mengolah & menghitung rekapitulasi nilai rapor...</span>
            </div>
          ) : !rekapData || rekapData.students.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 border border-slate-900 rounded-2xl">
              Belum ada data nilai penilaian untuk dihitung. Silakan isi penilaian formatif/sumatif terlebih dahulu.
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-xl space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-xs">
                  <thead>
                    <tr className="text-left font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 w-10 text-center">No</th>
                      <th className="pb-3 w-28">NIS</th>
                      <th className="pb-3 w-44">Nama Siswa</th>
                      <th className="pb-3 w-28 text-center bg-sky-950/40 text-sky-300">NA Formatif (NA_F)</th>
                      {rekapData.materiList.map((m, idx) => (
                        <th key={m} className="pb-3 w-28 text-center bg-amber-950/30 text-amber-300">
                          Sumatif {idx + 1}
                          <span className="block text-[9px] font-normal normal-case text-slate-400 truncate max-w-[100px]" title={m}>
                            {m}
                          </span>
                        </th>
                      ))}
                      <th className="pb-3 w-28 text-center bg-amber-950/50 text-amber-200">Rata Sumatif (NA_S)</th>
                      <th className="pb-3 w-24 text-center bg-rose-950/40 text-rose-300">PAS / UAS</th>
                      <th className="pb-3 w-28 text-center bg-emerald-950/50 text-emerald-300">Nilai Rapor</th>
                      <th className="pb-3 min-w-[280px]">Draft Deskripsi Capaian Kompetensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {rekapData.students.map((s, index) => {
                      const finalScore = useWeightedFormula
                        ? (s.nilaiRaporBobot !== null ? s.nilaiRaporBobot : s.nilaiRapor)
                        : s.nilaiRapor;

                      return (
                        <tr key={s.siswaId} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 text-center text-slate-500 font-mono">{index + 1}</td>
                          <td className="py-3 font-mono text-slate-400">{s.nis}</td>
                          <td className="py-3 font-bold text-white">{s.nama}</td>
                          <td className="py-3 text-center bg-sky-950/20 font-semibold text-sky-400">
                            {s.naFormatif !== null ? s.naFormatif : "-"}
                          </td>
                          {rekapData.materiList.map((m) => {
                            const val = s.sumatifMateriScores[m];
                            return (
                              <td key={m} className="py-3 text-center bg-amber-950/10 font-mono text-slate-300">
                                {val !== null ? val : "-"}
                              </td>
                            );
                          })}
                          <td className="py-3 text-center bg-amber-950/20 font-bold text-amber-300">
                            {s.avgSumatifMateri !== null ? s.avgSumatifMateri : "-"}
                          </td>
                          <td className="py-3 text-center bg-rose-950/20 font-semibold text-rose-300">
                            {s.uasScore !== null ? s.uasScore : "-"}
                          </td>
                          <td className="py-3 text-center bg-emerald-950/30 font-bold text-base text-emerald-400">
                            {finalScore !== null ? finalScore : "-"}
                          </td>
                          <td className="py-3 text-slate-300 text-[11px] leading-relaxed italic">
                            {s.deskripsiCapaian}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "KELAS" ? (
        /* TAB 1: KELAS SAYA FLOW */
        <div className="space-y-6">
          {!selectedClass ? (
            /* STEP 1: Pilih Kelas */
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <School className="w-5 h-5 text-indigo-400" />
                  Daftar Kelas Guru Mengajar
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih kelas tempat Anda mengajar untuk menambah atau mengelola nilai mata pelajaran.
                </p>
              </div>

              {loadingClasses ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2 bg-slate-900/40 border border-slate-900 rounded-2xl">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">Memuat kelas mengajar...</span>
                </div>
              ) : classList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-900/40 border border-slate-900 rounded-2xl">
                  Belum ada kelas mengajar yang terdaftar untuk Anda.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {classList.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => setSelectedClass(cls)}
                      className="p-5 bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all cursor-pointer group flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                          <School className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                            Kelas {cls.nama}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {cls.mapels.length} Mata Pelajaran Diajar
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !selectedMapel ? (
            /* STEP 2: Pilih Mapel di Kelas */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedClass(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                  title="Kembali ke Daftar Kelas"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    Mata Pelajaran di Kelas {selectedClass.nama}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih mata pelajaran yang Anda ajar di kelas ini.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {selectedClass.mapels.map((mp) => (
                  <div
                    key={mp.id}
                    onClick={() => setSelectedMapel(mp)}
                    className="p-5 bg-slate-900/40 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition-all cursor-pointer group flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">{mp.kode}</span>
                        <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {mp.nama}
                        </h4>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* STEP 3: Daftar Penilaian untuk (selectedClass, selectedMapel) */
            <PenilaianListDashboard
              selectedClass={selectedClass}
              selectedMapel={selectedMapel}
              penilaianList={penilaianList}
              loadingPenilaian={loadingPenilaian}
              tpListCount={tpList.length}
              onBack={() => setSelectedMapel(null)}
              onAddClick={() => setShowAddModal(true)}
              onOpenEntry={handleOpenGradeEntry}
              onDeleteHeader={handleDeletePenilaian}
              onOpenRekap={fetchRekapRapor}
              onOpenTpManage={() => setShowTpModal(true)}
            />
          )}
        </div>
      ) : (
        /* TAB 2: PENILAIAN SISWA DIRECT SELECTION */
        <div className="space-y-6">
          <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                Pilih Kelas & Mata Pelajaran
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pilih kelas dan mata pelajaran untuk membuat atau menginput nilai siswa.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pilih Kelas
                </label>
                <select
                  value={selectedClass?.id || ""}
                  onChange={(e) => {
                    const cls = classList.find((c) => c.id === e.target.value) || null;
                    setSelectedClass(cls);
                    setSelectedMapel(null);
                  }}
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classList.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pilih Mata Pelajaran
                </label>
                <select
                  value={selectedMapel?.id || ""}
                  disabled={!selectedClass}
                  onChange={(e) => {
                    const mp = selectedClass?.mapels.find((m) => m.id === e.target.value) || null;
                    setSelectedMapel(mp);
                  }}
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {selectedClass?.mapels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.kode} - {m.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedClass && selectedMapel && (
            <PenilaianListDashboard
              selectedClass={selectedClass}
              selectedMapel={selectedMapel}
              penilaianList={penilaianList}
              loadingPenilaian={loadingPenilaian}
              tpListCount={tpList.length}
              onBack={() => setSelectedMapel(null)}
              onAddClick={() => setShowAddModal(true)}
              onOpenEntry={handleOpenGradeEntry}
              onDeleteHeader={handleDeletePenilaian}
              onOpenRekap={fetchRekapRapor}
              onOpenTpManage={() => setShowTpModal(true)}
            />
          )}
        </div>
      )}

      {/* MODAL: TAMBAH PENILAIAN BARU (KURIKULUM MERDEKA) */}
      {showAddModal && selectedClass && selectedMapel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" />
                  Tambah Penilaian Baru (Kurikulum Merdeka)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedClass.nama} • {selectedMapel.nama}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePenilaian} className="space-y-4">
              {/* 1. KATEGORI / JENIS PENILAIAN (PALING ATAS) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  1. Pilih Kategori Penilaian *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setJenisPenilaian("FORMATIF");
                      setMateriPenilaian("");
                      setTpCodePenilaian("");
                      setNamaPenilaian("");
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      jenisPenilaian === "FORMATIF"
                        ? "bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>🔵 Formatif</span>
                    <span className="text-[9px] font-normal text-slate-400">Proses / Feedback TP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setJenisPenilaian("SUMATIF");
                      setMateriPenilaian("");
                      setTpCodePenilaian("");
                      setNamaPenilaian("");
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      jenisPenilaian === "SUMATIF"
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>🟡 Sumatif</span>
                    <span className="text-[9px] font-normal text-slate-400">Nilai Materi / TP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setJenisPenilaian("PAS_UAS");
                      setMateriPenilaian("");
                      setTpCodePenilaian("");
                      setNamaPenilaian("Sumatif Akhir Semester (PAS/UAS)");
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      jenisPenilaian === "PAS_UAS"
                        ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>🔴 PAS / UAS</span>
                    <span className="text-[9px] font-normal text-slate-400">Akhir Semester</span>
                  </button>
                </div>
              </div>

              {/* 2. PEMILIHAN TP / LINGKUP MATERI BERDASARKAN KATEGORI */}
              {jenisPenilaian === "FORMATIF" && (
                <div className="p-3.5 bg-sky-950/40 border border-sky-800/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-sky-300 uppercase tracking-wider">
                      2. Pilih Tujuan Pembelajaran (TP) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFastPickerSemesterFilter(fastPickerSemesterFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
                      className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-semibold transition cursor-pointer"
                    >
                      {fastPickerSemesterFilter === "ACTIVE" ? `Filter: Sem ${activeSemester === 1 ? "Ganjil" : "Genap"}` : "Filter: Semua Sem"}
                    </button>
                  </div>

                  {tpList.length === 0 ? (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 flex flex-col items-center gap-2 text-center">
                      <span>⚠️ Belum ada TP tersimpan di Bank Data untuk tingkat {tingkatKelas}.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setShowTpModal(true);
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
                      >
                        + Isi Bank TP & Materi Sekarang
                      </button>
                    </div>
                  ) : (
                    <select
                      value={tpList.find((t) => t.kodeTp === tpCodePenilaian && t.materi === materiPenilaian)?.id || ""}
                      onChange={(e) => {
                        const found = tpList.find((t) => t.id === e.target.value);
                        if (found) {
                          setMateriPenilaian(found.materi);
                          setTpCodePenilaian(found.kodeTp);
                          setNamaPenilaian(`Formatif ${found.kodeTp} - ${found.materi}`);
                          if (found.deskripsi) setDeskripsiPenilaian(found.deskripsi);
                        } else {
                          setMateriPenilaian("");
                          setTpCodePenilaian("");
                          setNamaPenilaian("");
                        }
                      }}
                      className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer"
                    >
                      <option value="">-- Wajib Pilih TP dari Bank Data --</option>
                      {availableTpOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          [Sem {t.semester === 1 ? "Ganjil" : "Genap"}] {t.kodeTp} - {t.materi} {t.deskripsi ? `(${t.deskripsi})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {jenisPenilaian === "SUMATIF" && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-800/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                      2. Pilih Lingkup Materi / Bab ATAU TP *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFastPickerSemesterFilter(fastPickerSemesterFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold transition cursor-pointer"
                    >
                      {fastPickerSemesterFilter === "ACTIVE" ? `Filter: Sem ${activeSemester === 1 ? "Ganjil" : "Genap"}` : "Filter: Semua Sem"}
                    </button>
                  </div>

                  {tpList.length === 0 ? (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 flex flex-col items-center gap-2 text-center">
                      <span>⚠️ Belum ada Lingkup Materi / TP tersimpan di Bank Data.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setShowTpModal(true);
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
                      >
                        + Isi Bank TP & Materi Sekarang
                      </button>
                    </div>
                  ) : (
                    <select
                      value={
                        tpCodePenilaian
                          ? `TP:${tpList.find((t) => t.kodeTp === tpCodePenilaian && t.materi === materiPenilaian)?.id || ""}`
                          : materiPenilaian
                          ? `MATERI:${materiPenilaian}`
                          : ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith("MATERI:")) {
                          const materi = val.replace("MATERI:", "");
                          setMateriPenilaian(materi);
                          setTpCodePenilaian("");
                          setNamaPenilaian(`Sumatif ${materi}`);
                        } else if (val.startsWith("TP:")) {
                          const tpId = val.replace("TP:", "");
                          const found = tpList.find((t) => t.id === tpId);
                          if (found) {
                            setMateriPenilaian(found.materi);
                            setTpCodePenilaian(found.kodeTp);
                            setNamaPenilaian(`Sumatif ${found.kodeTp} (${found.materi})`);
                            if (found.deskripsi) setDeskripsiPenilaian(found.deskripsi);
                          }
                        } else {
                          setMateriPenilaian("");
                          setTpCodePenilaian("");
                          setNamaPenilaian("");
                        }
                      }}
                      className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium cursor-pointer"
                    >
                      <option value="">-- Wajib Pilih Lingkup Materi / Bab atau TP --</option>
                      {Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean))).length > 0 && (
                        <optgroup label="📚 Lingkup Materi / Bab (Nilai Per Bab)">
                          {Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean))).map((materi, idx) => (
                            <option key={`m-${idx}`} value={`MATERI:${materi}`}>
                              Bab: {materi}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="🎯 TP Spesifik (Nilai Per TP)">
                        {availableTpOptions.map((t) => (
                          <option key={`tp-${t.id}`} value={`TP:${t.id}`}>
                            [Sem {t.semester === 1 ? "Ganjil" : "Genap"}] {t.kodeTp} - {t.materi}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  )}
                </div>
              )}

              {/* 3. FIELD DETAIL PENILAIAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Penilaian *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    jenisPenilaian === "FORMATIF"
                      ? "Pilih TP di atas untuk mengisi otomatis..."
                      : jenisPenilaian === "SUMATIF"
                      ? "Contoh: Sumatif Masa Mempertahankan Kemerdekaan"
                      : "Sumatif Akhir Semester (PAS/UAS)"
                  }
                  value={namaPenilaian}
                  onChange={(e) => setNamaPenilaian(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Lingkup Materi / Bab {jenisPenilaian === "SUMATIF" ? "*" : "(Opsional)"}
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">🔒 Terkunci</span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    required={jenisPenilaian === "SUMATIF"}
                    placeholder="Otomatis terisi dari pilihan TP / Bab di atas"
                    value={materiPenilaian}
                    className="block w-full px-3 py-2 border border-slate-800/80 rounded-xl bg-slate-900/60 text-xs text-indigo-300 font-semibold focus:outline-none cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Kode TP {jenisPenilaian === "FORMATIF" ? "*" : "(Opsional)"}
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">🔒 Terkunci</span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    required={jenisPenilaian === "FORMATIF"}
                    placeholder="Otomatis terisi dari pilihan TP di atas"
                    value={tpCodePenilaian}
                    className="block w-full px-3 py-2 border border-slate-800/80 rounded-xl bg-slate-900/60 text-xs text-indigo-300 font-semibold focus:outline-none cursor-not-allowed select-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tanggal Penilaian *
                </label>
                <input
                  type="date"
                  required
                  value={tanggalPenilaian}
                  onChange={(e) => setTanggalPenilaian(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Deskripsi / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tuliskan catatan atau instruksi penilaian..."
                  value={deskripsiPenilaian}
                  onChange={(e) => setDeskripsiPenilaian(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Validasi Penguncian */}
              {((jenisPenilaian === "FORMATIF" && (!tpCodePenilaian || !materiPenilaian)) ||
                (jenisPenilaian === "SUMATIF" && (!materiPenilaian && !tpCodePenilaian))) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2 font-medium">
                  <span>⚠️</span>
                  <span>
                    {jenisPenilaian === "FORMATIF"
                      ? "Wajib memilih Tujuan Pembelajaran (TP) dari Bank Data di atas untuk melanjutkan."
                      : "Wajib memilih Lingkup Materi / Bab atau TP dari Bank Data di atas untuk melanjutkan."}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isPending ||
                    (jenisPenilaian === "FORMATIF" && (!tpCodePenilaian || !materiPenilaian)) ||
                    (jenisPenilaian === "SUMATIF" && (!materiPenilaian && !tpCodePenilaian)) ||
                    !namaPenilaian.trim()
                  }
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Buat & Mulai Penilaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANAJEMEN BANK TP & MATERI GURU */}
      {showTpModal && selectedClass && selectedMapel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 space-y-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  Manajemen Bank TP & Lingkup Materi
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                  <span>Mapel: <strong className="text-emerald-400">{selectedMapel.nama}</strong></span>
                  <span>•</span>
                  <span>Tingkat: <strong className="text-indigo-300">Tingkat {tingkatKelas}</strong></span>
                  <span>•</span>
                  <span>Sem. Aktif: <strong className="text-amber-300">{activeSemester === 1 ? "Ganjil (Sem 1)" : "Genap (Sem 2)"}</strong></span>
                </p>
              </div>
              <button onClick={() => setShowTpModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg transition">
                ✕
              </button>
            </div>

            {/* Info Banner Sharing Angkatan */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <div className="space-y-0.5">
                <strong className="text-indigo-300">Otomatis Berbagi Per-Angkatan / Tingkat Kelas:</strong>
                <p className="text-slate-300 text-[11px]">
                  TP yang Anda tambahkan untuk mapel <strong>{selectedMapel.nama}</strong> di <strong>Tingkat {tingkatKelas}</strong> cukup diisi 1x dan akan <strong>otomatis berlaku untuk seluruh kelas tingkat {tingkatKelas}</strong> (misal: {selectedClass.nama}) yang Anda ajar.
                </p>
              </div>
            </div>

            {/* Form Tambah TP */}
            <form onSubmit={handleCreateTp} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Tambah TP & Materi Baru</h4>
              
              {/* Pilihan Semester */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-semibold text-[11px]">Target Semester:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tpSemester"
                    checked={newTpSemester === 1}
                    onChange={() => setNewTpSemester(1)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Semester 1 (Ganjil) {activeSemester === 1 && <span className="text-[10px] text-amber-400 font-bold ml-0.5">(Aktif)</span>}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tpSemester"
                    checked={newTpSemester === 2}
                    onChange={() => setNewTpSemester(2)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Semester 2 (Genap) {activeSemester === 2 && <span className="text-[10px] text-amber-400 font-bold ml-0.5">(Aktif)</span>}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-slate-400">Lingkup Materi / Bab *</label>
                    {tpList.length > 0 && Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean))).length > 0 && (
                      <span className="text-[10px] text-indigo-400 font-semibold">
                        {Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean))).length} materi tersimpan
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    list="existing-materi-list"
                    placeholder="Ketik atau pilih dari materi yang ada..."
                    value={newTpMateri}
                    onChange={(e) => setNewTpMateri(e.target.value)}
                    className="block w-full px-3 py-1.5 border border-slate-800 rounded-lg bg-slate-900 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="existing-materi-list">
                    {Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean))).map((materi, idx) => (
                      <option key={idx} value={materi} />
                    ))}
                  </datalist>

                  {/* Quick-Select Chips untuk Materi yang Sudah Pernah Diisi */}
                  {Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean))).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-500 font-medium">Pilih materi tersimpan:</span>
                      {Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean))).map((materi, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewTpMateri(materi)}
                          className={`px-2 py-0.5 text-[10px] rounded-md border font-medium transition cursor-pointer ${
                            newTpMateri === materi
                              ? "bg-indigo-600 text-white border-indigo-500 font-bold shadow"
                              : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                          }`}
                        >
                          {materi}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Kode TP * <span className="text-[10px] text-indigo-400 font-normal">(Otomatis Berurutan)</span>
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-1.5 bg-slate-800 border border-r-0 border-slate-700 rounded-l-lg text-xs font-bold text-indigo-300 font-mono select-none">
                      TP
                    </span>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="1"
                      value={newTpKode}
                      onChange={(e) => setNewTpKode(e.target.value)}
                      className="block w-full px-3 py-1.5 border border-slate-700 rounded-r-lg bg-slate-900 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {newTpMateri.trim() ? (
                      <>Urutan berikutnya untuk &quot;<strong className="text-indigo-300">{newTpMateri.trim()}</strong>&quot;: <strong>TP {calculateNextTpNumber(newTpSemester, newTpMateri)}</strong></>
                    ) : (
                      <>Otomatis reset ke <strong>TP 1</strong> untuk setiap Bab / Materi baru</>
                    )}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Deskripsi Tujuan Pembelajaran (TP)</label>
                <input
                  type="text"
                  placeholder="Contoh: Peserta didik mampu menganalisis kronologi diplomasi..."
                  value={newTpDeskripsi}
                  onChange={(e) => setNewTpDeskripsi(e.target.value)}
                  className="block w-full px-3 py-1.5 border border-slate-800 rounded-lg bg-slate-900 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Simpan TP ke Bank Data (Tingkat {tingkatKelas})
                </button>
              </div>
            </form>

            {/* Daftar TP Tersimpan */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Daftar TP Tersimpan (Tingkat {tingkatKelas})
                </h4>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedSemesterTab(0)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      selectedSemesterTab === 0 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSemesterTab(1)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1 ${
                      selectedSemesterTab === 1 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sem 1 (Ganjil)
                    {activeSemester === 1 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSemesterTab(2)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1 ${
                      selectedSemesterTab === 2 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sem 2 (Genap)
                    {activeSemester === 2 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                  </button>
                </div>
              </div>

              {loadingTp ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-xs">Memuat Bank TP...</span>
                </div>
              ) : tpList.filter((t) => selectedSemesterTab === 0 || t.semester === selectedSemesterTab).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-900">
                  Belum ada TP & Materi tersimpan untuk filter ini. Silakan tambahkan pada form di atas.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800 text-xs">
                  {tpList
                    .filter((t) => selectedSemesterTab === 0 || t.semester === selectedSemesterTab)
                    .map((t) => (
                      <div key={t.id} className="p-3 bg-slate-950/40 hover:bg-slate-800/40 transition flex items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.semester === 1 ? "bg-sky-500/10 text-sky-300 border border-sky-500/20" : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                            }`}>
                              Sem {t.semester === 1 ? "1 (Ganjil)" : "2 (Genap)"}
                            </span>
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded font-bold">{t.kodeTp}</span>
                            <span className="font-bold text-white">{t.materi}</span>
                          </div>
                          {t.deskripsi && <p className="text-slate-400 text-[11px] mt-0.5">{t.deskripsi}</p>}
                        </div>
                        <button
                          onClick={() => handleDeleteTp(t.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer shrink-0"
                          title="Hapus TP"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PenilaianListDashboard({
  selectedClass,
  selectedMapel,
  penilaianList,
  loadingPenilaian,
  tpListCount,
  onBack,
  onAddClick,
  onOpenEntry,
  onDeleteHeader,
  onOpenRekap,
  onOpenTpManage,
}: {
  selectedClass: ClassItem;
  selectedMapel: MapelItem;
  penilaianList: PenilaianHeader[];
  loadingPenilaian: boolean;
  tpListCount: number;
  onBack: () => void;
  onAddClick: () => void;
  onOpenEntry: (id: string) => void;
  onDeleteHeader: (id: string, e: React.MouseEvent) => void;
  onOpenRekap: () => void;
  onOpenTpManage: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <span>Kelas {selectedClass.nama}</span>
              <span>•</span>
              <span>{selectedMapel.nama} ({selectedMapel.kode})</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">Daftar Penilaian Mata Pelajaran</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenTpManage}
            className="px-4 py-2.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            Bank TP & Materi ({tpListCount})
          </button>

          <button
            onClick={onOpenRekap}
            className="px-4 py-2.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            Rekap Rapor Kurikulum Merdeka
          </button>

          <button
            onClick={onAddClick}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Penilaian Baru
          </button>
        </div>
      </div>

      {loadingPenilaian ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2 bg-slate-900/40 border border-slate-900 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs">Memuat daftar penilaian...</span>
        </div>
      ) : penilaianList.length === 0 ? (
        <div className="p-10 text-center space-y-3 bg-slate-900/40 border border-slate-900 rounded-2xl">
          <Award className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-xs font-medium">
            Belum ada penilaian dibuat untuk kelas {selectedClass.nama} pada mata pelajaran {selectedMapel.nama}.
          </p>
          <button
            onClick={onAddClick}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Buat Penilaian Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {penilaianList.map((item) => {
            const jenis = item.jenisPenilaian || "FORMATIF";
            return (
              <div
                key={item.id}
                onClick={() => onOpenEntry(item.id)}
                className="p-5 bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all cursor-pointer group flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
                      jenis === "FORMATIF"
                        ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                        : jenis === "SUMATIF"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}>
                      {jenis === "FORMATIF" ? "Formatif (Proses)" : jenis === "SUMATIF" ? "Sumatif (TP/Materi)" : "PAS / UAS"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500">{item.tanggal}</span>
                      <button
                        onClick={(e) => onDeleteHeader(item.id, e)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        title="Hapus Penilaian"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {item.namaPenilaian}
                  </h4>
                  {(item.materi || item.tpCode) && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                      {item.materi && <span className="bg-slate-800/60 px-2 py-0.5 rounded text-slate-300">{item.materi}</span>}
                      {item.tpCode && <span className="bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded">{item.tpCode}</span>}
                    </div>
                  )}
                  {item.deskripsi && (
                    <p className="text-xs text-slate-400 line-clamp-2">{item.deskripsi}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {item.totalTerisi} Siswa Dinilai
                  </span>
                  <span className="font-bold text-indigo-400 group-hover:underline flex items-center gap-1">
                    Input Nilai →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
