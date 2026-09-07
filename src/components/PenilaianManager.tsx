"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getTeacherClassesAndSubjectsAction,
  getPenilaianKelasListAction,
  createPenilaianKelasAction,
  deletePenilaianKelasAction,
  getPenilaianDetailAndStudentsAction,
  savePenilaianSiswaAction,
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
} from "lucide-react";

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
  const [tanggalPenilaian, setTanggalPenilaian] = useState(new Date().toISOString().split("T")[0]);
  const [deskripsiPenilaian, setDeskripsiPenilaian] = useState("");

  // Grade Entry State - Selected Penilaian Header
  const [activePenilaianId, setActivePenilaianId] = useState<string | null>(null);
  const [activePenilaianInfo, setActivePenilaianInfo] = useState<{
    id: string;
    kelasNama: string;
    mapelNama: string;
    namaPenilaian: string;
    tanggal: string;
    deskripsi: string;
  } | null>(null);
  const [studentGrades, setStudentGrades] = useState<StudentGradeItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

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

  // Fetch Penilaian List when (selectedClass, selectedMapel) changes
  useEffect(() => {
    if (selectedClass && selectedMapel) {
      fetchPenilaianList(selectedClass.id, selectedMapel.id);
    } else {
      setPenilaianList([]);
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

  // Open Grade Entry Form for a specific Penilaian Header
  const handleOpenGradeEntry = async (penilaianId: string) => {
    setActivePenilaianId(penilaianId);
    setLoadingStudents(true);
    setErrorMsg("");
    setSuccessMsg("");

    const res = await getPenilaianDetailAndStudentsAction(penilaianId);
    if (res.success && res.header && res.students) {
      setActivePenilaianInfo(res.header);
      setStudentGrades(res.students);
    } else {
      setErrorMsg(res.error || "Gagal memuat rincian siswa.");
    }
    setLoadingStudents(false);
  };

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

  // Save All Student Grades
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
        catatan: s.catatan,
      }));

    if (validScores.length === 0) {
      setErrorMsg("Isi setidaknya satu nilai siswa sebelum menyimpan.");
      return;
    }

    startTransition(async () => {
      const res = await savePenilaianSiswaAction({
        penilaianKelasId: activePenilaianId,
        scores: validScores,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
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
        tanggal: tanggalPenilaian,
        deskripsi: deskripsiPenilaian,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || "Penilaian baru dibuat.");
        setShowAddModal(false);
        setNamaPenilaian("");
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
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                  <span>{activePenilaianInfo.kelasNama}</span>
                  <span>•</span>
                  <span>{activePenilaianInfo.mapelNama}</span>
                  <span>•</span>
                  <span>{activePenilaianInfo.tanggal}</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">{activePenilaianInfo.namaPenilaian}</h3>
                {activePenilaianInfo.deskripsi && (
                  <p className="text-xs text-slate-400 mt-1">{activePenilaianInfo.deskripsi}</p>
                )}
              </div>
            </div>

            <button
              onClick={handleSaveAllGrades}
              disabled={isPending || loadingStudents}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isPending ? "Menyimpan..." : "Simpan Semua Nilai"}
            </button>
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
                              className="block w-24 mx-auto px-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-center font-bold text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              onBack={() => setSelectedMapel(null)}
              onAddClick={() => setShowAddModal(true)}
              onOpenEntry={handleOpenGradeEntry}
              onDeleteHeader={handleDeletePenilaian}
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
              onBack={() => setSelectedMapel(null)}
              onAddClick={() => setShowAddModal(true)}
              onOpenEntry={handleOpenGradeEntry}
              onDeleteHeader={handleDeletePenilaian}
            />
          )}
        </div>
      )}

      {/* MODAL: TAMBAH PENILAIAN BARU */}
      {showAddModal && selectedClass && selectedMapel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" />
                  Tambah Penilaian Baru
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
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nama Penilaian *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ulangan Harian 1, Tugas 2, PTS"
                  value={namaPenilaian}
                  onChange={(e) => setNamaPenilaian(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Deskripsi / Keterangan (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan materi atau instruksi penilaian..."
                  value={deskripsiPenilaian}
                  onChange={(e) => setDeskripsiPenilaian(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

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
                  disabled={isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isPending ? "Memproses..." : "Buat Penilaian"}
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
  onBack,
  onAddClick,
  onOpenEntry,
  onDeleteHeader,
}: {
  selectedClass: ClassItem;
  selectedMapel: MapelItem;
  penilaianList: PenilaianHeader[];
  loadingPenilaian: boolean;
  onBack: () => void;
  onAddClick: () => void;
  onOpenEntry: (id: string) => void;
  onDeleteHeader: (id: string, e: React.MouseEvent) => void;
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

        <button
          onClick={onAddClick}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Penilaian Baru
        </button>
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
          {penilaianList.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenEntry(item.id)}
              className="p-5 bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all cursor-pointer group flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400">
                    {item.tanggal}
                  </span>
                  <button
                    onClick={(e) => onDeleteHeader(item.id, e)}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                    title="Hapus Penilaian"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {item.namaPenilaian}
                </h4>
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
          ))}
        </div>
      )}
    </div>
  );
}
