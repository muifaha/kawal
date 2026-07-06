"use client";

import React, { useState, useTransition, useMemo } from "react";
import { createReferralAction, updateReferralStatusAction } from "@/app/actions/counseling";
import {
  UserPlus,
  Inbox,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Search,
  BookOpen,
  Send,
  Check,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

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

interface ReferralItem {
  id: string;
  siswaId: string;
  studentName: string;
  studentNis: string;
  kelasNama: string;
  pembuatNama: string;
  pembuatRole: string;
  kategori: string;
  deskripsi: string;
  status: string;
  tindakLanjut: string | null;
  tanggal: Date;
}

interface RujukanClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
  classes: ClassOption[];
  initialReferrals: ReferralItem[];
}

const CATEGORY_MAP: Record<string, string> = {
  PERILAKU: "Perilaku / Sikap",
  AKADEMIS: "Akademis / Nilai",
  EMOSIONAL: "Emosional / Mental",
  SOSIAL: "Sosial / Bullying",
  LAINNYA: "Lainnya"
};

export default function RujukanClient({ user, classes, initialReferrals }: RujukanClientProps) {
  const [referrals, setReferrals] = useState<ReferralItem[]>(initialReferrals);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [category, setCategory] = useState("PERILAKU");
  const [description, setDescription] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [activeReferral, setActiveReferral] = useState<ReferralItem | null>(null);
  const [modalStatus, setModalStatus] = useState("DIPROSES");
  const [modalTindakLanjut, setModalTindakLanjut] = useState("");

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const isBKOrWaka = user.role === "BK" || user.role === "WAKA";

  // List of students in the currently selected class
  const classStudents = useMemo(() => {
    const cls = classes.find((c) => c.nama === selectedClassId);
    return cls ? cls.siswa : [];
  }, [classes, selectedClassId]);

  // Filtered referrals list
  const filteredReferrals = useMemo(() => {
    return referrals.filter((item) => {
      const matchSearch =
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentNis.includes(searchQuery) ||
        item.pembuatNama.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [referrals, searchQuery, statusFilter]);

  // Submit new referral
  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!selectedStudentId || !category || !description) {
      setActionError("Harap pilih siswa, kategori, dan isi deskripsi.");
      return;
    }

    startTransition(async () => {
      const res = await createReferralAction(selectedStudentId, category, description);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Rujukan berhasil dikirim.");
        // Reset form
        setSelectedStudentId("");
        setSelectedClassId("");
        setDescription("");
        
        // Optimistic UI updates
        const activeStudent = classes
          .flatMap((c) => c.siswa)
          .find((s) => s.id === selectedStudentId);

        const newRef: ReferralItem = {
          id: `temp-${Date.now()}`,
          siswaId: selectedStudentId,
          studentName: activeStudent?.nama || "Siswa",
          studentNis: activeStudent?.nis || "",
          kelasNama: selectedClassId || "-",
          pembuatNama: user.nama,
          pembuatRole: user.role,
          kategori: category,
          deskripsi: description,
          status: "PENDING",
          tindakLanjut: null,
          tanggal: new Date()
        };
        setReferrals((prev) => [newRef, ...prev]);
      }
    });
  };

  // Process referral modal submit
  const handleUpdateStatus = async () => {
    if (!activeReferral) return;
    setActionError("");
    setActionSuccess("");

    startTransition(async () => {
      const res = await updateReferralStatusAction(activeReferral.id, modalStatus, modalTindakLanjut);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Status rujukan diperbarui.");
        setReferrals((prev) =>
          prev.map((item) =>
            item.id === activeReferral.id
              ? { ...item, status: modalStatus, tindakLanjut: modalTindakLanjut || null }
              : item
          )
        );
        setActiveReferral(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-start gap-3">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Side: Create Referral Form (Only visible to non-BK/Waka, or BK if they want to refer) */}
        {!isBKOrWaka && (
          <div className="xl:col-span-1 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Form Rujuk Siswa
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Kirim rujukan digital ke BK apabila siswa terindikasi membutuhkan bimbingan perilaku, mental, atau akademis.
              </p>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilih Kelas</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudentId("");
                  }}
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kategori Rujukan</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PERILAKU">Perilaku / Sikap Terganggu</option>
                  <option value="AKADEMIS">Akademis / Penurunan Nilai Drastis</option>
                  <option value="EMOSIONAL">Emosional / Murung / Menarik Diri</option>
                  <option value="SOSIAL">Sosial / Perundungan (Bullying)</option>
                  <option value="LAINNYA">Lainnya / Masalah Lain</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deskripsi Observasi Masalah</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Deskripsikan secara detail perilaku atau tanda-tanda yang Anda observasi pada siswa ini..."
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-800 text-xs font-bold text-emerald-950 rounded-xl transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Kirim Rujukan
              </button>
            </form>
          </div>
        )}

        {/* Right Side: Referrals List / Inbox */}
        <div className={`${isBKOrWaka ? "xl:col-span-3" : "xl:col-span-2"} bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Inbox className="w-5 h-5 text-emerald-400" />
                {isBKOrWaka ? "Kotak Masuk Rujukan BK" : "Riwayat Rujukan Saya"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isBKOrWaka
                  ? "Kelola berkas rujukan dari para guru untuk ditindaklanjuti secara konseling digital."
                  : "Daftar pengajuan rujukan siswa yang telah Anda kirimkan beserta status penanganannya."}
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">Menunggu (Pending)</option>
                <option value="DIPROSES">Diproses BK</option>
                <option value="SELESAI">Selesai</option>
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
              placeholder="Cari berdasarkan siswa, NIS, atau nama pelapor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {filteredReferrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl">
              <Inbox className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-lg font-bold text-white">Kotak Masuk Bersih!</h3>
              <p className="text-slate-500 text-sm mt-1">
                {statusFilter === "PENDING"
                  ? "Tidak ada rujukan siswa yang pending saat ini."
                  : "Tidak ada data rujukan siswa yang ditemukan saat ini."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/60">
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12">No</th>
                    <th className="py-3 px-4 w-36">Siswa</th>
                    <th className="py-3 px-4 w-24">Kelas</th>
                    <th className="py-3 px-4 w-36">Kategori</th>
                    <th className="py-3 px-4">Deskripsi Masalah / Observasi</th>
                    {isBKOrWaka && <th className="py-3 px-4 w-32">Pelapor</th>}
                    <th className="py-3 px-4 w-28 text-center">Status</th>
                    {isBKOrWaka && <th className="py-3 px-4 w-24 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredReferrals.map((item, index) => (
                    <tr key={item.id} className="text-xs hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-medium">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.studentName}</div>
                        <div className="text-[10px] text-slate-400">NIS: {item.studentNis}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{item.kelasNama}</td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{CATEGORY_MAP[item.kategori] || item.kategori}</td>
                      <td className="py-3 px-4 pr-4">
                        <p className="text-slate-300 leading-relaxed max-w-md break-words" title={item.deskripsi}>
                          {item.deskripsi}
                        </p>
                        {item.tindakLanjut && (
                          <div className="mt-1.5 text-[10px] bg-emerald-500/5 border border-emerald-500/10 rounded px-2.5 py-1 text-emerald-400 leading-snug">
                            <strong>BK:</strong> {item.tindakLanjut}
                          </div>
                        )}
                      </td>
                      {isBKOrWaka && (
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          <div className="font-semibold">{item.pembuatNama}</div>
                          <div className="text-[10px] text-slate-400">{item.pembuatRole}</div>
                        </td>
                      )}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : item.status === "DIPROSES"
                              ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {item.status === "PENDING" ? "Menunggu" : item.status === "DIPROSES" ? "Diproses" : "Selesai"}
                        </span>
                      </td>
                      {isBKOrWaka && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setActiveReferral(item);
                              setModalStatus(item.status);
                              setModalTindakLanjut(item.tindakLanjut || "");
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 transition-all cursor-pointer"
                            title="Proses / Tindak Lanjuti Rujukan"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Process Referral Modal */}
      {activeReferral && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h4 className="text-base font-bold text-white mb-1">Tindak Lanjuti Rujukan</h4>
              <p className="text-xs text-slate-400">
                Memproses rujukan siswa <strong>{activeReferral.studentName}</strong> dari <strong>{activeReferral.pembuatNama}</strong>.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ubah Status</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PENDING">Menunggu (Pending)</option>
                  <option value="DIPROSES">Diproses BK</option>
                  <option value="SELESAI">Selesai / Selesai Ditangani</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Catatan Tindak Lanjut</label>
                <textarea
                  value={modalTindakLanjut}
                  onChange={(e) => setModalTindakLanjut(e.target.value)}
                  rows={3}
                  placeholder="Tulis tindakan atau respon yang telah diambil oleh BK..."
                  className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Shortcut to create counseling record */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-medium">Butuh pencatatan konseling formal?</span>
                </div>
                <Link
                  href={`/bimbingan?studentId=${activeReferral.siswaId}`}
                  onClick={() => setActiveReferral(null)}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/20 transition-all"
                >
                  Buka Form BK
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveReferral(null)}
                className="px-4 py-2 border border-slate-800 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer disabled:bg-indigo-800"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
