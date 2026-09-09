"use client";

import React, { useEffect } from "react";
import { Printer, ArrowLeft, FileText, Download } from "lucide-react";
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
  const schoolAddress = schoolSettings.school_address || "Jl. Pt. YKK Mahkota, Pasir Jaya, Kec. Jatiuwung, Kota Tangerang, Banten 15135";
  const schoolLogo = schoolSettings.school_logo || "/icon.png";
  const schoolHeader = schoolSettings.school_header || "";

  useEffect(() => {
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
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:text-black font-sans">
      {/* Top Action Bar (Hidden in Print / PDF Export) */}
      <div className="print:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/jadwal"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Dokumen Cetak / Bukti Dukung Jurnal Mengajar
              </h1>
              <p className="text-xs text-slate-500">
                {teacher.nama} • {dateLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-200"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Paper Document Container */}
      <div className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-xl print:shadow-none print:border-none print:p-0 print:rounded-none">
          
          {/* Header Kop Sekolah */}
          {schoolHeader ? (
            <div className="mb-6 border-b-2 border-slate-900 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={schoolHeader}
                alt="Kop Surat Sekolah"
                className="w-full h-auto max-h-36 object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center justify-between gap-4">
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
                <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 leading-tight">
                  PEMERINTAH PROVINSI BANTEN<br />
                  DINAS PENDIDIKAN DAN KEBUDAYAAN<br />
                  <span className="text-base sm:text-lg font-black text-slate-950">{schoolName}</span>
                </h2>
                <p className="text-xs text-slate-700 font-medium mt-1 leading-snug">{schoolAddress}</p>
                <p className="text-[11px] text-slate-600 font-bold tracking-wider mt-0.5">
                  NPSN: {schoolNpsn} | JURNAL MENGAJAR HARIAN GURU
                </p>
              </div>

              <div className="w-20 shrink-0 hidden sm:block"></div>
            </div>
          )}

          {/* Document Title */}
          <div className="text-center mb-6">
            <h3 className="text-base font-black uppercase tracking-widest text-slate-900 underline underline-offset-4">
              LAPORAN RENCANA AKSI & JURNAL MENGAJAR
            </h3>
            <p className="text-xs text-slate-600 font-semibold mt-1">Hari & Tanggal: {dateLabel}</p>
          </div>

          {/* Teacher Information Box */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 mb-6 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Guru Pengajar</span>
              <span className="font-bold text-slate-900 text-sm">{teacher.nama}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">NIP</span>
              <span className="font-semibold text-slate-800">{teacher.nip || "-"}</span>
            </div>
            <div className="col-span-1 sm:col-span-2 border-t border-slate-200 pt-2 mt-1">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rencana Aksi Kinerja Utama</span>
              <span className="font-bold text-emerald-800 text-xs">
                {primaryRencanaAksi}
              </span>
            </div>
          </div>

          {/* Journals Content */}
          {journals.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-xs">
              Belum ada data jurnal mengajar yang tersimpan untuk tanggal ini.
            </div>
          ) : (
            <div className="space-y-6">
              {journals.map((jurnal, index) => {
                const photos: string[] = jurnal.foto ? JSON.parse(jurnal.foto) : [];
                const photoCaptions: string[] = jurnal.fotoKeterangan ? JSON.parse(jurnal.fotoKeterangan) : [];

                return (
                  <div key={jurnal.id} className="border border-slate-300 rounded-xl p-4 page-break-inside-avoid bg-white">
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{jurnal.mapel?.nama || "Mata Pelajaran / Kegiatan"}</h4>
                          <p className="text-[11px] text-slate-600 font-semibold">
                            Kelas {jurnal.kelas?.nama} • Jam Ke-{jurnal.jamMulai} s/d {jurnal.jamSelesai}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200">
                        {jurnal.namaJurnal}
                      </span>
                    </div>

                    {jurnal.rencanaAksi && (
                      <div className="mb-3 text-xs bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/60">
                        <span className="font-bold text-emerald-900 block text-[10px] uppercase tracking-wider">Rencana Aksi Sesi Ini:</span>
                        <p className="text-emerald-800 font-medium">{jurnal.rencanaAksi}</p>
                      </div>
                    )}

                    <div className="mb-3 text-xs">
                      <span className="font-bold text-slate-800 block mb-1">Uraian / Ringkasan Materi Pembelajaran:</span>
                      <p className="text-slate-900 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                        {jurnal.kegiatan}
                      </p>
                    </div>

                    {/* Attendance Table Summary */}
                    {jurnal.absensi && jurnal.absensi.length > 0 && (
                      <div className="mb-3">
                        <span className="font-bold text-slate-800 block text-xs mb-1">
                          Rekapitulasi Kehadiran Siswa ({jurnal.absensi.length} Siswa):
                        </span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 font-bold">
                                <th className="border border-slate-300 px-2 py-1 w-8 text-center">No</th>
                                <th className="border border-slate-300 px-2 py-1 w-24">NIS</th>
                                <th className="border border-slate-300 px-2 py-1">Nama Siswa</th>
                                <th className="border border-slate-300 px-2 py-1 w-24 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jurnal.absensi.map((abs: any, idx: number) => (
                                <tr key={abs.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                  <td className="border border-slate-300 px-2 py-1 text-center font-mono">{idx + 1}</td>
                                  <td className="border border-slate-300 px-2 py-1 font-mono">{abs.siswa?.nis}</td>
                                  <td className="border border-slate-300 px-2 py-1 font-semibold">{abs.siswa?.nama}</td>
                                  <td className="border border-slate-300 px-2 py-1 text-center font-bold">
                                    {abs.status === "H" && <span className="text-emerald-700">Hadir</span>}
                                    {abs.status === "S" && <span className="text-amber-700">Sakit</span>}
                                    {abs.status === "I" && <span className="text-blue-700">Izin</span>}
                                    {abs.status === "A" && <span className="text-rose-700">Alfa</span>}
                                    {abs.status === "D" && <span className="text-purple-700">Dispensasi</span>}
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
                        <span className="font-bold text-slate-800 block text-xs mb-2">Dokumentasi Foto Pembelajaran:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {photos.map((url, pIdx) => (
                            <div key={pIdx} className="border border-slate-200 rounded-lg p-1 bg-slate-50 text-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Foto ${pIdx + 1}`}
                                className="w-full h-24 object-cover rounded-md mb-1"
                              />
                              {photoCaptions[pIdx] && (
                                <span className="text-[10px] text-slate-600 italic block">{photoCaptions[pIdx]}</span>
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
          <div className="mt-8 pt-4 border-t border-slate-300 flex justify-end page-break-inside-avoid">
            <div className="text-center w-64">
              <p className="text-xs text-slate-600">Tangerang, {dateLabel}</p>
              <p className="text-xs font-bold text-slate-900 mt-1">Guru Pengajar,</p>
              <div className="h-20 flex items-center justify-center my-1">
                {teacher.ttd ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={teacher.ttd} alt="Tanda Tangan" className="max-h-16 max-w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-slate-400 italic">( Tanda Tangan Digital )</span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-900 underline">{teacher.nama}</p>
              <p className="text-[11px] text-slate-600 font-mono">NIP. {teacher.nip || "-"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
