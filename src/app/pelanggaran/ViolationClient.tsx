"use client";

import React, { useState, useTransition } from "react";
import { reportViolationAction, toggleCensorViolationAction } from "@/app/actions/violation";
import { AlertCircle, CheckCircle, Search, AlertTriangle, Send, X, Paperclip, Eye, EyeOff, ShieldAlert } from "lucide-react";

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

interface DetailPelanggaran {
  id: string;
  nama: string;
  poin: number;
}

interface Kategori {
  id: string;
  nama: string;
  details: DetailPelanggaran[];
}

interface ViolationHistoryItem {
  id: string;
  siswa: {
    nama: string;
    nis: string;
    kelas: { nama: string };
  };
  detailPelanggaran: {
    nama: string;
    poin: number;
    kategori: { nama: string };
  };
  pelapor: {
    nama: string;
    role: string;
  };
  tanggal: Date;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string | null;
  isCensored: boolean;
}

interface ViolationClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
  classes: Kelas[];
  categories: Kategori[];
  initialHistory: ViolationHistoryItem[];
}

export default function ViolationClient({ user, classes, categories, initialHistory }: ViolationClientProps) {
  // Flatten all students for global `@` search
  const allStudents = React.useMemo(() => {
    return classes.flatMap((c) =>
      c.siswa.map((s) => ({
        id: s.id,
        nis: s.nis,
        nama: s.nama,
        kelasNama: c.nama,
        searchString: `${s.nama} ${s.nis} ${c.nama}`.toLowerCase(),
      }))
    );
  }, [classes]);

  // Flatten all violations for keyword autocomplete
  const allViolations = React.useMemo(() => {
    return categories.flatMap((cat) =>
      cat.details.map((d) => ({
        id: d.id,
        nama: d.nama,
        poin: d.poin,
        kategoriNama: cat.nama,
        searchString: `${cat.nama} ${d.nama} ${d.poin}`.toLowerCase(),
      }))
    );
  }, [categories]);

  const [selectedStudents, setSelectedStudents] = useState<Array<{ id: string; nama: string; kelasNama: string; nis: string }>>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  const [violationSearch, setViolationSearch] = useState("");
  const [selectedViolation, setSelectedViolation] = useState<typeof allViolations[0] | null>(null);
  const [showViolationDropdown, setShowViolationDropdown] = useState(false);

  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState<ViolationHistoryItem[]>(initialHistory);

  const [isPending, startTransition] = useTransition();
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [revealedReports, setRevealedReports] = useState<Record<string, boolean>>({});

  const toggleCensor = async (reportId: string, currentCensored: boolean) => {
    startTransition(async () => {
      const res = await toggleCensorViolationAction(reportId, !currentCensored);
      if (res.success) {
        setHistory((prev) =>
          prev.map((item) =>
            item.id === reportId ? { ...item, isCensored: !currentCensored } : item
          )
        );
        setAlert({ type: "success", message: res.message });
      } else if (res.error) {
        setAlert({ type: "error", message: res.error });
      }
    });
  };

  // Student "@" query parsing
  const atIndex = studentSearch.lastIndexOf("@");
  const isSearchingStudent = atIndex !== -1;
  const studentQuery = isSearchingStudent ? studentSearch.substring(atIndex + 1).toLowerCase() : "";

  const filteredStudents = React.useMemo(() => {
    if (!isSearchingStudent) return [];
    return allStudents.filter(
      (s) =>
        s.searchString.includes(studentQuery) &&
        !selectedStudents.some((sel) => sel.id === s.id)
    ).slice(0, 8);
  }, [allStudents, isSearchingStudent, studentQuery, selectedStudents]);

  // Grouped and filtered violations by category
  const groupedFilteredViolations = React.useMemo(() => {
    const query = violationSearch.trim().toLowerCase();
    const filtered = allViolations.filter((v) =>
      v.searchString.includes(query)
    );

    // If query is empty, show all. If query is active, slice matches to 30 items.
    const listToGroup = query === "" ? filtered : filtered.slice(0, 30);

    const groups: Record<string, typeof allViolations> = {};
    listToGroup.forEach((v) => {
      if (!groups[v.kategoriNama]) {
        groups[v.kategoriNama] = [];
      }
      groups[v.kategoriNama].push(v);
    });

    return groups;
  }, [allViolations, violationSearch]);

  const selectStudent = (student: typeof allStudents[0]) => {
    setSelectedStudents((prev) => [...prev, student]);
    setStudentSearch("");
    setShowStudentDropdown(false);
  };

  const removeStudent = (id: string) => {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStudentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && studentSearch === "" && selectedStudents.length > 0) {
      setSelectedStudents((prev) => prev.slice(0, -1));
    }
  };

  const selectViolation = (v: typeof allViolations[0]) => {
    setSelectedViolation(v);
    setViolationSearch(`${v.kategoriNama} - ${v.nama} (+${v.poin} Poin)`);
    setShowViolationDropdown(false);
  };

  // Submit Violation Report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0 || !selectedViolation) {
      setAlert({ type: "error", message: "Siswa (minimal satu) dan jenis pelanggaran wajib diisi." });
      return;
    }

    setAlert(null);

    startTransition(async () => {
      const studentIds = selectedStudents.map((s) => s.id);
      
      let filesFormData: FormData | undefined;
      if (selectedFiles.length > 0) {
        filesFormData = new FormData();
        selectedFiles.forEach((file) => {
          filesFormData!.append("files", file);
        });
      }

      const res = await reportViolationAction(studentIds, selectedViolation.id, notes, filesFormData);
      if (res.error) {
        setAlert({ type: "error", message: res.error });
      } else if (res.success) {
        setAlert({ type: "success", message: res.message || "Laporan berhasil diajukan." });
        
        // Reset Form
        setSelectedStudents([]);
        setSelectedViolation(null);
        setViolationSearch("");
        setStudentSearch("");
        setNotes("");
        setSelectedFiles([]);
        
        setTimeout(() => setAlert(null), 5000);
      }
    });
  };

  // Filter History by search query
  const filteredHistory = history.filter((item) =>
    item.siswa.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.siswa.nis.includes(searchQuery)
  );

  const statusColors = {
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  const statusLabels = {
    APPROVED: "Disetujui",
    PENDING: "Menunggu",
    REJECTED: "Ditolak",
  };

  const showHistory = true;

  return (
    <div className={`grid grid-cols-1 gap-8 ${showHistory ? "lg:grid-cols-5" : ""}`}>
      {/* Form Input Section */}
      <div className={`${showHistory ? "lg:col-span-2" : "max-w-2xl mx-auto w-full"}`}>
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Input Laporan Pelanggaran
          </h2>

          {alert && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm border flex items-start gap-3 ${
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Pilih Siswa (Multi-selection Tagging via @) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pilih Siswa (Ketik @nama)
              </label>
              
              {/* Selected tags */}
              {selectedStudents.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-950/40 border border-slate-900 rounded-xl">
                  {selectedStudents.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg text-xs font-medium"
                    >
                      <span>{s.nama} ({s.kelasNama})</span>
                      <button
                        type="button"
                        onClick={() => removeStudent(s.id)}
                        className="text-emerald-400 hover:text-rose-400 focus:outline-none shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowStudentDropdown(true);
                  }}
                  onKeyDown={handleStudentKeyDown}
                  onFocus={() => setShowStudentDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                  placeholder="Ketik @ untuk mencari nama siswa..."
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                
                {showStudentDropdown && isSearchingStudent && filteredStudents.length > 0 && (
                  <div 
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute z-40 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 shadow-2xl py-1"
                  >
                    {filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectStudent(s)}
                        className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-900 hover:text-white flex justify-between items-center transition-colors"
                      >
                        <span className="font-medium text-slate-200">{s.nama}</span>
                        <span className="text-slate-500 text-[10px]">{s.kelasNama} | {s.nis}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showStudentDropdown && isSearchingStudent && filteredStudents.length === 0 && (
                  <div className="absolute z-40 left-0 right-0 mt-1 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl p-4 text-center text-xs text-slate-500">
                    Siswa tidak ditemukan atau sudah dipilih.
                  </div>
                )}
              </div>
            </div>

            {/* Pilih Jenis Pelanggaran (Searchable autocomplete dropdown) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Jenis Pelanggaran
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  value={violationSearch}
                  onChange={(e) => {
                    setViolationSearch(e.target.value);
                    setSelectedViolation(null);
                    setShowViolationDropdown(true);
                  }}
                  onFocus={() => setShowViolationDropdown(true)}
                  onBlur={() => setTimeout(() => setShowViolationDropdown(false), 200)}
                  placeholder="Ketik kata kunci jenis pelanggaran (misal: baju, dasi)..."
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                
                {showViolationDropdown && Object.keys(groupedFilteredViolations).length > 0 && (
                  <div 
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute z-40 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 shadow-2xl py-1 divide-y divide-slate-900"
                  >
                    {Object.entries(groupedFilteredViolations).map(([category, items]) => (
                      <div key={category} className="space-y-0.5">
                        {/* Group Header */}
                        <div className="px-4 py-1.5 text-[9px] font-bold text-slate-500 bg-slate-900/60 uppercase tracking-wider border-b border-slate-900 sticky top-0 backdrop-blur-md">
                          {category}
                        </div>
                        {/* Group Items */}
                        {items.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => selectViolation(v)}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white flex justify-between items-start gap-3 transition-colors border-b border-slate-900/50 last:border-0"
                          >
                            <span className="text-slate-200 text-xs">{v.nama}</span>
                            <span className="font-semibold text-rose-400 text-[10px] shrink-0">+{v.poin} Poin</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {showViolationDropdown && Object.keys(groupedFilteredViolations).length === 0 && (
                  <div className="absolute z-40 left-0 right-0 mt-1 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl p-4 text-center text-xs text-slate-500">
                    Tidak ada pelanggaran yang cocok.
                  </div>
                )}
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Catatan Tambahan
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tulis kronologi singkat atau informasi tambahan jika diperlukan..."
                rows={3}
                className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600 text-sm"
              />
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

            {/* Tombol Kirim */}
            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 py-3 rounded-xl font-bold transition-all active:scale-98"
              >
                <Send className="w-4 h-4" />
                {isPending ? "Mengirim Laporan..." : "Kirim Laporan Pelanggaran"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* History Log Section */}
      {showHistory && (
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col h-[650px]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold text-white">
                {user.role === "BK" ? "Log Semua Pelanggaran" : "Riwayat Laporan Saya"}
              </h2>

              {/* Search input */}
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

            {/* List scroll container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm">
                  Tidak ada riwayat laporan yang cocok atau ditemukan.
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isBKoWaka = user.role === "BK" || user.role === "WAKA";
                  const isRevealed = revealedReports[item.id] || false;
                  const shouldBlur = item.isCensored && (!isBKoWaka || !isRevealed);

                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2 hover:border-slate-850 transition-all"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h4 className="font-semibold text-white text-sm">{item.siswa.nama}</h4>
                          <p className="text-xs text-slate-400">
                            NIS: {item.siswa.nis} | Kelas: {item.siswa.kelas.nama}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.isCensored && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                              Disensor
                            </span>
                          )}
                          {item.isCensored && isBKoWaka && (
                            <button
                              onClick={() => setRevealedReports((prev) => ({ ...prev, [item.id]: !isRevealed }))}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors"
                              title={isRevealed ? "Terapkan Sensor" : "Buka Sensor (Intip)"}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {isBKoWaka && (
                            <button
                              onClick={() => toggleCensor(item.id, item.isCensored)}
                              className={`p-1 rounded transition-colors ${
                                item.isCensored
                                  ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                  : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-750"
                              }`}
                              title={item.isCensored ? "Batalkan Sensor Laporan" : "Sensor Laporan Ini (Tabu)"}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-sm font-semibold border ${
                              statusColors[item.status]
                            }`}
                          >
                            {statusLabels[item.status]}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-900/60 rounded-lg flex justify-between items-center text-xs">
                        <div className={shouldBlur ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all" : "transition-all"}>
                          <span className="text-slate-400">{item.detailPelanggaran.kategori.nama}: </span>
                          <span className="text-slate-200 font-semibold">{item.detailPelanggaran.nama}</span>
                        </div>
                        <span className="font-bold text-rose-400">+{item.detailPelanggaran.poin} Poin</span>
                      </div>

                      {item.notes && (
                        <p className={`text-xs text-slate-400 italic bg-slate-900/20 p-2 rounded-lg border border-slate-900/40 ${
                          shouldBlur ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all" : "transition-all"
                        }`}>
                          &ldquo;{item.notes}&rdquo;
                        </p>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        <span>Dilaporkan oleh: {item.pelapor.nama}</span>
                        <span>
                          {new Date(item.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
