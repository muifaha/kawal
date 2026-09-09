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
  ExternalLink,
  Download,
  Filter,
  RefreshCw,
  Send,
  UserCheck,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  FileCheck,
} from "lucide-react";
import { updatePpidStatusAction, deletePpidRecordAction, getPpidDataAction } from "@/app/actions/ppid";

interface PermohonanRecord {
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
  createdAt: string | Date;
}

interface KeberatanRecord {
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
  createdAt: string | Date;
}

interface RekapPpidClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
  initialPermohonanList: PermohonanRecord[];
  initialKeberatanList: KeberatanRecord[];
}

export default function RekapPpidClient({
  user,
  initialPermohonanList,
  initialKeberatanList,
}: RekapPpidClientProps) {
  const [activeTab, setActiveTab] = useState<"permohonan" | "keberatan">("permohonan");
  const [permohonanList, setPermohonanList] = useState<PermohonanRecord[]>(initialPermohonanList);
  const [keberatanList, setKeberatanList] = useState<KeberatanRecord[]>(initialKeberatanList);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [selectedPermohonan, setSelectedPermohonan] = useState<PermohonanRecord | null>(null);
  const [selectedKeberatan, setSelectedKeberatan] = useState<KeberatanRecord | null>(null);
  const [statusForm, setStatusForm] = useState<string>("PENDING");
  const [tanggapanForm, setTanggapanForm] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<{ title: string; src: string } | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const res = await getPpidDataAction();
    if (res.success) {
      if (res.permohonanList) setPermohonanList(res.permohonanList as any);
      if (res.keberatanList) setKeberatanList(res.keberatanList as any);
    }
    setIsRefreshing(false);
  };

  const handleOpenPermohonanModal = (item: PermohonanRecord) => {
    setSelectedPermohonan(item);
    setSelectedKeberatan(null);
    setStatusForm(item.status || "PENDING");
    setTanggapanForm(item.tanggapan || "");
    setModalError(null);
    setModalSuccess(null);
  };

  const handleOpenKeberatanModal = (item: KeberatanRecord) => {
    setSelectedKeberatan(item);
    setSelectedPermohonan(null);
    setStatusForm(item.status || "PENDING");
    setTanggapanForm(item.tanggapan || "");
    setModalError(null);
    setModalSuccess(null);
  };

  const handleSaveStatus = async () => {
    if (!selectedPermohonan && !selectedKeberatan) return;
    setIsUpdating(true);
    setModalError(null);
    setModalSuccess(null);

    const type = selectedPermohonan ? "permohonan" : "keberatan";
    const id = selectedPermohonan ? selectedPermohonan.id : selectedKeberatan!.id;

    const res = await updatePpidStatusAction({
      id,
      type,
      status: statusForm,
      tanggapan: tanggapanForm,
    });

    if (res.error) {
      setModalError(res.error);
    } else {
      setModalSuccess("Status dan tanggapan berhasil diperbarui.");
      await handleRefresh();
      setTimeout(() => {
        setSelectedPermohonan(null);
        setSelectedKeberatan(null);
      }, 1200);
    }
    setIsUpdating(false);
  };

  const handleDeleteRecord = async (id: string, type: "permohonan" | "keberatan") => {
    if (!confirm("Apakah Anda yakin ingin menghapus data permohonan PPID ini?")) return;
    const res = await deletePpidRecordAction({ id, type });
    if (res.error) {
      alert(res.error);
    } else {
      await handleRefresh();
    }
  };

  // Filtering
  const filteredPermohonan = permohonanList.filter((item) => {
    const matchesSearch =
      item.nomorRegistrasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nik.includes(searchQuery) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredKeberatan = keberatanList.filter((item) => {
    const matchesSearch =
      item.nomorRegistrasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorPermohonan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Verifikasi
          </span>
        );
      case "DIPROSES":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Sedang Diproses
          </span>
        );
      case "DISETUJUI":
      case "SELESAI":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Selesai / Disetujui
          </span>
        );
      case "DITOLAK":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Layanan PPID SMAN 6 Tangerang</h1>
              <p className="text-xs text-slate-400">
                Manajemen Rekap Permohonan Informasi Publik & Pengajuan Keberatan
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
          <a
            href="/ppid"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 border border-emerald-500 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buka Form Publik
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("permohonan")}
          className={`px-5 py-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === "permohonan"
              ? "border-blue-500 text-blue-400 bg-blue-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Permohonan Informasi Publik ({permohonanList.length})
        </button>

        <button
          onClick={() => setActiveTab("keberatan")}
          className={`px-5 py-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === "keberatan"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Pengajuan Keberatan ({keberatanList.length})
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor reg, nama, NIK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Menunggu Verifikasi</option>
            <option value="DIPROSES">Sedang Diproses</option>
            <option value="DISETUJUI">Disetujui / Selesai</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Permohonan Informasi Table */}
      {activeTab === "permohonan" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">No. Registrasi</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Pemohon</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Rincian Informasi</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPermohonan.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Belum ada permohonan informasi publik.
                    </td>
                  </tr>
                ) : (
                  filteredPermohonan.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{item.nomorRegistrasi}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.namaLengkap}</div>
                        <div className="text-[11px] text-slate-400">NIK: {item.nik}</div>
                        <div className="text-[11px] text-slate-500">{item.nomorHp}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {item.kategoriPemohon}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-300">{item.rincianInformasi}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">{renderStatusBadge(item.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenPermohonanModal(item)}
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg font-semibold text-xs border border-blue-500/30 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detail & Tanggapan
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(item.id, "permohonan")}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Pengajuan Keberatan Table */}
      {activeTab === "keberatan" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">No. Registrasi</th>
                  <th className="py-3.5 px-4">Ref. Permohonan</th>
                  <th className="py-3.5 px-4">Pemohon</th>
                  <th className="py-3.5 px-4">Alasan Keberatan</th>
                  <th className="py-3.5 px-4">Penjelasan Rinci</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredKeberatan.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Belum ada pengajuan keberatan.
                    </td>
                  </tr>
                ) : (
                  filteredKeberatan.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{item.nomorRegistrasi}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{item.nomorPermohonan}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.namaLengkap}</div>
                        <div className="text-[11px] text-slate-400">{item.email}</div>
                        <div className="text-[11px] text-slate-500">{item.nomorHp}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                          {item.alasanKeberatan.map((alasan, idx) => (
                            <li key={idx}>{alasan}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-300">{item.penjelasanKeberatan}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">{renderStatusBadge(item.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenKeberatanModal(item)}
                            className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg font-semibold text-xs border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detail & Tanggapan
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(item.id, "keberatan")}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detail Permohonan / Keberatan */}
      {(selectedPermohonan || selectedKeberatan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-none my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedPermohonan ? "Detail Permohonan Informasi" : "Detail Pengajuan Keberatan"}
                  </h3>
                  <p className="text-xs font-mono text-blue-400">
                    {selectedPermohonan?.nomorRegistrasi || selectedKeberatan?.nomorRegistrasi}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedPermohonan(null);
                  setSelectedKeberatan(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Pemohon Identity Card */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" /> Data Pemohon
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Nama Lengkap</span>
                    <span className="font-semibold text-white">
                      {selectedPermohonan?.namaLengkap || selectedKeberatan?.namaLengkap}
                    </span>
                  </div>
                  {selectedPermohonan && (
                    <div>
                      <span className="text-slate-500 block">NIK</span>
                      <span className="font-mono text-slate-200">{selectedPermohonan.nik}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block">Nomor HP / WA</span>
                    <span className="text-slate-200">{selectedPermohonan?.nomorHp || selectedKeberatan?.nomorHp}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Email</span>
                    <span className="text-slate-200">{selectedPermohonan?.email || selectedKeberatan?.email}</span>
                  </div>
                  {selectedPermohonan && (
                    <>
                      <div>
                        <span className="text-slate-500 block">Kategori</span>
                        <span className="text-slate-200">{selectedPermohonan.kategoriPemohon}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 block">Alamat</span>
                        <span className="text-slate-200">{selectedPermohonan.alamat}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Details Content */}
              {selectedPermohonan && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Rincian Informasi Yang Dibutuhkan
                    </span>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap">{selectedPermohonan.rincianInformasi}</p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Tujuan Penggunaan Informasi
                    </span>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap">{selectedPermohonan.tujuanPenggunaan}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block mb-1">Cara Memperoleh Informasi</span>
                      <span className="font-semibold text-slate-200">{selectedPermohonan.caraMemperoleh}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block mb-1">Cara Pengiriman Informasi</span>
                      <span className="font-semibold text-slate-200">{selectedPermohonan.caraPengiriman}</span>
                    </div>
                  </div>

                  {selectedPermohonan.fileIdentitas && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-300 block">Dokumen Identitas (KTP/KTM/SIM)</span>
                        <span className="text-[11px] text-slate-500">File lampiran identitas pemohon</span>
                      </div>
                      <button
                        onClick={() =>
                          setPreviewFile({
                            title: `Identitas - ${selectedPermohonan.namaLengkap}`,
                            src: selectedPermohonan.fileIdentitas!,
                          })
                        }
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-lg border border-blue-500/30 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Pratinjau File
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedKeberatan && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Nomor Permohonan Sebelumnya
                    </span>
                    <p className="text-xs font-mono font-bold text-amber-400">{selectedKeberatan.nomorPermohonan}</p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Alasan Keberatan
                    </span>
                    <ul className="list-disc pl-4 text-xs text-slate-200 space-y-1">
                      {selectedKeberatan.alasanKeberatan.map((alasan, i) => (
                        <li key={i}>{alasan}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Penjelasan Rinci Keberatan
                    </span>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap">{selectedKeberatan.penjelasanKeberatan}</p>
                  </div>

                  {selectedKeberatan.fileBuktiAwal && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-300 block">Bukti Permohonan Awal</span>
                        <span className="text-[11px] text-slate-500">File lampiran bukti permohonan</span>
                      </div>
                      <button
                        onClick={() =>
                          setPreviewFile({
                            title: `Bukti Permohonan Awal - ${selectedKeberatan.namaLengkap}`,
                            src: selectedKeberatan.fileBuktiAwal!,
                          })
                        }
                        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-xs font-semibold rounded-lg border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Pratinjau File
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Status Update Form */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Update Status & Tanggapan Resmi Waka PPID
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Status Tindak Lanjut</label>
                    <select
                      value={statusForm}
                      onChange={(e) => setStatusForm(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="PENDING">PENDING - Menunggu Verifikasi</option>
                      <option value="DIPROSES">DIPROSES - Sedang Ditindaklanjuti</option>
                      <option value="DISETUJUI">DISETUJUI - Permohonan / Keberatan Diterima</option>
                      <option value="DITOLAK">DITOLAK - Permohonan / Keberatan Ditolak</option>
                      <option value="SELESAI">SELESAI - Informasi Telah Disampaikan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Catatan Tanggapan PPID</label>
                    <textarea
                      rows={3}
                      placeholder="Masukkan catatan tanggapan atau nomor surat balasan resmi..."
                      value={tanggapanForm}
                      onChange={(e) => setTanggapanForm(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedPermohonan(null);
                  setSelectedKeberatan(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>

              <button
                onClick={handleSaveStatus}
                disabled={isUpdating}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 border border-blue-500 cursor-pointer"
              >
                {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Simpan Tanggapan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{previewFile.title}</h4>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center bg-slate-950/50">
              {previewFile.src.startsWith("data:image/") || previewFile.src.startsWith("http") ? (
                <img
                  src={previewFile.src}
                  alt={previewFile.title}
                  className="max-w-full max-h-[65vh] object-contain rounded-lg border border-slate-800"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-xs text-slate-400 mb-3">Dokumen PDF atau Format Lain</p>
                  <a
                    href={previewFile.src}
                    download="dokumen-ppid"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Dokumen
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
