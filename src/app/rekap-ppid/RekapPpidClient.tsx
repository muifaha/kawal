"use client";

import React, { useState } from "react";
import {
  FileText,
  AlertCircle,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Download,
  Send,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  X,
  FileCheck,
  Building2,
  Paperclip,
} from "lucide-react";
import { updatePpidStatusAction, deletePpidRecordAction } from "@/app/actions/ppid";

interface PermohonanItem {
  id: string;
  nomorPendaftaran: string;
  nama: string;
  nik: string;
  kategori: string;
  alamat: string;
  noHp: string;
  email: string;
  fileIdentitas: string;
  rincianInformasi: string;
  tujuanPenggunaan: string;
  caraMemperoleh: string;
  caraPengiriman: string;
  status: string;
  tanggapanAdmin?: string | null;
  createdAt: string | Date;
}

interface KeberatanItem {
  id: string;
  nomorPendaftaran: string;
  nomorPermohonanRef: string;
  nama: string;
  noHp: string;
  email: string;
  alasanKeberatan: string; // JSON array or string
  penjelasanRinci: string;
  fileBukti?: string | null;
  status: string;
  tanggapanAdmin?: string | null;
  createdAt: string | Date;
}

interface RekapPpidClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
  initialPermohonan: PermohonanItem[];
  initialKeberatan: KeberatanItem[];
}

export default function RekapPpidClient({
  user,
  initialPermohonan,
  initialKeberatan,
}: RekapPpidClientProps) {
  const [activeTab, setActiveTab] = useState<"permohonan" | "keberatan">("permohonan");
  const [permohonanList, setPermohonanList] = useState<PermohonanItem[]>(initialPermohonan);
  const [keberatanList, setKeberatanList] = useState<KeberatanItem[]>(initialKeberatan);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Detail / Edit Modal State
  const [selectedItem, setSelectedItem] = useState<{
    type: "permohonan" | "keberatan";
    data: PermohonanItem | KeberatanItem;
  } | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editTanggapan, setEditTanggapan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "permohonan" | "keberatan";
    id: string;
    nomor: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenDetail = (type: "permohonan" | "keberatan", data: PermohonanItem | KeberatanItem) => {
    setSelectedItem({ type, data });
    setEditStatus(data.status);
    setEditTanggapan(data.tanggapanAdmin || "");
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      const res = await updatePpidStatusAction({
        id: selectedItem.data.id,
        type: selectedItem.type,
        status: editStatus,
        tanggapan: editTanggapan,
      });

      if (res.success) {
        showToast("success", "Status & tanggapan PPID berhasil diperbarui!");
        if (selectedItem.type === "permohonan") {
          setPermohonanList((prev) =>
            prev.map((item) =>
              item.id === selectedItem.data.id
                ? { ...item, status: editStatus, tanggapanAdmin: editTanggapan }
                : item
            )
          );
        } else {
          setKeberatanList((prev) =>
            prev.map((item) =>
              item.id === selectedItem.data.id
                ? { ...item, status: editStatus, tanggapanAdmin: editTanggapan }
                : item
            )
          );
        }
        setSelectedItem(null);
      } else {
        showToast("error", res.error || "Gagal memperbarui status");
      }
    } catch (err: any) {
      showToast("error", err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      const res = await deletePpidRecordAction({
        id: deleteConfirm.id,
        type: deleteConfirm.type,
      });

      if (res.success) {
        showToast("success", `Data PPID ${deleteConfirm.nomor} berhasil dihapus.`);
        if (deleteConfirm.type === "permohonan") {
          setPermohonanList((prev) => prev.filter((item) => item.id !== deleteConfirm.id));
        } else {
          setKeberatanList((prev) => prev.filter((item) => item.id !== deleteConfirm.id));
        }
        setDeleteConfirm(null);
      } else {
        showToast("error", res.error || "Gagal menghapus data.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered lists
  const filteredPermohonan = permohonanList.filter((item) => {
    const matchesSearch =
      item.nomorPendaftaran.toLowerCase().includes(search.toLowerCase()) ||
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.nik.includes(search) ||
      item.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredKeberatan = keberatanList.filter((item) => {
    const matchesSearch =
      item.nomorPendaftaran.toLowerCase().includes(search.toLowerCase()) ||
      item.nomorPermohonanRef.toLowerCase().includes(search.toLowerCase()) ||
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Menunggu Review
          </span>
        );
      case "DIPROSES":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" /> Sedang Diproses
          </span>
        );
      case "DISETUJUI":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
          </span>
        );
      case "SELESAI":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Selesai
          </span>
        );
      case "DITOLAK":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  const parseReasons = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) return parsed.join(", ");
      return jsonStr;
    } catch {
      return jsonStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-800"
              : "bg-rose-950/90 text-rose-200 border-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Rekap & Layanan PPID
              </h1>
              <p className="text-sm text-slate-400">
                Kelola permohonan informasi publik dan pengajuan keberatan warga sekolah & umum.
              </p>
            </div>
          </div>
        </div>

        {/* Public link info */}
        <div className="flex items-center gap-3">
          <a
            href="/ppid"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
          >
            <FileCheck className="w-4 h-4" /> Buka Form Publik PPID (/ppid)
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("permohonan")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === "permohonan"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <FileText className="w-4 h-4" /> Permohonan Informasi
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300">
            {permohonanList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("keberatan")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === "keberatan"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <AlertCircle className="w-4 h-4" /> Pengajuan Keberatan
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300">
            {keberatanList.length}
          </span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === "permohonan"
                ? "Cari no pendaftaran, nama, NIK..."
                : "Cari no keberatan, no ref, nama..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" /> Filter Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Menunggu Review (PENDING)</option>
            <option value="DIPROSES">Sedang Diproses (DIPROSES)</option>
            <option value="DISETUJUI">Disetujui (DISETUJUI)</option>
            <option value="SELESAI">Selesai (SELESAI)</option>
            <option value="DITOLAK">Ditolak (DITOLAK)</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
        {activeTab === "permohonan" ? (
          /* Permohonan Table */
          filteredPermohonan.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="font-medium text-base text-slate-300">Belum ada permohonan informasi</p>
              <p className="text-sm text-slate-500 mt-1">Data permohonan publik akan muncul di sini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">No. Pendaftaran / Tgl</th>
                    <th className="px-6 py-4">Pemohon</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Kontak</th>
                    <th className="px-6 py-4">Rincian Informasi</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPermohonan.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-emerald-400">{item.nomorPendaftaran}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{item.nama}</div>
                        <div className="text-xs text-slate-400">NIK: {item.nik}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-slate-300 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-500" /> {item.noHp}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                          <Mail className="w-3 h-3 text-slate-500" /> {item.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="line-clamp-2 text-xs text-slate-300">{item.rincianInformasi}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleOpenDetail("permohonan", item)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail & Respon
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              type: "permohonan",
                              id: item.id,
                              nomor: item.nomorPendaftaran,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : /* Keberatan Table */
        filteredKeberatan.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="font-medium text-base text-slate-300">Belum ada pengajuan keberatan</p>
            <p className="text-sm text-slate-500 mt-1">
              Data keberatan permohonan informasi akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">No. Keberatan / Tgl</th>
                  <th className="px-6 py-4">No. Ref Permohonan</th>
                  <th className="px-6 py-4">Pemohon</th>
                  <th className="px-6 py-4">Kontak</th>
                  <th className="px-6 py-4">Alasan Keberatan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredKeberatan.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-amber-400">{item.nomorPendaftaran}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {item.nomorPermohonanRef}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{item.nama}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500" /> {item.noHp}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                        <Mail className="w-3 h-3 text-slate-500" /> {item.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="line-clamp-2 text-xs text-amber-200/80 font-medium">
                        {parseReasons(item.alasanKeberatan)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleOpenDetail("keberatan", item)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail & Respon
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            type: "keberatan",
                            id: item.id,
                            nomor: item.nomorPendaftaran,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all inline-flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Update Status Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {selectedItem.type === "permohonan" ? "Permohonan Informasi" : "Pengajuan Keberatan"}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {selectedItem.data.nomorPendaftaran}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content view */}
            {selectedItem.type === "permohonan" ? (
              <div className="space-y-4 text-sm text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-500 block">Nama Pemohon:</span>
                    <span className="font-semibold text-white">{(selectedItem.data as PermohonanItem).nama}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">NIK Pemohon:</span>
                    <span className="font-semibold text-white">{(selectedItem.data as PermohonanItem).nik}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Kategori Pemohon:</span>
                    <span className="font-semibold text-white">{(selectedItem.data as PermohonanItem).kategori}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Kontak HP / Email:</span>
                    <span className="font-semibold text-white">
                      {(selectedItem.data as PermohonanItem).noHp} / {(selectedItem.data as PermohonanItem).email}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-xs text-slate-500 block">Alamat Lengkap:</span>
                    <span className="text-slate-200">{(selectedItem.data as PermohonanItem).alamat}</span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Rincian Informasi Yang Dibutuhkan:</span>
                    <p className="text-slate-200 bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                      {(selectedItem.data as PermohonanItem).rincianInformasi}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Tujuan Penggunaan Informasi:</span>
                    <p className="text-slate-200 bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                      {(selectedItem.data as PermohonanItem).tujuanPenggunaan}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Cara Memperoleh:</span>
                      <span className="font-medium text-slate-300">{(selectedItem.data as PermohonanItem).caraMemperoleh}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Cara Pengiriman:</span>
                      <span className="font-medium text-slate-300">{(selectedItem.data as PermohonanItem).caraPengiriman}</span>
                    </div>
                  </div>
                </div>

                {/* Uploaded Identity */}
                {(selectedItem.data as PermohonanItem).fileIdentitas && (
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-500 block mb-2">Berkas Identitas Pemohon (KTP/KTM/SIM):</span>
                    {(selectedItem.data as PermohonanItem).fileIdentitas.startsWith("data:image") ? (
                      <div className="space-y-2">
                        <img
                          src={(selectedItem.data as PermohonanItem).fileIdentitas}
                          alt="Identitas Pemohon"
                          className="max-h-48 rounded-lg border border-slate-700 object-contain"
                        />
                        <a
                          href={(selectedItem.data as PermohonanItem).fileIdentitas}
                          download={`Identitas_${(selectedItem.data as PermohonanItem).nama}.png`}
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" /> Unduh Berkas Identitas
                        </a>
                      </div>
                    ) : (
                      <a
                        href={(selectedItem.data as PermohonanItem).fileIdentitas}
                        download={`Identitas_${(selectedItem.data as PermohonanItem).nama}`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                      >
                        <Paperclip className="w-4 h-4" /> Unduh Dokumen Identitas (PDF/File)
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Keberatan details */
              <div className="space-y-4 text-sm text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-500 block">Nama Pemohon:</span>
                    <span className="font-semibold text-white">{(selectedItem.data as KeberatanItem).nama}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">No. Ref Permohonan Awal:</span>
                    <span className="font-semibold text-amber-400">{(selectedItem.data as KeberatanItem).nomorPermohonanRef}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Kontak HP / Email:</span>
                    <span className="font-semibold text-white">
                      {(selectedItem.data as KeberatanItem).noHp} / {(selectedItem.data as KeberatanItem).email}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Alasan Keberatan:</span>
                    <p className="text-amber-200 bg-slate-900 p-3 rounded-lg border border-slate-800/80 font-medium">
                      {parseReasons((selectedItem.data as KeberatanItem).alasanKeberatan)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Penjelasan Rinci:</span>
                    <p className="text-slate-200 bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                      {(selectedItem.data as KeberatanItem).penjelasanRinci}
                    </p>
                  </div>
                </div>

                {(selectedItem.data as KeberatanItem).fileBukti && (
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-500 block mb-2">Berkas Bukti Permohonan Awal:</span>
                    <a
                      href={(selectedItem.data as KeberatanItem).fileBukti!}
                      download={`Bukti_Keberatan_${(selectedItem.data as KeberatanItem).nomorPendaftaran}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    >
                      <Paperclip className="w-4 h-4" /> Unduh Berkas Bukti
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Admin Response Form */}
            <form onSubmit={handleUpdateStatus} className="border-t border-slate-800 pt-5 space-y-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" /> Form Update Status & Respon Admin
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Status Layanan PPID:
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="PENDING">Menunggu Review (PENDING)</option>
                    <option value="DIPROSES">Sedang Diproses (DIPROSES)</option>
                    <option value="DISETUJUI">Disetujui (DISETUJUI)</option>
                    <option value="SELESAI">Selesai (SELESAI)</option>
                    <option value="DITOLAK">Ditolak (DITOLAK)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Catatan / Tanggapan Respon Admin (Akan Terlihat oleh Pemohon jika dicek):
                  </label>
                  <textarea
                    rows={3}
                    value={editTanggapan}
                    onChange={(e) => setEditTanggapan(e.target.value)}
                    placeholder="Tuliskan catatan tindak lanjut, instruksi pengambilan dokumen, atau alasan penolakan..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Hapus Record PPID?</h3>
            </div>
            <p className="text-sm text-slate-300">
              Apakah Anda yakin ingin menghapus data dengan nomor pendaftaran{" "}
              <strong className="text-white">{deleteConfirm.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteRecord}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? "Mengepus..." : "Ya, Hapus Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
