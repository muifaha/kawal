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
  Award
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

        {/* Right Side: Student Attendance & Assessment */}
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

          {/* Desktop View Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 w-10">No</th>
                  <th className="pb-3 w-32">Siswa</th>
                  <th className="pb-3 text-center w-60">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {students.map((student, index) => {
                  const currentStatus = attendance[student.id] || "H";
                  return (
                    <tr key={student.id}>
                      <td className="py-3 text-slate-500">{index + 1}</td>
                      <td className="py-3">
                        <div className="font-bold text-white text-xs">{student.nama}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIS: {student.nis}</div>
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center justify-center p-1 bg-slate-950/60 border border-slate-800 rounded-xl gap-1">
                          {[
                            { key: "H", label: "Hadir", color: "bg-emerald-500 text-white" },
                            { key: "S", label: "Sakit", color: "bg-amber-500 text-white" },
                            { key: "I", label: "Izin", color: "bg-blue-500 text-white" },
                            { key: "A", label: "Alpha", color: "bg-rose-500 text-white" },
                            { key: "D", label: "Dispen", color: "bg-purple-500 text-white" },
                          ].map((st) => (
                            <button
                              type="button"
                              key={st.key}
                              onClick={() => handleAttendanceChange(student.id, st.key)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                currentStatus === st.key
                                  ? `${st.color} shadow-sm`
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {st.key}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View Card List */}
          <div className="sm:hidden space-y-4">
            {students.map((student, index) => {
              const currentStatus = attendance[student.id] || "H";
              return (
                <div key={student.id} className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold mb-0.5">#{index + 1}</div>
                      <div className="font-bold text-white text-sm leading-snug">{student.nama}</div>
                      <div className="text-[9px] text-slate-500 font-mono">NIS: {student.nis}</div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const statuses = ["H", "S", "I", "A", "D"];
                        const nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
                        setAttendance((prev) => ({ ...prev, [student.id]: statuses[nextIdx] }));
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white transition-all active:scale-95 cursor-pointer shrink-0 ${
                        currentStatus === "H"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : currentStatus === "A"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {currentStatus}
                    </button>
                  </div>
                </div>
              );
            })}
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
