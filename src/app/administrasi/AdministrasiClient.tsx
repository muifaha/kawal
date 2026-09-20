"use client";

import React, { useState } from "react";
import { Printer, BookOpen, FileText, CheckCircle, ArrowRight, Layers } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdministrasiClientProps {
  user: {
    id: string;
    nama: string;
    role: string;
  };
  classes: any[];
  mapelList: any[];
  activeTA: any;
  schoolSettings: Record<string, string>;
}

export default function AdministrasiClient({
  user,
  classes,
  mapelList,
  activeTA,
  schoolSettings,
}: AdministrasiClientProps) {
  const router = useRouter();

  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    classes.length > 0 ? classes[0].id : ""
  );
  const [selectedMapelId, setSelectedMapelId] = useState<string>(
    mapelList.length > 0 ? mapelList[0].id : ""
  );
  const [selectedSemester, setSelectedSemester] = useState<"GANJIL" | "GENAP">(
    (activeTA?.semesterAktif as "GANJIL" | "GENAP") || "GANJIL"
  );
  const [paperSize, setPaperSize] = useState<string>(
    schoolSettings.print_paper_size || "A4"
  );

  const handleOpenPrintView = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKelasId || !selectedMapelId) return;

    const url = `/administrasi/cetak?kelasId=${selectedKelasId}&mapelId=${selectedMapelId}&semester=${selectedSemester}&paper=${paperSize}`;
    window.open(url, "_blank");
  };

  const selectedKelasObj = classes.find((c) => c.id === selectedKelasId);
  const selectedMapelObj = mapelList.find((m) => m.id === selectedMapelId);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Information Header Card */}
      <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen className="w-48 h-48 text-emerald-400" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Printer className="w-3.5 h-3.5" />
            <span>Layout Siap Cetak (Print to PDF / A4 & F4)</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Buku Administrasi Guru Pembelajaran
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Sistem akan menyusun seluruh kelengkapan dokumen administrasi pembelajaran dalam 1 bundel per kelas secara otomatis. Dokumen memuat 8 bab berturut-turut sesuai standar Kurikulum Merdeka.
          </p>
        </div>
      </div>

      {/* Main Selection Form */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <Layers className="w-4 h-4 text-emerald-400" />
          Pilih Parameter Administrasi Kelas
        </h3>

        <form onSubmit={handleOpenPrintView} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pilih Kelas */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                1. Pilih Kelas Target *
              </label>
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="block w-full py-3 px-4 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                required
              >
                {classes.length === 0 ? (
                  <option value="">-- Tidak Ada Kelas Aktif --</option>
                ) : (
                  classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Kelas {cls.nama} {cls.walas ? `(Walas: ${cls.walas.nama})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Pilih Mata Pelajaran */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                2. Pilih Mata Pelajaran *
              </label>
              <select
                value={selectedMapelId}
                onChange={(e) => setSelectedMapelId(e.target.value)}
                className="block w-full py-3 px-4 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                required
              >
                {mapelList.length === 0 ? (
                  <option value="">-- Tidak Ada Mata Pelajaran --</option>
                ) : (
                  mapelList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama} ({m.kode})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pilih Semester */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                3. Semester Pembelajaran *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSemester("GANJIL")}
                  className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedSemester === "GANJIL"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  Semester Ganjil
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSemester("GENAP")}
                  className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedSemester === "GENAP"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  Semester Genap
                </button>
              </div>
            </div>

            {/* Pilih Format Kertas Print */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                4. Format Ukuran Kertas Cetak *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaperSize("A4")}
                  className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paperSize === "A4"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  Ukuran A4 (210 × 297 mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize("F4")}
                  className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paperSize === "F4"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  Ukuran F4 (215 × 330 mm)
                </button>
              </div>
            </div>
          </div>

          {/* List of 8 Sections Included */}
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Struktur Isi Buku Administrasi yang Akan Dicetak:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>1. Cover / Sampul Buku Administrasi</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>2. Halaman Tugas Pokok & Fungsi Guru (Tupoksi)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>3. Agenda Kegiatan Pembelajaran (Jurnal Mengajar)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>4. Presensi / Daftar Hadir Siswa 1 Semester</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>5. Rekapitulasi Nilai Formatif</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>6. Rekapitulasi Nilai Sumatif</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>7. Rekapitulasi Nilai Rapor & Deskripsi</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>8. Lembar Pengesahan TTD Kepsek & Guru</span>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={!selectedKelasId || !selectedMapelId}
              className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-emerald-950 px-8 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-98 cursor-pointer flex items-center gap-3 text-sm shadow-lg shadow-emerald-500/10"
            >
              <Printer className="w-4 h-4" />
              <span>Buka Halaman Web Siap Cetak (Print to PDF)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
