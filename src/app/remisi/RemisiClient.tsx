"use client";

import React, { useState, useTransition } from "react";
import { applyConditionalRemisiAction } from "@/app/actions/remisi";
import { AlertCircle, CheckCircle, Sparkles, User, Calendar, Search, X, Paperclip } from "lucide-react";

interface Siswa {
  id: string;
  nis: string;
  nama: string;
}

interface Kelas {
  id: string;
  nama: string;
  siswa: Siswa[];
}

interface MasterRemisi {
  id: string;
  nama: string;
  persentasePengurangan: number;
}

interface RemisiHistoryItem {
  id: string;
  siswa: {
    nama: string;
    nis: string;
    kelas: { nama: string };
  };
  jenis: string;
  masterRemisi: {
    nama: string;
    persentasePengurangan: number;
  } | null;
  poinDikurangi: number;
  tanggal: Date;
  approver: {
    nama: string;
  } | null;
}

interface RemisiClientProps {
  classes: Kelas[];
  masterRemisiList: MasterRemisi[];
  initialHistory: RemisiHistoryItem[];
}

export default function RemisiClient({ classes, masterRemisiList, initialHistory }: RemisiClientProps) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedRemisiId, setSelectedRemisiId] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState<RemisiHistoryItem[]>(initialHistory);

  const [isPending, startTransition] = useTransition();
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Filter siswa berdasarkan kelas terpilih
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const students = selectedClass?.siswa || [];

  // Berikan Remisi Kondisional Manual
  const handleApplyRemisi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedRemisiId) {
      setAlert({ type: "error", message: "Siswa dan jenis remisi wajib dipilih." });
      return;
    }

    setAlert(null);

    startTransition(async () => {
      let filesFormData: FormData | undefined;
      if (selectedFiles.length > 0) {
        filesFormData = new FormData();
        selectedFiles.forEach((file) => {
          filesFormData!.append("files", file);
        });
      }

      const res = await applyConditionalRemisiAction(selectedStudentId, selectedRemisiId, filesFormData);
      if (res.error) {
        setAlert({ type: "error", message: res.error });
      } else if (res.success) {
        setAlert({ type: "success", message: res.message || "Remisi berhasil diberikan!" });
        
        // Reset form
        setSelectedRemisiId("");
        setSelectedFiles([]);
        
        // Timeout clear alert
        setTimeout(() => setAlert(null), 5000);
      }
    });
  };



  // Filter History
  const filteredHistory = history.filter((item) =>
    item.siswa.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.siswa.nis.includes(searchQuery)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      
      {/* Left Column: Input Forms & Actions (40% width) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Form Remisi Kondisional (Manual) */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Remisi Kondisional (Manual)
          </h2>

          {alert && (
            <div
              className={`mb-4 p-4 rounded-xl text-sm border flex items-start gap-3 ${
                alert.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-300"
              }`}
            >
              {alert.type === "success" ? (
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              )}
              <span>{alert.message}</span>
            </div>
          )}

          <form onSubmit={handleApplyRemisi} className="space-y-4">
            {/* Pilih Kelas */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Pilih Kelas
              </label>
              <select
                required
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedStudentId(""); // Reset student
                }}
                className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Siswa */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Pilih Siswa
              </label>
              <select
                required
                disabled={!selectedClassId}
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
              >
                <option value="">-- Pilih Siswa --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.nis})
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Jenis Remisi */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Pilih Aksi Remisi
              </label>
              <select
                required
                value={selectedRemisiId}
                onChange={(e) => setSelectedRemisiId(e.target.value)}
                className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Jenis Remisi --</option>
                {masterRemisiList.map((mr) => (
                  <option key={mr.id} value={mr.id}>
                    {mr.nama} (Potong {mr.persentasePengurangan}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Lampiran Bukti (Optional) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                Unggah Foto / Dokumen Bukti (Opsional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => {
                  if (e.target.files) {
                    const newFiles = Array.from(e.target.files);
                    setSelectedFiles((prev) => [...prev, ...newFiles]);
                  }
                }}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 transition-all cursor-pointer bg-slate-950 border border-slate-800 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 bg-slate-950/40 border border-slate-900 rounded-xl p-2">
                  {selectedFiles.map((file, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300"
                    >
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400 focus:outline-none shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 py-3 rounded-xl font-bold transition-all active:scale-98"
            >
              Terapkan Pengurangan Poin
            </button>
          </form>
        </div>

        {/* Kard Remisi Otomatis (Background) */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Remisi Otomatis (Background)
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Sistem Aktif
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Pemindaian berjalan otomatis di background sekali sehari saat sistem diakses.
          </p>
          <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold shrink-0 mt-0.5">1</span>
              <p className="text-xs text-slate-300">
                Poin otomatis dikurangi <strong>10%</strong> (minimal 1 poin) jika siswa tidak melanggar selama <strong>30 hari</strong> berturut-turut.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold shrink-0 mt-0.5">2</span>
              <p className="text-xs text-slate-300">
                Siklus rolling akan diatur ulang (*reset*) seketika jika siswa terbukti melakukan pelanggaran baru.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: History List (60% width) */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col h-[580px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-white">Log Transaksi Remisi</h2>
            
            {/* Search Box */}
            <div className="relative rounded-xl shadow-sm max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* List Scroll */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-sm">
                Belum ada transaksi remisi yang tercatat.
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between gap-4 hover:border-slate-850 transition-all"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.jenis === "OTOMATIS"
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                        }`}
                      >
                        {item.jenis === "OTOMATIS" ? "OTOMATIS" : "KONDISIONAL"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h4 className="font-semibold text-white text-sm truncate">{item.siswa.nama}</h4>
                    <p className="text-xs text-slate-400">
                      NIS: {item.siswa.nis} | Kelas: {item.siswa.kelas.nama}
                    </p>
                    
                    <p className="text-xs text-slate-300">
                      Alasan:{" "}
                      <span className="font-medium text-slate-200">
                        {item.jenis === "OTOMATIS"
                          ? "Pembersihan Poin Harian (Bersih Pelanggaran 1 Bulan)"
                          : item.masterRemisi?.nama}
                      </span>
                    </p>
                    
                    <p className="text-[10px] text-slate-500">
                      Disahkan oleh: {item.approver?.nama || "Sistem"}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      -{item.poinDikurangi} Pts
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
