"use client";

import React, { useEffect } from "react";
import { Printer, ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

interface CetakJurnalViewProps {
  teacher: {
    id: string;
    nama: string;
    nip: string | null;
    ttd: string | null;
    role: string;
  };
  journals: any[];
  tanggalStr: string;
  dateLabel: string;
  schoolSettings: Record<string, string>;
  autoPrint?: boolean;
}

export default function CetakJurnalView({
  teacher,
  journals,
  tanggalStr,
  dateLabel,
  schoolSettings,
  autoPrint = false,
}: CetakJurnalViewProps) {
  const schoolName = schoolSettings.school_name || "SMA NEGERI 6 TANGERANG";
  const schoolNpsn = schoolSettings.school_npsn || "20603348";
  const schoolAddress =
    schoolSettings.school_address ||
    "Jl. Pt. YKK Mahkota, Pasir Jaya, Kec. Jatiuwung, Kota Tangerang, Banten 15135";
  const schoolLogo = schoolSettings.school_logo || "/icon.png";
  const schoolHeader = schoolSettings.school_header || "";

  useEffect(() => {
    // Force body background to light mode white
    document.body.style.backgroundColor = "#f1f5f9";
    document.body.style.color = "#0f172a";

    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  // Extract primary Rencana Aksi from journals or fallback to default
  const primaryRencanaAksi =
    journals.find((j) => j.rencanaAksi)?.rencanaAksi ||
    "Melaksanakan pembelajaran/pembimbingan dalam mewujudkan pembelajaran yang bermutu";

  return (
    <div
      style={{ backgroundColor: "#f1f5f9", color: "#0f172a" }}
      className="min-h-screen font-sans print:bg-white print:p-0"
    >
      {/* Top Action Bar (Hidden in Print / PDF Export) */}
      <div
        style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" }}
        className="print:hidden sticky top-0 z-50 border-b px-4 py-3 shadow-sm"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/jadwal"
              style={{ backgroundColor: "#f1f5f9", borderColor: "#cbd5e1", color: "#334155" }}
              className="p-2 rounded-xl transition-colors border hover:bg-slate-200"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 style={{ color: "#0f172a" }} className="text-sm sm:text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Jurnal Kegiatan dan Jurnal Mengajar
              </h1>
              <p style={{ color: "#64748b" }} className="text-xs">
                {teacher.nama} • {dateLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrint}
              style={{ backgroundColor: "#059669", color: "#ffffff" }}
              className="px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md hover:bg-emerald-700 active:bg-emerald-800"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Paper Document Container */}
      <div className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        <div
          style={{ backgroundColor: "#ffffff", color: "#0f172a", borderColor: "#cbd5e1" }}
          className="rounded-2xl p-6 sm:p-10 border shadow-xl print:shadow-none print:border-none print:p-0 print:rounded-none"
        >
          {/* Header Kop Sekolah */}
          {schoolHeader ? (
            <div style={{ borderColor: "#0f172a" }} className="mb-6 border-b-2 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={schoolHeader}
                alt="Kop Surat Sekolah"
                className="w-full h-auto max-h-36 object-contain mx-auto"
              />
            </div>
          ) : (
            <div
              style={{ borderColor: "#0f172a" }}
              className="border-b-4 border-double pb-4 mb-6 flex items-center justify-between gap-4"
            >
              <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={schoolLogo}
                  alt="Logo Sekolah"
                  className="w-20 h-20 object-contain"
                  onError={(e) => {
                    if (e.currentTarget.src !== window.location.origin + "/icon.png") {
                      e.currentTarget.src = "/icon.png";
                    } else {
                      e.currentTarget.style.display = "none";
                    }
                  }}
                />
              </div>

              <div className="text-center flex-1 px-2">
                <h2 style={{ color: "#0f172a" }} className="text-sm sm:text-base font-extrabold uppercase tracking-wide leading-tight">
                  PEMERINTAH PROVINSI BANTEN<br />
                  DINAS PENDIDIKAN DAN KEBUDAYAAN<br />
                  <span style={{ color: "#020617" }} className="text-base sm:text-lg font-black">{schoolName}</span>
                </h2>
                <p style={{ color: "#334155" }} className="text-xs font-medium mt-1 leading-snug">{schoolAddress}</p>
                <p style={{ color: "#475569" }} className="text-[11px] font-bold tracking-wider mt-0.5">
                  NPSN: {schoolNpsn} | JURNAL KEGIATAN DAN JURNAL MENGAJAR
                </p>
              </div>

              <div className="w-20 shrink-0 hidden sm:block"></div>
            </div>
          )}

          {/* Document Title */}
          <div className="text-center mb-6">
            <h3 style={{ color: "#0f172a" }} className="text-base font-black uppercase tracking-widest underline underline-offset-4">
              LAPORAN JURNAL KEGIATAN DAN JURNAL MENGAJAR
            </h3>
            <p style={{ color: "#475569" }} className="text-xs font-semibold mt-1">Hari & Tanggal: {dateLabel}</p>
          </div>

          {/* Teacher Information Box */}
          <div
            style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }}
            className="border rounded-xl p-4 mb-6 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <div>
              <span style={{ color: "#64748b" }} className="block text-[10px] font-bold uppercase tracking-wider">
                Nama Guru Pengajar
              </span>
              <span style={{ color: "#0f172a" }} className="font-bold text-sm">
                {teacher.nama}
              </span>
            </div>
            <div>
              <span style={{ color: "#64748b" }} className="block text-[10px] font-bold uppercase tracking-wider">
                NIP
              </span>
              <span style={{ color: "#1e293b" }} className="font-semibold">
                {teacher.nip || "-"}
              </span>
            </div>
            <div style={{ borderColor: "#e2e8f0" }} className="col-span-1 sm:col-span-2 border-t pt-2 mt-1">
              <span style={{ color: "#64748b" }} className="block text-[10px] font-bold uppercase tracking-wider">
                Rencana Aksi Kinerja Utama
              </span>
              <span style={{ color: "#065f46" }} className="font-bold text-xs">
                {primaryRencanaAksi}
              </span>
            </div>
          </div>

          {/* Journals Content */}
          {journals.length === 0 ? (
            <div
              style={{ borderColor: "#cbd5e1", color: "#64748b" }}
              className="p-8 text-center border-2 border-dashed rounded-xl text-xs"
            >
              Belum ada data jurnal mengajar yang tersimpan untuk tanggal ini.
            </div>
          ) : (
            <div className="space-y-6">
              {journals.map((jurnal, index) => {
                const isCustomActivity =
                  !jurnal.jadwalId ||
                  jurnal.kelas?.nama === "KEGIATAN UMUM" ||
                  jurnal.mapel?.nama === "Kegiatan Pembelajaran";
                const photos: string[] = jurnal.foto ? JSON.parse(jurnal.foto) : [];
                const photoCaptions: string[] = jurnal.fotoKeterangan ? JSON.parse(jurnal.fotoKeterangan) : [];

                return (
                  <div
                    key={jurnal.id}
                    style={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}
                    className="border rounded-xl p-4 page-break-inside-avoid"
                  >
                    <div style={{ borderColor: "#e2e8f0" }} className="flex flex-wrap items-center justify-between border-b pb-2 mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                          className="w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0"
                        >
                          {index + 1}
                        </span>
                        <div>
                          {isCustomActivity ? (
                            <div className="flex items-center gap-2">
                              <span
                                style={{ backgroundColor: "#fef3c7", color: "#b45309", borderColor: "#fde68a" }}
                                className="px-2 py-0.5 font-bold text-[10px] rounded border uppercase tracking-wider"
                              >
                                Kegiatan Tambahan
                              </span>
                              <h4 style={{ color: "#0f172a" }} className="font-bold text-sm">
                                Agenda: {jurnal.namaJurnal}
                              </h4>
                            </div>
                          ) : (
                            <div>
                              <h4 style={{ color: "#0f172a" }} className="font-bold text-sm">
                                {jurnal.mapel?.nama || "Mata Pelajaran"} • {jurnal.namaJurnal}
                              </h4>
                              <p style={{ color: "#475569" }} className="text-[11px] font-semibold">
                                Kelas {jurnal.kelas?.nama || "-"} • Jam Ke-{jurnal.jamMulai}{jurnal.jamMulai !== jurnal.jamSelesai ? ` s/d ${jurnal.jamSelesai}` : ""}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor: isCustomActivity ? "#fffbeb" : "#ecfdf5",
                          color: isCustomActivity ? "#b45309" : "#065f46",
                          borderColor: isCustomActivity ? "#fde68a" : "#a7f3d0",
                        }}
                        className="px-3 py-1 font-bold text-[11px] rounded-lg border"
                      >
                        {isCustomActivity ? "Kegiatan Non-KBM" : jurnal.namaJurnal}
                      </span>
                    </div>

                    {jurnal.rencanaAksi && (
                      <div
                        style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}
                        className="mb-3 text-xs p-2.5 rounded-lg border"
                      >
                        <span style={{ color: "#14532d" }} className="font-bold block text-[10px] uppercase tracking-wider">
                          Rencana Aksi Sesi Ini:
                        </span>
                        <p style={{ color: "#166534" }} className="font-medium">
                          {jurnal.rencanaAksi}
                        </p>
                      </div>
                    )}

                    <div className="mb-3 text-xs">
                      <span style={{ color: "#1e293b" }} className="font-bold block mb-1">
                        {isCustomActivity ? "Deskripsi / Ringkasan Kegiatan:" : "Uraian / Ringkasan Materi Pembelajaran:"}
                      </span>
                      <p
                        style={{ backgroundColor: "#f8fafc", color: "#0f172a", borderColor: "#e2e8f0" }}
                        className="whitespace-pre-line p-3 rounded-lg border leading-relaxed"
                      >
                        {jurnal.kegiatan}
                      </p>
                    </div>

                    {/* Attendance Table Summary - ONLY FOR JURNAL MENGAJAR (REGULAR KBM) */}
                    {!isCustomActivity && jurnal.absensi && jurnal.absensi.length > 0 && (
                      <div className="mb-3">
                        <span style={{ color: "#1e293b" }} className="font-bold block text-xs mb-1">
                          Rekapitulasi Kehadiran Siswa ({jurnal.absensi.length} Siswa):
                        </span>
                        <div className="overflow-x-auto">
                          <table style={{ borderColor: "#cbd5e1" }} className="w-full text-left text-[11px] border-collapse border">
                            <thead>
                              <tr style={{ backgroundColor: "#f1f5f9", color: "#334155" }} className="font-bold">
                                <th style={{ borderColor: "#cbd5e1" }} className="border px-2 py-1 w-8 text-center">No</th>
                                <th style={{ borderColor: "#cbd5e1" }} className="border px-2 py-1 w-24">NIS</th>
                                <th style={{ borderColor: "#cbd5e1" }} className="border px-2 py-1">Nama Siswa</th>
                                <th style={{ borderColor: "#cbd5e1" }} className="border px-2 py-1 w-24 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jurnal.absensi.map((abs: any, idx: number) => (
                                <tr
                                  key={abs.id}
                                  style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}
                                >
                                  <td style={{ borderColor: "#cbd5e1", color: "#64748b" }} className="border px-2 py-1 text-center font-mono">{idx + 1}</td>
                                  <td style={{ borderColor: "#cbd5e1", color: "#334155" }} className="border px-2 py-1 font-mono">{abs.siswa?.nis}</td>
                                  <td style={{ borderColor: "#cbd5e1", color: "#0f172a" }} className="border px-2 py-1 font-semibold">{abs.siswa?.nama}</td>
                                  <td style={{ borderColor: "#cbd5e1" }} className="border px-2 py-1 text-center font-bold">
                                    {abs.status === "H" && <span style={{ color: "#15803d" }}>Hadir</span>}
                                    {abs.status === "S" && <span style={{ color: "#b45309" }}>Sakit</span>}
                                    {abs.status === "I" && <span style={{ color: "#1d4ed8" }}>Izin</span>}
                                    {abs.status === "A" && <span style={{ color: "#be123c" }}>Alfa</span>}
                                    {abs.status === "D" && <span style={{ color: "#6b21a8" }}>Dispensasi</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Photos documentation */}
                    {photos.length > 0 && (
                      <div className="mt-3">
                        <span style={{ color: "#1e293b" }} className="font-bold block text-xs mb-2">
                          Dokumentasi Foto Pembelajaran:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {photos.map((url, pIdx) => (
                            <div
                              key={pIdx}
                              style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
                              className="border rounded-lg p-1 text-center"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Foto ${pIdx + 1}`}
                                className="w-full h-24 object-cover rounded-md mb-1"
                              />
                              {photoCaptions[pIdx] && (
                                <span style={{ color: "#64748b" }} className="text-[10px] italic block">
                                  {photoCaptions[pIdx]}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Signature Section */}
          <div style={{ borderColor: "#cbd5e1" }} className="mt-8 pt-4 border-t flex justify-end page-break-inside-avoid">
            <div className="text-center w-64">
              <p style={{ color: "#475569" }} className="text-xs">Tangerang, {dateLabel}</p>
              <p style={{ color: "#0f172a" }} className="text-xs font-bold mt-1">Guru Pengajar,</p>
              <div className="h-20 flex items-center justify-center my-1">
                {teacher.ttd ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={teacher.ttd} alt="Tanda Tangan" className="max-h-16 max-w-full object-contain" />
                ) : (
                  <span style={{ color: "#94a3b8" }} className="text-[10px] italic">( Tanda Tangan Digital )</span>
                )}
              </div>
              <p style={{ color: "#0f172a" }} className="text-xs font-bold underline">{teacher.nama}</p>
              <p style={{ color: "#475569" }} className="text-[11px] font-mono">NIP. {teacher.nip || "-"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
