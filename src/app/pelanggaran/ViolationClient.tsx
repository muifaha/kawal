"use client";

import React, { useState, useTransition } from "react";
import {
  reportViolationAction,
  toggleCensorViolationAction,
  deleteViolationReportAction,
  updateViolationReportAction,
} from "@/app/actions/violation";
import {
  AlertCircle,
  CheckCircle,
  Search,
  AlertTriangle,
  Send,
  X,
  Paperclip,
  Eye,
  EyeOff,
  ShieldAlert,
  Pencil,
  Trash2,
} from "lucide-react";
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
    id: string;
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
  // Flatten all students for global search
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

  // Filter categories for OSIS (only allow upacara related items)
  const filteredCategories = React.useMemo(() => {
    if (user.role !== "OSIS") return categories;
    return categories
      .map((cat) => {
        const matchingDetails = cat.details.filter((det) =>
          det.nama.toLowerCase().includes("upacara") ||
          cat.nama.toLowerCase().includes("upacara")
        );
        return { ...cat, details: matchingDetails };
      })
      .filter((cat) => cat.details.length > 0);
  }, [categories, user.role]);

  // Flatten all violations for keyword autocomplete
  const allViolations = React.useMemo(() => {
    return filteredCategories.flatMap((cat) =>
      cat.details.map((d) => ({
        id: d.id,
        nama: d.nama,
        poin: d.poin,
        kategoriNama: cat.nama,
        searchString: `${cat.nama} ${d.nama} ${d.poin}`.toLowerCase(),
      }))
    );
  }, [filteredCategories]);

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
  const { showToast } = useToast();
  const [alert, _setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const setAlert = React.useCallback((val: { type: "success" | "error"; message: string } | null) => {
    _setAlert(val);
    if (val) {
      showToast(val.message, val.type);
    }
  }, [showToast]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [revealedReports, setRevealedReports] = useState<Record<string, boolean>>({});

  // BK Edit & Delete States and Handlers
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState<ViolationHistoryItem | null>(null);
  const [editViolation, setEditViolation] = useState<typeof allViolations[0] | null>(null);
  const [editViolationSearch, setEditViolationSearch] = useState("");
  const [showEditViolationDropdown, setShowEditViolationDropdown] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus laporan pelanggaran ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    startTransition(async () => {
      const res = await deleteViolationReportAction(reportId);
      if (res.success) {
        setHistory((prev) => prev.filter((item) => item.id !== reportId));
        showToast(res.message, "success");
      } else if (res.error) {
        showToast(res.error, "error");
      }
    });
  };

  const openEditModal = (item: ViolationHistoryItem) => {
    setEditingReport(item);
    const matchedViolation = allViolations.find((v) => v.id === item.detailPelanggaran.id);
    if (matchedViolation) {
      setEditViolation(matchedViolation);
      setEditViolationSearch(`${matchedViolation.kategoriNama} - ${matchedViolation.nama} (+${matchedViolation.poin} Poin)`);
    } else {
      setEditViolation(null);
      setEditViolationSearch("");
    }
    setEditNotes(item.notes || "");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !editViolation) {
      showToast("Data edit tidak lengkap.", "error");
      return;
    }

    startTransition(async () => {
      const res = await updateViolationReportAction(editingReport.id, editViolation.id, editNotes);
      if (res.success) {
        setHistory((prev) =>
          prev.map((item) =>
            item.id === editingReport.id
              ? {
                  ...item,
                  detailPelanggaran: res.detailPelanggaran as any,
                  notes: res.notes,
                }
              : item
          )
        );
        showToast(res.message, "success");
        setShowEditModal(false);
        setEditingReport(null);
      } else if (res.error) {
        showToast(res.error, "error");
      }
    });
  };

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

  // Student query parsing
  const isSearchingStudent = studentSearch.trim().length > 0;
  const studentQuery = isSearchingStudent ? studentSearch.trim().toLowerCase() : "";

  const filteredStudents = React.useMemo(() => {
    if (!isSearchingStudent) return [];
    
    // Split query by spaces to allow searching like "budi x 1"
    const searchTerms = studentQuery.split(" ").filter(t => t.length > 0);

    const matches = allStudents.filter(
      (s) =>
        searchTerms.every(term => s.searchString.includes(term)) &&
        !selectedStudents.some((sel) => sel.id === s.id)
    );

    // Sort to prioritize exact or startsWith matches, especially helpful for 1-word names
    matches.sort((a, b) => {
      const aName = a.nama.toLowerCase();
      const bName = b.nama.toLowerCase();
      
      const aExact = aName === studentQuery ? 1 : 0;
      const bExact = bName === studentQuery ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      const aStarts = aName.startsWith(studentQuery) ? 1 : 0;
      const bStarts = bName.startsWith(studentQuery) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
      
      return 0;
    });

    return matches.slice(0, 15);
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
        
        // Prepend new reports to history state to automatically update logs tab
        if (res.newReports) {
          setHistory((prev) => [...res.newReports, ...prev]);
        }

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
          <AlertTriangle className="w-4 h-4" />
          Catat Pelanggaran
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
          Riwayat Laporan
          {history.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Form Input */}
      {activeTab === "form" && (
        <div className="max-w-2xl">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Input Laporan Pelanggaran
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
            {/* Pilih Siswa (Multi-selection Tagging) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pilih Siswa (Ketik Nama)
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
                  placeholder="Ketik nama untuk mencari nama siswa..."
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                
                {showStudentDropdown && isSearchingStudent && filteredStudents.length > 0 && (
                  <div 
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute z-40 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 py-1"
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
                  <div className="absolute z-40 left-0 right-0 mt-1 rounded-xl bg-slate-950 border border-slate-800 p-4 text-center text-xs text-slate-500">
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
                    className="absolute z-40 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 py-1 divide-y divide-slate-900"
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
                  <div className="absolute z-40 left-0 right-0 mt-1 rounded-xl bg-slate-950 border border-slate-800 p-4 text-center text-xs text-slate-500">
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
      )}

      {/* Tab: Log Riwayat */}
      {activeTab === "log" && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex flex-col" style={{ minHeight: '600px' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold text-white">
                {user.role === "BK" ? "Log Semua Pelanggaran" : "Riwayat Laporan Saya"}
              </h2>

              {/* Search input */}
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
                    <th className="py-3 px-4 w-10">No</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Siswa</th>
                    <th className="py-3 px-4">Jenis Pelanggaran</th>
                    <th className="py-3 px-4 text-center">Poin</th>
                    <th className="py-3 px-4">Pelapor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-20 text-slate-500 text-sm">
                        Tidak ada riwayat laporan yang cocok atau ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item, idx) => {
                      const isBKoWaka = user.role === "BK" || user.role === "WAKA";
                      const isRevealed = revealedReports[item.id] || false;
                      const shouldBlur = item.isCensored && (!isBKoWaka || !isRevealed);

                      return (
                        <tr key={item.id} className="text-xs hover:bg-slate-900/10 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-medium">{idx + 1}</td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(item.tanggal).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            <div className="text-[10px] text-slate-600">
                              {new Date(item.tanggal).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{item.siswa.nama}</div>
                            <div className="text-[10px] text-slate-400">
                              {item.siswa.kelas.nama} • NIS: {item.siswa.nis}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className={shouldBlur ? "filter blur-sm select-none pointer-events-none opacity-40 transition-all" : "transition-all"}>
                              <div className="text-[10px] text-slate-500">{item.detailPelanggaran.kategori.nama}</div>
                              <div className="text-slate-200 font-semibold leading-snug">{item.detailPelanggaran.nama}</div>
                              {item.notes && (
                                <div className={`text-[10px] text-slate-400 italic mt-1 ${shouldBlur ? "" : ""}`}>
                                  &ldquo;{item.notes}&rdquo;
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-rose-400">+{item.detailPelanggaran.poin}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {item.pelapor.nama}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[item.status]}`}>
                              {statusLabels[item.status]}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.isCensored && !isBKoWaka && (
                                <span className="p-1 text-amber-500" title="Laporan disensor untuk publik">
                                  <EyeOff className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {item.isCensored && isBKoWaka && (
                                <button
                                  onClick={() => setRevealedReports((prev) => ({ ...prev, [item.id]: !isRevealed }))}
                                  className={`p-1 rounded transition-colors ${
                                    isRevealed ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-slate-800 text-amber-400 hover:bg-slate-700"
                                  }`}
                                  title={isRevealed ? "Sembunyikan Nama (Sensor)" : "Tampilkan Nama (Buka Sensor)"}
                                >
                                  {isRevealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              {isBKoWaka && (
                                <button
                                  onClick={() => toggleCensor(item.id, item.isCensored)}
                                  className={`p-1 rounded transition-colors ${
                                    item.isCensored
                                      ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                      : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700"
                                  }`}
                                  title={item.isCensored ? "Batalkan Sensor Laporan" : "Sensor Laporan Ini (Tabu)"}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {user.role === "BK" && (
                                <>
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="p-1 rounded transition-colors bg-slate-800 text-sky-400 hover:text-sky-300 hover:bg-slate-700 cursor-pointer"
                                    title="Edit Laporan Pelanggaran"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReport(item.id)}
                                    className="p-1 rounded transition-colors bg-slate-800 text-rose-400 hover:text-rose-300 hover:bg-slate-700 cursor-pointer"
                                    title="Hapus Laporan Pelanggaran"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
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

      {/* BK Edit Modal */}
      {showEditModal && editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Pencil className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Edit Laporan Pelanggaran</h3>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingReport(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="flex-1 p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nama Siswa</label>
                <input
                  disabled
                  type="text"
                  value={`${editingReport.siswa.nama} (Kelas: ${editingReport.siswa.kelas.nama})`}
                  className="block w-full py-2.5 px-3 border border-slate-850 rounded-xl bg-slate-950/50 text-slate-500 text-xs"
                />
              </div>

              {/* Jenis Pelanggaran Dropdown */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Jenis Pelanggaran</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari kategori atau detail pelanggaran..."
                    value={editViolationSearch}
                    onChange={(e) => {
                      setEditViolationSearch(e.target.value);
                      setShowEditViolationDropdown(true);
                    }}
                    onFocus={() => setShowEditViolationDropdown(true)}
                    className="block w-full pl-9 pr-8 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                  {editViolationSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditViolation(null);
                        setEditViolationSearch("");
                        setShowEditViolationDropdown(true);
                      }}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showEditViolationDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowEditViolationDropdown(false)} />
                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-850 bg-slate-955 p-2 shadow-xl">
                      {allViolations
                        .filter((v) =>
                          v.searchString.includes(editViolationSearch.toLowerCase())
                        )
                        .slice(0, 100)
                        .map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setEditViolation(v);
                              setEditViolationSearch(`${v.kategoriNama} - ${v.nama} (+${v.poin} Poin)`);
                              setShowEditViolationDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:bg-slate-900/80 ${
                              editViolation?.id === v.id ? "bg-emerald-500/10 text-emerald-400 font-bold" : "text-slate-300"
                            }`}
                          >
                            <span className="text-[10px] text-slate-500 block uppercase tracking-wider">{v.kategoriNama}</span>
                            <span className="font-medium">{v.nama}</span>
                            <span className="float-right text-[10px] font-bold text-rose-400">+{v.poin} Poin</span>
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Catatan / Keterangan</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Tambahkan keterangan tambahan mengenai pelanggaran..."
                  rows={3}
                  className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs placeholder-slate-600"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800 mt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none disabled:opacity-50 transition-all transform active:scale-98 cursor-pointer"
                >
                  {isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingReport(null);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-xs cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
