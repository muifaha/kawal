"use client";

import React, { useState, useTransition } from "react";
import { applyConditionalRemisiAction } from "@/app/actions/remisi";
import { AlertCircle, CheckCircle, Sparkles, User, Calendar, Search, X, Paperclip } from "lucide-react";
import { useToast } from "@/components/Toast";

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
  const { showToast } = useToast();
  const [alert, _setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const setAlert = React.useCallback((val: { type: "success" | "error"; message: string } | null) => {
    _setAlert(val);
    if (val) {
      showToast(val.message, val.type);
    }
  }, [showToast]);
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

  const [activeTab, setActiveTab] = useState<"form" | "log">("form");

  return (
    <div className="space-y-0">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-900 mb-6">
        <button
          onClick={() => setActiveTab("form")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
            activeTab === "form"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Tambah Remisi
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
            activeTab === "log"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <Search className="w-4 h-4" />
          Log Transaksi
          {history.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Form Tambah Remisi */}
      {activeTab === "form" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Form Remisi Kondisional (Manual) */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Remisi Kondisional (Manual)
            </h2>

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
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4">
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
      )}

      {/* Tab: Log Transaksi */}
      {activeTab === "log" && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-bold text-white">Log Transaksi Remisi</h2>
            
            {/* Search Box */}
            <div className="relative rounded-xl max-w-xs w-full">
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

          {/* Table */}
          <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900/60">
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Siswa</th>
                  <th className="py-3 px-4">Jenis Remisi</th>
                  <th className="py-3 px-4">Alasan / Keterangan</th>
                  <th className="py-3 px-4 text-center">Poin Remisi</th>
                  <th className="py-3 px-4">Disahkan Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-slate-500 text-sm">
                      Belum ada transaksi remisi yang tercatat.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item, idx) => (
                    <tr key={item.id} className="text-xs hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(item.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.siswa.nama}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.siswa.kelas.nama} • NIS: {item.siswa.nis}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.jenis === "OTOMATIS"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                          }`}
                        >
                          {item.jenis === "OTOMATIS" ? "OTOMATIS" : "KONDISIONAL"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {item.jenis === "OTOMATIS"
                          ? "Pembersihan Poin Harian (Bersih Pelanggaran 1 Bulan)"
                          : item.masterRemisi?.nama}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-emerald-400 font-mono">
                          -{item.poinDikurangi} Pts
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {item.approver?.nama || "Sistem"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

