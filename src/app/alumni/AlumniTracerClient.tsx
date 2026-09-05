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
  School,
  Clock,
  Heart,
  ShieldAlert,
  Loader2,
  FileCheck,
  Sun,
  Moon,
  Phone,
  Mail,
  MapPin,
  User as UserIcon,
  Calendar,
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

interface AlumniTracerClientProps {
  schoolName?: string;
  schoolLogo?: string;
}

export default function AlumniTracerClient({ schoolName = "KAWAL Sekolahan", schoolLogo = "" }: AlumniTracerClientProps) {
  const [step, setStep] = useState<"verify" | "form" | "success">("verify");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // School Identity State
  const [currentSchoolName, setCurrentSchoolName] = useState(schoolName);
  const [currentSchoolLogo, setCurrentSchoolLogo] = useState(schoolLogo);

  // Step 1: Verification State
  const [identifierInput, setIdentifierInput] = useState("");
  const [tanggalLahirInput, setTanggalLahirInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifiedSiswa, setVerifiedSiswa] = useState<SiswaVerifyData | null>(null);

  // Step 2: Main Status Choice & Contact Details
  const [statusUtama, setStatusUtama] = useState<string>("KULIAH");
  const [nomorHp, setNomorHp] = useState("");
  const [email, setEmail] = useState("");
  const [alamat, setAlamat] = useState("");
  const [bersediaDihubungi, setBersediaDihubungi] = useState(true);

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

  // Sync Theme & Fetch Settings
  useEffect(() => {
    setTheme("light");
    document.documentElement.classList.add("light");

    const localName = localStorage.getItem("cachedSchoolName");
    const localLogo = localStorage.getItem("cachedSchoolLogo");
    if (localName) setCurrentSchoolName(localName);
    if (localLogo) setCurrentSchoolLogo(localLogo);

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.schoolName) {
          setCurrentSchoolName(data.schoolName);
          localStorage.setItem("cachedSchoolName", data.schoolName);
        }
        if (data.schoolLogo) {
          setCurrentSchoolLogo(data.schoolLogo);
          localStorage.setItem("cachedSchoolLogo", data.schoolLogo);
        }
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  // Auto-resize postMessage for WordPress iframe embedding without scrollbar
  useEffect(() => {
    const sendHeight = () => {
      if (typeof window !== "undefined" && window.parent) {
        const height = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );
        window.parent.postMessage({ type: "kawal-iframe-resize", height }, "*");
      }
    };

    sendHeight();
    const timer = setTimeout(sendHeight, 300);
    const interval = setInterval(sendHeight, 1000);
    window.addEventListener("resize", sendHeight);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("resize", sendHeight);
    };
  }, [step, statusUtama]);

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
    if (!tanggalLahirInput) {
      setVerifyError("Silakan masukkan tanggal lahir Anda (wajib).");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await verifyAlumniAction({
        identifier: identifierInput.trim(),
        tanggalLahir: tanggalLahirInput,
      });

      if (res.error || !res.siswa) {
        setVerifyError(res.error || "Data siswa alumni tidak ditemukan.");
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

          setNomorHp(t.nomorHp || "");
          setEmail(t.email || "");
          setAlamat(t.alamat || "");
          setBersediaDihubungi(t.bersediaDihubungi ?? true);

          setRelevansiKurikulum(t.relevansiKurikulum || "RELEVAN");
          setPenilaianFasilitas(t.penilaianFasilitas || "BAIK");
          setPenilaianBKK(t.penilaianBKK || "BAIK");
          setSaranSekolah(t.saranSekolah || "");
        }

        setStep("form");
      }
    } catch (err: any) {
      setVerifyError(`Gagal melakukan verifikasi: ${err.message || err}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Submit Form
  const handleSubmitTracer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedSiswa) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        siswaId: verifiedSiswa.id,
        statusUtama,

        // Status Specific
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

        // Kontak & Domisili
        nomorHp: nomorHp.trim() || undefined,
        email: email.trim() || undefined,
        alamat: alamat.trim() || undefined,
        bersediaDihubungi,

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
      accentBg: "from-sky-500/10 to-indigo-500/10",
      accentBorder: "border-sky-500/30",
      accentText: "text-sky-600 dark:text-sky-400",
    },
    {
      id: "BEKERJA",
      title: "Bekerja",
      desc: "Karyawan Swasta / Pegawai / Freelance",
      icon: Briefcase,
      accentBg: "from-emerald-500/10 to-teal-500/10",
      accentBorder: "border-emerald-500/30",
      accentText: "text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "WIRAUSAHA",
      title: "Berwirausaha",
      desc: "Membuka Usaha Mandiri / Bisnis",
      icon: Building2,
      accentBg: "from-amber-500/10 to-orange-500/10",
      accentBorder: "border-amber-500/30",
      accentText: "text-amber-600 dark:text-amber-400",
    },
    {
      id: "PELATIHAN",
      title: "Pelatihan / Kursus / BLK",
      desc: "Mengikuti Balai Latihan Kerja / Bootcamp",
      icon: BookOpen,
      accentBg: "from-purple-500/10 to-pink-500/10",
      accentBorder: "border-purple-500/30",
      accentText: "text-purple-600 dark:text-purple-400",
    },
    {
      id: "MENCARI_KERJA",
      title: "Sedang Mencari Pekerjaan",
      desc: "Belum bekerja / aktif melamar kerja",
      icon: Search,
      accentBg: "from-rose-500/10 to-red-500/10",
      accentBorder: "border-rose-500/30",
      accentText: "text-rose-600 dark:text-rose-400",
    },
    {
      id: "MENGURUS_KELUARGA",
      title: "Mengurus Keluarga",
      desc: "Merawat keluarga / alasan pribadi",
      icon: Heart,
      accentBg: "from-pink-500/10 to-rose-500/10",
      accentBorder: "border-pink-500/30",
      accentText: "text-pink-600 dark:text-pink-400",
    },
    {
      id: "GAP_YEAR",
      title: "Gap Year / Persiapan Seleksi",
      desc: "Mempersiapkan seleksi ulang PTN / Kedinasan / TNI-Polri",
      icon: Clock,
      accentBg: "from-blue-500/10 to-cyan-500/10",
      accentBorder: "border-blue-500/30",
      accentText: "text-blue-600 dark:text-blue-400",
    },
  ];

  // STEP 1: VERIFIKASI - Centered Login Layout (NO HEADER, NO FOOTER)
  if (step === "verify") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
        {/* Background Gradient Orbs - Identical to Login Page */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* School Logo + Name + Powered by KAWAL - Identical to Login Page Header */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex items-center justify-center gap-4 px-4">
          {currentSchoolLogo ? (
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
              <img src={currentSchoolLogo} alt="Logo Sekolah" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-extrabold text-2xl shrink-0">
              <School className="w-8 h-8 text-emerald-400" />
            </div>
          )}
          <div className="text-left flex flex-col justify-center min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl leading-tight">
              {currentSchoolName}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 font-bold tracking-widest uppercase">
              powered by KAWAL
            </p>
          </div>
        </div>

        {/* Form Card Container - 100% Identical to Login Page Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 py-8 px-4 rounded-2xl sm:px-10">
            <form onSubmit={handleVerify} className="space-y-6">
              {verifyError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-sm flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Input 1: NISN / NIS */}
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-slate-300">
                  NISN / NIS
                </label>
                <div className="mt-1 relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  </div>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    placeholder="Masukkan NISN atau NIS Anda"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                  />
                </div>
              </div>

              {/* Input 2: Tanggal Lahir (WAJIB) */}
              <div>
                <label htmlFor="tanggalLahir" className="block text-sm font-medium text-slate-300">
                  Tanggal Lahir
                </label>
                <div className="mt-1 relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  </div>
                  <input
                    id="tanggalLahir"
                    name="tanggalLahir"
                    type="date"
                    required
                    value={tanggalLahirInput}
                    onChange={(e) => setTanggalLahirInput(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all font-sans"
                  />
                </div>
              </div>

              {/* Submit Button - 100% Identical to Login Page Button */}
              <div>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-98"
                >
                  {isVerifying ? "Memverifikasi..." : "Verifikasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2 & 3: FORM TRACER STUDY & SUCCESS CONFIRMATION
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-6 sm:px-6 lg:px-8 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Background Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Area */}
      <main className="sm:mx-auto sm:w-full sm:max-w-4xl z-10 px-4 py-6 flex-1">
        {/* STEP 2: FORM TRACER STUDY */}
        {step === "form" && verifiedSiswa && (
          <form onSubmit={handleSubmitTracer} className="space-y-6 animate-fade-in pb-12">
            {/* Header Identity Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-white leading-tight">{verifiedSiswa.nama}</h2>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                  <span>NISN : {verifiedSiswa.nisn || "-"}</span>
                  <span className="text-slate-700 font-bold">&bull;</span>
                  <span>NIS : {verifiedSiswa.nis || "-"}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                    Kelas Terakhir: {verifiedSiswa.kelasTerakhir}
                  </span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    Status: {verifiedSiswa.status}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep("verify")}
                className="text-xs text-slate-300 hover:text-white px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 w-fit transition-all cursor-pointer font-semibold"
              >
                Keluar
              </button>
            </div>

            {submitError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-sm flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
                <span>{submitError}</span>
              </div>
            )}

            {/* SECTION INFORMASI KONTAK & DOMISILI */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-emerald-400" />
                  Informasi Kontak & Domisili Alumni
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Isikan kontak aktif Anda agar sekolah & BKK dapat menginformasikan lowongan kerja, beasiswa, atau event alumni.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Nomor HP / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={nomorHp}
                      onChange={(e) => setNomorHp(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Alamat Email
                  </label>
                  <div className="mt-1 relative rounded-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="email"
                      placeholder="Contoh: nama@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Alamat Tempat Tinggal Saat Ini <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md">
                    <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-slate-500" />
                    </div>
                    <textarea
                      rows={2}
                      required
                      placeholder="Masukkan alamat domisili saat ini (Jalan, RT/RW, Desa/Kelurahan, Kecamatan, Kota/Kabupaten, Provinsi)..."
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1: STATUS UTAMA SAAT INI */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-emerald-400" />
                  Status Utama Saat Ini <span className="text-rose-500">*</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih salah satu status utama Anda saat ini untuk menyesuaikan pertanyaan rincian.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {statusOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = statusUtama === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStatusUtama(opt.id)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden ${
                        isSelected
                          ? `bg-gradient-to-br ${opt.accentBg} ${opt.accentBorder} ring-2 ring-emerald-500`
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${isSelected ? opt.accentText : "text-slate-400"}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && <CheckCircle2 className="w-5.5 h-5.5 text-emerald-400" />}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-white">{opt.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: RINCIAN BERDASARKAN STATUS */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  Rincian Detail (
                  {statusOptions.find((o) => o.id === statusUtama)?.title})
                </h3>
              </div>

              {/* 1. KULIAH / KEDINASAN */}
              {statusUtama === "KULIAH" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2 space-y-1 relative">
                    <label className="block text-sm font-medium text-slate-300">
                      Nama Perguruan Tinggi / Universitas (Pencarian Live PDDIKTI Kemdikbud) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama kampus (contoh: Universitas Indonesia / ITB / UNY)..."
                        value={ptQuery}
                        onChange={(e) => {
                          setPtQuery(e.target.value);
                          setNamaPerguruanTinggi(e.target.value);
                          setShowPtDropdown(true);
                        }}
                        onFocus={() => setShowPtDropdown(true)}
                        className="block w-full pl-3.5 pr-10 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all font-medium"
                      />
                      {isSearchingPt ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3.5 top-3.5" />
                      ) : (
                        <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                      )}
                    </div>

                    {showPtDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-800 rounded-xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-800">
                        {ptResults.length > 0 ? (
                          ptResults.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setPtQuery(item);
                                setNamaPerguruanTinggi(item);
                                setShowPtDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <School className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{item}</span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-[11px] text-slate-400 text-center">
                            {isSearchingPt ? "Mencari ke PDDIKTI..." : ptQuery.length >= 2 ? "Tekan Enter untuk gunakan nama ini" : "Ketik minimal 2 karakter..."}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1">Pencarian terintegrasi otomatis dengan API PDDIKTI Kemdikbud.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Jenjang Studi <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={jenjangPendidikan}
                      onChange={(e) => setJenjangPendidikan(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    >
                      <option value="D3 (Diploma 3)">D3 (Diploma 3)</option>
                      <option value="D4 (Sarjana Terapan)">D4 (Sarjana Terapan)</option>
                      <option value="S1 (Sarjana)">S1 (Sarjana)</option>
                      <option value="Sekolah Kedinasan">Sekolah Kedinasan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-300">
                      Fakultas & Program Studi (Pencarian PDDIKTI) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama prodi (contoh: Teknik Informatika)..."
                        value={prodiQuery}
                        onChange={(e) => {
                          setProdiQuery(e.target.value);
                          setFakultasProdi(e.target.value);
                          setShowProdiDropdown(true);
                        }}
                        onFocus={() => setShowProdiDropdown(true)}
                        className="block w-full pl-3.5 pr-10 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all font-medium"
                      />
                      {isSearchingProdi ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3.5 top-3.5" />
                      ) : (
                        <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                      )}
                    </div>

                    {showProdiDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-800 rounded-xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-800">
                        {prodiResults.length > 0 ? (
                          prodiResults.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setProdiQuery(item);
                                setFakultasProdi(item);
                                setShowProdiDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{item}</span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-[11px] text-slate-400 text-center">
                            {isSearchingProdi ? "Mencari ke PDDIKTI..." : prodiQuery.length >= 2 ? "Tekan Enter untuk gunakan nama ini" : "Ketik minimal 2 karakter..."}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Jalur Masuk <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={jalurMasuk}
                      onChange={(e) => setJalurMasuk(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    >
                      <option value="SNBP (Seleksi Nasional Berdasarkan Prestasi)">SNBP (Seleksi Nasional Berdasarkan Prestasi)</option>
                      <option value="SNBT (Seleksi Nasional Berdasarkan Tes)">SNBT (Seleksi Nasional Berdasarkan Tes)</option>
                      <option value="Mandiri (Ujian Mandiri PTN/PTS)">Mandiri (Ujian Mandiri PTN/PTS)</option>
                      <option value="Seleksi Kedinasan">Seleksi Kedinasan</option>
                      <option value="Beasiswa Khusus">Beasiswa Khusus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Status Pembiayaan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={statusPembiayaan}
                      onChange={(e) => setStatusPembiayaan(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
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
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Nama Perusahaan / Instansi / Tempat Kerja <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: PT Telekomunikasi Indonesia (Telkom)"
                      value={namaPerusahaan}
                      onChange={(e) => setNamaPerusahaan(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Posisi / Jabatan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Junior Software Engineer"
                      value={posisiJabatan}
                      onChange={(e) => setPosisiJabatan(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Bidang Pekerjaan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Teknologi Informasi & Software"
                      value={bidangPekerjaan}
                      onChange={(e) => setBidangPekerjaan(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Estimasi Waktu Tunggu Hingga Dapat Kerja <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={waktuTungguKerja}
                      onChange={(e) => setWaktuTungguKerja(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    >
                      <option value="< 1 bulan">&lt; 1 bulan</option>
                      <option value="1 - 3 bulan">1 - 3 bulan</option>
                      <option value="3 - 6 bulan">3 - 6 bulan</option>
                      <option value="> 6 bulan">&gt; 6 bulan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Kisaran Pendapatan Bulanan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Rp 4.500.000 - Rp 6.000.000"
                      value={kisaranPendapatan}
                      onChange={(e) => setKisaranPendapatan(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>
                </div>
              )}

              {/* 3. BERWIRAUSAHA */}
              {statusUtama === "WIRAUSAHA" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Nama Usaha / Merek <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Coffee Shop Kawal / Creative Studio"
                      value={namaUsaha}
                      onChange={(e) => setNamaUsaha(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Bidang Usaha <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Kuliner, Fashion, Agribisnis, Jasa Digital, Retail, dll."
                      value={bidangUsaha}
                      onChange={(e) => setBidangUsaha(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Status Kepemilikan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={statusKepemilikan}
                      onChange={(e) => setStatusKepemilikan(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    >
                      <option value="Usaha Sendiri">Usaha Sendiri</option>
                      <option value="Kemitraan / Franchise">Kemitraan / Franchise</option>
                      <option value="Usaha Keluarga">Usaha Keluarga</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Jumlah Karyawan (Jika Ada)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 3 Orang"
                      value={jumlahKaryawan}
                      onChange={(e) => setJumlahKaryawan(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>
                </div>
              )}

              {/* 4. PELATIHAN / KURSUS / BLK */}
              {statusUtama === "PELATIHAN" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Nama Lembaga Pelatihan / BLK <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: BLK Kota / Digitalent Scholarship"
                      value={namaLembaga}
                      onChange={(e) => setNamaLembaga(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Bidang Keahlian <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Bahasa Asing, IT/Coding, Otomotif, Tata Boga, dll."
                      value={bidangKeahlian}
                      onChange={(e) => setBidangKeahlian(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Durasi Program <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={durasiProgram}
                      onChange={(e) => setDurasiProgram(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    >
                      <option value="< 3 bulan">&lt; 3 bulan</option>
                      <option value="3 - 6 bulan">3 - 6 bulan</option>
                      <option value="> 6 bulan">&gt; 6 bulan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Rencana Pasca Pelatihan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={rencanaPasca}
                      onChange={(e) => setRencanaPasca(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Lama Waktu Mencari Kerja <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={lamaMencariKerja}
                      onChange={(e) => setLamaMencariKerja(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    >
                      <option value="< 1 bulan">&lt; 1 bulan</option>
                      <option value="1 - 3 bulan">1 - 3 bulan</option>
                      <option value="3 - 6 bulan">3 - 6 bulan</option>
                      <option value="> 6 bulan">&gt; 6 bulan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Saluran Pencarian Kerja Utama <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={saluranPencarian}
                      onChange={(e) => setSaluranPencarian(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    >
                      <option value="Portal Kerja (Jobstreet/LinkedIn)">Portal Kerja (Jobstreet/LinkedIn)</option>
                      <option value="Bursa Kerja Khusus (BKK) Sekolah">Bursa Kerja Khusus (BKK) Sekolah</option>
                      <option value="Relasi / Teman / Keluarga">Relasi / Teman / Keluarga</option>
                      <option value="Media Sosial">Media Sosial</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Kendala Utama yang Dihadapi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Minim pengalaman kerja, butuh sertifikasi khusus"
                      value={kendalaUtama}
                      onChange={(e) => setKendalaUtama(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Bantuan yang Diharapkan dari Sekolah
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Info bursa kerja alumni, pelatihan pembuatan CV & wawancara"
                      value={bantuanSekolah}
                      onChange={(e) => setBantuanSekolah(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>
                </div>
              )}

              {/* 6. MENGURUS KELUARGA */}
              {statusUtama === "MENGURUS_KELUARGA" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Alasan Utama <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Membantu usaha keluarga, merawat keluarga"
                      value={alasanUtamaKeluarga}
                      onChange={(e) => setAlasanUtamaKeluarga(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Rencana Masa Depan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={rencanaMasaDepan}
                      onChange={(e) => setRencanaMasaDepan(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Target Seleksi Berikutnya <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={targetSeleksi}
                      onChange={(e) => setTargetSeleksi(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    >
                      <option value="SNBT (Seleksi Nasional Berdasarkan Tes)">SNBT (Seleksi Nasional Berdasarkan Tes)</option>
                      <option value="Sekolah Kedinasan">Sekolah Kedinasan</option>
                      <option value="TNI - Polri">TNI - Polri</option>
                      <option value="Mandiri PTN / PTS">Mandiri PTN / PTS</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Aktivitas Pengisi Waktu
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Belajar intensif bimbel, magang singkat"
                      value={aktivitasPengisi}
                      onChange={(e) => setAktivitasPengisi(e.target.value)}
                      className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: EVALUASI SEKOLAH & UMPAN BALIK */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  Evaluasi Sekolah & Umpan Balik
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Masukan Anda sangat berharga untuk peningkatan kualitas pembelajaran & bimbingan karir bagi adik-adik angkatan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Relevansi Kurikulum <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={relevansiKurikulum}
                    onChange={(e) => setRelevansiKurikulum(e.target.value)}
                    className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  >
                    <option value="SANGAT_RELEVAN">Sangat Relevan</option>
                    <option value="RELEVAN">Relevan</option>
                    <option value="KURANG_RELEVAN">Kurang Relevan</option>
                    <option value="TIDAK_RELEVAN">Tidak Relevan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Penilaian Fasilitas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={penilaianFasilitas}
                    onChange={(e) => setPenilaianFasilitas(e.target.value)}
                    className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  >
                    <option value="SANGAT_BAIK">Sangat Baik</option>
                    <option value="BAIK">Baik</option>
                    <option value="CUKUP">Cukup</option>
                    <option value="KURANG">Kurang</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Layanan BKK / Karir <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={penilaianBKK}
                    onChange={(e) => setPenilaianBKK(e.target.value)}
                    className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  >
                    <option value="SANGAT_BAIK">Sangat Baik</option>
                    <option value="BAIK">Baik</option>
                    <option value="CUKUP">Cukup</option>
                    <option value="KURANG">Kurang</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-slate-300">
                    Masukan & Saran untuk Sekolah
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan masukan atau saran pengembangan sekolah..."
                    value={saranSekolah}
                    onChange={(e) => setSaranSekolah(e.target.value)}
                    className="mt-1 block w-full p-3.5 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                  />
                </div>

                {/* CAREER DAY & CAMPUS EXPO CONSENT CHECKBOX */}
                <div className="sm:col-span-3 pt-3 border-t border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer group p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 transition-all">
                    <input
                      type="checkbox"
                      checked={bersediaDihubungi}
                      onChange={(e) => setBersediaDihubungi(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 accent-emerald-500 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Bersedia dihubungi sekolah terkait kegiatan Career Day atau Campus Expo
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Sekolah dapat menghubungi Anda (melalui WhatsApp/Email) untuk mengundang sebagai narasumber, berbagi pengalaman karir/studi, atau pengisian booth alumni pada acara sekolah.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Action Button - Identical to Login Button */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex justify-center items-center gap-2 py-3.5 px-8 border border-transparent rounded-xl text-sm font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-98 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-950" />
                    <span>Menyimpan Tracer...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-950" />
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
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Survei Tracer Study Berhasil Dikirim!</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Terima kasih kepada <strong className="text-white">{verifiedSiswa.nama}</strong> telah berkontribusi mengisi data Tracer Study. Sukses selalu untuk karir & studi Anda!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 text-left space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-medium">Status Utama:</span>
                <span className="font-bold text-emerald-400">{statusOptions.find((o) => o.id === statusUtama)?.title}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400 font-medium">Kelas Terakhir:</span>
                <span className="text-white font-medium">{verifiedSiswa.kelasTerakhir}</span>
              </div>
            </div>

            <button
              onClick={() => setStep("verify")}
              className="py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-xs transition-all cursor-pointer"
            >
              Pengisian Baru / Siswa Lain
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
