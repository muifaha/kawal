"use client";

import React, { useState, useMemo } from "react";
import {
  GraduationCap,
  Briefcase,
  Building2,
  BookOpen,
  Search,
  Users,
  Download,
  Eye,
  X,
  FileSpreadsheet,
  Heart,
  Clock,
  Sparkles,
  School,
  CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";

interface AlumniItem {
  siswaId: string;
  nama: string;
  nis: string;
  nisn: string;
  statusSiswa: string;
  kelasTerakhir: string;
  tahunLulus: string;
  tracer: any | null;
}

interface RekapAlumniClientProps {
  user: {
    id: string;
    nama: string;
    role: string;
  };
  initialAlumniList: AlumniItem[];
}

export default function RekapAlumniClient({ user, initialAlumniList }: RekapAlumniClientProps) {
  const [alumniList] = useState<AlumniItem[]>(initialAlumniList);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAlumniDetail, setSelectedAlumniDetail] = useState<AlumniItem | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = alumniList.length;
    const filledCount = alumniList.filter((a) => a.tracer !== null).length;

    let kuliahCount = 0;
    let kerjaCount = 0;
    let wirausahaCount = 0;
    let pelatihanCount = 0;
    let mencariKerjaCount = 0;
    let keluargaCount = 0;
    let gapYearCount = 0;

    alumniList.forEach((a) => {
      if (a.tracer) {
        const st = a.tracer.statusUtama;
        if (st === "KULIAH") kuliahCount++;
        else if (st === "BEKERJA") kerjaCount++;
        else if (st === "WIRAUSAHA") wirausahaCount++;
        else if (st === "PELATIHAN") pelatihanCount++;
        else if (st === "MENCARI_KERJA") mencariKerjaCount++;
        else if (st === "MENGURUS_KELUARGA") keluargaCount++;
        else if (st === "GAP_YEAR") gapYearCount++;
      }
    });

    return {
      total,
      filledCount,
      kuliahCount,
      kerjaCount,
      wirausahaCount,
      pelatihanCount,
      mencariKerjaCount,
      keluargaCount,
      gapYearCount,
      filledPercentage: total > 0 ? Math.round((filledCount / total) * 100) : 0,
    };
  }, [alumniList]);

  // Filtered List
  const filteredAlumni = useMemo(() => {
    return alumniList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.nama.toLowerCase().includes(q) ||
        item.nis.toLowerCase().includes(q) ||
        item.nisn.toLowerCase().includes(q) ||
        item.kelasTerakhir.toLowerCase().includes(q) ||
        (item.tracer?.namaPerusahaan && item.tracer.namaPerusahaan.toLowerCase().includes(q)) ||
        (item.tracer?.namaPerguruanTinggi && item.tracer.namaPerguruanTinggi.toLowerCase().includes(q)) ||
        (item.tracer?.namaUsaha && item.tracer.namaUsaha.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "FILLED" && item.tracer !== null) ||
        (statusFilter === "UNFILLED" && item.tracer === null) ||
        (item.tracer && item.tracer.statusUtama === statusFilter);

      return matchSearch && matchStatus;
    });
  }, [alumniList, searchQuery, statusFilter]);

  // Paginated List
  const paginatedAlumni = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAlumni.slice(start, start + pageSize);
  }, [filteredAlumni, currentPage, pageSize]);

  // Export to Excel Handler
  const handleExportExcel = () => {
    if (filteredAlumni.length === 0) {
      alert("Tidak ada data alumni untuk diekspor.");
      return;
    }

    const dataToExport = filteredAlumni.map((item, idx) => {
      const t = item.tracer || {};
      return {
        No: idx + 1,
        Nama: item.nama,
        "NISN / NIS": `${item.nisn} / ${item.nis}`,
        "Kelas Terakhir": item.kelasTerakhir,
        "Status Tracer Study": t.statusUtama ? "Sudah Mengisi" : "Belum Mengisi",
        "Status Utama Saat Ini": t.statusUtama || "-",
        // Bekerja
        "Perusahaan / Tempat Kerja": t.namaPerusahaan || "-",
        "Posisi / Jabatan": t.posisiJabatan || "-",
        "Bidang Pekerjaan": t.bidangPekerjaan || "-",
        "Waktu Tunggu Kerja": t.waktuTungguKerja || "-",
        "Kisaran Pendapatan": t.kisaranPendapatan || "-",
        // Kuliah
        "Perguruan Tinggi": t.namaPerguruanTinggi || "-",
        Jenjang: t.jenjangPendidikan || "-",
        "Fakultas / Prodi": t.fakultasProdi || "-",
        "Jalur Masuk": t.jalurMasuk || "-",
        "Status Pembiayaan": t.statusPembiayaan || "-",
        // Wirausaha
        "Nama Usaha": t.namaUsaha || "-",
        "Bidang Usaha": t.bidangUsaha || "-",
        "Status Kepemilikan Usaha": t.statusKepemilikan || "-",
        // Evaluasi Sekolah
        "Relevansi Kurikulum": t.relevansiKurikulum || "-",
        "Penilaian Fasilitas": t.penilaianFasilitas || "-",
        "Penilaian BKK": t.penilaianBKK || "-",
        "Saran Untuk Sekolah": t.saranSekolah || "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tracer Study Alumni");
    XLSX.writeFile(workbook, `Rekap_Tracer_Study_Alumni_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const statusBadgeStyle: Record<string, { label: string; style: string }> = {
    KULIAH: { label: "Melanjutkan Pendidikan", style: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
    BEKERJA: { label: "Bekerja", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    WIRAUSAHA: { label: "Berwirausaha", style: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    PELATIHAN: { label: "Pelatihan / Kursus", style: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
    MENCARI_KERJA: { label: "Sedang Mencari Kerja", style: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
    MENGURUS_KELUARGA: { label: "Mengurus Keluarga", style: "bg-pink-500/10 text-pink-400 border-pink-500/30" },
    GAP_YEAR: { label: "Gap Year / Seleksi", style: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <School className="w-7 h-7 text-emerald-400" />
            Alumni & Tracer Study
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Rekapitulasi penelusuran lulusan, statistik karir alumni, dan umpan balik sekolah.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/alumni"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Buka Portal Alumni (Form Publik)</span>
          </a>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Alumni Terdata</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.total}</p>
          <p className="text-[10px] text-emerald-400 font-semibold">{metrics.filledCount} Alumni Sudah Mengisi Tracer</p>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Bekerja</span>
            <Briefcase className="w-4 h-4 text-emerald-400/70" />
          </div>
          <p className="text-2xl font-bold text-emerald-300">{metrics.kerjaCount}</p>
          <p className="text-[10px] text-slate-400">Terserap di Dunia Kerja / Industri</p>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Kuliah / Kedinasan</span>
            <GraduationCap className="w-4 h-4 text-sky-400/70" />
          </div>
          <p className="text-2xl font-bold text-sky-300">{metrics.kuliahCount}</p>
          <p className="text-[10px] text-slate-400">Melanjutkan Pendidikan Tinggi</p>
        </div>

        <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Wirausaha / BLK / Lainnya</span>
            <Building2 className="w-4 h-4 text-amber-400/70" />
          </div>
          <p className="text-2xl font-bold text-amber-300">
            {metrics.wirausahaCount + metrics.pelatihanCount + metrics.mencariKerjaCount + metrics.keluargaCount + metrics.gapYearCount}
          </p>
          <p className="text-[10px] text-slate-400">Berwirausaha, Kursus, dll.</p>
        </div>
      </div>

      {/* Filters & Datatable */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative rounded-xl w-full sm:w-72">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, NISN, PT, atau Perusahaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
            >
              <option value="ALL">Semua Status Tracer</option>
              <option value="FILLED">Sudah Mengisi Tracer</option>
              <option value="UNFILLED">Belum Mengisi Tracer</option>
              <option value="BEKERJA">Status: Bekerja</option>
              <option value="KULIAH">Status: Melanjutkan Pendidikan</option>
              <option value="WIRAUSAHA">Status: Berwirausaha</option>
              <option value="PELATIHAN">Status: Pelatihan / BLK</option>
              <option value="MENCARI_KERJA">Status: Sedang Mencari Kerja</option>
              <option value="MENGURUS_KELUARGA">Status: Mengurus Keluarga</option>
              <option value="GAP_YEAR">Status: Gap Year / Persiapan Seleksi</option>
            </select>
          </div>
        </div>

        {/* Datatable */}
        <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/20">
          <table className="min-w-[850px] w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/60">
              <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Siswa Alumni</th>
                <th className="py-3 px-4">Kelas Terakhir</th>
                <th className="py-3 px-4">Status Tracer Study</th>
                <th className="py-3 px-4">Detail Instansi / Kampus</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAlumni.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-500 text-sm">
                    Tidak ada data alumni yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedAlumni.map((item, index) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + index + 1;
                  const t = item.tracer;
                  const badge = t?.statusUtama ? statusBadgeStyle[t.statusUtama] : null;

                  return (
                    <tr key={item.siswaId} className="text-xs hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500 font-medium text-center">{absoluteIndex}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.nama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NISN: {item.nisn}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">{item.kelasTerakhir}</td>
                      <td className="py-3.5 px-4">
                        {badge ? (
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.style}`}>
                            {badge.label}
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Belum Mengisi
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {t?.statusUtama === "BEKERJA" && (
                          <div>
                            <div className="font-semibold text-white">{t.namaPerusahaan}</div>
                            <div className="text-[10px] text-slate-400">{t.posisiJabatan} ({t.bidangPekerjaan})</div>
                          </div>
                        )}
                        {t?.statusUtama === "KULIAH" && (
                          <div>
                            <div className="font-semibold text-sky-300">{t.namaPerguruanTinggi}</div>
                            <div className="text-[10px] text-slate-400">{t.fakultasProdi} • {t.jenjangPendidikan}</div>
                          </div>
                        )}
                        {t?.statusUtama === "WIRAUSAHA" && (
                          <div>
                            <div className="font-semibold text-amber-300">{t.namaUsaha}</div>
                            <div className="text-[10px] text-slate-400">{t.bidangUsaha} ({t.statusKepemilikan})</div>
                          </div>
                        )}
                        {t?.statusUtama === "PELATIHAN" && (
                          <div>
                            <div className="font-semibold text-purple-300">{t.namaLembaga}</div>
                            <div className="text-[10px] text-slate-400">{t.bidangKeahlian}</div>
                          </div>
                        )}
                        {t?.statusUtama === "MENCARI_KERJA" && (
                          <div className="text-rose-300 font-medium">Sedang Aktif Melamar Kerja ({t.lamaMencariKerja})</div>
                        )}
                        {t?.statusUtama === "MENGURUS_KELUARGA" && (
                          <div className="text-pink-300 font-medium">Mengurus Keluarga</div>
                        )}
                        {t?.statusUtama === "GAP_YEAR" && (
                          <div className="text-blue-300 font-medium">Persiapan Seleksi: {t.targetSeleksi}</div>
                        )}
                        {!t && <span className="text-slate-500 italic">-</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {t ? (
                          <button
                            onClick={() => setSelectedAlumniDetail(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 hover:text-white transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Detail</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedAlumniDetail && selectedAlumniDetail.tracer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedAlumniDetail.nama}</h3>
                <p className="text-xs text-slate-400">
                  NISN: {selectedAlumniDetail.nisn} &bull; Kelas: {selectedAlumniDetail.kelasTerakhir}
                </p>
              </div>
              <button
                onClick={() => setSelectedAlumniDetail(null)}
                className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Answer Summary */}
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Status Utama:</span>
                <span className="font-bold text-emerald-400">
                  {statusBadgeStyle[selectedAlumniDetail.tracer.statusUtama]?.label || selectedAlumniDetail.tracer.statusUtama}
                </span>
              </div>

              {/* Specific Details */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">Rincian Kuesioner Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                  {Object.entries(selectedAlumniDetail.tracer).map(([key, val]) => {
                    if (
                      !val ||
                      ["id", "siswaId", "createdAt", "updatedAt", "statusUtama"].includes(key)
                    )
                      return null;
                    return (
                      <div key={key} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">{key}</span>
                        <span className="font-medium text-white">{String(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAlumniDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
