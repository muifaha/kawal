"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Layers,
  Search,
  Award,
  Filter,
} from "lucide-react";
import {
  getTeacherClassesAndSubjectsAction,
  getTujuanPembelajaranListAction,
  createTujuanPembelajaranAction,
  deleteTujuanPembelajaranAction,
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
  const [tpList, setTpList] = useState<
    Array<{
      id: string;
      materi: string;
      kodeTp: string;
      deskripsi: string | null;
      semester: number;
      tingkatKelas: string;
    }>
  >([]);
  const [tingkatKelas, setTingkatKelas] = useState<string>("X");
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<number>(0); // 0 = Semua, 1 = Ganjil, 2 = Genap
  const [loadingTp, setLoadingTp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newTpMateri, setNewTpMateri] = useState("");
  const [newTpKode, setNewTpKode] = useState("1");
  const [newTpDeskripsi, setNewTpDeskripsi] = useState("");
  const [newTpSemester, setNewTpSemester] = useState<number>(1);

  // Transition & Notification State
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Calculate next TP number for selected semester & materi
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

  // Auto update newTpKode when newTpSemester or newTpMateri changes
  useEffect(() => {
    const nextNum = calculateNextTpNumber(newTpSemester, newTpMateri);
    setNewTpKode(nextNum.toString());
  }, [newTpSemester, newTpMateri, tpList]);

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

  const filteredTpList = tpList.filter((t) => {
    const matchSem = selectedSemesterTab === 0 || t.semester === selectedSemesterTab;
    const matchSearch =
      !searchQuery.trim() ||
      t.materi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.kodeTp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.deskripsi && t.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSem && matchSearch;
  });

  const uniqueMateriList = Array.from(new Set(tpList.map((t) => t.materi).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* HEADER UTAMA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Manajemen Materi</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manajemen Bank Tujuan Pembelajaran (TP) & Lingkup Materi Kurikulum Merdeka
            </p>
          </div>
        </div>

        {selectedClass && selectedMapel && (
          <Link
            href={`/penilaian?kelasId=${selectedClass.id}&mapelId=${selectedMapel.id}`}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shrink-0 border border-slate-700"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Ke Menu Penilaian</span>
          </Link>
        )}
      </div>

      {/* ALERT NOTIFIKASI */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-2xl flex items-center justify-between">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {loadingClasses ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
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
                        {cls.nama}
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
        /* STEP 3: HALAMAN UTAMA MANAJEMEN BANK TP & MATERI (FULL PAGE - NON POP-UP) */
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
                  <span>{selectedClass.nama}</span>
                  <span>•</span>
                  <span>{selectedMapel.nama}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Bank Data Tujuan Pembelajaran (TP) & Lingkup Materi
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
                Setiap TP & Materi yang Anda tambahkan di bawah ini untuk mapel <strong>{selectedMapel.nama}</strong> cukup diisi 1 kali, dan akan <strong>otomatis berlaku & dapat dipakai di seluruh kelas tingkat {tingkatKelas}</strong> (seperti {selectedClass.nama}) yang Anda ampu.
              </p>
            </div>
          </div>

          {/* FORM TAMBAH TP & MATERI (CARD UTAMA) */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              Tambah TP & Lingkup Materi Baru
            </h3>

            <form onSubmit={handleCreateTp} className="space-y-4">
              {/* TARGET SEMESTER */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Target Semester:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tpSemester"
                    checked={newTpSemester === 1}
                    onChange={() => setNewTpSemester(1)}
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
                    name="tpSemester"
                    checked={newTpSemester === 2}
                    onChange={() => setNewTpSemester(2)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    Semester 2 (Genap){" "}
                    {activeSemester === 2 && <span className="text-[10px] text-amber-400 font-bold ml-1">(Semester Aktif)</span>}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LINGKUP MATERI / BAB */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Lingkup Materi / Bab *
                    </label>
                    {uniqueMateriList.length > 0 && (
                      <span className="text-[10px] text-indigo-400 font-semibold">
                        {uniqueMateriList.length} materi tersimpan
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
                    className="block w-full px-3.5 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <datalist id="existing-materi-list">
                    {uniqueMateriList.map((materi, idx) => (
                      <option key={idx} value={materi} />
                    ))}
                  </datalist>

                  {/* Quick-Select Chips */}
                  {uniqueMateriList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-500 font-medium">Pilih cepat:</span>
                      {uniqueMateriList.map((materi, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewTpMateri(materi)}
                          className={`px-2.5 py-0.5 text-[10px] rounded-lg border font-medium transition cursor-pointer ${
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

                {/* KODE TP */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kode TP * <span className="text-[10px] text-indigo-400 font-normal">(Otomatis Berurutan)</span>
                  </label>
                  <div className="flex items-center">
                    <span className="px-3.5 py-2 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-xs font-bold text-indigo-300 font-mono select-none">
                      TP
                    </span>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="1"
                      value={newTpKode}
                      onChange={(e) => setNewTpKode(e.target.value)}
                      className="block w-full px-3.5 py-2 border border-slate-700 rounded-r-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    {newTpMateri.trim() ? (
                      <>
                        Urutan berikutnya untuk &quot;<strong className="text-indigo-300">{newTpMateri.trim()}</strong>&quot;:{" "}
                        <strong>TP {calculateNextTpNumber(newTpSemester, newTpMateri)}</strong>
                      </>
                    ) : (
                      <>Otomatis reset ke <strong>TP 1</strong> saat mengisi Lingkup Materi/Bab baru</>
                    )}
                  </p>
                </div>
              </div>

              {/* DESKRIPSI TP */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deskripsi Tujuan Pembelajaran (TP) (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Peserta didik mampu menganalisis kronologi diplomasi mempertahankan kemerdekaan..."
                  value={newTpDeskripsi}
                  onChange={(e) => setNewTpDeskripsi(e.target.value)}
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
                  Simpan TP ke Bank Data (Tingkat {tingkatKelas})
                </button>
              </div>
            </form>
          </div>

          {/* DATA TABLE TP & MATERI TERSIMPAN */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Daftar TP & Lingkup Materi Tersimpan (Tingkat {tingkatKelas})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total {tpList.length} Tujuan Pembelajaran terdaftar
                </p>
              </div>

              {/* SEARCH & FILTER TABS */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari TP atau Materi..."
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
                <span className="text-xs">Memuat daftar Bank TP...</span>
              </div>
            ) : filteredTpList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-900">
                Belum ada TP & Materi tersimpan yang sesuai dengan kriteria filter. Silakan tambahkan pada form di atas.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="min-w-full divide-y divide-slate-800 text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-left font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="p-3.5 w-28">Semester</th>
                      <th className="p-3.5 w-28">Kode TP</th>
                      <th className="p-3.5 min-w-[200px]">Lingkup Materi / Bab</th>
                      <th className="p-3.5 min-w-[300px]">Deskripsi Tujuan Pembelajaran (TP)</th>
                      <th className="p-3.5 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                    {filteredTpList.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                              t.semester === 1
                                ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                                : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                            }`}
                          >
                            Sem {t.semester === 1 ? "1 (Ganjil)" : "2 (Genap)"}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono">
                          <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-bold">
                            {t.kodeTp}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-white">{t.materi}</td>
                        <td className="p-3.5 text-slate-300 leading-relaxed">
                          {t.deskripsi || <span className="text-slate-600 italic">- Tidak ada deskripsi -</span>}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleDeleteTp(t.id)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Hapus TP"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
