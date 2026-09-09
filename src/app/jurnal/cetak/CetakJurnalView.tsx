"use client";

import React, { useEffect } from "react";
import { Printer, ArrowLeft, Download, CheckCircle, FileText } from "lucide-react";
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
}

export default function CetakJurnalView({
  teacher,
  journals,
  tanggalStr,
  dateLabel,
  schoolSettings,
}: CetakJurnalViewProps) {
  const schoolName = schoolSettings.school_name || "SMA NEGERI 6 TANGERANG";
  const schoolNpsn = schoolSettings.school_npsn || "20603348";
  const schoolAddress = schoolSettings.school_address || "Jl. Garuda No. 2, Batuceper, Kota Tangerang";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 print:bg-white print:text-black">
      {/* Printable Top Bar (Hidden when printing) */}
      <div className="print:hidden sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/jadwal"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Dokumen Bukti Dukung Jurnal Mengajar
              </h1>
              <p className="text-xs text-slate-400">
                {teacher.nama} • {dateLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Print Container */}
      <div className="max-w-5xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl print:shadow-none print:p-0 print:rounded-none">
          {/* Header Kop Sekolah */}
          <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center justify-between">
            <div className="w-16 h-16 shrink-0 flex items-center justify-center font-bold text-indigo-900 text-2xl border-2 border-indigo-900 rounded-lg">
              SMAN6
            </div>
            <div className="text-center flex-1 px-4">
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900">{schoolName}</h2>
              <p className="text-xs text-slate-600 mt-0.5">{schoolAddress}</p>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">NPSN: {schoolNpsn} | JURNAL MENGAJAR HARIAN</p>
            </div>
            <div className="w-16"></div>
          </div>

          {/* Document Title */}
          <div className="text-center mb-6">
            <h3 className="text-base font-extrabold uppercase tracking-widest text-slate-900 underline underline-offset-4">
              LAPORAN RENCANA AKSI & JURNAL MENGAJAR
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-1">Hari & Tanggal: {dateLabel}</p>
          </div>

          {/* Guru Information Box */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 mb-6 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Nama Guru Pengajar</span>
              <span className="font-bold text-slate-900 text-sm">{teacher.nama}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">NIP</span>
              <span className="font-semibold text-slate-800">{teacher.nip || "-"}</span>
            </div>
            <div className="col-span-1 sm:col-span-2 border-t border-slate-200 pt-2 mt-1">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Rencana Aksi</span>
              <span className="font-semibold text-emerald-800">
                Melaksanakan pembelajaran/pembimbingan dalam mewujudkan pembelajaran yang bermutu
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
                  <div key={jurnal.id} className="border border-slate-300 rounded-xl p-4 page-break-inside-avoid">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{jurnal.mapel?.nama || "Mata Pelajaran"}</h4>
                          <p className="text-[11px] text-slate-600 font-semibold">
                            Kelas {jurnal.kelas?.nama} • Jam Ke-{jurnal.jamMulai} s/d {jurnal.jamSelesai}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg border border-emerald-300">
                        {jurnal.namaJurnal}
                      </span>
                    </div>

                    <div className="mb-3 text-xs">
                      <span className="font-bold text-slate-700 block mb-1">Uraian / Ringkasan Materi Pembelajaran:</span>
                      <p className="text-slate-800 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {jurnal.kegiatan}
                      </p>
                    </div>

                    {/* Attendance Table Summary if available */}
                    {jurnal.absensi && jurnal.absensi.length > 0 && (
                      <div className="mb-3">
                        <span className="font-bold text-slate-700 block text-xs mb-1">
                          Rekapitulasi Kehadiran Siswa ({jurnal.absensi.length} Siswa):
                        </span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700">
                                <th className="border border-slate-300 px-2 py-1 w-8 text-center">No</th>
                                <th className="border border-slate-300 px-2 py-1 w-24">NIS</th>
                                <th className="border border-slate-300 px-2 py-1">Nama Siswa</th>
                                <th className="border border-slate-300 px-2 py-1 w-20 text-center">Status</th>
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
                                    {abs.status === "A" && <span className="text-rose-700">Alpha</span>}
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
                        <span className="font-bold text-slate-700 block text-xs mb-2">Dokumentasi Foto Pembelajaran:</span>
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
