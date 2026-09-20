"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getTodayWibStr } from "@/lib/dateUtils";
import {
  getTeacherClassesAndSubjectsAction,
  getPenilaianKelasListAction,
  createPenilaianKelasAction,
  updatePenilaianKelasAction,
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
  Pencil,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Award,
  ChevronRight,
  ChevronDown,
  Download,
  Calculator,
  Sliders,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Target,
  X,
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

import { useRouter } from "next/navigation";

export default function PenilaianManager({ user, defaultMode = "KELAS" }: PenilaianManagerProps) {
  const router = useRouter();
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
  const [pickerOpen, setPickerOpen] = useState(false);

  // Form State - Edit Penilaian Header
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPenilaianId, setEditingPenilaianId] = useState<string | null>(null);
  const [editNamaPenilaian, setEditNamaPenilaian] = useState("");
  const [editJenisPenilaian, setEditJenisPenilaian] = useState<"FORMATIF" | "SUMATIF" | "PAS_UAS">("FORMATIF");
  const [editMateriPenilaian, setEditMateriPenilaian] = useState("");
  const [editTpCodePenilaian, setEditTpCodePenilaian] = useState("");
  const [editTanggalPenilaian, setEditTanggalPenilaian] = useState("");
  const [editDeskripsiPenilaian, setEditDeskripsiPenilaian] = useState("");
  const [editPickerOpen, setEditPickerOpen] = useState(false);

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
  const [loadingTp, setLoadingTp] = useState(false);
  const [fastPickerSemesterFilter, setFastPickerSemesterFilter] = useState<"ACTIVE" | "ALL">("ACTIVE");

  const availableTpOptions = React.useMemo(() => {
    if (fastPickerSemesterFilter === "ACTIVE") {
      const activeFiltered = tpList.filter((t) => t.semester === activeSemester);
      if (activeFiltered.length > 0) return activeFiltered;
    }
    return tpList;
  }, [tpList, fastPickerSemesterFilter, activeSemester]);

  const realTpOptions = React.useMemo(() => {
    return availableTpOptions.filter((t) => t.kodeTp !== "BAB");
  }, [availableTpOptions]);

  const uniqueBabList = React.useMemo(() => {
    return Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean)));
  }, [tpList]);

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

  const fetchTpList = async (kelasId: string, mapelId: string) => {
    setLoadingTp(true);
    const res = await getTujuanPembelajaranListAction(kelasId, mapelId);
    if (res.success && res.data) {
      setTpList(res.data);
      if (res.tingkatKelas) setTingkatKelas(res.tingkatKelas);
      if (res.activeSemester) {
        setActiveSemester(res.activeSemester);
      }
    }
    setLoadingTp(false);
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

  // Open Edit Modal for Penilaian Header
  const handleOpenEditModal = (
    item: { id: string; namaPenilaian: string; jenisPenilaian?: string; materi?: string; tpCode?: string; tanggal: string; deskripsi?: string },
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setEditingPenilaianId(item.id);
    setEditNamaPenilaian(item.namaPenilaian);
    setEditJenisPenilaian((item.jenisPenilaian as any) || "FORMATIF");
    setEditMateriPenilaian(item.materi || "");
    setEditTpCodePenilaian(item.tpCode || "");

    // Parse tanggal if needed into YYYY-MM-DD for date input
    let formattedDate = item.tanggal;
    if (item.tanggal && item.tanggal.includes("/")) {
      const parts = item.tanggal.split("/");
      if (parts.length === 3) {
        formattedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    setEditTanggalPenilaian(formattedDate || getTodayWibStr());
    setEditDeskripsiPenilaian(item.deskripsi || "");
    setEditPickerOpen(false);
    setShowEditModal(true);
  };

  // Update Penilaian Header
  const handleUpdatePenilaian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPenilaianId) return;

    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await updatePenilaianKelasAction({
        id: editingPenilaianId,
        namaPenilaian: editNamaPenilaian,
        jenisPenilaian: editJenisPenilaian,
        materi: editMateriPenilaian,
        tpCode: editTpCodePenilaian,
        tanggal: editTanggalPenilaian,
        deskripsi: editDeskripsiPenilaian,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "Data penilaian berhasil diperbarui.");
        setShowEditModal(false);
        if (selectedClass && selectedMapel) {
          fetchPenilaianList(selectedClass.id, selectedMapel.id);
        }
        if (activePenilaianId === editingPenilaianId) {
          const detailRes = await getPenilaianDetailAndStudentsAction(editingPenilaianId);
          if (detailRes.success && detailRes.header) {
            setActivePenilaianInfo(detailRes.header);
          }
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
      {/* HEADER UTAMA HALAMAN PENILAIAN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
            Penilaian Siswa
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Input & Manajemen Penilaian Formatif, Sumatif, PAS/UAS, dan Rekapitulasi Nilai Rapor Kurikulum Merdeka
          </p>
        </div>

        {/* Tab Penilaian (Mode Alur Kelas vs Pilih Langsung) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800/80 rounded-xl shrink-0">
          <button
            onClick={() => {
              setActiveTab("KELAS");
              setSelectedClass(null);
              setSelectedMapel(null);
              setActivePenilaianId(null);
              setShowRekapRapor(false);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "KELAS"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <School className="w-3.5 h-3.5" />
            Alur Kelas Saya
          </button>

          <button
            onClick={() => {
              setActiveTab("PENILAIAN");
              setSelectedClass(null);
              setSelectedMapel(null);
              setActivePenilaianId(null);
              setShowRekapRapor(false);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "PENILAIAN"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Pilih Langsung
          </button>
        </div>
      </div>

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
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold mb-1">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg">
                    {activePenilaianInfo.kelasNama}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                    {activePenilaianInfo.mapelNama}
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg font-mono">
                    {activePenilaianInfo.tanggal}
                  </span>
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
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-lg font-bold text-white">{activePenilaianInfo.namaPenilaian}</h3>
                  <button
                    onClick={() => handleOpenEditModal(activePenilaianInfo)}
                    className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Edit Detail Penilaian"
                  >
                    <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                    Edit Detail
                  </button>
                </div>
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
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold mb-1">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg">
                    Kelas {selectedClass.nama}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                    {selectedMapel.nama} ({selectedMapel.kode})
                  </span>
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
              onEditHeader={handleOpenEditModal}
              onDeleteHeader={handleDeletePenilaian}
              onOpenRekap={fetchRekapRapor}
              onOpenTpManage={() => router.push(`/materi?kelasId=${selectedClass.id}&mapelId=${selectedMapel.id}`)}
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
              onEditHeader={handleOpenEditModal}
              onDeleteHeader={handleDeletePenilaian}
              onOpenRekap={fetchRekapRapor}
              onOpenTpManage={() => router.push(`/materi?kelasId=${selectedClass.id}&mapelId=${selectedMapel.id}`)}
            />
          )}
        </div>
      )}

      {/* MODAL: TAMBAH PENILAIAN */}
      {showAddModal && selectedClass && selectedMapel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" />
                  Tambah Penilaian
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs mt-1.5 font-bold">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg">
                    Kelas {selectedClass.nama}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                    {selectedMapel.nama} ({selectedMapel.kode})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
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
                      setDeskripsiPenilaian("");
                      setPickerOpen(false);
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
                      setDeskripsiPenilaian("");
                      setPickerOpen(false);
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
                      setNamaPenilaian(activeSemester === 1 ? "Asesmen Akhir Semester" : "Asesmen Akhir Tahun");
                      setDeskripsiPenilaian("");
                      setPickerOpen(false);
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
                <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-sky-400 shrink-0" />
                      <label className="block text-xs font-bold text-sky-300 uppercase tracking-wider">
                        2. Pilih Tujuan Pembelajaran (TP) *
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFastPickerSemesterFilter(fastPickerSemesterFilter === "ACTIVE" ? "ALL" : "ACTIVE");
                        setPickerOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Sliders className="w-3 h-3 text-sky-400" />
                      <span>{fastPickerSemesterFilter === "ACTIVE" ? `Semester ${activeSemester === 1 ? "Ganjil" : "Genap"}` : "Semua Semester"}</span>
                    </button>
                  </div>

                  {realTpOptions.length === 0 ? (
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex flex-col items-center gap-2.5 text-center">
                      <span>⚠️ Belum ada TP tersimpan di Bank Data untuk tingkat {tingkatKelas}.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          router.push(`/materi?kelasId=${selectedClass.id}&mapelId=${selectedMapel.id}`);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        + Isi Bank TP & Materi Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Trigger Button with text wrapping */}
                      <button
                        type="button"
                        onClick={() => setPickerOpen((prev) => !prev)}
                        className="w-full text-left p-3.5 border border-slate-800 hover:border-sky-500/50 rounded-xl bg-slate-900/90 text-xs text-white flex items-start justify-between gap-3 cursor-pointer transition-all shadow-inner"
                      >
                        {tpCodePenilaian && materiPenilaian ? (
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 font-bold">
                              {(() => {
                                const selectedTp = realTpOptions.find((t) => t.kodeTp === tpCodePenilaian && t.materi === materiPenilaian);
                                return (
                                  <>
                                    <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[10px] font-mono shrink-0 font-bold">
                                      Sem {selectedTp?.semester === 1 ? "Ganjil" : "Genap"}
                                    </span>
                                    <span className="px-2 py-0.5 bg-slate-800 text-sky-400 font-mono font-bold rounded text-[11px]">
                                      {tpCodePenilaian}
                                    </span>
                                    <span className="text-white font-semibold">• {materiPenilaian}</span>
                                  </>
                                );
                              })()}
                            </div>
                            {(() => {
                              const selectedTp = realTpOptions.find((t) => t.kodeTp === tpCodePenilaian && t.materi === materiPenilaian);
                              return selectedTp?.deskripsi ? (
                                <p className="text-slate-400 text-xs leading-relaxed whitespace-normal break-words pl-0.5">
                                  {selectedTp.deskripsi}
                                </p>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">-- Klik untuk Pilih TP dari Bank Data --</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-sky-400 shrink-0 mt-0.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Dropdown Options Popup Container with Auto Text Wrapping */}
                      {pickerOpen && (
                        <div className="mt-2 max-h-64 overflow-y-auto space-y-1.5 p-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-30 divide-y divide-slate-800/40">
                          {realTpOptions.map((t) => {
                            const isSelected = tpCodePenilaian === t.kodeTp && materiPenilaian === t.materi;
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setMateriPenilaian(t.materi);
                                  setTpCodePenilaian(t.kodeTp);
                                  if (t.deskripsi) setDeskripsiPenilaian(t.deskripsi);
                                  setPickerOpen(false);
                                }}
                                className={`p-3 rounded-xl text-xs cursor-pointer transition space-y-1.5 text-left border ${
                                  isSelected
                                    ? "bg-sky-500/15 border-sky-500/50 text-white"
                                    : "border-transparent hover:bg-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white"
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-1.5 font-bold">
                                  <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[9px] font-mono">
                                    Sem {t.semester === 1 ? "Ganjil" : "Genap"}
                                  </span>
                                  <span className="text-sky-300 font-mono font-bold">{t.kodeTp}</span>
                                  <span className="text-white font-semibold">• {t.materi}</span>
                                </div>
                                {t.deskripsi && (
                                  <p className="text-slate-400 text-xs leading-relaxed whitespace-normal break-words">
                                    {t.deskripsi}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {jenisPenilaian === "SUMATIF" && (
                <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                      <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                        2. Pilih Lingkup Materi / Bab ATAU TP *
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFastPickerSemesterFilter(fastPickerSemesterFilter === "ACTIVE" ? "ALL" : "ACTIVE");
                        setPickerOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Sliders className="w-3 h-3 text-amber-400" />
                      <span>{fastPickerSemesterFilter === "ACTIVE" ? `Semester ${activeSemester === 1 ? "Ganjil" : "Genap"}` : "Semua Semester"}</span>
                    </button>
                  </div>

                  {tpList.length === 0 ? (
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex flex-col items-center gap-2.5 text-center">
                      <span>⚠️ Belum ada Lingkup Materi / TP tersimpan di Bank Data.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          router.push(`/materi?kelasId=${selectedClass.id}&mapelId=${selectedMapel.id}`);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        + Isi Bank TP & Materi Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Trigger Button with text wrapping */}
                      <button
                        type="button"
                        onClick={() => setPickerOpen((prev) => !prev)}
                        className="w-full text-left p-3.5 border border-slate-800 hover:border-amber-500/50 rounded-xl bg-slate-900/90 text-xs text-white flex items-start justify-between gap-3 cursor-pointer transition-all shadow-inner"
                      >
                        {materiPenilaian ? (
                          <div className="space-y-1.5 min-w-0 flex-1">
                            {tpCodePenilaian ? (
                              <>
                                <div className="flex flex-wrap items-center gap-2 font-bold">
                                  {(() => {
                                    const selectedTp = realTpOptions.find((t) => t.kodeTp === tpCodePenilaian && t.materi === materiPenilaian);
                                    return (
                                      <>
                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] shrink-0 font-bold">
                                          🎯 TP Spesifik [Sem {selectedTp?.semester === 1 ? "Ganjil" : "Genap"}]
                                        </span>
                                        <span className="px-2 py-0.5 bg-slate-800 text-amber-400 font-mono font-bold rounded text-[11px]">
                                          {tpCodePenilaian}
                                        </span>
                                        <span className="text-white font-semibold">• {materiPenilaian}</span>
                                      </>
                                    );
                                  })()}
                                </div>
                                {(() => {
                                  const selectedTp = realTpOptions.find((t) => t.kodeTp === tpCodePenilaian && t.materi === materiPenilaian);
                                  return selectedTp?.deskripsi ? (
                                    <p className="text-slate-400 text-xs leading-relaxed whitespace-normal break-words pl-0.5">
                                      {selectedTp.deskripsi}
                                    </p>
                                  ) : null;
                                })()}
                              </>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2 font-bold">
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] shrink-0 font-bold">
                                  📚 Lingkup Materi / Bab
                                </span>
                                <span className="text-white font-bold">{materiPenilaian}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">-- Klik untuk Pilih Lingkup Materi / Bab atau TP --</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-amber-400 shrink-0 mt-0.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Dropdown Options Popup Container with Auto Text Wrapping */}
                      {pickerOpen && (
                        <div className="mt-2 max-h-64 overflow-y-auto space-y-2 p-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-30">
                          {/* SECTION 1: LINGKUP MATERI / BAB */}
                          {uniqueBabList.length > 0 && (
                            <div className="space-y-1">
                              <div className="px-2.5 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/60 border border-amber-800/40 rounded-lg">
                                📚 Lingkup Materi / Bab (Nilai Per Bab)
                              </div>
                              {uniqueBabList.map((babTitle) => {
                                const isSelected = materiPenilaian === babTitle && !tpCodePenilaian;
                                return (
                                  <div
                                    key={`bab-${babTitle}`}
                                    onClick={() => {
                                      setMateriPenilaian(babTitle);
                                      setTpCodePenilaian("");
                                      setPickerOpen(false);
                                    }}
                                    className={`p-3 rounded-xl text-xs cursor-pointer transition text-left font-bold border ${
                                      isSelected
                                        ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                                        : "border-transparent hover:bg-slate-800/80 hover:border-slate-700 text-slate-200 hover:text-white"
                                    }`}
                                  >
                                    Bab: {babTitle}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* SECTION 2: TP SPESIFIK */}
                          {realTpOptions.length > 0 && (
                            <div className="space-y-1 pt-1.5 border-t border-slate-800">
                              <div className="px-2.5 py-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider bg-sky-950/60 border border-sky-800/40 rounded-lg">
                                🎯 TP Spesifik (Nilai Per TP)
                              </div>
                              {realTpOptions.map((t) => {
                                const isSelected = tpCodePenilaian === t.kodeTp && materiPenilaian === t.materi;
                                return (
                                  <div
                                    key={`tp-${t.id}`}
                                    onClick={() => {
                                      setMateriPenilaian(t.materi);
                                      setTpCodePenilaian(t.kodeTp);
                                      if (t.deskripsi) setDeskripsiPenilaian(t.deskripsi);
                                      setPickerOpen(false);
                                    }}
                                    className={`p-3 rounded-xl text-xs cursor-pointer transition space-y-1.5 text-left border ${
                                      isSelected
                                        ? "bg-sky-500/15 border-sky-500/50 text-white"
                                        : "border-transparent hover:bg-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center gap-1.5 font-bold">
                                      <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[9px] font-mono">
                                        Sem {t.semester === 1 ? "Ganjil" : "Genap"}
                                      </span>
                                      <span className="text-sky-300 font-mono font-bold">{t.kodeTp}</span>
                                      <span className="text-white font-semibold">• {t.materi}</span>
                                    </div>
                                    {t.deskripsi && (
                                      <p className="text-slate-400 text-xs leading-relaxed whitespace-normal break-words">
                                        {t.deskripsi}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. FIELD DETAIL PENILAIAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Penilaian *
                </label>
                {jenisPenilaian === "PAS_UAS" ? (
                  <select
                    value={namaPenilaian || (activeSemester === 1 ? "Asesmen Akhir Semester" : "Asesmen Akhir Tahun")}
                    onChange={(e) => setNamaPenilaian(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold cursor-pointer"
                  >
                    <option value="Asesmen Akhir Semester">Asesmen Akhir Semester (Semester Ganjil)</option>
                    <option value="Asesmen Akhir Tahun">Asesmen Akhir Tahun (Semester Genap)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ketik nama penilaian (contoh: Formatif 1 / Quiz Bab 1)..."
                    value={namaPenilaian}
                    onChange={(e) => setNamaPenilaian(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                )}
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

      {/* MODAL: EDIT DETAIL PENILAIAN */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Detail Penilaian</h3>
                  <p className="text-xs text-slate-400">
                    Ubah data isian seperti jenis, lingkup materi, TP, nama, atau tanggal penilaian.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePenilaian} className="space-y-4">
              {/* 1. JENIS PENILAIAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Jenis Penilaian *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditJenisPenilaian("FORMATIF")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      editJenisPenilaian === "FORMATIF"
                        ? "bg-sky-500/20 border-sky-500 text-sky-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span>Formatif</span>
                    <span className="text-[10px] font-normal opacity-80">(Proses Harian)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditJenisPenilaian("SUMATIF")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      editJenisPenilaian === "SUMATIF"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span>Sumatif</span>
                    <span className="text-[10px] font-normal opacity-80">(TP / Materi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditJenisPenilaian("PAS_UAS");
                      setEditNamaPenilaian(activeSemester === 1 ? "Asesmen Akhir Semester" : "Asesmen Akhir Tahun");
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      editJenisPenilaian === "PAS_UAS"
                        ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span>PAS / UAS</span>
                    <span className="text-[10px] font-normal opacity-80">(Akhir Semester)</span>
                  </button>
                </div>
              </div>

              {/* 2. BANK DATA / LINGKUP MATERI & TP (Hanya jika bukan PAS_UAS) */}
              {editJenisPenilaian !== "PAS_UAS" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Lingkup Materi & Tujuan Pembelajaran (TP) *
                    </label>
                    {selectedClass && selectedMapel && (
                      <button
                        type="button"
                        onClick={() => router.push(`/materi?kelasId=${selectedClass.id}&mapelId=${selectedMapel.id}`)}
                        className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Kelola Bank Materi
                      </button>
                    )}
                  </div>

                  {tpList.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
                      <p className="font-bold">⚠️ Belum Ada Bank Materi / TP</p>
                      <p className="text-[11px]">
                        Anda dapat menambah Lingkup Materi dan TP terlebih dahulu agar penilaian terstruktur.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Trigger Button with text wrapping */}
                      <button
                        type="button"
                        onClick={() => setEditPickerOpen((prev) => !prev)}
                        className="w-full text-left p-3.5 border border-slate-800 hover:border-amber-500/50 rounded-xl bg-slate-900/90 text-xs text-white flex items-start justify-between gap-3 cursor-pointer transition-all shadow-inner"
                      >
                        {editMateriPenilaian ? (
                          <div className="space-y-1.5 min-w-0 flex-1">
                            {editTpCodePenilaian ? (
                              <>
                                <div className="flex flex-wrap items-center gap-2 font-bold">
                                  {(() => {
                                    const selectedTp = realTpOptions.find((t) => t.kodeTp === editTpCodePenilaian && t.materi === editMateriPenilaian);
                                    return (
                                      <>
                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] shrink-0 font-bold">
                                          🎯 TP Spesifik [Sem {selectedTp?.semester === 1 ? "Ganjil" : "Genap"}]
                                        </span>
                                        <span className="px-2 py-0.5 bg-slate-800 text-amber-400 font-mono font-bold rounded text-[11px]">
                                          {editTpCodePenilaian}
                                        </span>
                                        <span className="text-white font-semibold">• {editMateriPenilaian}</span>
                                      </>
                                    );
                                  })()}
                                </div>
                                {(() => {
                                  const selectedTp = realTpOptions.find((t) => t.kodeTp === editTpCodePenilaian && t.materi === editMateriPenilaian);
                                  return selectedTp?.deskripsi ? (
                                    <p className="text-slate-400 text-xs leading-relaxed whitespace-normal break-words pl-0.5">
                                      {selectedTp.deskripsi}
                                    </p>
                                  ) : null;
                                })()}
                              </>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2 font-bold">
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] shrink-0 font-bold">
                                  📚 Lingkup Materi / Bab
                                </span>
                                <span className="text-white font-bold">{editMateriPenilaian}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">-- Klik untuk Pilih Lingkup Materi / Bab atau TP --</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-amber-400 shrink-0 mt-0.5 transition-transform ${editPickerOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Dropdown Options Popup */}
                      {editPickerOpen && (
                        <div className="mt-2 max-h-64 overflow-y-auto space-y-2 p-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-30">
                          {/* SECTION 1: LINGKUP MATERI / BAB */}
                          {uniqueBabList.length > 0 && (
                            <div className="space-y-1">
                              <div className="px-2.5 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/60 border border-amber-800/40 rounded-lg">
                                📚 Lingkup Materi / Bab (Nilai Per Bab)
                              </div>
                              {uniqueBabList.map((babTitle) => {
                                const isSelected = editMateriPenilaian === babTitle && !editTpCodePenilaian;
                                return (
                                  <div
                                    key={`edit-bab-${babTitle}`}
                                    onClick={() => {
                                      setEditMateriPenilaian(babTitle);
                                      setEditTpCodePenilaian("");
                                      setEditPickerOpen(false);
                                    }}
                                    className={`p-3 rounded-xl text-xs cursor-pointer transition text-left font-bold border ${
                                      isSelected
                                        ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                                        : "border-transparent hover:bg-slate-800/80 hover:border-slate-700 text-slate-200 hover:text-white"
                                    }`}
                                  >
                                    Bab: {babTitle}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* SECTION 2: TP SPESIFIK */}
                          {realTpOptions.length > 0 && (
                            <div className="space-y-1 pt-1.5 border-t border-slate-800">
                              <div className="px-2.5 py-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider bg-sky-950/60 border border-sky-800/40 rounded-lg">
                                🎯 TP Spesifik (Nilai Per TP)
                              </div>
                              {realTpOptions.map((t) => {
                                const isSelected = editTpCodePenilaian === t.kodeTp && editMateriPenilaian === t.materi;
                                return (
                                  <div
                                    key={`edit-tp-${t.id}`}
                                    onClick={() => {
                                      setEditMateriPenilaian(t.materi);
                                      setEditTpCodePenilaian(t.kodeTp);
                                      if (t.deskripsi) setEditDeskripsiPenilaian(t.deskripsi);
                                      setEditPickerOpen(false);
                                    }}
                                    className={`p-3 rounded-xl text-xs cursor-pointer transition space-y-1.5 text-left border ${
                                      isSelected
                                        ? "bg-sky-500/15 border-sky-500/50 text-white"
                                        : "border-transparent hover:bg-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center gap-1.5 font-bold">
                                      <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[9px] font-mono">
                                        Sem {t.semester === 1 ? "Ganjil" : "Genap"}
                                      </span>
                                      <span className="text-sky-300 font-mono font-bold">{t.kodeTp}</span>
                                      <span className="text-white font-semibold">• {t.materi}</span>
                                    </div>
                                    {t.deskripsi && (
                                      <p className="text-slate-400 text-xs leading-relaxed whitespace-normal break-words">
                                        {t.deskripsi}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. FIELD DETAIL PENILAIAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Penilaian *
                </label>
                {editJenisPenilaian === "PAS_UAS" ? (
                  <select
                    value={editNamaPenilaian || (activeSemester === 1 ? "Asesmen Akhir Semester" : "Asesmen Akhir Tahun")}
                    onChange={(e) => setEditNamaPenilaian(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold cursor-pointer"
                  >
                    <option value="Asesmen Akhir Semester">Asesmen Akhir Semester (Semester Ganjil)</option>
                    <option value="Asesmen Akhir Tahun">Asesmen Akhir Tahun (Semester Genap)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ketik nama penilaian (contoh: Formatif 1 / Quiz Bab 1)..."
                    value={editNamaPenilaian}
                    onChange={(e) => setEditNamaPenilaian(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tanggal Penilaian *
                </label>
                <input
                  type="date"
                  required
                  value={editTanggalPenilaian}
                  onChange={(e) => setEditTanggalPenilaian(e.target.value)}
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
                  value={editDeskripsiPenilaian}
                  onChange={(e) => setEditDeskripsiPenilaian(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isPending ||
                    (editJenisPenilaian === "FORMATIF" && (!editTpCodePenilaian || !editMateriPenilaian)) ||
                    (editJenisPenilaian === "SUMATIF" && (!editMateriPenilaian && !editTpCodePenilaian)) ||
                    !editNamaPenilaian.trim()
                  }
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
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
  onEditHeader,
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
  onEditHeader: (item: PenilaianHeader, e: React.MouseEvent) => void;
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
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold mb-1">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg">
                Kelas {selectedClass.nama}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                {selectedMapel.nama} ({selectedMapel.kode})
              </span>
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
            Bank Materi ({tpListCount})
          </button>

          <button
            onClick={onOpenRekap}
            className="px-4 py-2.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            Rekap Nilai
          </button>

          <button
            onClick={onAddClick}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Penilaian
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
                        onClick={(e) => onEditHeader(item, e)}
                        className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition cursor-pointer"
                        title="Edit Detail Penilaian"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
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
