"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { approveViolationAction, rejectViolationAction, bulkApproveViolationsAction, updateViolationReportAction } from "@/app/actions/approval";
import { AlertCircle, CheckCircle, CheckSquare, Trash, Inbox, User, Clock, AlertTriangle, ShieldCheck, Edit2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/Toast";

interface TransformedReport {
  id: string;
  siswaId: string;
  siswaNama: string;
  siswaNis: string;
  siswaKelas: string;
  currentPoints: number;
  violationDetailId: string;
  violationName: string;
  violationCategory: string;
  violationPoin: number;
  pelaporNama: string;
  pelaporRole: string;
  tanggal: Date;
  notes: string | null;
}

interface ViolationDetail {
  id: string;
  nama: string;
  poin: number;
}

interface ViolationCategory {
  id: string;
  nama: string;
  details: ViolationDetail[];
}

interface ApprovalClientProps {
  initialReports: TransformedReport[];
  categories: ViolationCategory[];
}

export default function ApprovalClient({ initialReports, categories }: ApprovalClientProps) {
  const [reports, setReports] = useState<TransformedReport[]>(initialReports);
  const [selectedId, setSelectedId] = useState<string>(
    initialReports.length > 0 ? initialReports[0].id : ""
  );
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  // Search & Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.siswaNama.toLowerCase().includes(q) ||
        r.siswaNis.toLowerCase().includes(q) ||
        r.siswaKelas.toLowerCase().includes(q) ||
        r.violationCategory.toLowerCase().includes(q) ||
        r.violationName.toLowerCase().includes(q) ||
        r.pelaporNama.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editViolationId, setEditViolationId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editViolationSearch, setEditViolationSearch] = useState("");
  const [showEditViolationDropdown, setShowEditViolationDropdown] = useState(false);

  // Cari detail laporan yang sedang dipilih
  const activeReport = reports.find((r) => r.id === selectedId) || (reports.length > 0 ? reports[0] : null);

  // Sync edit states on active report change
  useEffect(() => {
    if (activeReport) {
      setEditViolationId(activeReport.violationDetailId);
      setEditNotes(activeReport.notes || "");
      setEditViolationSearch(`${activeReport.violationCategory} - ${activeReport.violationName} (+${activeReport.violationPoin} Poin)`);
    }
    setIsEditing(false);
    setShowEditViolationDropdown(false);
  }, [selectedId, activeReport]);

  // Flattened violation details for easy access
  const allViolationDetails = useMemo(() => {
    return categories.flatMap((c) => c.details);
  }, [categories]);

  const currentEditCategory = useMemo(() => {
    if (!editViolationId) return null;
    return categories.find((cat) => cat.details.some((det) => det.id === editViolationId));
  }, [categories, editViolationId]);

  const currentEditViolation = allViolationDetails.find((d) => d.id === editViolationId);
  const activePoin = isEditing && currentEditViolation ? currentEditViolation.poin : (activeReport ? activeReport.violationPoin : 0);

  // Flatten all violations for keyword autocomplete
  const allViolations = useMemo(() => {
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

  // Grouped and filtered violations by category for editing
  const groupedEditViolations = useMemo(() => {
    const cleanSearch = editViolationSearch.trim().toLowerCase();
    const currentFormatted = currentEditViolation && currentEditCategory
      ? `${currentEditCategory.nama} - ${currentEditViolation.nama} (+${currentEditViolation.poin} Poin)`.toLowerCase()
      : "";

    const isDefault = !cleanSearch || cleanSearch === currentFormatted;
    const filtered = isDefault
      ? allViolations
      : allViolations.filter((v) => v.searchString.includes(cleanSearch));

    // Grouping
    const groups: Record<string, typeof allViolations> = {};
    const listToGroup = isDefault ? filtered : filtered.slice(0, 30);
    
    listToGroup.forEach((v) => {
      if (!groups[v.kategoriNama]) {
        groups[v.kategoriNama] = [];
      }
      groups[v.kategoriNama].push(v);
    });

    return groups;
  }, [allViolations, editViolationSearch, currentEditViolation, currentEditCategory]);

  // Save edits
  const handleSaveEdit = async () => {
    if (!activeReport) return;
    if (!editViolationId) {
      showToast("Silakan pilih jenis pelanggaran dari daftar hasil pencarian.", "error");
      return;
    }

    startTransition(async () => {
      const res = await updateViolationReportAction(activeReport.id, editViolationId, editNotes || null);
      if (res.error) {
        showToast(res.error, "error");
      } else if (res.success && res.data) {
        showToast(res.message || "Laporan berhasil diperbarui.", "success");
        setReports((prev) =>
          prev.map((r) =>
            r.id === activeReport.id
              ? {
                  ...r,
                  violationDetailId: res.data.violationDetailId,
                  violationName: res.data.violationName,
                  violationCategory: res.data.violationCategory,
                  violationPoin: res.data.violationPoin,
                  notes: res.data.notes,
                }
              : r
          )
        );
        setIsEditing(false);
      }
    });
  };

  // Singkronisasi ID terpilih jika item aktif saat ini dihapus/disetujui
  const transitionToNext = (idToRemove: string) => {
    const currentIndex = reports.findIndex((r) => r.id === idToRemove);
    let nextId = "";
    if (reports.length > 1) {
      if (currentIndex < reports.length - 1) {
        nextId = reports[currentIndex + 1].id;
      } else {
        nextId = reports[currentIndex - 1].id;
      }
    }
    setReports((prev) => prev.filter((r) => r.id !== idToRemove));
    setSelectedId(nextId);
    setBulkSelection((prev) => prev.filter((id) => id !== idToRemove));
  };

  // 1. Approve Single
  const handleApprove = async (id: string) => {
    startTransition(async () => {
      const res = await approveViolationAction(id);
      if (res.error) {
        showToast(res.error, "error");
      } else if (res.success) {
        showToast(res.message || "Laporan disetujui.", "success");
        transitionToNext(id);
      }
    });
  };

  // 2. Reject Single
  const handleReject = async (id: string) => {
    startTransition(async () => {
      const res = await rejectViolationAction(id);
      if (res.error) {
        showToast(res.error, "error");
      } else if (res.success) {
        showToast(res.message || "Laporan berhasil ditolak.", "success");
        transitionToNext(id);
      }
    });
  };

  // 3. Bulk Approve
  const handleBulkApprove = async () => {
    if (bulkSelection.length === 0) return;

    startTransition(async () => {
      const res = await bulkApproveViolationsAction(bulkSelection);
      if (res.error) {
        showToast(res.error, "error");
      } else if (res.success) {
        showToast(res.message || "Semua laporan terpilih berhasil disetujui.", "success");
        
        // Hapus massal dari state
        const remaining = reports.filter((r) => !bulkSelection.includes(r.id));
        setReports(remaining);
        setSelectedId(remaining.length > 0 ? remaining[0].id : "");
        setBulkSelection([]);
      }
    });
  };

  // Checkbox Toggles
  const handleSelectAll = () => {
    if (bulkSelection.length === reports.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(reports.map((r) => r.id));
    }
  };

  const handleSelectToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Agar tidak men-trigger pemilihan card detail
    setBulkSelection((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl">
        <Inbox className="w-16 h-16 text-slate-600 mb-4" />
        <h3 className="text-lg font-bold text-white">Kotak Masuk Bersih!</h3>
        <p className="text-slate-500 text-sm mt-1">Tidak ada laporan pelanggaran siswa yang pending saat ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Split Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 h-[700px] items-stretch">
        
        {/* Left Side: Inbox List (40% width) */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex flex-col h-full overflow-hidden space-y-3">
          
          {/* Search Box */}
          <div className="relative rounded-xl w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Cari siswa, kelas, pelapor..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* List Toolbar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-900 gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reports.length > 0 && bulkSelection.length === reports.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-400">Pilih Semua ({reports.length})</span>
            </div>

            {bulkSelection.length > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={isPending}
                className="flex items-center gap-1.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                ACC ({bulkSelection.length})
              </button>
            )}
          </div>

          {/* Cards Scrollbox */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {paginatedReports.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Tidak ada laporan yang cocok dengan pencarian.
              </div>
            ) : (
              paginatedReports.map((report) => {
                const isSelected = activeReport?.id === report.id;
                const isChecked = bulkSelection.includes(report.id);

                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedId(report.id)}
                    className={`p-3 rounded-xl border flex gap-3 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-slate-900/80 border-emerald-500/30"
                        : "bg-slate-950/40 border-slate-900/80 hover:border-slate-800"
                    }`}
                  >
                    {/* Select Checkbox */}
                    <div className="pt-0.5 flex items-start">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => handleSelectToggle(report.id, e)}
                        onChange={() => {}} // Handle on click
                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Card Body */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-semibold text-white text-xs truncate">{report.siswaNama}</h4>
                        <span className="text-rose-400 text-[11px] font-extrabold shrink-0">
                          +{report.violationPoin} Pts
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Kelas: {report.siswaKelas}</p>
                      <p className="text-[11px] text-slate-300 truncate font-semibold">
                        {report.violationCategory}: {report.violationName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(report.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span>•</span>
                        <span>Pelapor: {report.pelaporNama}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          <div className="pt-2 border-t border-slate-900 text-xs text-slate-400 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span>Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="py-0.5 px-1.5 border border-slate-800 rounded-lg bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-[11px]"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-slate-800 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
                </button>
                <span className="px-1 text-[11px] font-semibold text-slate-300">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-slate-800 bg-slate-950 hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detailed Profile & Actions (60% width) */}
        <div className="lg:col-span-3 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex flex-col h-full overflow-hidden">
          {activeReport ? (
            <div className="flex flex-col h-full space-y-6">
              
              {/* Header: Student Info */}
              <div className="border-b border-slate-900 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                    <User className="w-6 h-6 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{activeReport.siswaNama}</h3>
                    <p className="text-sm text-slate-400">
                      NIS: {activeReport.siswaNis} | Kelas: {activeReport.siswaKelas}
                    </p>
                  </div>
                </div>
              </div>              {/* Body: Scrollable Detail Info */}
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-sm">
                
                {/* Pelanggaran Detail Box */}
                <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-900/60 pb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Detail Laporan
                    </span>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Laporan
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Jenis Pelanggaran
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={editViolationSearch}
                            onChange={(e) => {
                              setEditViolationSearch(e.target.value);
                              setEditViolationId(""); // Must select one from the dropdown
                              setShowEditViolationDropdown(true);
                            }}
                            onFocus={() => setShowEditViolationDropdown(true)}
                            onBlur={() => setTimeout(() => setShowEditViolationDropdown(false), 200)}
                            placeholder="Ketik kata kunci jenis pelanggaran (misal: baju, dasi)..."
                            className="block w-full py-2.5 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs animate-none"
                          />
                          
                          {showEditViolationDropdown && Object.keys(groupedEditViolations).length > 0 && (
                            <div 
                              onMouseDown={(e) => e.preventDefault()}
                              className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 py-1 divide-y divide-slate-900"
                            >
                              {Object.entries(groupedEditViolations).map(([category, items]) => (
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
                                      onClick={() => {
                                        setEditViolationId(v.id);
                                        setEditViolationSearch(`${v.kategoriNama} - ${v.nama} (+${v.poin} Poin)`);
                                        setShowEditViolationDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white flex justify-between items-start gap-3 transition-colors border-b border-slate-900/50 last:border-0"
                                    >
                                      <span className="text-slate-200 text-xs font-sans">{v.nama}</span>
                                      <span className="font-semibold text-rose-400 text-[10px] shrink-0 font-sans">+{v.poin} Poin</span>
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                          {showEditViolationDropdown && Object.keys(groupedEditViolations).length === 0 && (
                            <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl bg-slate-950 border border-slate-800 p-4 text-center text-xs text-slate-500 font-sans">
                              Tidak ada pelanggaran yang cocok.
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Catatan Kronologi (Opsional)
                        </label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Masukkan catatan kronologi pelanggaran..."
                          className="block w-full py-2 px-3 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs leading-relaxed"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setEditViolationId(activeReport.violationDetailId);
                            setEditNotes(activeReport.notes || "");
                            if (activeReport) {
                              setEditViolationSearch(`${activeReport.violationCategory} - ${activeReport.violationName} (+${activeReport.violationPoin} Poin)`);
                            }
                            setShowEditViolationDropdown(false);
                          }}
                          className="px-3 py-1.5 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={isPending}
                          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-450 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-slate-400 text-xs">Kategori: {activeReport.violationCategory}</p>
                          <p className="text-white font-semibold text-lg mt-0.5">
                            {activeReport.violationName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Bobot Poin</p>
                          <p className="text-2xl font-black text-rose-400">+{activeReport.violationPoin}</p>
                        </div>
                      </div>

                      {activeReport.notes && (
                        <div className="mt-4 pt-3 border-t border-slate-900/60">
                          <p className="text-xs font-semibold text-slate-400 mb-1">Catatan Kronologi:</p>
                          <p className="text-xs text-slate-300 italic bg-slate-900/30 p-3 rounded-lg border border-slate-900/60">
                            &ldquo;{activeReport.notes}&rdquo;
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Akumulasi Poin Standings & Gauge */}
                <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-xl space-y-4">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-900/60 pb-3">
                    Simulasi Akumulasi Poin Siswa
                  </span>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-lg">
                      <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Poin Saat Ini</p>
                      <p className="text-xl font-bold text-white mt-1">{activeReport.currentPoints}</p>
                    </div>
                    <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-lg flex items-center justify-center text-slate-500 font-black">
                      +
                    </div>
                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg">
                      <p className="text-xxs font-bold text-rose-400 uppercase tracking-wider">Poin Baru (ACC)</p>
                      <p className="text-xl font-bold text-rose-400 mt-1">
                        {activeReport.currentPoints + activePoin}
                      </p>
                    </div>
                  </div>

                  {/* Warning Threshold alert */}
                  {activeReport.currentPoints + activePoin >= 50 ? (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                      <div>
                        <p className="font-bold">PERINGATAN: Batas Kritis Terlampaui!</p>
                        <p className="mt-0.5">Siswa ini akan mencapai total {activeReport.currentPoints + activePoin} poin. Wajib diberikan tindakan disiplin khusus atau panggilan orang tua.</p>
                      </div>
                    </div>
                  ) : activeReport.currentPoints + activePoin >= 25 ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-xl text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="font-bold">Peringatan Menengah</p>
                        <p className="mt-0.5">Total poin siswa mencapai {activeReport.currentPoints + activePoin}. Wali kelas disarankan mengirimkan notifikasi binaan.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 border border-slate-900/60 text-slate-400 p-4 rounded-xl text-xs flex items-start gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-300">Poin Aman</p>
                        <p className="mt-0.5">Akumulasi poin setelah disetujui masih berada di bawah batas peringatan sekolah.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions: ACC / Tolak buttons */}
              <div className="border-t border-slate-900 pt-5 flex gap-4">
                <button
                  onClick={() => handleReject(activeReport.id)}
                  disabled={isPending || isEditing}
                  className="flex-1 py-3 px-4 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 rounded-xl text-sm font-bold transition-all disabled:opacity-50 active:scale-98"
                >
                  Tolak Laporan
                </button>
                <button
                  onClick={() => handleApprove(activeReport.id)}
                  disabled={isPending || isEditing}
                  className="flex-[2] py-3 px-4 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 rounded-xl text-sm font-bold-emerald-500/10 transition-all active:scale-98"
                >
                  Sahkan & Tambah Poin (ACC)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              Pilih salah satu laporan pending dari sisi kiri untuk meninjau secara detail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
