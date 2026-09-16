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
  Layers,
  Search,
  Award,
  Check,
  X,
  FolderPlus,
  Filter,
} from "lucide-react";
import {
  getTeacherClassesAndSubjectsAction,
  getAllTujuanPembelajaranAction,
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
  mapelId: string;
  mapel?: {
    id: string;
    kode: string;
    nama: string;
  };
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

  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [mapelOptions, setMapelOptions] = useState<MapelItem[]>([]);

  // Bank TP & Materi State
  const [tpList, setTpList] = useState<TpItem[]>([]);
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTingkatFilter, setSelectedTingkatFilter] = useState<string>("ALL"); // ALL, X, XI, XII
  const [selectedMapelFilter, setSelectedMapelFilter] = useState<string>("ALL");

  // Form 1: Input Bab / Lingkup Materi Baru
  const [showAddBabForm, setShowAddBabForm] = useState(false);
  const [newBabTingkat, setNewBabTingkat] = useState<string>("X");
  const [newBabMapelId, setNewBabMapelId] = useState<string>("");
  const [newBabTitle, setNewBabTitle] = useState("");
  const [newBabSemester, setNewBabSemester] = useState<number>(1);

  // Active Expanded Bab for Hierarchy View & Adding TP
  const [activeBabKey, setActiveBabKey] = useState<string | null>(null);
  const [expandedBabs, setExpandedBabs] = useState<Record<string, boolean>>({});

  // Form 2: Input TP Baru bawah Bab Aktif
  const [newTpDeskripsi, setNewTpDeskripsi] = useState("");
  const [newTpCustomNumber, setNewTpCustomNumber] = useState<string>("");

  // Edit State for Bab & TP Modals
  const [editingBab, setEditingBab] = useState<{
    mapelId: string;
    tingkatKelas: string;
    oldMateri: string;
    newTitle: string;
  } | null>(null);
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

  // Load Initial Data (Teacher Mapels & All TP items)
  useEffect(() => {
    async function loadInitialData() {
      setLoadingData(true);
      const resClasses = await getTeacherClassesAndSubjectsAction();
      let mapels: MapelItem[] = [];
      if (resClasses.success && resClasses.data) {
        setClassList(resClasses.data);
        const mapelMap = new Map<string, MapelItem>();
        resClasses.data.forEach((c) => {
          c.mapels.forEach((m) => {
            if (!mapelMap.has(m.id)) {
              mapelMap.set(m.id, m);
            }
          });
        });
        mapels = Array.from(mapelMap.values());
        setMapelOptions(mapels);
        if (mapels.length > 0) {
          setNewBabMapelId(mapels[0].id);
        }
      }

      const resTp = await getAllTujuanPembelajaranAction();
      if (resTp.success && resTp.data) {
        setTpList(resTp.data as any);
        if (resTp.activeSemester) {
          setActiveSemester(resTp.activeSemester);
          setNewBabSemester(resTp.activeSemester);
        }

        // All Bab items collapsed (hidden) by default
        setExpandedBabs({});
      }
      setLoadingData(false);
    }
    loadInitialData();
  }, []);

  const refreshTpList = async () => {
    const resTp = await getAllTujuanPembelajaranAction();
    if (resTp.success && resTp.data) {
      setTpList(resTp.data as any);
    }
  };

  // Extract unique Bab Group Items: Key = `${mapelId}_${tingkatKelas}_${materi}`
  interface BabGroup {
    key: string;
    materi: string;
    tingkatKelas: string;
    mapelId: string;
    mapelNama: string;
    mapelKode: string;
    tps: TpItem[];
  }

  const babGroups: BabGroup[] = React.useMemo(() => {
    const map = new Map<string, BabGroup>();

    tpList.forEach((t) => {
      const key = `${t.mapelId}_${t.tingkatKelas}_${t.materi}`;
      if (!map.has(key)) {
        const foundMapel = mapelOptions.find((m) => m.id === t.mapelId) || t.mapel;
        map.set(key, {
          key,
          materi: t.materi,
          tingkatKelas: t.tingkatKelas || "X",
          mapelId: t.mapelId,
          mapelNama: foundMapel?.nama || "Mata Pelajaran",
          mapelKode: foundMapel?.kode || "MP",
          tps: [],
        });
      }
      if (t.kodeTp !== "BAB") {
        map.get(key)!.tps.push(t);
      }
    });

    return Array.from(map.values());
  }, [tpList, mapelOptions]);

  // Filtered Bab Groups based on filters
  const filteredBabGroups = babGroups.filter((group) => {
    const matchTingkat = selectedTingkatFilter === "ALL" || group.tingkatKelas === selectedTingkatFilter;
    const matchMapel = selectedMapelFilter === "ALL" || group.mapelId === selectedMapelFilter;
    const matchQuery =
      !searchQuery.trim() ||
      group.materi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.mapelNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.tps.some(
        (t) =>
          t.kodeTp.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.deskripsi && t.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    return matchTingkat && matchMapel && matchQuery;
  });

  // Calculate next Bab Number for selected (mapelId, tingkatKelas)
  const calculateNextBabNumber = (targetMapelId: string, targetTingkat: string) => {
    const babsForScope = babGroups.filter(
      (g) => g.mapelId === targetMapelId && g.tingkatKelas === targetTingkat
    );
    return babsForScope.length + 1;
  };

  const currentNextBabNum = calculateNextBabNumber(newBabMapelId, newBabTingkat);

  // Calculate next TP number for a specific Bab group
  const calculateNextTpNumForGroup = (group: BabGroup) => {
    const numbers = group.tps.map((t) => {
      const match = t.kodeTp.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    return maxNum + 1;
  };

  const toggleExpandBab = (key: string) => {
    setExpandedBabs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Submit Form: Tambah Lingkup Materi / Bab Baru
  const handleCreateBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBabMapelId) {
      setErrorMsg("Mata Pelajaran wajib dipilih.");
      return;
    }
    if (!newBabTitle.trim()) {
      setErrorMsg("Nama Lingkup Materi / Bab wajib diisi.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    const rawTitle = newBabTitle.trim();
    const formattedBabName = rawTitle.toLowerCase().startsWith("bab ")
      ? rawTitle
      : `Bab ${currentNextBabNum} - ${rawTitle}`;

    startTransition(async () => {
      const res = await createTujuanPembelajaranAction({
        mapelId: newBabMapelId,
        tingkatKelas: newBabTingkat,
        materi: formattedBabName,
        kodeTp: "BAB",
        deskripsi: undefined,
        semester: newBabSemester,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || `Lingkup Materi / ${formattedBabName} berhasil disimpan.`);
        setNewBabTitle("");
        setShowAddBabForm(false);
        const newGroupKey = `${newBabMapelId}_${newBabTingkat}_${formattedBabName}`;
        setActiveBabKey(newGroupKey);
        setExpandedBabs((prev) => ({ ...prev, [newGroupKey]: true }));
        refreshTpList();
      }
    });
  };

  // 2. Submit Form: Tambah TP Baru di bawah Bab tertentu
  const handleCreateTpUnderGroup = async (group: BabGroup) => {
    if (!group.mapelId || !group.materi) return;

    setErrorMsg("");
    setSuccessMsg("");

    const nextNum = calculateNextTpNumForGroup(group);
    const cleanNum = newTpCustomNumber.replace(/\D/g, "");
    const finalKodeTp = cleanNum ? `TP ${cleanNum}` : `TP ${nextNum}`;
    const semSample = group.tps[0]?.semester || activeSemester;

    startTransition(async () => {
      const res = await createTujuanPembelajaranAction({
        mapelId: group.mapelId,
        tingkatKelas: group.tingkatKelas,
        materi: group.materi,
        kodeTp: finalKodeTp,
        deskripsi: newTpDeskripsi.trim() || undefined,
        semester: semSample,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || `${finalKodeTp} berhasil ditambahkan ke ${group.materi}.`);
        setNewTpDeskripsi("");
        setNewTpCustomNumber("");
        refreshTpList();
      }
    });
  };

  // 3. Edit Bab Name
  const handleUpdateBab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBab) return;
    if (!editingBab.newTitle.trim()) {
      setErrorMsg("Nama Bab baru tidak boleh kosong.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await updateLingkupMateriAction({
        kelasId: "",
        mapelId: editingBab.mapelId,
        oldMateri: editingBab.oldMateri,
        newMateri: editingBab.newTitle.trim(),
        tingkatKelas: editingBab.tingkatKelas,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "Nama Bab berhasil diperbarui.");
        setEditingBab(null);
        refreshTpList();
      }
    });
  };

  // 4. Delete Bab & all its TPs
  const handleDeleteBab = async (group: BabGroup) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${group.materi}" (Tingkat ${group.tingkatKelas}) beserta seluruh TP di dalamnya?`))
      return;

    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await deleteLingkupMateriAction({
        kelasId: "",
        mapelId: group.mapelId,
        materi: group.materi,
        tingkatKelas: group.tingkatKelas,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "Lingkup Materi / Bab berhasil dihapus.");
        refreshTpList();
      }
    });
  };

  // 5. Edit single TP Item
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
        refreshTpList();
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
        refreshTpList();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER UTAMA HALAMAN MANAJEMEN MATERI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
            Manajemen Materi
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola Bank Lingkup Materi / Bab & Tujuan Pembelajaran (TP) Kurikulum Merdeka
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddBabForm((prev) => !prev)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shrink-0 border border-indigo-500/30"
            style={{ color: "#ffffff" }}
          >
            <FolderPlus className="w-4 h-4" style={{ color: "#ffffff" }} />
            <span className="font-bold" style={{ color: "#ffffff" }}>
              {showAddBabForm ? "Tutup Form" : "Tambah Lingkup Materi"}
            </span>
          </button>
        </div>
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

      {/* FORM UTAMA: INPUT LINGKUP MATERI / BAB BARU */}
      {showAddBabForm && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              Tambah Lingkup Materi *
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">
                Urutan Otomatis: <strong className="text-indigo-300">Bab {currentNextBabNum}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowAddBabForm(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Tutup Form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateBab} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* TINGKATAN KELAS */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tingkatan Kelas *
                </label>
                <div className="flex items-center gap-2">
                  {["X", "XI", "XII"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewBabTingkat(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        newBabTingkat === t
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Kelas {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* MATA PELAJARAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mata Pelajaran *
                </label>
                {mapelOptions.length === 0 ? (
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500">
                    Belum ada mapel terdaftar
                  </div>
                ) : (
                  <select
                    value={newBabMapelId}
                    onChange={(e) => setNewBabMapelId(e.target.value)}
                    className="block w-full px-3.5 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                  >
                    {mapelOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.kode} - {m.nama}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* TARGET SEMESTER */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Semester *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewBabSemester(1)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      newBabSemester === 1
                        ? "bg-sky-600 border-sky-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Ganjil
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBabSemester(2)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      newBabSemester === 2
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Genap
                  </button>
                </div>
              </div>
            </div>

            {/* INPUT NAMA LINGKUP MATERI / BAB */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lingkup Materi / Bab * <span className="text-[10px] text-indigo-400 font-normal">(Format Terkunci Berurutan)</span>
              </label>
              <div className="flex items-center">
                <span className="px-3.5 py-2.5 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-xs font-bold text-indigo-300 font-mono select-none shrink-0">
                  Bab {currentNextBabNum}
                </span>
                <input
                  type="text"
                  required
                  placeholder="Masukkan Judul Bab / Lingkup Materi... (contoh: Revolusi Indonesia)"
                  value={newBabTitle}
                  onChange={(e) => setNewBabTitle(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-slate-700 rounded-r-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Simpan Lingkup Materi Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HEADER CONTROLS CARD FOR DAFTAR MATERI DAN TP */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-indigo-400" />
              Daftar Materi dan TP
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Total {babGroups.length} Lingkup Materi / Bab tersimpan
            </p>
          </div>

          {/* SEARCH & FILTER CONTROLS */}
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

            {/* FILTER TINGKATAN KELAS */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSelectedTingkatFilter("ALL")}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  selectedTingkatFilter === "ALL" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Semua Kelas
              </button>
              {["X", "XI", "XII"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTingkatFilter(t)}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    selectedTingkatFilter === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Kelas {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loadingData ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs">Memuat daftar Bank Materi & TP...</span>
        </div>
      ) : filteredBabGroups.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-900">
          Belum ada Lingkup Materi / Bab tersimpan. Silakan tambahkan pada form di atas.
        </div>
      ) : (
          /* MAIN DIRECT HIERARCHICAL TABLE VIEW */
          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/40">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-left font-semibold text-slate-300 uppercase tracking-wider">
                  <th className="p-3.5 w-16 text-center">No</th>
                  <th className="p-3.5 min-w-[200px]">Lingkup Materi / Bab</th>
                  <th className="p-3.5 w-40 text-center">Tingkatan Kelas</th>
                  <th className="p-3.5 w-72">Mata Pelajaran</th>
                  <th className="p-3.5 w-36 text-center">Jumlah TP</th>
                  <th className="p-3.5 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/30">
                {filteredBabGroups.map((group, groupIdx) => {
                  const isExpanded = !!expandedBabs[group.key];
                  const isCurrentActive = activeBabKey === group.key;

                  return (
                    <React.Fragment key={group.key}>
                      {/* PARENT ROW: LINGKUP MATERI / BAB */}
                      <tr className={`hover:bg-slate-900/50 transition-colors ${isExpanded ? "bg-slate-900/40" : ""}`}>
                        {/* NO + TOGGLE ARROW (COMBINED COLUMN) */}
                        <td className="p-3.5 text-center font-mono font-bold text-slate-300">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleExpandBab(group.key)}
                              className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer inline-flex items-center justify-center shrink-0"
                              title={isExpanded ? "Sembunyikan TP" : "Tampilkan TP"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                            <span>{groupIdx + 1}</span>
                          </div>
                        </td>

                        {/* JUDUL BAB */}
                        <td className="p-3.5 font-bold text-white text-sm">
                          {group.materi}
                        </td>

                        {/* TINGKATAN KELAS */}
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-lg font-bold text-xs font-mono inline-block">
                            Kelas {group.tingkatKelas}
                          </span>
                        </td>

                        {/* MATA PELAJARAN (TANPA KODE) */}
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg font-bold text-xs font-mono inline-block">
                            {group.mapelNama}
                          </span>
                        </td>

                        {/* JUMLAH TP */}
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-lg font-bold text-xs font-mono">
                            {group.tps.length} TP
                          </span>
                        </td>

                        {/* AKSI EDIT / HAPUS BAB */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingBab({
                                  mapelId: group.mapelId,
                                  tingkatKelas: group.tingkatKelas,
                                  oldMateri: group.materi,
                                  newTitle: group.materi,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition cursor-pointer border border-transparent hover:border-amber-500/20"
                              title="Edit Nama Bab"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBab(group)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-500/20"
                              title="Hapus Bab beserta seluruh TP"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED SUB-ROW: DAFTAR TP & FORM INPUT BAWAH BAB */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="p-4 border-t border-b border-indigo-500/20 bg-slate-900/30">
                            <div className="space-y-3 pl-4 border-l-2 border-indigo-500/40">
                              {/* FORM INPUT TP BAWAH BAB */}
                              {isCurrentActive ? (
                                <div className="p-3.5 bg-slate-900/90 border border-indigo-500/30 rounded-xl space-y-3 animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                                      <Plus className="w-3.5 h-3.5 text-indigo-400" />
                                      Input TP Baru untuk <strong className="text-white">{group.materi}</strong>
                                    </h5>
                                    <span className="text-[11px] font-mono text-indigo-400 font-bold">
                                      Urutan Berikutnya: TP {calculateNextTpNumForGroup(group)}
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
                                          value={newTpCustomNumber || calculateNextTpNumForGroup(group)}
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
                                        placeholder="Contoh: Peserta didik mampu menganalisis kronologi..."
                                        value={newTpDeskripsi}
                                        onChange={(e) => setNewTpDeskripsi(e.target.value)}
                                        className="block w-full px-3 py-1.5 border border-slate-800 rounded-lg bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleCreateTpUnderGroup(group)}
                                      disabled={isPending || !newTpDeskripsi.trim()}
                                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                      Simpan TP
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs">
                                  <span className="text-slate-400">
                                    Daftar TP tersimpan untuk bab ini.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveBabKey(group.key)}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Input TP Baru</span>
                                  </button>
                                </div>
                              )}

                              {/* TABEL CHILD: DAFTAR TP DI BAWAH BAB INI */}
                              {group.tps.length === 0 ? (
                                <div className="p-3 text-center text-slate-500 text-xs bg-slate-900/30 rounded-xl border border-slate-800/60 italic">
                                  Belum ada TP terdaftar untuk bab ini.
                                </div>
                              ) : (
                                <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                                  <table className="min-w-full divide-y divide-slate-800 text-xs">
                                    <thead>
                                      <tr className="bg-slate-900/90 text-left font-semibold text-slate-400 uppercase tracking-wider">
                                        <th className="p-2.5 w-14 text-center">No</th>
                                        <th className="p-2.5 w-24">Kode TP</th>
                                        <th className="p-2.5 min-w-[280px]">Deskripsi Tujuan Pembelajaran (TP)</th>
                                        <th className="p-2.5 w-24">Semester</th>
                                        <th className="p-2.5 w-24 text-center">Aksi</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                                      {group.tps.map((tp, tpIdx) => (
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
                                              {tp.semester === 1 ? "Ganjil" : "Genap"}
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* MODAL EDIT NAMA LINGKUP MATERI / BAB */}
      {editingBab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
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
                    <option value={1}>Ganjil</option>
                    <option value={2}>Genap</option>
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
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
