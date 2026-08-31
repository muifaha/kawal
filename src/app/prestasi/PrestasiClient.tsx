"use client";

import React, { useState, useMemo } from "react";
import {
  Trophy,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Award,
  Users,
  User,
  Upload,
  X,
  Eye,
  Trash2,
  Sparkles,
  Building,
  FileText,
  Clock,
  Filter,
  Check,
  Zap,
  Medal,
  Globe,
  Star,
  ChevronRight,
  TrendingUp,
  Image as ImageIcon,
} from "lucide-react";
import { reportPrestasiAction, deletePrestasiAction } from "@/app/actions/prestasi";

interface StudentItem {
  id: string;
  nis: string;
  nama: string;
}

interface KelasItem {
  id: string;
  nama: string;
  siswa: StudentItem[];
}

interface PrestasiItem {
  id: string;
  jenisKepesertaan: "INDIVIDU" | "TIM";
  namaTim: string | null;
  namaPrestasi: string;
  waktuPelaksanaan: string;
  penyelenggara: string;
  kategori: "BERJENJANG" | "TIDAK_BERJENJANG";
  tingkat: "KECAMATAN" | "KOTA" | "PROVINSI" | "NASIONAL" | "INTERNASIONAL";
  isRemisiOtomatis: boolean;
  poinRemisi: number;
  catatan: string | null;
  fotoPiagam: string | null;
  fotoKegiatan: string | null;
  createdAt: string;
  pelapor: {
    id: string;
    nama: string;
    role: string;
  };
  anggota: {
    id: string;
    nis: string;
    nama: string;
    kelasNama: string;
  }[];
}

interface PrestasiClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
  classes: KelasItem[];
  initialPrestasiList: PrestasiItem[];
  defaultTab?: "input" | "list";
}

const DEFAULT_REMISI_POINTS: Record<string, number> = {
  KECAMATAN: 5,
  KOTA: 10,
  PROVINSI: 15,
  NASIONAL: 25,
  INTERNASIONAL: 50,
};

const TINGKAT_BADGE_STYLE: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  KECAMATAN: { bg: "bg-slate-500/10", text: "text-slate-300", border: "border-slate-500/30", icon: Building },
  KOTA: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30", icon: Award },
  PROVINSI: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", icon: Medal },
  NASIONAL: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", icon: Star },
  INTERNASIONAL: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", icon: Globe },
};

export default function PrestasiClient({ user, classes, initialPrestasiList, defaultTab = "list" }: PrestasiClientProps) {
  const [activeTab, setActiveTab] = useState<"input" | "list">(defaultTab);
  const [prestasiList, setPrestasiList] = useState<PrestasiItem[]>(initialPrestasiList);

  // Form States
  const [jenisKepesertaan, setJenisKepesertaan] = useState<"INDIVIDU" | "TIM">("INDIVIDU");
  const [namaTim, setNamaTim] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [classFilterId, setClassFilterId] = useState("");

  const [namaPrestasi, setNamaPrestasi] = useState("");
  const [waktuPelaksanaan, setWaktuPelaksanaan] = useState(() => new Date().toISOString().split("T")[0]);
  const [penyelenggara, setPenyelenggara] = useState("");
  const [kategori, setKategori] = useState<"BERJENJANG" | "TIDAK_BERJENJANG">("BERJENJANG");
  const [tingkat, setTingkat] = useState<"KECAMATAN" | "KOTA" | "PROVINSI" | "NASIONAL" | "INTERNASIONAL">("KOTA");

  // Remisi Otomatis States
  const [isRemisiOtomatis, setIsRemisiOtomatis] = useState(true);
  const [poinRemisi, setPoinRemisi] = useState(10); // default for KOTA

  // Upload States
  const [fotoPiagamBase64, setFotoPiagamBase64] = useState<string | null>(null);
  const [fotoPiagamPreview, setFotoPiagamPreview] = useState<string | null>(null);
  const [fotoKegiatanBase64, setFotoKegiatanBase64] = useState<string | null>(null);
  const [fotoKegiatanPreview, setFotoKegiatanPreview] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");

  // Status & Modal States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<{ title: string; src: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // History Filter States
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyTingkatFilter, setHistoryTingkatFilter] = useState("");
  const [historyKategoriFilter, setHistoryKategoriFilter] = useState("");

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const totalCount = prestasiList.length;
    const nationalOrHigher = prestasiList.filter((p) => p.tingkat === "NASIONAL" || p.tingkat === "INTERNASIONAL").length;

    const uniqueStudentsSet = new Set<string>();
    let totalRemissionPoints = 0;

    prestasiList.forEach((p) => {
      p.anggota.forEach((a) => {
        uniqueStudentsSet.add(a.id);
        if (p.isRemisiOtomatis) {
          totalRemissionPoints += p.poinRemisi;
        }
      });
    });

    return {
      totalCount,
      nationalOrHigher,
      totalStudents: uniqueStudentsSet.size,
      totalRemissionPoints,
    };
  }, [prestasiList]);

  // Flat Student List for Autocomplete Tagging
  const allStudents = useMemo(() => {
    return classes.flatMap((c) =>
      c.siswa.map((s) => ({
        id: s.id,
        nis: s.nis,
        nama: s.nama,
        kelasId: c.id,
        kelasNama: c.nama,
        searchString: `${s.nama} ${s.nis} ${c.nama}`.toLowerCase(),
      }))
    );
  }, [classes]);

  // Filtered Students for Tagging Selector
  const filteredStudents = useMemo(() => {
    let list = allStudents;
    if (classFilterId) {
      list = list.filter((s) => s.kelasId === classFilterId);
    }
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.trim().toLowerCase();
      list = list.filter((s) => s.searchString.includes(q));
    }
    return list.filter((s) => !selectedStudentIds.includes(s.id)).slice(0, 15);
  }, [allStudents, classFilterId, studentSearchQuery, selectedStudentIds]);

  // Selected Students Detail
  const selectedStudentsDetail = useMemo(() => {
    return selectedStudentIds
      .map((id) => allStudents.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
  }, [selectedStudentIds, allStudents]);

  // Handle Tingkat Change -> Update Default Poin Remisi
  const handleTingkatChange = (newTingkat: "KECAMATAN" | "KOTA" | "PROVINSI" | "NASIONAL" | "INTERNASIONAL") => {
    setTingkat(newTingkat);
    if (DEFAULT_REMISI_POINTS[newTingkat]) {
      setPoinRemisi(DEFAULT_REMISI_POINTS[newTingkat]);
    }
  };

  // Add / Remove Student Handler
  const handleAddStudent = (id: string) => {
    if (jenisKepesertaan === "INDIVIDU") {
      setSelectedStudentIds([id]);
    } else {
      setSelectedStudentIds((prev) => [...prev, id]);
    }
    setStudentSearchQuery("");
  };

  const handleRemoveStudent = (id: string) => {
    setSelectedStudentIds((prev) => prev.filter((sid) => sid !== id));
  };

  // File Upload Handlers (Base64)
  const handlePiagamFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file foto piagam maksimal 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoPiagamBase64(reader.result as string);
      setFotoPiagamPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleKegiatanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file foto kegiatan maksimal 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoKegiatanBase64(reader.result as string);
      setFotoKegiatanPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (selectedStudentIds.length === 0) {
      setStatusMessage({ type: "error", text: "Mohon pilih minimal 1 siswa penerima / anggota tim prestasi." });
      return;
    }

    if (jenisKepesertaan === "TIM" && !namaTim.trim()) {
      setStatusMessage({ type: "error", text: "Mohon isi nama Tim / Kontingen." });
      return;
    }

    if (!namaPrestasi.trim() || !penyelenggara.trim() || !waktuPelaksanaan) {
      setStatusMessage({ type: "error", text: "Mohon lengkapi Nama Prestasi, Penyelenggara, dan Waktu Pelaksanaan." });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await reportPrestasiAction({
        studentIds: selectedStudentIds,
        jenisKepesertaan,
        namaTim: jenisKepesertaan === "TIM" ? namaTim.trim() : undefined,
        namaPrestasi: namaPrestasi.trim(),
        waktuPelaksanaan,
        penyelenggara: penyelenggara.trim(),
        kategori,
        tingkat,
        catatan: catatan.trim() || undefined,
        fotoPiagamBase64: fotoPiagamBase64 || undefined,
        fotoKegiatanBase64: fotoKegiatanBase64 || undefined,
      });

      if (res.error) {
        setStatusMessage({ type: "error", text: res.error });
      } else {
        setStatusMessage({ type: "success", text: res.message || "Data prestasi berhasil disimpan!" });

        if (res.newPrestasi) {
          const formattedNew: PrestasiItem = {
            id: res.newPrestasi.id,
            jenisKepesertaan: res.newPrestasi.jenisKepesertaan,
            namaTim: res.newPrestasi.namaTim,
            namaPrestasi: res.newPrestasi.namaPrestasi,
            waktuPelaksanaan: res.newPrestasi.waktuPelaksanaan.toString(),
            penyelenggara: res.newPrestasi.penyelenggara,
            kategori: res.newPrestasi.kategori,
            tingkat: res.newPrestasi.tingkat,
            isRemisiOtomatis: res.newPrestasi.isRemisiOtomatis,
            poinRemisi: res.newPrestasi.poinRemisi,
            catatan: res.newPrestasi.catatan,
            fotoPiagam: res.newPrestasi.fotoPiagam,
            fotoKegiatan: res.newPrestasi.fotoKegiatan,
            createdAt: res.newPrestasi.createdAt.toString(),
            pelapor: {
              id: res.newPrestasi.pelapor.id,
              nama: res.newPrestasi.pelapor.nama,
              role: res.newPrestasi.pelapor.role,
            },
            anggota: res.newPrestasi.anggota.map((a: any) => ({
              id: a.siswa.id,
              nis: a.siswa.nis,
              nama: a.siswa.nama,
              kelasNama: a.siswa.riwayatKelas[0]?.kelas.nama || "-",
            })),
          };
          setPrestasiList((prev) => [formattedNew, ...prev]);
        }

        // Reset Form
        setSelectedStudentIds([]);
        setNamaTim("");
        setNamaPrestasi("");
        setPenyelenggara("");
        setCatatan("");
        setFotoPiagamBase64(null);
        setFotoPiagamPreview(null);
        setFotoKegiatanBase64(null);
        setFotoKegiatanPreview(null);
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal menyimpan: ${err.message || err}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeletePrestasi = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data prestasi "${name}"?`)) return;

    setDeletingId(id);
    try {
      const res = await deletePrestasiAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        setPrestasiList((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message || err}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered History List
  const filteredHistory = useMemo(() => {
    return prestasiList.filter((item) => {
      const matchSearch =
        !historySearchQuery ||
        item.namaPrestasi.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        item.penyelenggara.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        (item.namaTim && item.namaTim.toLowerCase().includes(historySearchQuery.toLowerCase())) ||
        item.anggota.some((a) => a.nama.toLowerCase().includes(historySearchQuery.toLowerCase()) || a.nis.includes(historySearchQuery));

      const matchTingkat = !historyTingkatFilter || item.tingkat === historyTingkatFilter;
      const matchKategori = !historyKategoriFilter || item.kategori === historyKategoriFilter;

      return matchSearch && matchTingkat && matchKategori;
    });
  }, [prestasiList, historySearchQuery, historyTingkatFilter, historyKategoriFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Modul Prestasi Siswa
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Kawal Sekolahan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Pencatatan & Rekapitulasi Prestasi Siswa
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Kelola pendokumentasian prestasi kejuaraan siswa, apresiasi sertifikat/piagam, serta integrasi pemotongan poin pelanggaran secara langsung.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto shrink-0">
            <button
              onClick={() => setActiveTab("input")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "input"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-md shadow-amber-400/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Input Prestasi Siswa</span>
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "list"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-md shadow-amber-400/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Daftar & Riwayat ({prestasiList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Total Prestasi</span>
            <Trophy className="w-4 h-4 text-amber-400/70" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.totalCount}</p>
          <p className="text-[10px] text-slate-400">Kejuaraan berhasil didokumentasikan</p>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Nasional / Internasional</span>
            <Globe className="w-4 h-4 text-purple-400/70" />
          </div>
          <p className="text-2xl font-bold text-purple-300">{metrics.nationalOrHigher}</p>
          <p className="text-[10px] text-slate-400">Tingkat tinggi diraih</p>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Siswa Berprestasi</span>
            <Users className="w-4 h-4 text-sky-400/70" />
          </div>
          <p className="text-2xl font-bold text-sky-300">{metrics.totalStudents}</p>
          <p className="text-[10px] text-slate-400">Siswa terlibat individu & tim</p>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Total Remisi Poin</span>
            <Zap className="w-4 h-4 text-emerald-400/70" />
          </div>
          <p className="text-2xl font-bold text-emerald-300">+{metrics.totalRemissionPoints}</p>
          <p className="text-[10px] text-slate-400">Poin remisi disalurkan</p>
        </div>
      </div>

      {/* Alert Status Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-slate-900 rounded-lg transition-all text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================== TAB 1: FORM INPUT PRESTASI ==================== */}
      {activeTab === "input" && (
        <form onSubmit={handleSubmitForm} className="space-y-6">
          {/* SECTION 1: KEPESERTAAN & SISWA */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Kategori Kepesertaan & Tagging Siswa
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Choice: Individu vs Tim */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Jenis Kepesertaan
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setJenisKepesertaan("INDIVIDU");
                      if (selectedStudentIds.length > 1) setSelectedStudentIds([selectedStudentIds[0]]);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      jenisKepesertaan === "INDIVIDU"
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-md shadow-amber-400/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Individu (Perorangan)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenisKepesertaan("TIM")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      jenisKepesertaan === "TIM"
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-md shadow-amber-400/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Tim / Kelompok / Kontingen</span>
                  </button>
                </div>
              </div>

              {/* Nama Tim Input (if TIM) */}
              {jenisKepesertaan === "TIM" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nama Tim / Kontingen <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Tim Futsal Putra Kawal / Kontingen OSN Matematika"
                    value={namaTim}
                    onChange={(e) => setNamaTim(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Student Search & Tagging */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pilih Siswa {jenisKepesertaan === "TIM" ? "Anggota Tim" : "Penerima Prestasi"}{" "}
                <span className="text-rose-400">*</span>
              </label>

              {/* Search & Class Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ketik nama siswa atau NIS untuk mencari..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <select
                    value={classFilterId}
                    onChange={(e) => setClassFilterId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">-- Semua Kelas --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} ({c.siswa.length} siswa)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Autocomplete Dropdown List */}
              {studentSearchQuery.trim() !== "" && filteredStudents.length > 0 && (
                <div className="max-h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-900 shadow-2xl z-20">
                  {filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleAddStudent(s.id)}
                      className="w-full p-2.5 text-left flex items-center justify-between hover:bg-amber-500/10 hover:text-amber-300 transition-all cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{s.nama}</span>
                        <span className="text-slate-500">({s.nis})</span>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-400 font-semibold">
                        {s.kelasNama}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Students Badge List */}
              <div className="pt-1">
                <p className="text-[10px] text-slate-500 font-semibold mb-1.5 uppercase tracking-wider">
                  Siswa Terpilih ({selectedStudentIds.length}):
                </p>
                {selectedStudentsDetail.length === 0 ? (
                  <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl text-xs text-slate-500 italic text-center">
                    Belum ada siswa yang dipilih. Ketik nama siswa pada kotak pencarian di atas.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedStudentsDetail.map((s) => (
                      <div
                        key={s.id}
                        className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-2 shadow-sm"
                      >
                        <span>
                          {s.nama} ({s.kelasNama})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(s.id)}
                          className="p-0.5 hover:bg-amber-500/20 rounded-full transition-all cursor-pointer text-amber-400 hover:text-amber-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: DETAIL KEJUARAAN & TINGKAT PRESTASI */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Detail Kejuaraan & Tingkat Prestasi
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Prestasi & Peringkat */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nama Prestasi / Kejuaraan (Termasuk Peringkat / Juara) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Juara 1 Lomba FLS2N Cipta Puisi / Medali Emas OSN Matematika"
                  value={namaPrestasi}
                  onChange={(e) => setNamaPrestasi(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Waktu Pelaksanaan */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Waktu Pelaksanaan Event <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={waktuPelaksanaan}
                  onChange={(e) => setWaktuPelaksanaan(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Penyelenggara Event */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Penyelenggara Event / Kejuaraan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dinas Pendidikan Kota / Kemendikbudristek / Universitas Indonesia"
                  value={penyelenggara}
                  onChange={(e) => setPenyelenggara(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Kategori Prestasi */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Kategori Prestasi
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setKategori("BERJENJANG")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      kategori === "BERJENJANG"
                        ? "bg-amber-400 text-amber-950 shadow-md shadow-amber-400/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Berjenjang
                  </button>
                  <button
                    type="button"
                    onClick={() => setKategori("TIDAK_BERJENJANG")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      kategori === "TIDAK_BERJENJANG"
                        ? "bg-amber-400 text-amber-950 shadow-md shadow-amber-400/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tidak Berjenjang
                  </button>
                </div>
              </div>

              {/* Tingkat Prestasi */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Tingkat Prestasi
                </label>
                <select
                  value={tingkat}
                  onChange={(e) => setTingkat(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer font-semibold"
                >
                  <option value="KECAMATAN">Tingkat Kecamatan</option>
                  <option value="KOTA">Tingkat Kota / Kabupaten</option>
                  <option value="PROVINSI">Tingkat Provinsi</option>
                  <option value="NASIONAL">Tingkat Nasional</option>
                  <option value="INTERNASIONAL">Tingkat Internasional</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: UPLOAD DOKUMEN & CATATAN */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Upload Dokumen Piagam & Catatan Tambahan (Opsional)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upload 1: Foto Piagam */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Foto Piagam / Sertifikat Kejuaraan
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePiagamFileChange}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-amber-400 hover:file:bg-slate-800 cursor-pointer"
                />
                {fotoPiagamPreview && (
                  <div className="relative mt-2 w-32 h-32 rounded-xl overflow-hidden border border-slate-700 group">
                    <img src={fotoPiagamPreview} alt="Piagam" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setFotoPiagamBase64(null);
                        setFotoPiagamPreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-rose-600/80 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Upload 2: Foto Diri / Kelompok */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Foto Diri / Kelompok / Penyerahan Hadiah
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleKegiatanFileChange}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-amber-400 hover:file:bg-slate-800 cursor-pointer"
                />
                {fotoKegiatanPreview && (
                  <div className="relative mt-2 w-32 h-32 rounded-xl overflow-hidden border border-slate-700 group">
                    <img src={fotoKegiatanPreview} alt="Kegiatan" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setFotoKegiatanBase64(null);
                        setFotoKegiatanPreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-rose-600/80 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={3}
                placeholder="Tambahkan catatan khusus, informasi pembimbing, atau detail hadiah kejuaraan..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-400/20 disabled:opacity-50"
            >
              <Trophy className="w-4 h-4" />
              <span>{isSubmitting ? "Memproses Data..." : "Simpan Data Prestasi Siswa"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ==================== TAB 2: DAFTAR & RIWAYAT PRESTASI ==================== */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari prestasi, siswa, penyelenggara..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Tingkat Filter */}
            <div>
              <select
                value={historyTingkatFilter}
                onChange={(e) => setHistoryTingkatFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer font-semibold"
              >
                <option value="">-- Semua Tingkat --</option>
                <option value="KECAMATAN">Tingkat Kecamatan</option>
                <option value="KOTA">Tingkat Kota / Kabupaten</option>
                <option value="PROVINSI">Tingkat Provinsi</option>
                <option value="NASIONAL">Tingkat Nasional</option>
                <option value="INTERNASIONAL">Tingkat Internasional</option>
              </select>
            </div>

            {/* Kategori Filter */}
            <div>
              <select
                value={historyKategoriFilter}
                onChange={(e) => setHistoryKategoriFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer font-semibold"
              >
                <option value="">-- Semua Kategori --</option>
                <option value="BERJENJANG">Berjenjang</option>
                <option value="TIDAK_BERJENJANG">Tidak Berjenjang</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 text-center w-12">No</th>
                    <th className="py-3.5 px-4 text-left">Nama Prestasi & Event</th>
                    <th className="py-3.5 px-4 text-left">Penerima / Anggota</th>
                    <th className="py-3.5 px-4 text-left">Tingkat & Kategori</th>
                    <th className="py-3.5 px-4 text-left">Waktu & Penyelenggara</th>
                    <th className="py-3.5 px-4 text-center">Remisi Poin</th>
                    <th className="py-3.5 px-4 text-center">Bukti Foto</th>
                    <th className="py-3.5 px-4 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Trophy className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="font-semibold text-slate-400">Belum ada data prestasi yang sesuai dengan filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item, idx) => {
                      const badge = TINGKAT_BADGE_STYLE[item.tingkat] || TINGKAT_BADGE_STYLE.KOTA;
                      const IconComp = badge.icon;
                      const formattedDate = new Date(item.waktuPelaksanaan).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-500">{idx + 1}</td>

                          {/* Nama Prestasi */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <p className="font-bold text-white text-xs flex items-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{item.namaPrestasi}</span>
                              </p>
                              {item.catatan && (
                                <p className="text-[10px] text-slate-400 italic">"{item.catatan}"</p>
                              )}
                              <p className="text-[10px] text-slate-500">
                                Pelapor: <span className="text-slate-400 font-semibold">{item.pelapor.nama}</span>
                              </p>
                            </div>
                          </td>

                          {/* Anggota Siswa */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {item.jenisKepesertaan === "TIM" && item.namaTim && (
                                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold rounded inline-block">
                                  Tim: {item.namaTim}
                                </span>
                              )}
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {item.anggota.map((a) => (
                                  <span
                                    key={a.id}
                                    className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] font-medium text-slate-200"
                                  >
                                    {a.nama} ({a.kelasNama})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Tingkat & Kategori */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                <IconComp className="w-3 h-3" />
                                <span>Tingkat {item.tingkat}</span>
                              </span>
                              <p className="text-[10px] text-slate-400">
                                {item.kategori === "BERJENJANG" ? "Berjenjang" : "Tidak Berjenjang"}
                              </p>
                            </div>
                          </td>

                          {/* Waktu & Penyelenggara */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{formattedDate}</span>
                              </p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-500" />
                                <span>{item.penyelenggara}</span>
                              </p>
                            </div>
                          </td>

                          {/* Remisi Poin */}
                          <td className="py-3.5 px-4 text-center">
                            {item.isRemisiOtomatis && item.poinRemisi > 0 ? (
                              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-lg text-[10px] inline-flex items-center gap-1 shadow-sm">
                                <Zap className="w-3 h-3" />+{item.poinRemisi} Poin
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Tanpa Remisi</span>
                            )}
                          </td>

                          {/* Bukti Foto */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.fotoPiagam && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImageModal({
                                      title: `Piagam: ${item.namaPrestasi}`,
                                      src: item.fotoPiagam!,
                                    })
                                  }
                                  className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-amber-400 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                  title="Lihat Foto Piagam"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Piagam</span>
                                </button>
                              )}
                              {item.fotoKegiatan && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImageModal({
                                      title: `Kegiatan: ${item.namaPrestasi}`,
                                      src: item.fotoKegiatan!,
                                    })
                                  }
                                  className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-sky-400 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                  title="Lihat Foto Kegiatan"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Foto</span>
                                </button>
                              )}
                              {!item.fotoPiagam && !item.fotoKegiatan && (
                                <span className="text-[10px] text-slate-600 italic">-</span>
                              )}
                            </div>
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => handleDeletePrestasi(item.id, item.namaPrestasi)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                              title="Hapus Data Prestasi"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* ==================== IMAGE PREVIEW MODAL ==================== */}
      {previewImageModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{previewImageModal.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewImageModal.src}
                alt="Preview"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
