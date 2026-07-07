"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { createBimbinganAction } from "@/app/actions/counseling";
import { useToast } from "@/components/Toast";
import {
  HeartHandshake,
  Search,
  Send,
  Lock,
  Eye,
  AlertCircle,
  Check,
  User,
  ShieldAlert,
  ClipboardList
} from "lucide-react";

interface Student {
  id: string;
  nis: string;
  nama: string;
}

interface ClassOption {
  id: string;
  nama: string;
  siswa: Student[];
}

interface BimbinganItem {
  id: string;
  siswaId: string;
  studentName: string;
  studentNis: string;
  kelasNama: string;
  pembimbingNama: string;
  bidang: string;
  masalah: string;
  solusi: string;
  catatanRahasia: string | null;
  tanggal: Date;
}

interface BimbinganClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
  classes: ClassOption[];
  initialHistory: BimbinganItem[];
}

const BIDANG_MAP: Record<string, { label: string; style: string }> = {
  PRIBADI: { label: "Bimbingan Pribadi", style: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  SOSIAL: { label: "Bimbingan Sosial", style: "bg-sky-500/10 text-sky-400 border border-sky-500/20" },
  BELAJAR: { label: "Bimbingan Belajar", style: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  KARIR: { label: "Bimbingan Karir", style: "bg-teal-500/10 text-teal-400 border border-teal-500/20" }
};

export default function BimbinganClient({ user, classes, initialHistory }: BimbinganClientProps) {
  const searchParams = useSearchParams();
  const prefilledStudentId = searchParams.get("studentId");

  const [history, setHistory] = useState<BimbinganItem[]>(initialHistory);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [bidang, setBidang] = useState("PRIBADI");
  const [masalah, setMasalah] = useState("");
  const [solusi, setSolusi] = useState("");
  const [catatanRahasia, setCatatanRahasia] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [bidangFilter, setBidangFilter] = useState("ALL");

  const [activeConfidentialId, setActiveConfidentialId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const [actionError, _setActionError] = useState("");
  const [actionSuccess, _setActionSuccess] = useState("");

  const setActionError = React.useCallback((val: string) => {
    _setActionError(val);
    if (val) showToast(val, "error");
  }, [showToast]);

  const setActionSuccess = React.useCallback((val: string) => {
    _setActionSuccess(val);
    if (val) showToast(val, "success");
  }, [showToast]);

  const isBK = user.role === "BK";
  const isBKOrWaka = user.role === "BK" || user.role === "WAKA";
  const [activeTab, setActiveTab] = useState<"form" | "log">(isBK ? "form" : "log");

  // Prefill student details if loaded from query parameters
  useEffect(() => {
    if (prefilledStudentId) {
      const foundClass = classes.find((c) => c.siswa.some((s) => s.id === prefilledStudentId));
      if (foundClass) {
        setSelectedClassId(foundClass.nama);
        setSelectedStudentId(prefilledStudentId);
      }
    }
  }, [prefilledStudentId, classes]);

  // List of students in the currently selected class
  const classStudents = useMemo(() => {
    const cls = classes.find((c) => c.nama === selectedClassId);
    return cls ? cls.siswa : [];
  }, [classes, selectedClassId]);

  // Filtered counseling logs
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchSearch =
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentNis.includes(searchQuery) ||
        item.pembimbingNama.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchBidang = bidangFilter === "ALL" || item.bidang === bidangFilter;
      return matchSearch && matchBidang;
    });
  }, [history, searchQuery, bidangFilter]);

  // Submit new counseling record
  const handleCreateBimbingan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!selectedStudentId || !bidang || !masalah || !solusi) {
      setActionError("Harap isi semua field utama (Siswa, Bidang, Masalah, Solusi).");
      return;
    }

    startTransition(async () => {
      const res = await createBimbinganAction(selectedStudentId, bidang, masalah, solusi, catatanRahasia);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Bimbingan konseling berhasil disimpan.");
        
        // Optimistic UI updates
        const activeStudent = classes
          .flatMap((c) => c.siswa)
          .find((s) => s.id === selectedStudentId);

        const newRecord: BimbinganItem = {
          id: `temp-${Date.now()}`,
          siswaId: selectedStudentId,
          studentName: activeStudent?.nama || "Siswa",
          studentNis: activeStudent?.nis || "",
          kelasNama: selectedClassId || "-",
          pembimbingNama: user.nama,
          bidang,
          masalah,
          solusi,
          catatanRahasia: catatanRahasia || null,
          tanggal: new Date()
        };
        setHistory((prev) => [newRecord, ...prev]);

        // Reset form
        setSelectedStudentId("");
        setSelectedClassId("");
        setMasalah("");
        setSolusi("");
        setCatatanRahasia("");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-900 mb-6">
        {isBK && (
          <button
            onClick={() => setActiveTab("form")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
              activeTab === "form"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            Catat Konseling
          </button>
        )}
        <button
          onClick={() => setActiveTab("log")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
            activeTab === "log"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Log Riwayat
          {history.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Form Catat Konseling */}
      {activeTab === "form" && isBK && (
        <div className="max-w-2xl">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-indigo-400" />
                Catat Konseling Baru
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Catat bimbingan standar pribadi, sosial, belajar, dan karir.
              </p>
            </div>

            <form onSubmit={handleCreateBimbingan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilih Kelas</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudentId("");
                  }}
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.nama}>
                      {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilih Siswa</label>
                <select
                  value={selectedStudentId}
                  disabled={!selectedClassId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {classStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.nis})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bidang Layanan BK</label>
                <select
                  value={bidang}
                  onChange={(e) => setBidang(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PRIBADI">Bimbingan Pribadi (Mental, Emosi, Keluarga)</option>
                  <option value="SOSIAL">Bimbingan Sosial (Sosialisasi, Teman, Perundungan)</option>
                  <option value="BELAJAR">Bimbingan Belajar (Kesulitan Belajar, Nilai)</option>
                  <option value="KARIR">Bimbingan Karir (Penjurusan, Pemilihan Kampus)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deskripsi Masalah / Kasus</label>
                <textarea
                  value={masalah}
                  onChange={(e) => setMasalah(e.target.value)}
                  rows={3}
                  placeholder="Deskripsikan isu/masalah yang dikonsultasikan siswa..."
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rencana Tindak Lanjut / Solusi</label>
                <textarea
                  value={solusi}
                  onChange={(e) => setSolusi(e.target.value)}
                  rows={3}
                  placeholder="Solusi atau langkah pembinaan yang disepakati..."
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  Catatan Rahasia (Confidential)
                </label>
                <textarea
                  value={catatanRahasia}
                  onChange={(e) => setCatatanRahasia(e.target.value)}
                  rows={3}
                  placeholder="Isi catatan yang HANYA boleh dibaca oleh Guru BK & Waka Kesiswaan (Wali Kelas tidak diizinkan membaca)..."
                  className="block w-full px-3 py-2.5 border border-rose-500/20 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-800 text-xs font-bold text-emerald-950 rounded-xl transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Simpan Konseling
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Log Riwayat */}
      {activeTab === "log" && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-400" />
                Log Riwayat Bimbingan Konseling
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isBKOrWaka
                  ? "Daftar seluruh catatan bimbingan umum yang terdaftar di sistem."
                  : "Daftar bimbingan konseling yang diterima oleh siswa di kelas Anda."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bidangFilter}
                onChange={(e) => setBidangFilter(e.target.value)}
                className="py-1.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Bidang</option>
                <option value="PRIBADI">Bimbingan Pribadi</option>
                <option value="SOSIAL">Bimbingan Sosial</option>
                <option value="BELAJAR">Bimbingan Belajar</option>
                <option value="KARIR">Bimbingan Karir</option>
              </select>
            </div>
          </div>

          {/* Search box */}
          <div className="relative rounded-xl shadow-sm w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan siswa, NIS, atau nama pembimbing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900/60">
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4 w-40">Siswa</th>
                  <th className="py-3 px-4 w-24">Kelas</th>
                  <th className="py-3 px-4 w-44">Bidang</th>
                  <th className="py-3 px-4">Deskripsi Bimbingan</th>
                  <th className="py-3 px-4 w-32">Konselor</th>
                  <th className="py-3 px-4 w-32 text-center">Catatan Rahasia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-slate-500 text-sm">
                      Belum ada log bimbingan konseling.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item, index) => {
                    const bids = BIDANG_MAP[item.bidang] || { label: item.bidang, style: "" };
                    const isVisible = activeConfidentialId === item.id;
                    return (
                      <tr key={item.id} className="text-xs hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-medium">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{item.studentName}</div>
                          <div className="text-[10px] text-slate-400">NIS: {item.studentNis}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">{item.kelasNama}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${bids.style}`}>
                            {bids.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs break-words">
                          <div className="space-y-1.5">
                            <p className="text-slate-300 leading-relaxed">
                              <strong className="text-white block text-[10px] uppercase tracking-wider text-slate-400">Isu/Masalah:</strong>
                              {item.masalah}
                            </p>
                            <p className="text-slate-300 leading-relaxed">
                              <strong className="text-white block text-[10px] uppercase tracking-wider text-slate-400">Solusi:</strong>
                              {item.solusi}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-semibold whitespace-nowrap">
                          {item.pembimbingNama}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isBKOrWaka ? (
                            item.catatanRahasia ? (
                              <div className="relative inline-block text-left">
                                <button
                                  onClick={() => setActiveConfidentialId(isVisible ? null : item.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold hover:bg-rose-500/20 cursor-pointer"
                                >
                                  <Lock className="w-3 h-3 text-rose-400" />
                                  <span>{isVisible ? "Tutup" : "Lihat"}</span>
                                </button>
                                {isVisible && (
                                  <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl shadow-2xl z-30 font-normal text-left text-xs leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                                    <span className="font-bold text-rose-400 flex items-center gap-1 mb-1">
                                      <Lock className="w-3.5 h-3.5" />
                                      Catatan Rahasia BK
                                    </span>
                                    <p className="whitespace-pre-wrap">{item.catatanRahasia}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 font-medium">Tidak ada</span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-semibold cursor-not-allowed" title="Catatan rahasia hanya boleh diakses BK & Waka.">
                              <Lock className="w-3.5 h-3.5 text-slate-600" />
                              <span>Rahasia BK</span>
                            </span>
                          )}
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
    </div>
  );
}
