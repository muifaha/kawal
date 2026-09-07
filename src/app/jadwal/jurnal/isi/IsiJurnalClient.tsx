"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveJurnalAction } from "@/app/actions/schedule";
import {
  ClipboardList,
  ArrowLeft,
  Upload,
  User,
  Plus,
  AlertCircle,
  Check,
  Send,
  Sparkles,
  Award,
  Search,
} from "lucide-react";
import Link from "next/link";

interface StudentItem {
  id: string;
  nis: string;
  nama: string;
  defaultStatus: string;
}

interface SchedData {
  id: string;
  kelasId: string;
  kelasNama: string;
  mapelId: string;
  mapelNama: string;
  jamMulai: number;
  jamSelesai: number;
}

interface IsiJurnalClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
  jadwal: SchedData;
  students: StudentItem[];
}

export default function IsiJurnalClient({ user, jadwal, students }: IsiJurnalClientProps) {
  const router = useRouter();

  // General fields
  const [namaJurnal, setNamaJurnal] = useState("Pertemuan 1");
  const [kegiatan, setKegiatan] = useState("");
  interface PhotoDoc {
    file: File | null;
    preview: string | null;
    caption: string;
  }

  const [photos, setPhotos] = useState<PhotoDoc[]>([
    { file: null, preview: null, caption: "" },
    { file: null, preview: null, caption: "" },
    { file: null, preview: null, caption: "" },
  ]);

  // Attendance map state
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Prepopulate attendance with defaults
  useEffect(() => {
    const defaultAtt: Record<string, string> = {};
    students.forEach((s) => {
      defaultAtt[s.id] = s.defaultStatus;
    });
    setAttendance(defaultAtt);
  }, [students]);

  const filteredStudents = students.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery)
  );

  const summary = { H: 0, S: 0, I: 0, A: 0, D: 0 };
  students.forEach((s) => {
    const status = (attendance[s.id] || "H") as keyof typeof summary;
    summary[status] = (summary[status] || 0) + 1;
  });

  type StatusType = "H" | "S" | "I" | "A" | "D";
  const rowColors: Record<StatusType, string> = {
    H: "bg-transparent text-slate-300 border-slate-900/60",
    S: "bg-amber-500/5 border-amber-500/10 text-amber-300",
    I: "bg-sky-500/5 border-sky-500/10 text-sky-300",
    A: "bg-rose-500/5 border-rose-500/10 text-rose-300",
    D: "bg-purple-500/5 border-purple-500/10 text-purple-300",
  };

  const handlePhotoSlotChange = (index: number, file: File | null) => {
    setPhotos((prev) => {
      const next = [...prev];
      if (file) {
        next[index] = {
          file,
          preview: URL.createObjectURL(file),
          caption: next[index].caption,
        };
      } else {
        next[index] = {
          file: null,
          preview: null,
          caption: "",
        };
      }
      return next;
    });
  };

  const handleCaptionSlotChange = (index: number, caption: string) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        caption,
      };
      return next;
    });
  };

  const handleAttendanceChange = (siswaId: string, status: string) => {
    setAttendance((prev) => ({ ...prev, [siswaId]: status }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!namaJurnal || !kegiatan) {
      setActionError("Judul jurnal dan deskripsi kegiatan wajib diisi.");
      return;
    }

    // Prepare arrays to send
    const attendanceArray = Object.entries(attendance).map(([siswaId, status]) => ({
      siswaId,
      status,
    }));

    const formData = new FormData();
    formData.append("jadwalId", jadwal.id);
    formData.append("kelasId", jadwal.kelasId);
    formData.append("mapelId", jadwal.mapelId);
    formData.append("jamMulai", String(jadwal.jamMulai));
    formData.append("jamSelesai", String(jadwal.jamSelesai));
    formData.append("namaJurnal", namaJurnal);
    formData.append("kegiatan", kegiatan);
    photos.forEach((doc, idx) => {
      if (doc.file) {
        formData.append(`foto_${idx}`, doc.file);
        formData.append(`fotoKeterangan_${idx}`, doc.caption);
      }
    });
    formData.append("absensiJson", JSON.stringify(attendanceArray));
    formData.append("penilaianJson", JSON.stringify([]));

    startTransition(async () => {
      const res = await saveJurnalAction(formData);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess(res.message || "Jurnal berhasil disimpan.");
        // Redirect to schedule dashboard
        setTimeout(() => {
          router.push("/jadwal");
        }, 1500);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/jadwal"
          className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-900/40 border border-slate-900 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-xs font-semibold text-slate-400">Kembali ke Dashboard Jadwal</span>
      </div>

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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Side: General Info Form */}
        <div className="xl:col-span-1 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              Detail Sesi Pembelajaran
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Data kelas, mata pelajaran, dan jam pengajaran telah diisi otomatis.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl space-y-3">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Kelas</span>
              <span className="text-sm font-bold text-white">Kelas {jadwal.kelasNama}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Mata Pelajaran</span>
              <span className="text-sm font-bold text-indigo-300">{jadwal.mapelNama}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Jam Pelajaran</span>
              <span className="text-sm font-medium text-slate-300">Jam ke-{jadwal.jamMulai} s/d {jadwal.jamSelesai}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Tanggal</span>
              <span className="text-sm font-medium text-slate-300">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Judul Jurnal Sesi</label>
              <input
                type="text"
                value={namaJurnal}
                onChange={(e) => setNamaJurnal(e.target.value)}
                placeholder="Contoh: Pertemuan 1 atau Ujian Harian"
                className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deskripsi Kegiatan KBM</label>
              <textarea
                value={kegiatan}
                onChange={(e) => setKegiatan(e.target.value)}
                rows={4}
                placeholder="Uraikan jalannya pembelajaran, topik pembahasan materi, atau kendala selama kegiatan..."
                className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Foto Kegiatan & Dokumentasi (Maksimal 3 Foto)</label>
              <div className="grid grid-cols-1 gap-4">
                {photos.map((doc, idx) => {
                  return (
                    <div key={idx} className="space-y-3 p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Foto Dokumentasi #{idx + 1}</span>
                        {doc.preview && (
                          <button
                            type="button"
                            onClick={() => handlePhotoSlotChange(idx, null)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold transition-all focus:outline-none"
                          >
                            Hapus Foto
                          </button>
                        )}
                      </div>
                      
                      {doc.preview ? (
                        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
                          <img src={doc.preview} alt={`Preview ${idx + 1}`} className="rounded-lg h-20 w-full object-cover border border-slate-800" />
                          <div className="flex flex-col justify-center">
                            <label className="block text-[10px] text-slate-500 font-semibold mb-1">Keterangan Foto</label>
                            <input
                              type="text"
                              placeholder="Tulis keterangan foto (contoh: siswa sedang mengerjakan tugas...)"
                              value={doc.caption}
                              onChange={(e) => handleCaptionSlotChange(idx, e.target.value)}
                              className="block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-16 border border-dashed border-slate-800 rounded-xl cursor-pointer bg-slate-950/20 hover:bg-slate-950/40 hover:border-slate-700 transition-all">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-400">Pilih berkas foto #{idx + 1}</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handlePhotoSlotChange(idx, file);
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Student Attendance & Summary (Unified Catat Absensi Layout) */}
        <div className="xl:col-span-2 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-400" />
                Daftar Kehadiran Kelas (Absensi)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Data absensi disalin otomatis dari BK hari ini. Modifikasi di bawah **tidak berdampak** pada database utama BK.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama atau NIS siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Unified Table & Summary Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
            {/* Table (Responsive for Mobile & Desktop) */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-slate-900">
                <thead className="bg-slate-900/50">
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-1.5 sm:px-3 text-center w-7 sm:w-10 text-[11px] sm:text-xs">No</th>
                    <th className="py-3 px-3 w-20 hidden sm:table-cell">NIS</th>
                    <th className="py-3 px-2 sm:px-3">Nama Lengkap</th>
                    <th className="py-3 px-1 sm:px-3 text-center w-auto sm:w-64">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-sm">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-500">
                        Tidak ada siswa ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const status = (attendance[student.id] || "H") as StatusType;
                      return (
                        <tr key={student.id} className={`transition-all ${rowColors[status]}`}>
                          <td className="py-2.5 px-1.5 sm:px-3 text-center text-xs sm:text-sm font-medium text-slate-400">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs hidden sm:table-cell">
                            {student.nis}
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-xs sm:text-sm font-semibold whitespace-normal break-words leading-tight">
                            {student.nama}
                            <div className="sm:hidden text-[9px] text-slate-500 font-mono">NIS: {student.nis}</div>
                          </td>
                          <td className="py-2.5 px-1 sm:px-3">
                            <div className="flex justify-center gap-1 sm:gap-1.5">
                              {(["H", "S", "I", "A", "D"] as const).map((s) => {
                                const active = {
                                  H: "bg-emerald-500 text-emerald-950 font-bold border-emerald-500",
                                  S: "bg-amber-500 text-amber-950 font-bold border-amber-500",
                                  I: "bg-sky-500 text-sky-950 font-bold border-sky-500",
                                  A: "bg-rose-500 text-white font-bold border-rose-500",
                                  D: "bg-purple-500 text-white font-bold border-purple-500",
                                };
                                const inactive = {
                                  H: "bg-slate-950/60 hover:bg-emerald-500/20 text-slate-300 border-slate-800",
                                  S: "bg-slate-950/60 hover:bg-amber-500/20 text-slate-300 border-slate-800",
                                  I: "bg-slate-950/60 hover:bg-sky-500/20 text-slate-300 border-slate-800",
                                  A: "bg-slate-950/60 hover:bg-rose-500/20 text-slate-300 border-slate-800",
                                  D: "bg-slate-950/60 hover:bg-purple-500/20 text-slate-300 border-slate-800",
                                };
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => handleAttendanceChange(student.id, s)}
                                    className={`w-7 h-7 sm:w-10 sm:h-9 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                      status === s ? active[s] : inactive[s]
                                    }`}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rekap Tidak Hadir Summary Card */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4 h-fit xl:sticky xl:top-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" /> Rekap Tidak Hadir
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 border rounded-lg bg-amber-500/5 border-amber-500/20 text-amber-400">
                  <p className="text-lg font-bold">{summary.S}</p> Sakit
                </div>
                <div className="p-2 border rounded-lg bg-sky-500/5 border-sky-500/20 text-sky-400">
                  <p className="text-lg font-bold">{summary.I}</p> Izin
                </div>
                <div className="p-2 border rounded-lg bg-rose-500/5 border-rose-500/20 text-rose-400">
                  <p className="text-lg font-bold">{summary.A}</p> Alpha
                </div>
                <div className="p-2 border rounded-lg bg-purple-500/5 border-purple-500/20 text-purple-400">
                  <p className="text-lg font-bold">{summary.D}</p> Disp
                </div>
              </div>

              {/* Daftar Siswa Tidak Hadir */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Daftar Siswa Tidak Hadir ({students.filter((s) => (attendance[s.id] || "H") !== "H").length})
                </h4>
                {students.filter((s) => (attendance[s.id] || "H") !== "H").length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center">✅ Nihil (Hadir Semua)</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {students
                      .filter((s) => (attendance[s.id] || "H") !== "H")
                      .map((s) => {
                        const st = attendance[s.id] || "H";
                        const badgeStyle: Record<string, string> = {
                          S: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                          I: "bg-sky-500/20 text-sky-300 border-sky-500/30",
                          A: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                          D: "bg-purple-500/20 text-purple-300 border-purple-500/30",
                        };
                        const statusText: Record<string, string> = {
                          S: "Sakit",
                          I: "Izin",
                          A: "Alpha",
                          D: "Dispensasi",
                        };
                        return (
                          <div
                            key={s.id}
                            className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-white truncate max-w-[170px]">{s.nama}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle[st] || ""}`}>
                              {statusText[st] || st}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <Link
              href="/jadwal"
              className="px-5 py-2.5 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 rounded-xl transition-all"
            >
              Kembali
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-2-indigo-600/10"
            >
              <Send className="w-4 h-4" />
              Simpan & Laporkan Jurnal
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
