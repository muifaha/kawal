"use client";

import React, { useState, useEffect } from "react";
import { Printer, ArrowLeft, FileText, Settings, BookOpen } from "lucide-react";
import Link from "next/link";

interface CetakAdministrasiViewProps {
  data: {
    kelas: {
      id: string;
      nama: string;
      walasNama: string;
      walasNip: string;
    };
    mapel: {
      id: string;
      kode: string;
      nama: string;
    };
    guru: {
      id: string;
      nama: string;
      nip: string;
      ttd: string | null;
    };
    tahunAjaran: {
      id: string;
      nama: string;
      semester: "GANJIL" | "GENAP";
    };
    schoolSettings: Record<string, string>;
    journals: any[];
    students: any[];
    formatifPenilaian: any[];
    sumatifPenilaian: any[];
    tujuanPembelajaran: any[];
    attendanceMatrix: any[];
    formativeMatrix: any[];
    summativeMatrix: any[];
    reportSummary: any[];
  };
  initialPaperSize?: "A4" | "F4";
}

export default function CetakAdministrasiView({
  data,
  initialPaperSize = "A4",
}: CetakAdministrasiViewProps) {
  const [paperSize, setPaperSize] = useState<"A4" | "F4">(initialPaperSize);

  const schoolName = data.schoolSettings.school_name || "SMA NEGERI 6 TANGERANG";
  const schoolCity = data.schoolSettings.school_city || "Tangerang";
  const schoolAddress =
    data.schoolSettings.school_address ||
    "Jl. Pt. YKK Mahkota, Pasir Jaya, Kec. Jatiuwung, Kota Tangerang, Banten 15135";
  const schoolLogo = data.schoolSettings.school_logo || "/icon.png";
  const provinceLogo = data.schoolSettings.province_logo || "";
  const kepsekName = data.schoolSettings.kepsek_name || "Kepala Sekolah, M.Pd.";
  const kepsekNip = data.schoolSettings.kepsek_nip || "-";

  const isAbsensiLandscape = data.journals.length > 3;
  const isFormatifLandscape = data.formatifPenilaian.length > 3;
  const isSumatifLandscape = data.sumatifPenilaian.length > 3;

  // Split Formatif assessments into chunks of 10 for print readability & zero truncation
  const MAX_FORMATIF_PER_TABLE = 10;
  const formatifChunks: any[][] = [];
  if (data.formatifPenilaian && data.formatifPenilaian.length > 0) {
    for (let i = 0; i < data.formatifPenilaian.length; i += MAX_FORMATIF_PER_TABLE) {
      formatifChunks.push(data.formatifPenilaian.slice(i, i + MAX_FORMATIF_PER_TABLE));
    }
  } else {
    formatifChunks.push([]);
  }

  // Split Journals (Daftar Hadir) into chunks of 10 for print readability & zero truncation
  const MAX_JOURNALS_PER_TABLE = 10;
  const journalChunks: any[][] = [];
  if (data.journals && data.journals.length > 0) {
    for (let i = 0; i < data.journals.length; i += MAX_JOURNALS_PER_TABLE) {
      journalChunks.push(data.journals.slice(i, i + MAX_JOURNALS_PER_TABLE));
    }
  } else {
    journalChunks.push([]);
  }

  useEffect(() => {
    // Force light mode for Cetak Administrasi page
    const htmlEl = document.documentElement;
    const isLightActive = htmlEl.classList.contains("light");

    // Remove 'light' class because globals.css inverts slate variables when .light is active
    htmlEl.classList.remove("light");
    document.body.style.backgroundColor = "#f1f5f9";
    document.body.style.color = "#0f172a";

    return () => {
      if (isLightActive) {
        htmlEl.classList.add("light");
      }
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="cetak-administrasi-wrapper min-h-screen bg-[#f1f5f9] text-[#0f172a] font-sans print:bg-white print:p-0">
      {/* Dynamic CSS for Print Page Sizes & Light Mode Enforcer */}
      <style jsx global>{`
        /* Reset slate CSS variables for true light mode on cetak page */
        .cetak-administrasi-wrapper,
        body {
          --slate-50: #f8fafc !important;
          --slate-100: #f1f5f9 !important;
          --slate-200: #e2e8f0 !important;
          --slate-300: #cbd5e1 !important;
          --slate-400: #94a3b8 !important;
          --slate-500: #64748b !important;
          --slate-600: #475569 !important;
          --slate-700: #334155 !important;
          --slate-800: #1e293b !important;
          --slate-900: #0f172a !important;
          --slate-950: #020617 !important;
          --text-white: #ffffff !important;
          --background: #f8fafc !important;
          --foreground: #0f172a !important;
        }

        .cetak-administrasi-wrapper .text-white {
          color: #ffffff !important;
        }

        @media print {
          @page {
            size: ${paperSize === "F4" ? "215mm 330mm" : "A4 portrait"};
            margin: 10mm 12mm 10mm 12mm;
          }
          @page landscape-section {
            size: ${paperSize === "F4" ? "330mm 215mm" : "A4 landscape"};
            margin: 8mm 10mm 8mm 10mm;
          }
          .print-landscape {
            page: landscape-section;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .print-landscape table {
            width: 100% !important;
            table-layout: auto !important;
          }
          .print-landscape td, .print-landscape th {
            padding: 3px 4px !important;
          }
          body, .cetak-administrasi-wrapper, .print-container {
            background-color: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Screen Toolbar (Hidden when printing / export PDF) */}
      <div className="no-print sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/administrasi"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors text-slate-200"
              title="Kembali ke Menu Administrasi"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm sm:text-base font-bold flex items-center gap-2 text-white">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Buku Administrasi Guru — Kelas {data.kelas.nama}
              </h1>
              <p className="text-xs text-slate-400">
                {data.mapel.nama} • Semester {data.tahunAjaran.semester} • TP {data.tahunAjaran.nama}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Paper Size Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setPaperSize("A4")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  paperSize === "A4"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                A4 (210×297 mm)
              </button>
              <button
                onClick={() => setPaperSize("F4")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  paperSize === "F4"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                F4 / Folio (215×330 mm)
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Document Paper Container */}
      <div className="max-w-5xl mx-auto my-6 p-4 sm:p-10 print:my-0 print:p-0 print:max-w-none">
        <div className="bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-2xl p-8 sm:p-14 print:shadow-none print:border-none print:p-0 print:rounded-none">

          {/* ========================================================== */}
          {/* PAGE 1: COVER / SAMPUL BUKU ADMINISTRASI GURU             */}
          {/* ========================================================== */}
          <div className="min-h-[90vh] flex flex-col justify-between border-4 border-double border-slate-800 p-8 sm:p-12 text-center page-break relative overflow-hidden">
            
            {/* Header Logos */}
            <div className="flex items-center justify-between mb-8 px-4">
              <div className="w-24 h-24 flex items-center justify-center">
                {provinceLogo ? (
                  <img src={provinceLogo} alt="Logo Provinsi" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 italic">
                    Logo Prov
                  </div>
                )}
              </div>
              <div className="w-24 h-24 flex items-center justify-center">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="Logo Sekolah" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 italic">
                    Logo Sekolah
                  </div>
                )}
              </div>
            </div>

            {/* Main Cover Titles */}
            <div className="space-y-4 my-auto py-8">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-slate-900 leading-tight">
                BUKU ADMINISTRASI GURU
              </h1>
              <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-wide text-emerald-800">
                MATA PELAJARAN: {data.mapel.nama}
              </h2>
              <div className="w-32 h-1.5 bg-slate-900 mx-auto rounded-full my-4"></div>
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                KURIKULUM MERDEKA
              </p>
            </div>

            {/* Detailed Metadata Box */}
            <div className="max-w-md mx-auto w-full border-2 border-slate-800 rounded-xl p-6 text-left space-y-3 bg-slate-50 my-6 text-xs sm:text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-600 uppercase">Mata Pelajaran</span>
                <span className="col-span-2 font-black text-slate-900">: {data.mapel.nama} ({data.mapel.kode})</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-600 uppercase">Kelas / Semester</span>
                <span className="col-span-2 font-black text-slate-900">: Kelas {data.kelas.nama} / {data.tahunAjaran.semester}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-600 uppercase">Tahun Pelajaran</span>
                <span className="col-span-2 font-black text-slate-900">: {data.tahunAjaran.nama}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-600 uppercase">Guru Pengajar</span>
                <span className="col-span-2 font-black text-slate-900">: {data.guru.nama}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-slate-600 uppercase">NIP</span>
                <span className="col-span-2 font-bold text-slate-800">: {data.guru.nip}</span>
              </div>
            </div>

            {/* Bottom School Identity Footer */}
            <div className="mt-8 pt-4">
              <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
                {schoolName}
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-lg mx-auto font-medium">
                {schoolAddress}
              </p>
              <p className="text-xs font-bold text-slate-800 mt-2 uppercase tracking-widest">
                TAHUN AJARAN {data.tahunAjaran.nama}
              </p>
            </div>
          </div>


          {/* ========================================================== */}
          {/* PAGE 2: HALAMAN TUGA SO POKOK & FUNGSI GURU (TUPOKSI)       */}
          {/* ========================================================== */}
          <div className="py-6 page-break">
            <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                TUGAS POKOK DAN FUNGSI GURU MATA PELAJARAN
              </h2>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                Berdasarkan Standar Pelaksanaan Kurikulum Merdeka
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
              <p className="text-justify font-medium">
                Sesuai dengan Peraturan Menteri Pendidikan dan Kebudayaan serta pedoman implementasi Kurikulum Merdeka, Guru Mata Pelajaran bertanggung jawab kepada Kepala Sekolah dalam melaksanakan kegiatan proses belajar mengajar secara efektif dan efisien.
              </p>

              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-900 uppercase border-b border-slate-200 pb-1">
                  A. Rincian Tugas Utama Guru Mata Pelajaran:
                </h3>
                <ol className="list-decimal pl-5 space-y-2 font-medium">
                  <li>
                    <strong>Menyusun Perencanaan Pembelajaran:</strong> Menyusun Alur Tujuan Pembelajaran (ATP), Modul Ajar / Rencana Pelaksanaan Pembelajaran (RPP), serta instrumen asesmen pembelajaran.
                  </li>
                  <li>
                    <strong>Melaksanakan Kegiatan Pembelajaran (KBM):</strong> Mengondisikan lingkungan belajar yang interaktif, berpusat pada siswa, memfasilitasi penguatan karakter Profil Pelajar Pancasila.
                  </li>
                  <li>
                    <strong>Melakukan Evaluasi dan Asesmen:</strong> Mengatur dan merencanakan Asesmen Formatif (awal & proses) serta Asesmen Sumatif (tengah & akhir semester) secara objektif dan transparan.
                  </li>
                  <li>
                    <strong>Mengisi Agenda Jurnal Mengajar & Presensi:</strong> Mencatat seluruh aktivitas tatap muka pembelajaran, kompetensi dasar / TP yang dibahas, serta tingkat kehadiran peserta didik pada setiap pertemuan.
                  </li>
                  <li>
                    <strong>Melaksanakan Program Remedial dan Pengayaan:</strong> Memberikan intervensi khusus kepada peserta didik yang belum mencapai Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) serta memberikan tantangan bagi yang berprestasi.
                  </li>
                  <li>
                    <strong>Pelaporan dan Pembimbingan:</strong> Mengolah nilai hasil belajar peserta didik serta melaporkan capaian perkembangan belajar secara berkala kepada Wali Kelas dan Orang Tua/Wali Siswa.
                  </li>
                </ol>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-slate-900 uppercase border-b border-slate-200 pb-1">
                  B. Hak dan Kewajiban Akademik Guru:
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 font-medium">
                  <li>Memperoleh kebebasan akademik dalam memilih strategi, media, dan metode pembelajaran yang relevan.</li>
                  <li>Menjaga kerahasiaan dan integritas data nilai serta rekam medis/perilaku peserta didik.</li>
                  <li>Mengikuti kegiatan pengembangan profesi secara berkelanjutan (KKG/MGMP/Pelatihan Mandiri).</li>
                </ul>
              </div>
            </div>
          </div>


          {/* ========================================================== */}
          {/* PAGE 3: AGENDA KEGIATAN PEMBELAJARAN (JURNAL MENGAJAR)     */}
          {/* ========================================================== */}
          <div className="py-6 page-break">
            <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                AGENDA KEGIATAN PEMBELAJARAN (JURNAL MENGAJAR)
              </h2>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                Kelas: {data.kelas.nama} • Mata Pelajaran: {data.mapel.nama} • Semester {data.tahunAjaran.semester} • Tahun Pelajaran {data.tahunAjaran.nama}
              </p>
            </div>

            {data.journals.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl text-xs text-slate-500 italic">
                Belum ada rekaman jurnal mengajar tersimpan untuk kelas dan semester ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-slate-800">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                      <th className="border border-slate-800 px-2 py-2 w-8">No</th>
                      <th className="border border-slate-800 px-2 py-2 w-24">Tanggal</th>
                      <th className="border border-slate-800 px-2 py-2 w-16">Jam Ke-</th>
                      <th className="border border-slate-800 px-3 py-2 w-1/3">TP / Materi Pembelajaran</th>
                      <th className="border border-slate-800 px-3 py-2">Pencapaian / Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.journals.map((j, idx) => {
                      const dateFormatted = new Date(j.tanggal).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });

                      return (
                        <tr key={j.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="border border-slate-800 px-2 py-2 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-800 px-2 py-2 text-center font-mono">{dateFormatted}</td>
                          <td className="border border-slate-800 px-2 py-2 text-center font-mono">{j.jamMulai}-{j.jamSelesai}</td>
                          <td className="border border-slate-800 px-3 py-2 font-semibold text-slate-900">{j.namaJurnal}</td>
                          <td className="border border-slate-800 px-3 py-2 whitespace-pre-line text-slate-700">{j.kegiatan}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>


          {/* ========================================================== */}
          {/* PAGE 4: DAFTAR HADIR SISWA 1 SEMESTER (PRESENSI)          */}
          {/* ========================================================== */}
          <div className={`py-6 page-break ${isAbsensiLandscape ? "print-landscape" : ""}`}>
            <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                DAFTAR HADIR SISWA (PRESENSI 1 SEMESTER)
              </h2>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                Kelas: {data.kelas.nama} • Mata Pelajaran: {data.mapel.nama} • Semester {data.tahunAjaran.semester} • Tahun Pelajaran {data.tahunAjaran.nama}
              </p>
            </div>

            {data.journals.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl text-xs text-slate-500 italic">
                Belum ada rekaman jurnal mengajar / presensi tersimpan untuk kelas dan semester ini.
              </div>
            ) : (
              <div className="space-y-6">
                {journalChunks.map((chunk, chunkIdx) => {
                  const isLastChunk = chunkIdx === journalChunks.length - 1;
                  const startNum = chunkIdx * MAX_JOURNALS_PER_TABLE + 1;
                  const endNum = startNum + chunk.length - 1;

                  return (
                    <div key={`journal-chunk-${chunkIdx}`} className="space-y-2">
                      {journalChunks.length > 1 && (
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
                          <span>Bagian {chunkIdx + 1}: Pertemuan P{startNum} s/d P{endNum}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({chunk.length} Pertemuan)</span>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse border border-slate-800">
                          <thead>
                            <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                              <th className="border border-slate-800 px-2 py-1.5 w-8" rowSpan={2}>No</th>
                              <th className="border border-slate-800 px-2 py-1.5 w-20" rowSpan={2}>NIS</th>
                              <th className="border border-slate-800 px-3 py-1.5 min-w-[140px]" rowSpan={2}>Nama Siswa</th>
                              <th className="border border-slate-800 px-1 py-1" colSpan={chunk.length}>
                                Pertemuan Ke-
                              </th>
                              {isLastChunk && (
                                <th className="border border-slate-800 px-1 py-1" colSpan={4}>Rekapitulasi</th>
                              )}
                            </tr>
                            <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                              {chunk.map((j, i) => (
                                <th key={j.id} className="border border-slate-800 px-1 py-1 w-7 font-mono text-[10px]" title={new Date(j.tanggal).toLocaleDateString("id-ID")}>
                                  P{chunkIdx * MAX_JOURNALS_PER_TABLE + i + 1}
                                </th>
                              ))}
                              {isLastChunk && (
                                <>
                                  <th className="border border-slate-800 px-1 py-1 w-7 bg-amber-50 text-amber-900">S</th>
                                  <th className="border border-slate-800 px-1 py-1 w-7 bg-blue-50 text-blue-900">I</th>
                                  <th className="border border-slate-800 px-1 py-1 w-7 bg-rose-50 text-rose-900">A</th>
                                  <th className="border border-slate-800 px-1 py-1 w-7 bg-emerald-50 text-emerald-900">H</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {data.attendanceMatrix.map((item, idx) => (
                              <tr key={item.siswaId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                <td className="border border-slate-800 px-2 py-1 text-center font-mono">{idx + 1}</td>
                                <td className="border border-slate-800 px-2 py-1 text-center font-mono">{item.nis}</td>
                                <td className="border border-slate-800 px-3 py-1 font-semibold text-slate-900">{item.nama}</td>
                                {chunk.map((j) => {
                                  const st = item.records[j.id] || "H";
                                  let colorClass = "text-slate-800";
                                  if (st === "S") colorClass = "text-amber-700 font-bold";
                                  if (st === "I") colorClass = "text-blue-700 font-bold";
                                  if (st === "A") colorClass = "text-rose-700 font-black";
                                  return (
                                    <td key={j.id} className={`border border-slate-800 px-1 py-1 text-center font-mono ${colorClass}`}>
                                      {st}
                                    </td>
                                  );
                                })}
                                {isLastChunk && (
                                  <>
                                    <td className="border border-slate-800 px-1 py-1 text-center font-bold text-amber-700 bg-amber-50/50">{item.countS}</td>
                                    <td className="border border-slate-800 px-1 py-1 text-center font-bold text-blue-700 bg-blue-50/50">{item.countI}</td>
                                    <td className="border border-slate-800 px-1 py-1 text-center font-bold text-rose-700 bg-rose-50/50">{item.countA}</td>
                                    <td className="border border-slate-800 px-1 py-1 text-center font-bold text-emerald-700 bg-emerald-50/50">{item.countH}</td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


          {/* ========================================================== */}
          {/* PAGE 5: REKAPITULASI NILAI FORMATIF                        */}
          {/* ========================================================== */}
          <div className={`py-6 page-break ${isFormatifLandscape ? "print-landscape" : ""}`}>
            <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                REKAPITULASI NILAI FORMATIF
              </h2>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                Kelas: {data.kelas.nama} • Mata Pelajaran: {data.mapel.nama} • Semester {data.tahunAjaran.semester} • Tahun Pelajaran {data.tahunAjaran.nama}
              </p>
            </div>

            {data.formatifPenilaian.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl text-xs text-slate-500 italic">
                Belum ada data penilaian formatif yang diinput untuk kelas dan mata pelajaran ini.
              </div>
            ) : (
              <div className="space-y-6">
                {formatifChunks.map((chunk, chunkIdx) => {
                  const isLastChunk = chunkIdx === formatifChunks.length - 1;
                  const startNum = chunkIdx * MAX_FORMATIF_PER_TABLE + 1;
                  const endNum = startNum + chunk.length - 1;

                  return (
                    <div key={`formatif-chunk-${chunkIdx}`} className="space-y-2">
                      {formatifChunks.length > 1 && (
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
                          <span>Bagian {chunkIdx + 1}: Penilaian Formatif F{startNum} s/d F{endNum}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({chunk.length} Kolom)</span>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse border border-slate-800">
                          <thead>
                            <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                              <th className="border border-slate-800 px-2 py-1.5 w-8">No</th>
                              <th className="border border-slate-800 px-2 py-1.5 w-20">NIS</th>
                              <th className="border border-slate-800 px-3 py-1.5 min-w-[140px]">Nama Siswa</th>
                              {chunk.map((p, pIdx) => {
                                const realIndex = chunkIdx * MAX_FORMATIF_PER_TABLE + pIdx + 1;
                                const label = p.tpCode && p.tpCode !== "-" ? p.tpCode : `F${realIndex}`;
                                return (
                                  <th
                                    key={p.id}
                                    className="border border-slate-800 px-1 py-1.5 font-mono font-bold text-[10px] text-center whitespace-nowrap min-w-[32px]"
                                    title={p.namaPenilaian}
                                  >
                                    {label}
                                  </th>
                                );
                              })}
                              {isLastChunk && (
                                <th className="border border-slate-800 px-2 py-1.5 min-w-[70px] bg-emerald-100 text-emerald-950 font-black text-center text-[10px]">
                                  Nilai Akhir Formatif
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {data.formativeMatrix.map((item, idx) => (
                              <tr key={item.siswaId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                <td className="border border-slate-800 px-2 py-1 text-center font-mono">{idx + 1}</td>
                                <td className="border border-slate-800 px-2 py-1 text-center font-mono">{item.nis}</td>
                                <td className="border border-slate-800 px-3 py-1 font-semibold text-slate-900">{item.nama}</td>
                                {chunk.map((p) => {
                                  const val = item.grades[p.id];
                                  return (
                                    <td key={p.id} className="border border-slate-800 px-2 py-1 text-center font-mono">
                                      {val !== null && val !== undefined ? val : "-"}
                                    </td>
                                  );
                                })}
                                {isLastChunk && (
                                  <td className="border border-slate-800 px-2 py-1 text-center font-bold text-emerald-800 bg-emerald-50">
                                    {item.average !== null ? item.average : "-"}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Legend Keterangan Judul Penilaian Formatif */}
                <div className="mt-4 p-3 bg-slate-50 border border-slate-300 rounded-lg text-[10px] space-y-1 avoid-break">
                  <div className="font-bold text-slate-900 uppercase tracking-wider">Keterangan Judul Penilaian Formatif:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                    {data.formatifPenilaian.map((p, pIdx) => {
                      const label = p.tpCode && p.tpCode !== "-" ? p.tpCode : `F${pIdx + 1}`;
                      return (
                        <div key={`legend-${p.id}`} className="truncate text-slate-700">
                          <span className="font-mono font-bold text-slate-900">{label}:</span> {p.namaPenilaian}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* ========================================================== */}
          {/* PAGE 6: REKAPITULASI NILAI SUMATIF                        */}
          {/* ========================================================== */}
          <div className={`py-6 page-break ${isSumatifLandscape ? "print-landscape" : ""}`}>
            <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                REKAPITULASI NILAI SUMATIF
              </h2>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                Kelas: {data.kelas.nama} • Mata Pelajaran: {data.mapel.nama} • Semester {data.tahunAjaran.semester} • Tahun Pelajaran {data.tahunAjaran.nama}
              </p>
            </div>

            {data.sumatifPenilaian.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl text-xs text-slate-500 italic">
                Belum ada data penilaian sumatif yang diinput untuk kelas dan mata pelajaran ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-800">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                      <th className="border border-slate-800 px-2 py-1.5 w-8">No</th>
                      <th className="border border-slate-800 px-2 py-1.5 w-20">NIS</th>
                      <th className="border border-slate-800 px-3 py-1.5 min-w-[140px]">Nama Siswa</th>
                      {data.sumatifPenilaian.map((p, pIdx) => (
                        <th key={p.id} className="border border-slate-800 px-2 py-1.5 font-semibold text-[10px]">
                          <div>{p.namaPenilaian}</div>
                          <div className="text-[9px] text-slate-500 font-normal">{p.tpCode !== "-" ? p.tpCode : `S${pIdx + 1}`}</div>
                        </th>
                      ))}
                      <th className="border border-slate-800 px-2 py-1.5 min-w-[70px] bg-blue-100 text-blue-950 font-black text-center text-[10px]">
                        Nilai Akhir Sumatif
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summativeMatrix.map((item, idx) => (
                      <tr key={item.siswaId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="border border-slate-800 px-2 py-1 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-800 px-2 py-1 text-center font-mono">{item.nis}</td>
                        <td className="border border-slate-800 px-3 py-1 font-semibold text-slate-900">{item.nama}</td>
                        {data.sumatifPenilaian.map((p) => {
                          const val = item.grades[p.id];
                          return (
                            <td key={p.id} className="border border-slate-800 px-2 py-1 text-center font-mono">
                              {val !== null && val !== undefined ? val : "-"}
                            </td>
                          );
                        })}
                        <td className="border border-slate-800 px-2 py-1 text-center font-bold text-blue-800 bg-blue-50">
                          {item.average !== null ? item.average : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>


          {/* ========================================================== */}
          {/* PAGE 7: REKAPITULASI NILAI RAPOR & CAPAIAN KOMPETENSI      */}
          {/* ========================================================== */}
          <div className="py-6 page-break print-landscape">
            <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                REKAPITULASI NILAI RAPOR & CAPAIAN KOMPETENSI
              </h2>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                Kelas: {data.kelas.nama} • Mata Pelajaran: {data.mapel.nama} • Semester {data.tahunAjaran.semester} • Tahun Pelajaran {data.tahunAjaran.nama}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse border border-slate-800">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                    <th className="border border-slate-800 px-2 py-1.5 w-8">No</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-20">NIS</th>
                    <th className="border border-slate-800 px-3 py-1.5 min-w-[140px]">Nama Siswa</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-24 text-emerald-900 font-bold text-[10px]">Nilai Akhir Formatif</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-24 text-blue-900 font-bold text-[10px]">Nilai Akhir Sumatif</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-20 bg-slate-200 text-slate-950 font-black">Nilai Rapor</th>
                    <th className="border border-slate-800 px-3 py-1.5 min-w-[200px]">Capaian Kompetensi / Deskripsi Rapor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reportSummary.map((item, idx) => (
                    <tr key={item.siswaId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="border border-slate-800 px-2 py-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-800 px-2 py-1 text-center font-mono">{item.nis}</td>
                      <td className="border border-slate-800 px-3 py-1 font-semibold text-slate-900">{item.nama}</td>
                      <td className="border border-slate-800 px-2 py-1 text-center font-mono font-bold text-emerald-700">
                        {item.naFormatif !== null ? item.naFormatif : "-"}
                      </td>
                      <td className="border border-slate-800 px-2 py-1 text-center font-mono font-bold text-blue-700">
                        {item.naSumatif !== null ? item.naSumatif : "-"}
                      </td>
                      <td className="border border-slate-800 px-2 py-1 text-center font-mono font-black text-slate-900 text-xs bg-slate-100">
                        {item.finalGrade !== null ? item.finalGrade : "-"}
                      </td>
                      <td className="border border-slate-800 px-3 py-1 text-slate-700 text-[10px] font-medium leading-tight">
                        {item.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


          {/* ========================================================== */}
          {/* PAGE 8: LEMBAR PENGESAHAN TTD KEPSEK & GURU MATA PELAJARAN  */}
          {/* ========================================================== */}
          <div className="py-8 avoid-break">
            <div className="border-2 border-slate-800 p-6 sm:p-10 rounded-xl space-y-6">
              <div className="border-b-2 border-slate-800 pb-3 text-center">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                  LEMBAR PENGESAHAN DOKUMEN ADMINISTRASI GURU
                </h2>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                  Tahun Pelajaran {data.tahunAjaran.nama} — Semester {data.tahunAjaran.semester}
                </p>
              </div>

              <div className="text-xs text-slate-800 leading-relaxed text-justify space-y-2 font-medium">
                <p>
                  Dokumen Buku Administrasi Guru Mata Pelajaran <strong>{data.mapel.nama}</strong> untuk Kelas <strong>{data.kelas.nama}</strong> ini telah diverifikasi dan disahkan sebagai bukti fisik pertanggungjawaban akademis dan kinerja pembelajaran profesional.
                </p>
                <p>
                  Demikian lembar pengesahan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
                </p>
              </div>

              <div className="pt-8">
                <div className="flex justify-between items-start text-xs font-semibold">
                  {/* Left Signature: Kepsek */}
                  <div className="text-center w-64">
                    <p className="text-slate-600">Mengetahui,</p>
                    <p className="font-bold text-slate-900">Kepala {schoolName}</p>
                    <div className="h-24 flex items-center justify-center my-2">
                      <span className="text-[10px] text-slate-400 italic">( Tanda Tangan & Stempel )</span>
                    </div>
                    <p className="font-bold underline text-slate-900 uppercase">{kepsekName}</p>
                    <p className="text-slate-600 font-mono text-[11px]">NIP. {kepsekNip}</p>
                  </div>

                  {/* Right Signature: Guru */}
                  <div className="text-center w-64">
                    <p className="text-slate-600">{schoolCity}, {todayStr}</p>
                    <p className="font-bold text-slate-900">Guru Mata Pelajaran,</p>
                    <div className="h-24 flex items-center justify-center my-2">
                      {data.guru.ttd ? (
                        <img src={data.guru.ttd} alt="Tanda Tangan Guru" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">( Tanda Tangan Digital )</span>
                      )}
                    </div>
                    <p className="font-bold underline text-slate-900 uppercase">{data.guru.nama}</p>
                    <p className="text-slate-600 font-mono text-[11px]">NIP. {data.guru.nip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
