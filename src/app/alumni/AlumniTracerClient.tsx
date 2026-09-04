"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Briefcase,
  Building2,
  BookOpen,
  Search,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  School,
  Clock,
  HelpCircle,
  Heart,
  Calendar,
  AlertCircle,
  Loader2,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import { verifyAlumniAction, submitTracerStudyAction } from "@/app/actions/alumni";

interface SiswaVerifyData {
  id: string;
  nis: string;
  nisn: string;
  nama: string;
  status: string;
  kelasTerakhir: string;
  tanggalLahir?: string | null;
}

export default function AlumniTracerClient() {
  const [step, setStep] = useState<"verify" | "form" | "success">("verify");

  // Step 1: Verification State
  const [identifierInput, setIdentifierInput] = useState("");
  const [tanggalLahirInput, setTanggalLahirInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifiedSiswa, setVerifiedSiswa] = useState<SiswaVerifyData | null>(null);

  // Step 2: Main Status Choice
  const [statusUtama, setStatusUtama] = useState<string>("KULIAH");

  // Status Details: 1. BEKERJA
  const [namaPerusahaan, setNamaPerusahaan] = useState("");
  const [posisiJabatan, setPosisiJabatan] = useState("");
  const [bidangPekerjaan, setBidangPekerjaan] = useState("");
  const [waktuTungguKerja, setWaktuTungguKerja] = useState("< 1 bulan");
  const [kisaranPendapatan, setKisaranPendapatan] = useState("");

  // Status Details: 2. KULIAH / KEDINASAN
  const [namaPerguruanTinggi, setNamaPerguruanTinggi] = useState("");
  const [jenjangPendidikan, setJenjangPendidikan] = useState("S1 (Sarjana)");
  const [fakultasProdi, setFakultasProdi] = useState("");
  const [jalurMasuk, setJalurMasuk] = useState("SNBP (Seleksi Nasional Berdasarkan Prestasi)");
  const [statusPembiayaan, setStatusPembiayaan] = useState("Mandiri");

  // Autocomplete PDDIKTI States
  const [ptQuery, setPtQuery] = useState("");
  const [ptResults, setPtResults] = useState<string[]>([]);
  const [isSearchingPt, setIsSearchingPt] = useState(false);
  const [showPtDropdown, setShowPtDropdown] = useState(false);

  const [prodiQuery, setProdiQuery] = useState("");
  const [prodiResults, setProdiResults] = useState<string[]>([]);
  const [isSearchingProdi, setIsSearchingProdi] = useState(false);
  const [showProdiDropdown, setShowProdiDropdown] = useState(false);

  // Status Details: 3. BERWIRAUSAHA
  const [namaUsaha, setNamaUsaha] = useState("");
  const [bidangUsaha, setBidangUsaha] = useState("");
  const [statusKepemilikan, setStatusKepemilikan] = useState("Usaha Sendiri");
  const [jumlahKaryawan, setJumlahKaryawan] = useState("");

  // Status Details: 4. PELATIHAN / KURSUS / BLK
  const [namaLembaga, setNamaLembaga] = useState("");
  const [bidangKeahlian, setBidangKeahlian] = useState("");
  const [durasiProgram, setDurasiProgram] = useState("< 3 bulan");
  const [rencanaPasca, setRencanaPasca] = useState("Langsung mencari kerja");

  // Status Details: 5. SEDANG MENCARI PEKERJAAN
  const [lamaMencariKerja, setLamaMencariKerja] = useState("< 1 bulan");
  const [saluranPencarian, setSaluranPencarian] = useState("Portal Kerja (Jobstreet/LinkedIn)");
  const [kendalaUtama, setKendalaUtama] = useState("");
  const [bantuanSekolah, setBantuanSekolah] = useState("");

  // Status Details: 6. MENGURUS KELUARGA / ALASAN PRIBADI
  const [alasanUtamaKeluarga, setAlasanUtamaKeluarga] = useState("");
  const [rencanaMasaDepan, setRencanaMasaDepan] = useState("Berencana bekerja nanti");

  // Status Details: 7. GAP YEAR / PERSIAPAN SELEKSI
  const [targetSeleksi, setTargetSeleksi] = useState("SNBT (Seleksi Nasional Berdasarkan Tes)");
  const [aktivitasPengisi, setAktivitasPengisi] = useState("");

  // Evaluasi & Umpan Balik
  const [relevansiKurikulum, setRelevansiKurikulum] = useState("RELEVAN");
  const [penilaianFasilitas, setPenilaianFasilitas] = useState("BAIK");
  const [penilaianBKK, setPenilaianBKK] = useState("BAIK");
  const [saranSekolah, setSaranSekolah] = useState("");

  // Form Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Debounced Search for PDDIKTI PT
  useEffect(() => {
    if (!ptQuery || ptQuery.trim().length < 2) {
      setPtResults([]);
      setIsSearchingPt(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPt(true);
      try {
        const res = await fetch(`/api/pddikti/search?type=pt&q=${encodeURIComponent(ptQuery)}`);
        const data = await res.json();
        setPtResults(data.results || []);
      } catch (err) {
        setPtResults([]);
      } finally {
        setIsSearchingPt(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [ptQuery]);

  // Debounced Search for PDDIKTI Prodi
  useEffect(() => {
    if (!prodiQuery || prodiQuery.trim().length < 2) {
      setProdiResults([]);
      setIsSearchingProdi(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingProdi(true);
      try {
        const res = await fetch(`/api/pddikti/search?type=prodi&q=${encodeURIComponent(prodiQuery)}`);
        const data = await res.json();
        setProdiResults(data.results || []);
      } catch (err) {
        setProdiResults([]);
      } finally {
        setIsSearchingProdi(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [prodiQuery]);

  // Handle Alumni Verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim()) {
      setVerifyError("Silakan masukkan NISN atau NIS Anda.");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await verifyAlumniAction({
        identifier: identifierInput.trim(),
        tanggalLahir: tanggalLahirInput || undefined,
      });

      if (res.error || !res.siswa) {
        setVerifyError(res.error || "Siswa tidak ditemukan.");
      } else {
        setVerifiedSiswa(res.siswa);

        // Pre-fill form if existing tracer study exists
        if (res.existingTracer) {
          const t = res.existingTracer;
          setStatusUtama(t.statusUtama || "KULIAH");
          setNamaPerusahaan(t.namaPerusahaan || "");
          setPosisiJabatan(t.posisiJabatan || "");
          setBidangPekerjaan(t.bidangPekerjaan || "");
          setWaktuTungguKerja(t.waktuTungguKerja || "< 1 bulan");
          setKisaranPendapatan(t.kisaranPendapatan || "");

          setNamaPerguruanTinggi(t.namaPerguruanTinggi || "");
          setPtQuery(t.namaPerguruanTinggi || "");
          setJenjangPendidikan(t.jenjangPendidikan || "S1 (Sarjana)");
          setFakultasProdi(t.fakultasProdi || "");
          setProdiQuery(t.fakultasProdi || "");
          setJalurMasuk(t.jalurMasuk || "SNBP (Seleksi Nasional Berdasarkan Prestasi)");
          setStatusPembiayaan(t.statusPembiayaan || "Mandiri");

          setNamaUsaha(t.namaUsaha || "");
          setBidangUsaha(t.bidangUsaha || "");
          setStatusKepemilikan(t.statusKepemilikan || "Usaha Sendiri");
          setJumlahKaryawan(t.jumlahKaryawan || "");

          setNamaLembaga(t.namaLembaga || "");
          setBidangKeahlian(t.bidangKeahlian || "");
          setDurasiProgram(t.durasiProgram || "< 3 bulan");
          setRencanaPasca(t.rencanaPasca || "Langsung mencari kerja");

          setLamaMencariKerja(t.lamaMencariKerja || "< 1 bulan");
          setSaluranPencarian(t.saluranPencarian || "Portal Kerja (Jobstreet/LinkedIn)");
          setKendalaUtama(t.kendalaUtama || "");
          setBantuanSekolah(t.bantuanSekolah || "");

          setAlasanUtamaKeluarga(t.alasanUtamaKeluarga || "");
          setRencanaMasaDepan(t.rencanaMasaDepan || "Berencana bekerja nanti");

          setTargetSeleksi(t.targetSeleksi || "SNBT (Seleksi Nasional Berdasarkan Tes)");
          setAktivitasPengisi(t.aktivitasPengisi || "");

          setRelevansiKurikulum(t.relevansiKurikulum || "RELEVAN");
          setPenilaianFasilitas(t.penilaianFasilitas || "BAIK");
          setPenilaianBKK(t.penilaianBKK || "BAIK");
          setSaranSekolah(t.saranSekolah || "");
        }

        setStep("form");
      }
    } catch (err: any) {
      setVerifyError(`Gagal memverifikasi: ${err.message || err}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Tracer Study Submission
  const handleSubmitTracer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedSiswa) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        siswaId: verifiedSiswa.id,
        statusUtama,
        // Conditional data
        namaPerusahaan: statusUtama === "BEKERJA" ? namaPerusahaan : undefined,
        posisiJabatan: statusUtama === "BEKERJA" ? posisiJabatan : undefined,
        bidangPekerjaan: statusUtama === "BEKERJA" ? bidangPekerjaan : undefined,
        waktuTungguKerja: statusUtama === "BEKERJA" ? waktuTungguKerja : undefined,
        kisaranPendapatan: statusUtama === "BEKERJA" ? kisaranPendapatan : undefined,

        namaPerguruanTinggi: statusUtama === "KULIAH" ? (namaPerguruanTinggi || ptQuery) : undefined,
        jenjangPendidikan: statusUtama === "KULIAH" ? jenjangPendidikan : undefined,
        fakultasProdi: statusUtama === "KULIAH" ? (fakultasProdi || prodiQuery) : undefined,
        jalurMasuk: statusUtama === "KULIAH" ? jalurMasuk : undefined,
        statusPembiayaan: statusUtama === "KULIAH" ? statusPembiayaan : undefined,

        namaUsaha: statusUtama === "WIRAUSAHA" ? namaUsaha : undefined,
        bidangUsaha: statusUtama === "WIRAUSAHA" ? bidangUsaha : undefined,
        statusKepemilikan: statusUtama === "WIRAUSAHA" ? statusKepemilikan : undefined,
        jumlahKaryawan: statusUtama === "WIRAUSAHA" ? jumlahKaryawan : undefined,

        namaLembaga: statusUtama === "PELATIHAN" ? namaLembaga : undefined,
        bidangKeahlian: statusUtama === "PELATIHAN" ? bidangKeahlian : undefined,
        durasiProgram: statusUtama === "PELATIHAN" ? durasiProgram : undefined,
        rencanaPasca: statusUtama === "PELATIHAN" ? rencanaPasca : undefined,

        lamaMencariKerja: statusUtama === "MENCARI_KERJA" ? lamaMencariKerja : undefined,
        saluranPencarian: statusUtama === "MENCARI_KERJA" ? saluranPencarian : undefined,
        kendalaUtama: statusUtama === "MENCARI_KERJA" ? kendalaUtama : undefined,
        bantuanSekolah: statusUtama === "MENCARI_KERJA" ? bantuanSekolah : undefined,

        alasanUtamaKeluarga: statusUtama === "MENGURUS_KELUARGA" ? alasanUtamaKeluarga : undefined,
        rencanaMasaDepan: statusUtama === "MENGURUS_KELUARGA" ? rencanaMasaDepan : undefined,

        targetSeleksi: statusUtama === "GAP_YEAR" ? targetSeleksi : undefined,
        aktivitasPengisi: statusUtama === "GAP_YEAR" ? aktivitasPengisi : undefined,

        // Evaluasi
        relevansiKurikulum,
        penilaianFasilitas,
        penilaianBKK,
        saranSekolah,
      };

      const res = await submitTracerStudyAction(payload);
      if (res.error) {
        setSubmitError(res.error);
      } else {
        setStep("success");
      }
    } catch (err: any) {
      setSubmitError(`Gagal menyimpan: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    {
      id: "KULIAH",
      title: "Melanjutkan Pendidikan",
      desc: "Kuliah Perguruan Tinggi / Sekolah Kedinasan",
      icon: GraduationCap,
      color: "from-sky-500/20 to-indigo-500/10 text-sky-400 border-sky-500/30",
    },
    {
      id: "BEKERJA",
      title: "Bekerja",
      desc: "Karyawan Swasta / Pegawai / Freelance",
      icon: Briefcase,
      color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30",
    },
    {
      id: "WIRAUSAHA",
      title: "Berwirausaha",
      desc: "Membuka Usaha Mandiri / Bisnis",
      icon: Building2,
      color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30",
    },
    {
      id: "PELATIHAN",
      title: "Pelatihan / Kursus / BLK",
      desc: "Mengikuti Balai Latihan Kerja / Bootcamp",
      icon: BookOpen,
      color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30",
    },
    {
      id: "MENCARI_KERJA",
      title: "Sedang Mencari Pekerjaan",
      desc: "Belum bekerja / aktif melamar kerja",
      icon: Search,
      color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30",
    },
    {
      id: "MENGURUS_KELUARGA",
      title: "Mengurus Keluarga",
      desc: "Merawat keluarga / alasan pribadi",
      icon: Heart,
      color: "from-pink-500/20 to-rose-500/10 text-pink-400 border-pink-500/30",
    },
    {
      id: "GAP_YEAR",
      title: "Gap Year / Persiapan Seleksi",
      desc: "Mempersiapkan seleksi ulang PTN / Kedinasan / TNI-Polri",
      icon: Clock,
      color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40 px-4 py-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                Tracer Study Alumni <Sparkles className="w-4 h-4 text-emerald-400" />
              </h1>
              <p className="text-[11px] text-slate-400">Portal Penelusuran Lulusan & Karir Sekolah</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
            KAWAL Sekolahan
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        {/* STEP 1: VERIFIKASI ALUMNI */}
        {step === "verify" && (
          <div className="max-w-md mx-auto space-y-6 animate-fade-in py-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                <UserCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Verifikasi Data Alumni</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Silakan masukkan NISN (atau NIS) dan tanggal lahir Anda untuk memverifikasi identitas alumni sebelum mengisi survei tracer study.
              </p>
            </div>

            <form onSubmit={handleVerify} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 backdrop-blur-xl shadow-2xl">
              {verifyError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  NISN / NIS Siswa <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 0099927510"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    className="w-full pl-3.5 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Nomor Induk Siswa Nasional / NIS terdaftar di sekolah.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Tanggal Lahir (Opsional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={tanggalLahirInput}
                    onChange={(e) => setTanggalLahirInput(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjutkan ke Tracer Study</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: FORM TRACER STUDY */}
        {step === "form" && verifiedSiswa && (
          <form onSubmit={handleSubmitTracer} className="space-y-8 animate-fade-in pb-12">
            {/* Header Identity Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl uppercase shrink-0">
                  {verifiedSiswa.nama.substring(0, 2)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">{verifiedSiswa.nama}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">NISN / NIS: {verifiedSiswa.nisn}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      Kelas: {verifiedSiswa.kelasTerakhir}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Status: {verifiedSiswa.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep("verify")}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 w-fit transition-all cursor-pointer"
              >
                Ganti Siswa
              </button>
            </div>

            {submitError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* SECTION 1: STATUS UTAMA SAAT INI */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Status Utama Saat Ini <span className="text-rose-400">*</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih salah satu status utama Anda saat ini untuk membuka pertanyaan rincian terkait.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {statusOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = statusUtama === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStatusUtama(opt.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? `bg-gradient-to-br ${opt.color} ring-2 ring-emerald-500/50 shadow-lg`
                          : "bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 ${isSelected ? "text-emerald-400" : "text-slate-400"}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{opt.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: RINCIAN BERDASARKAN STATUS */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 backdrop-blur-xl">
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4.5 h-4.5 text-emerald-400" />
                  Rincian Berdasarkan Status (
                  {statusOptions.find((o) => o.id === statusUtama)?.title})
                </h3>
              </div>

              {/* 1. KULIAH / KEDINASAN */}
              {statusUtama === "KULIAH" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Nama Perguruan Tinggi (Live Autocomplete PDDIKTI) */}
                  <div className="sm:col-span-2 space-y-1.5 relative">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Nama Perguruan Tinggi / Universitas (Pencarian PDDIKTI) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama PT / Universitas (contoh: Universitas Indonesia)..."
                        value={ptQuery}
                        onChange={(e) => {
                          setPtQuery(e.target.value);
                          setNamaPerguruanTinggi(e.target.value);
                          setShowPtDropdown(true);
                        }}
                        onFocus={() => setShowPtDropdown(true)}
                        className="w-full pl-3.5 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {isSearchingPt ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3.5 top-3.5" />
                      ) : (
                        <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showPtDropdown && ptResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-2xl max-h-48 overflow-y-auto z-50 shadow-2xl divide-y divide-slate-800/60">
                        {ptResults.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setPtQuery(item);
                              setNamaPerguruanTinggi(item);
                              setShowPtDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500">Pencarian terintegrasi otomatis dengan API Kemendikbud / PDDIKTI.</p>
                  </div>

                  {/* Jenjang Pendidikan */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Jenjang <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={jenjangPendidikan}
                      onChange={(e) => setJenjangPendidikan(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="D3 (Diploma 3)">D3 (Diploma 3)</option>
                      <option value="D4 (Sarjana Terapan)">D4 (Sarjana Terapan)</option>
                      <option value="S1 (Sarjana)">S1 (Sarjana)</option>
                      <option value="Sekolah Kedinasan">Sekolah Kedinasan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  {/* Fakultas & Prodi (Live Autocomplete PDDIKTI) */}
                  <div className="space-y-1.5 relative">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Fakultas & Program Studi (Pencarian PDDIKTI) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama prodi (contoh: S1 Teknik Informatika)..."
                        value={prodiQuery}
                        onChange={(e) => {
                          setProdiQuery(e.target.value);
                          setFakultasProdi(e.target.value);
                          setShowProdiDropdown(true);
                        }}
                        onFocus={() => setShowProdiDropdown(true)}
                        className="w-full pl-3.5 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {isSearchingProdi ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3.5 top-3.5" />
                      ) : (
                        <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                      )}
                    </div>

                    {showProdiDropdown && prodiResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-2xl max-h-48 overflow-y-auto z-50 shadow-2xl divide-y divide-slate-800/60">
                        {prodiResults.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setProdiQuery(item);
                              setFakultasProdi(item);
                              setShowProdiDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Jalur Masuk */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Jalur Masuk <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={jalurMasuk}
                      onChange={(e) => setJalurMasuk(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="SNBP (Seleksi Nasional Berdasarkan Prestasi)">SNBP (Seleksi Nasional Berdasarkan Prestasi)</option>
                      <option value="SNBT (Seleksi Nasional Berdasarkan Tes)">SNBT (Seleksi Nasional Berdasarkan Tes)</option>
                      <option value="Mandiri (Ujian Mandiri PTN/PTS)">Mandiri (Ujian Mandiri PTN/PTS)</option>
                      <option value="Seleksi Kedinasan">Seleksi Kedinasan</option>
                      <option value="Beasiswa Khusus">Beasiswa Khusus</option>
                    </select>
                  </div>

                  {/* Status Pembiayaan */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Status Pembiayaan <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={statusPembiayaan}
                      onChange={(e) => setStatusPembiayaan(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Mandiri">Mandiri</option>
                      <option value="Beasiswa / KIP Kuliah">Beasiswa / KIP Kuliah</option>
                      <option value="Kedinasan (Beasiswa Penuh/Ikatan Dinas)">Kedinasan (Beasiswa Penuh/Ikatan Dinas)</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 2. BEKERJA */}
              {statusUtama === "BEKERJA" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Nama Perusahaan / Instansi / Tempat Kerja <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: PT Telekomunikasi Indonesia (Telkom)"
                      value={namaPerusahaan}
                      onChange={(e) => setNamaPerusahaan(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Posisi / Jabatan <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Junior Software Engineer"
                      value={posisiJabatan}
                      onChange={(e) => setPosisiJabatan(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Bidang Pekerjaan <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Teknologi Informasi & Software"
                      value={bidangPekerjaan}
                      onChange={(e) => setBidangPekerjaan(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Estimasi Waktu Tunggu Hingga Dapat Kerja <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={waktuTungguKerja}
                      onChange={(e) => setWaktuTungguKerja(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="< 1 bulan">&lt; 1 bulan</option>
                      <option value="1 - 3 bulan">1 - 3 bulan</option>
                      <option value="3 - 6 bulan">3 - 6 bulan</option>
                      <option value="> 6 bulan">&gt; 6 bulan</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Kisaran Pendapatan Bulanan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Rp 5.000.000 - Rp 7.000.000"
                      value={kisaranPendapatan}
                      onChange={(e) => setKisaranPendapatan(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* 3. BERWIRAUSAHA */}
              {statusUtama === "WIRAUSAHA" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Nama Usaha / Merek <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Coffee Shop Kawal / Digital Creative Studio"
                      value={namaUsaha}
                      onChange={(e) => setNamaUsaha(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Bidang Usaha <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Kuliner, Fashion, Agribisnis, Jasa Digital, Retail, dll."
                      value={bidangUsaha}
                      onChange={(e) => setBidangUsaha(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Status Kepemilikan <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={statusKepemilikan}
                      onChange={(e) => setStatusKepemilikan(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Usaha Sendiri">Usaha Sendiri</option>
                      <option value="Kemitraan / Franchise">Kemitraan / Franchise</option>
                      <option value="Usaha Keluarga">Usaha Keluarga</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Jumlah Karyawan / Tenaga Kerja (Jika Ada)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 3 Orang"
                      value={jumlahKaryawan}
                      onChange={(e) => setJumlahKaryawan(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* 4. PELATIHAN / KURSUS / BLK */}
              {statusUtama === "PELATIHAN" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Nama Lembaga Pelatihan / BLK <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: BLK Kota / Digitalent Scholarship"
                      value={namaLembaga}
                      onChange={(e) => setNamaLembaga(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Bidang Keahlian <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Bahasa Asing, Desain Grafis, IT/Coding, Otomotif, Tata Boga, dll."
                      value={bidangKeahlian}
                      onChange={(e) => setBidangKeahlian(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Durasi Program <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={durasiProgram}
                      onChange={(e) => setDurasiProgram(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="< 3 bulan">&lt; 3 bulan</option>
                      <option value="3 - 6 bulan">3 - 6 bulan</option>
                      <option value="> 6 bulan">&gt; 6 bulan</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Rencana Pasca Pelatihan <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={rencanaPasca}
                      onChange={(e) => setRencanaPasca(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Langsung mencari kerja">Langsung mencari kerja</option>
                      <option value="Membuka usaha mandiri">Membuka usaha mandiri</option>
                      <option value="Melanjutkan kuliah">Melanjutkan kuliah</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 5. SEDANG MENCARI PEKERJAAN */}
              {statusUtama === "MENCARI_KERJA" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Lama Waktu Mencari Kerja <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={lamaMencariKerja}
                      onChange={(e) => setLamaMencariKerja(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="< 1 bulan">&lt; 1 bulan</option>
                      <option value="1 - 3 bulan">1 - 3 bulan</option>
                      <option value="3 - 6 bulan">3 - 6 bulan</option>
                      <option value="> 6 bulan">&gt; 6 bulan</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Saluran Pencarian Kerja Utama <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={saluranPencarian}
                      onChange={(e) => setSaluranPencarian(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Portal Kerja (Jobstreet/LinkedIn)">Portal Kerja (Jobstreet/LinkedIn)</option>
                      <option value="Bursa Kerja Khusus (BKK) Sekolah">Bursa Kerja Khusus (BKK) Sekolah</option>
                      <option value="Relasi / Teman / Keluarga">Relasi / Teman / Keluarga</option>
                      <option value="Media Sosial">Media Sosial</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Kendala Utama yang Dihadapi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kurang pengalaman, persyaratan sertifikasi, info lowongan minim"
                      value={kendalaUtama}
                      onChange={(e) => setKendalaUtama(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Bantuan yang Diharapkan dari Sekolah
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Info bursa kerja alumni, pelatihan CV & wawancara"
                      value={bantuanSekolah}
                      onChange={(e) => setBantuanSekolah(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* 6. MENGURUS KELUARGA */}
              {statusUtama === "MENGURUS_KELUARGA" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Alasan Utama <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Membantu usaha keluarga, merawat keluarga, pemulihan kesehatan"
                      value={alasanUtamaKeluarga}
                      onChange={(e) => setAlasanUtamaKeluarga(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Rencana Masa Depan <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={rencanaMasaDepan}
                      onChange={(e) => setRencanaMasaDepan(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Berencana bekerja nanti">Berencana bekerja nanti</option>
                      <option value="Berencana membuka usaha nanti">Berencana membuka usaha nanti</option>
                      <option value="Tidak berencana bekerja">Tidak berencana bekerja</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 7. GAP YEAR / PERSIAPAN SELEKSI */}
              {statusUtama === "GAP_YEAR" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Target Seleksi Berikutnya <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={targetSeleksi}
                      onChange={(e) => setTargetSeleksi(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="SNBT (Seleksi Nasional Berdasarkan Tes)">SNBT (Seleksi Nasional Berdasarkan Tes)</option>
                      <option value="Sekolah Kedinasan">Sekolah Kedinasan</option>
                      <option value="TNI - Polri">TNI - Polri</option>
                      <option value="Mandiri PTN / PTS">Mandiri PTN / PTS</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Aktivitas Pengisi Waktu
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bimbel mandiri, kerja sampingan, kursus singkat"
                      value={aktivitasPengisi}
                      onChange={(e) => setAktivitasPengisi(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: EVALUASI SEKOLAH & UMPAN BALIK */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 backdrop-blur-xl">
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Heart className="w-4.5 h-4.5 text-pink-400" />
                  Evaluasi Sekolah & Umpan Balik
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Masukan Anda sangat berharga untuk perbaikan kualitas kurikulum & layanan karir bagi adik-adik angkatan berikutnya.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Relevansi Kurikulum Pembelajaran <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={relevansiKurikulum}
                    onChange={(e) => setRelevansiKurikulum(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="SANGAT_RELEVAN">Sangat Relevan</option>
                    <option value="RELEVAN">Relevan</option>
                    <option value="KURANG_RELEVAN">Kurang Relevan</option>
                    <option value="TIDAK_RELEVAN">Tidak Relevan</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Penilaian Fasilitas Sekolah <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={penilaianFasilitas}
                    onChange={(e) => setPenilaianFasilitas(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="SANGAT_BAIK">Sangat Baik</option>
                    <option value="BAIK">Baik</option>
                    <option value="CUKUP">Cukup</option>
                    <option value="KURANG">Kurang</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Layanan Bimbingan Karir / BKK <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={penilaianBKK}
                    onChange={(e) => setPenilaianBKK(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="SANGAT_BAIK">Sangat Baik</option>
                    <option value="BAIK">Baik</option>
                    <option value="CUKUP">Cukup</option>
                    <option value="KURANG">Kurang</option>
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Masukan & Saran untuk Pengembangan Sekolah
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan saran atau masukan Anda..."
                    value={saranSekolah}
                    onChange={(e) => setSaranSekolah(e.target.value)}
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-4 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Kirim Data Tracer Study</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === "success" && verifiedSiswa && (
          <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Survei Tracer Study Berhasil Dikirim!</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Terima kasih kepada <strong className="text-white">{verifiedSiswa.nama}</strong> telah berkontribusi mengisi data Tracer Study. Sukses selalu untuk perjalanan karir Anda!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Status Utama:</span>
                <span className="font-bold text-emerald-400">{statusOptions.find((o) => o.id === statusUtama)?.title}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Kelas Terakhir:</span>
                <span className="text-white font-medium">{verifiedSiswa.kelasTerakhir}</span>
              </div>
            </div>

            <button
              onClick={() => setStep("verify")}
              className="py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Pengisian Baru / Siswa Lain
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-slate-500 text-xs">
        <p>&copy; {new Date().getFullYear()} KAWAL Sekolahan &bull; Sistem Informasi Kesiswaan & Alumni</p>
      </footer>
    </div>
  );
}
