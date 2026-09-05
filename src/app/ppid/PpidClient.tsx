"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  ShieldAlert,
  User as UserIcon,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Upload,
  CheckCircle2,
  School,
  Sun,
  Moon,
  Loader2,
  FileCheck,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  submitPpidPermohonanAction,
  submitPpidKeberatanAction,
} from "@/app/actions/ppid";

interface PpidClientProps {
  schoolName?: string;
  schoolLogo?: string;
}

export default function PpidClient({
  schoolName = "SMAN 6 Tangerang",
  schoolLogo = "",
}: PpidClientProps) {
  const [formMode, setFormMode] = useState<"permohonan" | "keberatan">("permohonan");
  const [step, setStep] = useState<"form" | "success">("form");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // School Identity State
  const [currentSchoolName, setCurrentSchoolName] = useState(schoolName);
  const [currentSchoolLogo, setCurrentSchoolLogo] = useState(schoolLogo);

  // Success State
  const [successRegistrationNumber, setSuccessRegistrationNumber] = useState("");
  const [successType, setSuccessType] = useState<"permohonan" | "keberatan">("permohonan");

  // Status & Errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // FORM 1: Permohonan State
  const [namaLengkap, setNamaLengkap] = useState("");
  const [nik, setNik] = useState("");
  const [kategoriPemohon, setKategoriPemohon] = useState("PERORANGAN");
  const [alamat, setAlamat] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  const [email, setEmail] = useState("");
  const [fileIdentitasBase64, setFileIdentitasBase64] = useState<string | null>(null);
  const [fileIdentitasName, setFileIdentitasName] = useState<string>("");
  const [rincianInformasi, setRincianInformasi] = useState("");
  const [tujuanPenggunaan, setTujuanPenggunaan] = useState("");
  const [caraMemperoleh, setCaraMemperoleh] = useState("MELIHAT_MEMBACA");
  const [caraPengiriman, setCaraPengiriman] = useState("EMAIL");

  // FORM 2: Keberatan State
  const [nomorPermohonan, setNomorPermohonan] = useState("");
  const [namaKeberatan, setNamaKeberatan] = useState("");
  const [nomorHpKeberatan, setNomorHpKeberatan] = useState("");
  const [emailKeberatan, setEmailKeberatan] = useState("");
  const [alasanKeberatanList, setAlasanKeberatanList] = useState<string[]>([]);
  const [penjelasanKeberatan, setPenjelasanKeberatan] = useState("");
  const [fileBuktiBase64, setFileBuktiBase64] = useState<string | null>(null);
  const [fileBuktiName, setFileBuktiName] = useState<string>("");

  const ALASAN_KEBERATAN_OPTIONS = [
    "Permohonan Informasi Ditolak Tanpa Alasan yang Jelas",
    "Informasi Berkala Tidak Disediakan",
    "Permohonan Tidak Ditanggapi Sesuai Tenggat Waktu (10 Hari Kerja)",
    "Biaya Penyediaan Salinan Dikenakan Tidak Sesuai",
    "Informasi yang Diberikan Tidak Sesuai Permintaan",
    "Pengiriman Informasi Melebihi Waktu yang Dijanjikan",
  ];

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
  }, [step, formMode]);

  // Handle File Upload (Max 5MB)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setBase64: (val: string | null) => void,
    setName: (name: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal adalah 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64(reader.result as string);
      setName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const toggleAlasanKeberatan = (option: string) => {
    setAlasanKeberatanList((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    );
  };

  // Handle Form 1: Permohonan Submit
  const handleSubmitPermohonan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (nik.trim().length !== 16) {
      setSubmitError("Nomor KTP / NIK wajib 16 digit angka secara valid.");
      return;
    }

    if (!fileIdentitasBase64) {
      setSubmitError("Unggah identitas (KTP / KTM / SIM) wajib dilampirkan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitPpidPermohonanAction({
        namaLengkap,
        nik,
        kategoriPemohon,
        alamat,
        nomorHp,
        email,
        fileIdentitas: fileIdentitasBase64,
        rincianInformasi,
        tujuanPenggunaan,
        caraMemperoleh,
        caraPengiriman,
      });

      if (res.error || !res.nomorRegistrasi) {
        setSubmitError(res.error || "Gagal menyimpan permohonan informasi.");
      } else {
        setSuccessRegistrationNumber(res.nomorRegistrasi);
        setSuccessType("permohonan");
        setStep("success");
      }
    } catch (err: any) {
      setSubmitError(`Terjadi kesalahan: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Form 2: Keberatan Submit
  const handleSubmitKeberatan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (alasanKeberatanList.length === 0) {
      setSubmitError("Pilih minimal 1 alasan pengajuan keberatan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitPpidKeberatanAction({
        nomorPermohonan,
        namaLengkap: namaKeberatan,
        nomorHp: nomorHpKeberatan,
        email: emailKeberatan,
        alasanKeberatan: alasanKeberatanList,
        penjelasanKeberatan,
        fileBuktiAwal: fileBuktiBase64,
      });

      if (res.error || !res.nomorRegistrasi) {
        setSubmitError(res.error || "Gagal menyimpan pengajuan keberatan.");
      } else {
        setSuccessRegistrationNumber(res.nomorRegistrasi);
        setSuccessType("keberatan");
        setStep("success");
      }
    } catch (err: any) {
      setSubmitError(`Terjadi kesalahan: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForms = () => {
    setNamaLengkap("");
    setNik("");
    setKategoriPemohon("PERORANGAN");
    setAlamat("");
    setNomorHp("");
    setEmail("");
    setFileIdentitasBase64(null);
    setFileIdentitasName("");
    setRincianInformasi("");
    setTujuanPenggunaan("");
    setCaraMemperoleh("MELIHAT_MEMBACA");
    setCaraPengiriman("EMAIL");

    setNomorPermohonan("");
    setNamaKeberatan("");
    setNomorHpKeberatan("");
    setEmailKeberatan("");
    setAlasanKeberatanList([]);
    setPenjelasanKeberatan("");
    setFileBuktiBase64(null);
    setFileBuktiName("");

    setSubmitError(null);
    setStep("form");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Gradient Orbs - Identical to Login/Alumni Page */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* School Logo + Name + Powered by KAWAL - Identical to Login/Alumni Page Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl z-10 flex items-center justify-center gap-4 px-4">
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
            PPID {currentSchoolName}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 font-bold tracking-widest uppercase">
            Pejabat Pengelola Informasi & Dokumentasi &bull; powered by KAWAL
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl z-10 px-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 py-8 px-4 rounded-2xl sm:px-10">
          {step === "form" && (
            <div className="space-y-6">
              {/* Tab Selector: Permohonan vs Keberatan */}
              <div className="grid grid-cols-2 p-1.5 bg-slate-950 border border-slate-800 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormMode("permohonan");
                    setSubmitError(null);
                  }}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    formMode === "permohonan"
                      ? "bg-emerald-400 text-emerald-950"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Permohonan Informasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode("keberatan");
                    setSubmitError(null);
                  }}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    formMode === "keberatan"
                      ? "bg-amber-400 text-amber-950"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Pengajuan Keberatan</span>
                </button>
              </div>

              {submitError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-sm flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* MODE 1: FORMULIR PERMOHONAN INFORMASI PUBLIK */}
              {formMode === "permohonan" && (
                <form onSubmit={handleSubmitPermohonan} className="space-y-5 animate-fade-in">
                  <div className="border-b border-slate-800 pb-3">
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-400" />
                      Formulir Permohonan Informasi Publik PPID {currentSchoolName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Gunakan formulir ini untuk mengajukan permohonan dokumen atau informasi resmi sekolah sesuai UU Keterbukaan Informasi Publik.
                    </p>
                  </div>

                  {/* DATA DIRI PEMOHON */}
                  <div className="space-y-4 pt-1">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      I. Data Diri Pemohon
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Nama Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-slate-500" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Masukkan nama lengkap sesuai identitas"
                          value={namaLengkap}
                          onChange={(e) => setNamaLengkap(e.target.value)}
                          className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Nomor KTP / NIK (16 Digit) <span className="text-rose-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CreditCard className="h-5 w-5 text-slate-500" />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={16}
                          placeholder="Masukkan 16 digit NIK/KTP Anda"
                          value={nik}
                          onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                          className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Kategori Pemohon <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={kategoriPemohon}
                        onChange={(e) => setKategoriPemohon(e.target.value)}
                        className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                      >
                        <option value="PERORANGAN">Perorangan (Masyarakat / Orang Tua / Alumni)</option>
                        <option value="KELOMPOK">Kelompok / Lembaga / Ormas</option>
                        <option value="PESERTA_DIDIK">Peserta Didik / Mahasiswa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Alamat Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-slate-500" />
                        </div>
                        <textarea
                          rows={2}
                          required
                          placeholder="Masukkan alamat domisili lengkap..."
                          value={alamat}
                          onChange={(e) => setAlamat(e.target.value)}
                          className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300">
                          Alamat Email <span className="text-rose-500">*</span>
                        </label>
                        <div className="mt-1 relative rounded-md">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-500" />
                          </div>
                          <input
                            type="email"
                            required
                            placeholder="Contoh: nama@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Unggah Identitas (KTP / KTM / SIM) <span className="text-rose-500">*</span>
                      </label>
                      <div className="mt-1">
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl bg-slate-950/60 cursor-pointer transition-all">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-300 font-semibold">
                            {fileIdentitasName ? fileIdentitasName : "Pilih File Identitas (JPG / PNG / PDF Max 5MB)"}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => handleFileUpload(e, setFileIdentitasBase64, setFileIdentitasName)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* RINCIAN PERMOHONAN INFORMASI */}
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      II. Rincian Permohonan Informasi
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Rincian Informasi yang Dibutuhkan <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Contoh: Rencana Kerja Sekolah Tahun 2026, Data Statistik Sarana Prasarana..."
                        value={rincianInformasi}
                        onChange={(e) => setRincianInformasi(e.target.value)}
                        className="mt-1 block w-full p-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Tujuan Penggunaan Informasi <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Contoh: Riset Akademis, Transparansi Publik, Bimbingan Siswa..."
                        value={tujuanPenggunaan}
                        onChange={(e) => setTujuanPenggunaan(e.target.value)}
                        className="mt-1 block w-full p-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300">
                          Cara Memperoleh Informasi <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={caraMemperoleh}
                          onChange={(e) => setCaraMemperoleh(e.target.value)}
                          className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                        >
                          <option value="MELIHAT_MEMBACA">Melihat / Mendengarkan / Membaca</option>
                          <option value="SOFTCOPY">Mendapatkan Salinan Softcopy (Digital)</option>
                          <option value="HARDCOPY">Mendapatkan Salinan Hardcopy (Cetak)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300">
                          Cara Pengiriman Informasi <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={caraPengiriman}
                          onChange={(e) => setCaraPengiriman(e.target.value)}
                          className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm font-medium"
                        >
                          <option value="EMAIL">Email</option>
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="DIAMBIL_LANGSUNG">Diambil Langsung di Sekretariat PPID SMAN 6 Tangerang</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-98 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-950" />
                          <span>Mengirimkan Permohonan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-950" />
                          <span>Kirim Permohonan Informasi</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* MODE 2: FORMULIR PENGAJUAN KEBERATAN INFORMASI PUBLIK */}
              {formMode === "keberatan" && (
                <form onSubmit={handleSubmitKeberatan} className="space-y-5 animate-fade-in">
                  <div className="border-b border-slate-800 pb-3">
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      Formulir Pengajuan Keberatan Layanan Informasi PPID {currentSchoolName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Gunakan formulir ini jika permohonan informasi Anda ditolak, tidak ditanggapi tepat waktu, atau tidak sesuai dengan permintaan.
                    </p>
                  </div>

                  {/* DATA DIRI PENGAJU KEBERATAN */}
                  <div className="space-y-4 pt-1">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                      I. Data Diri Pengaju Keberatan
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Nomor Pendaftaran Permohonan Sebelumnya <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: PPID-6TNG/2026/0001"
                        value={nomorPermohonan}
                        onChange={(e) => setNomorPermohonan(e.target.value)}
                        className="mt-1 block w-full px-3.5 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:text-sm font-mono transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Nama Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-slate-500" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Masukkan nama lengkap Anda"
                          value={namaKeberatan}
                          onChange={(e) => setNamaKeberatan(e.target.value)}
                          className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            value={nomorHpKeberatan}
                            onChange={(e) => setNomorHpKeberatan(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:text-sm transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300">
                          Alamat Email <span className="text-rose-500">*</span>
                        </label>
                        <div className="mt-1 relative rounded-md">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-500" />
                          </div>
                          <input
                            type="email"
                            required
                            placeholder="Contoh: nama@gmail.com"
                            value={emailKeberatan}
                            onChange={(e) => setEmailKeberatan(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:text-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DETAIL KEBERATAN */}
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                      II. Detail Pengajuan Keberatan
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Alasan Pengajuan Keberatan <span className="text-rose-500">*</span>
                      </label>
                      <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                        {ALASAN_KEBERATAN_OPTIONS.map((option, idx) => {
                          const isChecked = alasanKeberatanList.includes(option);
                          return (
                            <label
                              key={idx}
                              className="flex items-start gap-3 cursor-pointer group text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleAlasanKeberatan(option)}
                                className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 accent-amber-500 cursor-pointer"
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Penjelasan Rinci Alasan Keberatan <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Uraikan secara rinci alasan atau kendala pengajuan keberatan Anda..."
                        value={penjelasanKeberatan}
                        onChange={(e) => setPenjelasanKeberatan(e.target.value)}
                        className="mt-1 block w-full p-3 border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:text-sm transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Unggah Bukti Permohonan Awal (Opsional)
                      </label>
                      <div className="mt-1">
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl bg-slate-950/60 cursor-pointer transition-all">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-300 font-semibold">
                            {fileBuktiName ? fileBuktiName : "Pilih File Bukti (PDF / JPG Max 5MB)"}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => handleFileUpload(e, setFileBuktiBase64, setFileBuktiName)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-amber-950 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-98 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-amber-950" />
                          <span>Mengirimkan Keberatan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-amber-950" />
                          <span>Kirim Pengajuan Keberatan</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STEP 2: SUCCESS CONFIRMATION PAGE */}
          {step === "success" && (
            <div className="max-w-md mx-auto text-center space-y-6 py-6 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight sm:text-2xl">
                  Terima Kasih! {successType === "permohonan" ? "Permohonan" : "Pengajuan Keberatan"} Informasi Anda Telah Terkirim.
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Berkas Anda telah diterima secara resmi oleh Tim Sekretariat PPID {currentSchoolName}.
                </p>
              </div>

              {/* Registration Number Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-center space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Nomor Registrasi Resmi
                </span>
                <p className="text-xl font-black text-white font-mono tracking-wider">
                  {successRegistrationNumber}
                </p>
              </div>

              {/* Response Timeframe Box */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-left space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Tim PPID {currentSchoolName} akan memeriksa berkas permohonan Anda dalam waktu maksimal <strong>1–3 hari kerja</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 pt-1 border-t border-slate-800/80">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Jawaban / Konfirmasi resmi akan dikirimkan ke email atau WhatsApp Anda selambat-lambatnya <strong>10 hari kerja</strong> sejak permohonan diterima.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetForms}
                  className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  Kirim Permohonan / Keberatan Baru
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
