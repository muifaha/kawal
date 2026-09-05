"use client";

import React, { useState } from "react";
import {
  FileText,
  AlertCircle,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  Download,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  UserCheck,
  Mail,
  Phone,
  FileSpreadsheet,
} from "lucide-react";
import { updatePpidStatusAction, deletePpidRecordAction, getPpidDataAction } from "@/app/actions/ppid";

interface PermohonanItem {
  id: string;
  nomorRegistrasi: string;
  namaLengkap: string;
  nik: string;
  kategoriPemohon: string;
  alamat: string;
  nomorHp: string;
  email: string;
  fileIdentitas?: string | null;
  rincianInformasi: string;
  tujuanPenggunaan: string;
  caraMemperoleh: string;
  caraPengiriman: string;
  status: string;
  tanggapan?: string | null;
  createdAt: string;
}

interface KeberatanItem {
  id: string;
  nomorRegistrasi: string;
  nomorPermohonan: string;
  namaLengkap: string;
  nomorHp: string;
  email: string;
  alasanKeberatan: string[];
  penjelasanKeberatan: string;
  fileBuktiAwal?: string | null;
  status: string;
  tanggapan?: string | null;
  createdAt: string;
}

interface RekapPpidClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
  initialPermohonanList: PermohonanItem[];
  initialKeberatanList: KeberatanItem[];
}

export default function RekapPpidClient({
  user,
  initialPermohonanList,
  initialKeberatanList,
}: RekapPpidClientProps) {
  const [activeTab, setActiveTab] = useState<"permohonan" | "keberatan">("permohonan");
  const [permohonanList, setPermohonanList] = useState<PermohonanItem[]>(initialPermohonanList);
  const [keberatanList, setKeberatanList] = useState<KeberatanItem[]>(initialKeberatanList);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<{
    type: "permohonan" | "keberatan";
    data: PermohonanItem | KeberatanItem;
  } | null>(null);

  const [updateStatus, setUpdateStatus] = useState("");
  const [updateTanggapan, setUpdateTanggapan] = useState("");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshData = async () => {
    setIsRefreshing(true);
    const res = await getPpidDataAction();
    if (res.success) {
      if (res.permohonanList) setPermohonanList(res.permohonanList as any);
      if (res.keberatanList) setKeberatanList(res.keberatanList as any);
    }
    setIsRefreshing(false);
  };

  const handleOpenDetail = (type: "permohonan" | "keberatan", item: PermohonanItem | KeberatanItem) => {
    setSelectedItem({ type, data: item });
    setUpdateStatus(item.status);
    setUpdateTanggapan(item.tanggapan || "");
    setFeedbackMsg(null);
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
    setFeedbackMsg(null);
  };

  const handleSaveStatus = async () => {
    if (!selectedItem) return;
    setIsSubmittingUpdate(true);
    setFeedbackMsg(null);

    const res = await updatePpidStatusAction({
      id: selectedItem.data.id,
      type: selectedItem.type,
      status: updateStatus,
      tanggapan: updateTanggapan,
    });

    setIsSubmittingUpdate(false);
    if (res.error) {
      setFeedbackMsg({ type: "error", text: res.error });
    } else {
      setFeedbackMsg({ type: "success", text: res.message || "Status berhasil diperbarui." });
      // Update local state
      if (selectedItem.type === "permohonan") {
        setPermohonanList((prev) =>
          prev.map((item) =>
            item.id === selectedItem.data.id
              ? { ...item, status: updateStatus, tanggapan: updateTanggapan }
              : item
          )
        );
      } else {
        setKeberatanList((prev) =>
          prev.map((item) =>
            item.id === selectedItem.data.id
              ? { ...item, status: updateStatus, tanggapan: updateTanggapan }
              : item
          )
        );
      }
      setTimeout(() => {
        handleCloseDetail();
      }, 1200);
    }
  };

  const handleDelete = async (type: "permohonan" | "keberatan", id: string, noReg: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data berkas ${noReg}?`)) return;

    const res = await deletePpidRecordAction({ id, type });
    if (res.error) {
      alert(res.error);
    } else {
      if (type === "permohonan") {
        setPermohonanList((prev) => prev.filter((i) => i.id !== id));
      } else {
        setKeberatanList((prev) => prev.filter((i) => i.id !== id));
      }
      if (selectedItem?.data.id === id) {
        handleCloseDetail();
      }
    }
  };

  // Filter Permohonan
  const filteredPermohonan = permohonanList.filter((item) => {
    const matchesSearch =
      item.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorRegistrasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nik.includes(searchQuery) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorHp.includes(searchQuery);

    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter Keberatan
  const filteredKeberatan = keberatanList.filter((item) => {
    const matchesSearch =
      item.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorRegistrasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorPermohonan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorHp.includes(searchQuery);

    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Menunggu Review
          </span>
        );
      case "DIPROSES":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sedang Diproses
          </span>
        );
      case "DISETUJUI":
      case "SELESAI":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai / Disetujui
          </span>
        );
      case "DITOLAK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-emerald-400" />
            Layanan PPID SMAN 6 Tangerang
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Rekap permohonan informasi publik dan pengajuan keberatan resmi dari masyarakat.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
            Refresh Data
          </button>
          <a
            href="/ppid"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition text-xs font-semibold"
          >
            <ExternalLink className="w-4 h-4" />
            Buka Form Publik
          </a>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab("permohonan")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === "permohonan"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <FileText className="w-4 h-4" />
            Permohonan Informasi
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              {permohonanList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("keberatan")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === "keberatan"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Pengajuan Keberatan
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              {keberatanList.length}
            </span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, reg, KTP, email..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-600"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Semua Status</option>
              <option value="PENDING" className="bg-slate-900 text-white">Pending</option>
              <option value="DIPROSES" className="bg-slate-900 text-white">Diproses</option>
              <option value="DISETUJUI" className="bg-slate-900 text-white">Disetujui / Selesai</option>
              <option value="DITOLAK" className="bg-slate-900 text-white">Ditolak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
        {activeTab === "permohonan" ? (
          /* TAB PERMOHONAN */
          filteredPermohonan.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="font-medium text-slate-300">Belum ada permohonan informasi publik.</p>
              <p className="text-xs text-slate-500 mt-1">Data dari formulir online akan muncul di sini secara otomatis.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">No. Registrasi</th>
                    <th className="py-3.5 px-4 font-semibold">Pemohon</th>
                    <th className="py-3.5 px-4 font-semibold">Kategori</th>
                    <th className="py-3.5 px-4 font-semibold">Informasi Dibutuhkan</th>
                    <th className="py-3.5 px-4 font-semibold">Pengiriman</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredPermohonan.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-emerald-400 block">{item.nomorRegistrasi}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.namaLengkap}</div>
                        <div className="text-[11px] text-slate-400 font-mono">NIK: {item.nik}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{item.nomorHp}</span> • <span>{item.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {item.kategoriPemohon}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-300">{item.rincianInformasi}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-400 block text-[11px]">{item.caraPengiriman}</span>
                        <span className="text-slate-500 text-[10px]">({item.caraMemperoleh})</span>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenDetail("permohonan", item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>
                        {user.role === "WAKA" && (
                          <button
                            onClick={() => handleDelete("permohonan", item.id, item.nomorRegistrasi)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB KEBERATAN */
          filteredKeberatan.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="font-medium text-slate-300">Belum ada pengajuan keberatan layanan PPID.</p>
              <p className="text-xs text-slate-500 mt-1">Pengajuan keberatan resmi akan tercatat di sini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">No. Keberatan</th>
                    <th className="py-3.5 px-4 font-semibold">No. Permohonan Awal</th>
                    <th className="py-3.5 px-4 font-semibold">Pengaju</th>
                    <th className="py-3.5 px-4 font-semibold">Alasan Utama</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredKeberatan.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-amber-400 block">{item.nomorRegistrasi}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-emerald-400 font-medium">{item.nomorPermohonan}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.namaLengkap}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{item.nomorHp}</span> • <span>{item.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {item.alasanKeberatan.slice(0, 2).map((alasan, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {alasan}
                            </span>
                          ))}
                          {item.alasanKeberatan.length > 2 && (
                            <span className="text-[10px] text-slate-500">+{item.alasanKeberatan.length - 2} lainnya</span>
                          )}
                        </div>
                        <p className="line-clamp-1 text-slate-400 text-[11px]">{item.penjelasanKeberatan}</p>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenDetail("keberatan", item)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>
                        {user.role === "WAKA" && (
                          <button
                            onClick={() => handleDelete("keberatan", item.id, item.nomorRegistrasi)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* DETAIL & RESPONSE MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  {selectedItem.type === "permohonan" ? "Detail Permohonan Informasi" : "Detail Pengajuan Keberatan"}
                </span>
                <h3 className="text-lg font-bold text-white font-mono mt-0.5">
                  {selectedItem.data.nomorRegistrasi}
                </h3>
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Alert Feedback */}
              {feedbackMsg && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    feedbackMsg.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  {feedbackMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* Data Pemohon / Pengaju */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Identitas Pemohon
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Nama Lengkap</span>
                    <span className="font-semibold text-white">{selectedItem.data.namaLengkap}</span>
                  </div>
                  {selectedItem.type === "permohonan" && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">Nomor KTP / NIK</span>
                      <span className="font-mono text-slate-200">{(selectedItem.data as PermohonanItem).nik}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block text-[10px]">WhatsApp / HP</span>
                    <span className="text-slate-200">{(selectedItem.data as PermohonanItem).nomorHp}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Email</span>
                    <span className="text-slate-200">{(selectedItem.data as PermohonanItem).email}</span>
                  </div>
                  {selectedItem.type === "permohonan" && (
                    <>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Kategori Pemohon</span>
                        <span className="text-slate-200">{(selectedItem.data as PermohonanItem).kategoriPemohon}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-[10px]">Alamat Lengkap</span>
                        <span className="text-slate-300 font-normal">{(selectedItem.data as PermohonanItem).alamat}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Uploaded Attachment */}
                {selectedItem.type === "permohonan" && (selectedItem.data as PermohonanItem).fileIdentitas && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 block text-[10px] mb-1">Lampiran Identitas (KTP/KTM/SIM)</span>
                    <a
                      href={(selectedItem.data as PermohonanItem).fileIdentitas!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition text-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Lihat / Unduh Dokumen Identitas
                    </a>
                  </div>
                )}
                {selectedItem.type === "keberatan" && (selectedItem.data as KeberatanItem).fileBuktiAwal && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 block text-[10px] mb-1">Lampiran Bukti Permohonan Awal</span>
                    <a
                      href={(selectedItem.data as KeberatanItem).fileBuktiAwal!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition text-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Lihat / Unduh Bukti Awal
                    </a>
                  </div>
                )}
              </div>

              {/* Rincian Permohonan / Keberatan */}
              {selectedItem.type === "permohonan" ? (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">
                    Rincian Kebutuhan Informasi
                  </h4>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Informasi yang Dibutuhkan</span>
                    <p className="text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">
                      {(selectedItem.data as PermohonanItem).rincianInformasi}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tujuan Penggunaan</span>
                    <p className="text-slate-300 mt-1 whitespace-pre-wrap">
                      {(selectedItem.data as PermohonanItem).tujuanPenggunaan}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Cara Memperoleh</span>
                      <span className="text-slate-300 font-medium font-sans">{(selectedItem.data as PermohonanItem).caraMemperoleh}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Cara Pengiriman</span>
                      <span className="text-slate-300 font-medium font-sans">{(selectedItem.data as PermohonanItem).caraPengiriman}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">
                    Detail Alasan Keberatan
                  </h4>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Nomor Permohonan Awal</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {(selectedItem.data as KeberatanItem).nomorPermohonan}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] mb-1.5">Alasan Pengajuan Keberatan</span>
                    <ul className="space-y-1">
                      {(selectedItem.data as KeberatanItem).alasanKeberatan.map((alasan, i) => (
                        <li key={i} className="flex items-start gap-2 text-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                          <span>{alasan}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Penjelasan Rinci Alasan</span>
                    <p className="text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">
                      {(selectedItem.data as KeberatanItem).penjelasanKeberatan}
                    </p>
                  </div>
                </div>
              )}

              {/* Form Process / Status Update (For Waka Admin) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Process & Tanggapan PPID
                </h4>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1.5 font-medium">Status Permohonan</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-600"
                  >
                    <option value="PENDING">PENDING (Menunggu Pemeriksaan)</option>
                    <option value="DIPROSES">DIPROSES (Dalam Penyiapan Dokumen)</option>
                    <option value="DISETUJUI">DISETUJUI / SELESAI (Dokumen Diberikan)</option>
                    <option value="DITOLAK">DITOLAK (Ditolak / Informasi Dikecualikan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1.5 font-medium">
                    Catatan Tanggapan / Jawaban Resmi Sekolah
                  </label>
                  <textarea
                    rows={3}
                    value={updateTanggapan}
                    onChange={(e) => setUpdateTanggapan(e.target.value)}
                    placeholder="Tuliskan jawaban resmi, link Google Drive softcopy, atau alasan penolakan..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCloseDetail}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-medium"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={isSubmittingUpdate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition disabled:opacity-50"
              >
                {isSubmittingUpdate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Simpan Tanggapan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
