"use client";

import React, { useState, useTransition } from "react";
import { applyConditionalRemisiAction } from "@/app/actions/remisi";
import { AlertCircle, CheckCircle, Sparkles, User, Calendar, Search, X, Paperclip, ChevronLeft, ChevronRight } from "lucide-react";
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



  const filteredHistory = history.filter((item) =>
    item.siswa.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.siswa.nis.includes(searchQuery)
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
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
          <Calendar className="w-4 h-4" />
          Log Riwayat Remisi ({filteredHistory.length})
        </button>
      </div>

      {/* Tab: Form Tambah Remisi */}
      {activeTab === "form" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Remisi Kondisional (Manual) */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <div className="border-b border-slate-900 pb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Remisi Kondisional (Manual)
              </h3>
            </div>

            <form onSubmit={handleApplyRemisi} className="space-y-4">
              {/* Filter Kelas */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pilih Kelas <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudentId("");
                  }}
                  className="w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama} ({c.siswa.length} Siswa)
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilih Siswa */}
              {selectedClassId && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Pilih Siswa <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {filteredStudentsForRemisi.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} (NIS: {s.nis})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pilih Jenis Remisi */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pilih Aksi Remisi <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedRemisiId}
                  onChange={(e) => setSelectedRemisiId(e.target.value)}
                  className="w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Jenis Remisi --</option>
                  {masterRemisiList.map((mr) => (
                    <option key={mr.id} value={mr.id}>
                      {mr.nama} (Potongan {mr.persentasePengurangan}% Poin)
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Bukti Remisi */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Unggah Dokumen / Bukti Foto (Opsional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 border border-slate-800 rounded-xl bg-slate-950 hover:bg-slate-900 text-xs font-semibold text-slate-300 cursor-pointer transition-all">
                    <Paperclip className="w-4 h-4 text-emerald-400" />
                    <span>Pilih Berkas</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleRemisiFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500">Mendukung Gambar, PDF, DOC</span>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                      >
                        <span className="truncate max-w-xs">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeRemisiFile(idx)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending || !selectedStudentId || !selectedRemisiId}
                className="w-full py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isPending ? "Memproses Remisi..." : "Berikan Remisi"}
              </button>
            </form>
          </div>

          {/* Kard Remisi Otomatis (Background) */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-2">
                <Sparkles className="w-4 h-4" />
                Remisi Otomatis (Background)
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sistem secara otomatis memindai seluruh siswa setiap hari. Siswa yang <strong className="text-white">bersih dari pelanggaran selama 30 hari berturut-turut</strong> akan secara otomatis menerima potongan poin sebesar <strong className="text-emerald-400">10%</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Pemindaian Otomatis
              </div>
              <p className="text-[11px] leading-relaxed">
                Tidak memerlukan tindakan manual. Log transaksi remisi otomatis akan tercatat secara resmi di tab <strong className="text-white">Log Transaksi Remisi</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Log Transaksi */}
      {activeTab === "log" && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-bold text-white">Log Transaksi Remisi</h2>
            
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
                  paginatedHistory.map((item, idx) => {
                    const absoluteIndex = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={item.id} className="text-xs hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-medium">{absoluteIndex}</td>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredHistory.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-900/60 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="py-1 px-2 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-xs"
                >
                  <option value={20}>20 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={100}>100 Baris</option>
                  <option value={500}>500 Baris</option>
                </select>
                <span>
                  Menampilkan {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, filteredHistory.length)} dari {filteredHistory.length} data
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-300" />
                  </button>
                  <span className="px-2 font-semibold text-slate-300">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
