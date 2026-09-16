"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  ArrowLeft,
  Layers,
  Search,
  Award,
  Check,
  X,
  FolderPlus,
} from "lucide-react";
import {
  getTeacherClassesAndSubjectsAction,
  getTujuanPembelajaranListAction,
  createTujuanPembelajaranAction,
  deleteTujuanPembelajaranAction,
  updateTujuanPembelajaranAction,
  updateLingkupMateriAction,
  deleteLingkupMateriAction,
} from "@/app/actions/penilaian";

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

interface TpItem {
  id: string;
  materi: string;
  kodeTp: string;
  deskripsi: string | null;
  semester: number;
  tingkatKelas: string;
}

interface MateriManagerProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
}

export default function MateriManager({ user }: MateriManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramKelasId = searchParams.get("kelasId");
  const paramMapelId = searchParams.get("mapelId");

  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedMapel, setSelectedMapel] = useState<MapelItem | null>(null);

  // Bank TP & Materi State
  const [tpList, setTpList] = useState<TpItem[]>([]);
  const [tingkatKelas, setTingkatKelas] = useState<string>("X");
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<number>(0); // 0 = Semua, 1 = Ganjil, 2 = Genap
  const [loadingTp, setLoadingTp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form 1: Input Bab / Lingkup Materi Baru
  const [newBabNumber, setNewBabNumber] = useState<number>(1);
  const [newBabTitle, setNewBabTitle] = useState("");
  const [newBabSemester, setNewBabSemester] = useState<number>(1);
  const [newBabInitialTpDeskripsi, setNewBabInitialTpDeskripsi] = useState("");

  // Active Expanded Bab for Hierarchy View & Adding TP
  const [activeBab, setActiveBab] = useState<string | null>(null);
  const [expandedBabs, setExpandedBabs] = useState<Record<string, boolean>>({});

  // Form 2: Input TP Baru bawah Bab Aktif
  const [newTpDeskripsi, setNewTpDeskripsi] = useState("");
  const [newTpCustomNumber, setNewTpCustomNumber] = useState<string>("1");

  // Edit State for Bab & TP Modals
  const [editingBab, setEditingBab] = useState<{ oldMateri: string; newTitle: string } | null>(null);
  const [editingTp, setEditingTp] = useState<{
    id: string;
    materi: string;
    kodeTpNum: string;
    deskripsi: string;
    semester: number;
  } | null>(null);

  // Transition & Notification State
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Calculate unique list of Bab / Lingkup Materi items
  const uniqueBabList = Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean)));

  // Auto calculate next Bab number
  useEffect(() => {
    setNewBabNumber(uniqueBabList.length + 1);
  }, [tpList]);

  // Toggle Expand / Collapse Bab in hierarchy view
  const toggleExpandBab = (materi: string) => {
    setExpandedBabs((prev) => ({ ...prev, [materi]: !prev[materi] }));
  };

  // Load teacher classes & mapels on mount
  useEffect(() => {
    async function loadData() {
      setLoadingClasses(true);
      const res = await getTeacherClassesAndSubjectsAction();
      if (res.success && res.data) {
        setClassList(res.data);

        // Pre-select if query params passed
        if (paramKelasId) {
          const foundClass = res.data.find((c) => c.id === paramKelasId);
          if (foundClass) {
            setSelectedClass(foundClass);
            if (paramMapelId) {
              const foundMapel = foundClass.mapels.find((m) => m.id === paramMapelId);
              if (foundMapel) {
                setSelectedMapel(foundMapel);
              }
            }
          }
        }
      }
      setLoadingClasses(false);
    }
    loadData();
  }, [paramKelasId, paramMapelId]);

  // Fetch TP List when (selectedClass, selectedMapel) changes
  useEffect(() => {
    if (selectedClass && selectedMapel) {
      fetchTpList(selectedClass.id, selectedMapel.id);
    } else {
      setTpList([]);
    }
  }, [selectedClass, selectedMapel]);

  const fetchTpList = async (kelasId: string, mapelId: string) => {
    setLoadingTp(true);
    const res = await getTujuanPembelajaranListAction(kelasId, mapelId);
    if (res.success && res.data) {
      setTpList(res.data);
      if (res.tingkatKelas) setTingkatKelas(res.tingkatKelas);
      if (res.activeSemester) {
        setActiveSemester(res.activeSemester);
        setNewBabSemester(res.activeSemester);
      }

      // Auto expand all Babs by default
      const uniqueMateri = Array.from(new Set(res.data.map((t: TpItem) => t.materi).filter(Boolean)));
      const expMap: Record<string, boolean> = {};
      uniqueMateri.forEach((m) => {
        expMap[m] = true;
      });
      setExpandedBabs(expMap);

      if (uniqueMateri.length > 0 && !activeBab) {
        setActiveBab(uniqueMateri[0]);
      }
    }
    setLoadingTp(false);
  };

  // Calculate next TP number for a specific Bab
  const calculateNextTpNumberForBab = (targetMateri: string) => {
    if (!targetMateri) return 1;
    const existingInBab = tpList.filter(
      (t) => t.materi.trim().toLowerCase() === targetMateri.trim().toLowerCase()
    );
    const numbers = existingInBab.map((t) => {
      const match = t.kodeTp.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    return maxNum + 1;
  };

  // 1. Submit Form: Tambah Bab / Lingkup Materi Baru
  const handleCreateBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedMapel) return;
    if (!newBabTitle.trim()) {
      setErrorMsg("Nama Lingkup Materi / Judul Bab wajib diisi.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");

    // Formatted Bab Name: e.g. "Bab 1 - Masa Mempertahankan Kemerdekaan" or user-provided "Bab X"
    const rawTitle = newBabTitle.trim();
    const formattedBabName = rawTitle.toLowerCase().startsWith("bab ")
      ? rawTitle
      : `Bab ${newBabNumber} - ${rawTitle}`;

    // Default Kode TP 1
    const defaultKodeTp = "TP 1";

    startTransition(async () => {
      const res = await createTujuanPembelajaranAction({
        kelasId: selectedClass.id,
        mapelId: selectedMapel.id,
        materi: formattedBabName,
        kodeTp: defaultKodeTp,
        deskripsi: newBabInitialTpDeskripsi.trim() || null || undefined,
        semester: newBabSemester,
        tingkatKelas: tingkatKelas,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || `Lingkup Materi / ${formattedBabName} berhasil ditambahkan.`);
        setNewBabTitle("");
        setNewBabInitialTpDeskripsi("");
        setActiveBab(formattedBabName);
        setExpandedBabs((prev) => ({ ...prev, [formattedBabName]: true }));
        fetchTpList(selectedClass.id, selectedMapel.id);
      }
    });
  };

  // 2. Submit Form: Tambah TP Baru di bawah Bab tertentu
  const handleCreateTpUnderBab = async (targetBab: string) => {
    if (!selectedClass || !selectedMapel || !targetBab) return;

    setErrorMsg("");
    setSuccessMsg("");

    const nextNum = calculateNextTpNumberForBab(targetBab);
    const cleanNum = newTpCustomNumber.replace(/\D/g, "");
    const finalKodeTp = cleanNum ? `TP ${cleanNum}` : `TP ${nextNum}`;

    // Get semester from existing Bab entries if any
    const existingBabEntry = tpList.find((t) => t.materi === targetBab);
    const babSem = existingBabEntry ? existingBabEntry.semester : activeSemester;

    startTransition(async () => {
      const res = await createTujuanPembelajaranAction({
        kelasId: selectedClass.id,
        mapelId: selectedMapel.id,
        materi: targetBab,
        kodeTp: finalKodeTp,
        deskripsi: newTpDeskripsi.trim() || undefined,
        semester: babSem,
        tingkatKelas: tingkatKelas,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || `${finalKodeTp} berhasil ditambahkan ke ${targetBab}.`);
        setNewTpDeskripsi("");
        fetchTpList(selectedClass.id, selectedMapel.id);
      }
    });
  };

  // 3. Edit Bab Name
  const handleUpdateBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBab || !selectedClass || !selectedMapel) return;
    if (!editingBab.newTitle.trim()) {
      setErrorMsg("Nama Bab baru tidak boleh kosong.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await updateLingkupMateriAction({
        kelasId: selectedClass.id,
        mapelId: selectedMapel.id,
        oldMateri: editingBab.oldMateri,
        newMateri: editingBab.newTitle.trim(),
        tingkatKelas: tingkatKelas,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "Nama Bab berhasil diperbarui.");
        setEditingBab(null);
        fetchTpList(selectedClass.id, selectedMapel.id);
      }
    });
  };

  // 4. Delete Bab & all its TPs
  const handleDeleteBab = async (materi: string) => {
    if (!selectedClass || !selectedMapel) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus "${materi}" beserta seluruh TP di dalamnya?`)) return;

    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await deleteLingkupMateriAction({
        kelasId: selectedClass.id,
        mapelId: selectedMapel.id,
        materi: materi,
        tingkatKelas: tingkatKelas,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "Lingkup Materi / Bab berhasil dihapus.");
        fetchTpList(selectedClass.id, selectedMapel.id);
      }
    });
  };

  // 5. Edit TP Item
  const handleUpdateTp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTp) return;

    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await updateTujuanPembelajaranAction({
        id: editingTp.id,
        kodeTp: editingTp.kodeTpNum,
        materi: editingTp.materi,
        deskripsi: editingTp.deskripsi,
        semester: editingTp.semester,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "TP berhasil diperbarui.");
        setEditingTp(null);
        if (selectedClass && selectedMapel) {
          fetchTpList(selectedClass.id, selectedMapel.id);
        }
      }
    });
  };

  // 6. Delete single TP Item
  const handleDeleteSingleTp = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus TP ini?")) return;

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

  // Filter TP list based on search & semester tab
  const filteredBabList = uniqueBabList.filter((materi) => {
    const babsTps = tpList.filter((t) => t.materi === materi);
    const matchSem =
      selectedSemesterTab === 0 || babsTps.some((t) => t.semester === selectedSemesterTab);
    const matchSearch =
      !searchQuery.trim() ||
      materi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      babsTps.some(
        (t) =>
          t.kodeTp.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.deskripsi && t.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    return matchSem && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER UTAMA HALAMAN MANAJEMEN MATERI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Manajemen Materi</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola Struktur Hirarki Lingkup Materi / Bab & Tujuan Pembelajaran (TP) Kurikulum Merdeka
            </p>
          </div>
        </div>

        {selectedClass && selectedMapel && (
          <Link
            href={`/penilaian?kelasId=${selectedClass.id}&mapelId=${selectedMapel.id}`}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shrink-0 border border-slate-700 shadow-md"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Ke Menu Penilaian</span>
          </Link>
        )}
      </div>

      {/* ALERT NOTIFIKASI */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold rounded-2xl flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-2xl flex items-center justify-between">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {loadingClasses ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs font-medium">Memuat data kelas & mata pelajaran...</span>
        </div>
      ) : !selectedClass ? (
        /* STEP 1: PILIH KELAS */
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Pilih Kelas untuk Mengelola Bank Materi
          </h2>
          {classList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-2xl text-xs">
              Belum ada kelas atau jadwal mengajar terdaftar.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {classList.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className="p-5 bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition cursor-pointer group flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition">
                      {cls.nama.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                        Kelas {cls.nama}
                      </h3>
                      <span className="text-[11px] text-slate-400">{cls.mapels.length} Mata Pelajaran</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : !selectedMapel ? (
        /* STEP 2: PILIH MAPEL */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedClass(null)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-xs text-indigo-400 font-bold uppercase">Kelas {selectedClass.nama}</span>
              <h2 className="text-base font-bold text-white">Pilih Mata Pelajaran</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {selectedClass.mapels.map((mp) => (
              <div
                key={mp.id}
                onClick={() => setSelectedMapel(mp)}
                className="p-5 bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition cursor-pointer group flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase font-mono group-hover:scale-105 transition">
                    {mp.kode}
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">{mp.kode}</span>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                      {mp.nama}
                    </h3>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* STEP 3: MANAJEMEN MATERI HIRARKI (TABEL LINGKUP MATERI / BAB & TP) */
        <div className="space-y-6">
          {/* BAR HEADER KELAS & MAPEL */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedMapel(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                title="Ganti Mapel"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                  <span>Kelas {selectedClass.nama}</span>
                  <span>•</span>
                  <span>{selectedMapel.nama}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Bank Data Lingkup Materi / Bab & Tujuan Pembelajaran (TP)
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold rounded-lg font-mono">
                Tingkat {tingkatKelas}
              </span>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold rounded-lg font-mono">
                Sem. Aktif: {activeSemester === 1 ? "Ganjil (Sem 1)" : "Genap (Sem 2)"}
              </span>
            </div>
          </div>

          {/* BANNER SHARING ANGKATAN */}
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-indigo-200 flex items-start gap-3">
            <span className="text-lg shrink-0">💡</span>
            <div className="space-y-1">
              <strong className="text-indigo-300">Otomatis Berbagi Per-Tingkat Kelas ({tingkatKelas}):</strong>
              <p className="text-slate-300 leading-relaxed">
                Setiap Lingkup Materi & TP yang Anda tambahkan di bawah ini untuk mapel <strong>{selectedMapel.nama}</strong> cukup diisi 1 kali, dan akan <strong>otomatis berlaku & dapat dipakai di seluruh kelas tingkat {tingkatKelas}</strong> (seperti {selectedClass.nama}) yang Anda ampu.
              </p>
            </div>
          </div>

          {/* INPUT 1: FORM TAMBAH LINGKUP MATERI / BAB BARU (UTAMA / FIRST STEP) */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                1. Input Lingkup Materi / Bab Baru *
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Urutan Otomatis: <strong className="text-indigo-300">Bab {newBabNumber}</strong>
              </span>
            </div>

            <form onSubmit={handleCreateBab} className="space-y-4">
              {/* TARGET SEMESTER */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Target Semester:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="babSemester"
                    checked={newBabSemester === 1}
                    onChange={() => setNewBabSemester(1)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    Semester 1 (Ganjil){" "}
                    {activeSemester === 1 && <span className="text-[10px] text-amber-400 font-bold ml-1">(Semester Aktif)</span>}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="babSemester"
                    checked={newBabSemester === 2}
                    onChange={() => setNewBabSemester(2)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    Semester 2 (Genap){" "}
                    {activeSemester === 2 && <span className="text-[10px] text-amber-400 font-bold ml-1">(Semester Aktif)</span>}
                  </span>
                </label>
              </div>

              {/* INPUT NAMA LINGKUP MATERI / BAB */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lingkup Materi / Bab * <span className="text-[10px] text-indigo-400 font-normal">(Format Terkunci Berurutan)</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3.5 py-2.5 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-xs font-bold text-indigo-300 font-mono select-none shrink-0">
                    Bab {newBabNumber}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan Judul Bab / Lingkup Materi... (contoh: Masa Mempertahankan Kemerdekaan)"
                    value={newBabTitle}
                    onChange={(e) => setNewBabTitle(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-slate-700 rounded-r-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Sistem otomatis mengunci prefix urutan <strong className="text-indigo-300">Bab {newBabNumber}</strong> (seperti +62 / TP 1). Guru cukup memasukkan judul/nama bab.
                </p>
              </div>

              {/* DESKRIPSI TP PERTAMA (OPTIONAL) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deskripsi Tujuan Pembelajaran (TP 1) Awal (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Peserta didik mampu menganalisis kronologi diplomasi mempertahankan kemerdekaan..."
                  value={newBabInitialTpDeskripsi}
                  onChange={(e) => setNewBabInitialTpDeskripsi(e.target.value)}
                  className="block w-full px-3.5 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Simpan Lingkup Materi / Bab Baru (Tingkat {tingkatKelas})
                </button>
              </div>
            </form>
          </div>

          {/* TABEL HIRARKI: DAFTAR LINGKUP MATERI / BAB & TUJUAN PEMBELAJARAN (TP) */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Structure Hirarki: Bab & Tujuan Pembelajaran (TP)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total {uniqueBabList.length} Lingkup Materi / Bab & {tpList.length} Tujuan Pembelajaran tersimpan
                </p>
              </div>

              {/* SEARCH & FILTER TABS */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari Bab atau TP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSemesterTab(0)}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      selectedSemesterTab === 0 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSemesterTab(1)}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                      selectedSemesterTab === 1 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sem 1 (Ganjil)
                    {activeSemester === 1 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSemesterTab(2)}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                      selectedSemesterTab === 2 ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sem 2 (Genap)
                    {activeSemester === 2 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                  </button>
                </div>
              </div>
            </div>

            {loadingTp ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs">Memuat daftar Bank Materi & TP...</span>
              </div>
            ) : filteredBabList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-900">
                Belum ada Lingkup Materi / Bab tersimpan. Silakan tambahkan pada form di atas.
              </div>
            ) : (
              /* LIST HIRARKI BAB & TP */
              <div className="space-y-4">
                {filteredBabList.map((materiName, babIdx) => {
                  const babsTps = tpList.filter((t) => t.materi === materiName);
                  const isExpanded = expandedBabs[materiName] !== false; // default expanded
                  const isCurrentActiveBab = activeBab === materiName;

                  const semSample = babsTps[0]?.semester || 1;

                  return (
                    <div
                      key={materiName}
                      className="border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden transition-all shadow-md"
                    >
                      {/* HEADER BAB (PARENT ROW) */}
                      <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleExpandBab(materiName)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0"
                            title={isExpanded ? "Sembunyikan TP" : "Tampilkan TP"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2 font-mono">
                              <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-bold text-xs">
                                No {babIdx + 1}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  semSample === 1
                                    ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                                    : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                }`}
                              >
                                Sem {semSample === 1 ? "1 (Ganjil)" : "2 (Genap)"}
                              </span>
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md font-bold text-[11px]">
                                {babsTps.length} TP Tersimpan
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-white mt-1">{materiName}</h4>
                          </div>
                        </div>

                        {/* TOMBOL AKSI BAB (EDIT, HAPUS, TAMBAH TP) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveBab(materiName);
                              if (!isExpanded) toggleExpandBab(materiName);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              isCurrentActiveBab && isExpanded
                                ? "bg-indigo-600 text-white shadow"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Input TP di Bab Ini</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingBab({ oldMateri: materiName, newTitle: materiName })}
                            className="p-2 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl transition cursor-pointer border border-transparent hover:border-amber-500/20"
                            title="Edit Nama Bab"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBab(materiName)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-500/20"
                            title="Hapus Bab beserta seluruh TP"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* SUB-SECTION HIRARKI: INPUT TP & TABEL TP BAWAH BAB */}
                      {isExpanded && (
                        <div className="p-4 space-y-4 bg-slate-950/60">
                          {/* FORM INPUT TP BAWAH BAB TERPILIH */}
                          {isCurrentActiveBab ? (
                            <div className="p-4 bg-slate-900/90 border border-indigo-500/30 rounded-xl space-y-3 shadow-md animate-in fade-in duration-150">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                                  Input TP Baru untuk <strong className="text-white">{materiName}</strong>
                                </h5>
                                <span className="text-[11px] font-mono text-indigo-400 font-bold">
                                  Urutan Berukutnya: TP {calculateNextTpNumberForBab(materiName)}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                    Kode TP * <span className="text-[10px] text-indigo-400">(Terkunci Berurutan)</span>
                                  </label>
                                  <div className="flex items-center">
                                    <span className="px-3 py-1.5 bg-slate-800 border border-r-0 border-slate-700 rounded-l-lg text-xs font-bold text-indigo-300 font-mono select-none">
                                      TP
                                    </span>
                                    <input
                                      type="number"
                                      min={1}
                                      value={newTpCustomNumber || calculateNextTpNumberForBab(materiName)}
                                      onChange={(e) => setNewTpCustomNumber(e.target.value)}
                                      className="block w-full px-3 py-1.5 border border-slate-700 rounded-r-lg bg-slate-950 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                    Deskripsi Tujuan Pembelajaran (TP) *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Peserta didik mampu mengidentifikasi nilai-nilai Pancasila..."
                                    value={newTpDeskripsi}
                                    onChange={(e) => setNewTpDeskripsi(e.target.value)}
                                    className="block w-full px-3 py-1.5 border border-slate-800 rounded-lg bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleCreateTpUnderBab(materiName)}
                                  disabled={isPending || !newTpDeskripsi.trim()}
                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow"
                                >
                                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Simpan TP ke {materiName}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs">
                              <span className="text-slate-400">
                                Klik tombol <strong>+ Input TP di Bab Ini</strong> untuk menambah TP baru ke bab ini.
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveBab(materiName)}
                                className="px-3 py-1 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-[11px] font-bold rounded-lg transition cursor-pointer"
                              >
                                + Input TP Baru
                              </button>
                            </div>
                          )}

                          {/* TABEL CHILD: DAFTAR TP DI BAWAH BAB INI */}
                          {babsTps.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-xs bg-slate-900/30 rounded-xl border border-slate-800 italic">
                              Belum ada TP terdaftar untuk bab ini. Silakan input TP di atas.
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-slate-800 rounded-xl">
                              <table className="min-w-full divide-y divide-slate-800 text-xs">
                                <thead>
                                  <tr className="bg-slate-900/90 text-left font-semibold text-slate-400 uppercase tracking-wider">
                                    <th className="p-3 w-16 text-center">No</th>
                                    <th className="p-3 w-28">Kode TP</th>
                                    <th className="p-3 min-w-[300px]">Deskripsi Tujuan Pembelajaran (TP)</th>
                                    <th className="p-3 w-28">Semester</th>
                                    <th className="p-3 w-24 text-center">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                                  {babsTps.map((tp, tpIdx) => (
                                    <tr key={tp.id} className="hover:bg-slate-800/40 transition">
                                      <td className="p-3 text-center font-mono text-slate-500">{tpIdx + 1}</td>
                                      <td className="p-3 font-mono">
                                        <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-bold">
                                          {tp.kodeTp}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-200 leading-relaxed font-medium">
                                        {tp.deskripsi || <span className="text-slate-600 italic">- Belum ada deskripsi TP -</span>}
                                      </td>
                                      <td className="p-3 font-mono">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            tp.semester === 1
                                              ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                                              : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                          }`}
                                        >
                                          Sem {tp.semester === 1 ? "1" : "2"}
                                        </span>
                                      </td>
                                      <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingTp({
                                                id: tp.id,
                                                materi: tp.materi,
                                                kodeTpNum: tp.kodeTp.replace(/\D/g, "") || "1",
                                                deskripsi: tp.deskripsi || "",
                                                semester: tp.semester,
                                              })
                                            }
                                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                                            title="Edit TP"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteSingleTp(tp.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                            title="Hapus TP"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL EDIT NAMA LINGKUP MATERI / BAB */}
      {editingBab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                Edit Nama Lingkup Materi / Bab
              </h3>
              <button
                onClick={() => setEditingBab(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBab} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nama Bab Lama:
                </label>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono">
                  {editingBab.oldMateri}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Bab Baru: *
                </label>
                <input
                  type="text"
                  required
                  value={editingBab.newTitle}
                  onChange={(e) => setEditingBab({ ...editingBab, newTitle: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBab(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT TUJUAN PEMBELAJARAN (TP) */}
      {editingTp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Edit Tujuan Pembelajaran (TP)
              </h3>
              <button
                onClick={() => setEditingTp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kode TP *
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-xs font-bold text-indigo-300 font-mono select-none">
                      TP
                    </span>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editingTp.kodeTpNum}
                      onChange={(e) => setEditingTp({ ...editingTp, kodeTpNum: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-700 rounded-r-xl bg-slate-950 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Semester
                  </label>
                  <select
                    value={editingTp.semester}
                    onChange={(e) => setEditingTp({ ...editingTp, semester: parseInt(e.target.value, 10) })}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value={1}>Semester 1 (Ganjil)</option>
                    <option value={2}>Semester 2 (Genap)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deskripsi Tujuan Pembelajaran (TP)
                </label>
                <textarea
                  rows={3}
                  value={editingTp.deskripsi}
                  onChange={(e) => setEditingTp({ ...editingTp, deskripsi: e.target.value })}
                  className="block w-full px-3.5 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTp(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Simpan Perubahan TP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
