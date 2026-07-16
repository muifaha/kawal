"use client";

import React, { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { updateProfileAction } from "@/app/actions/auth";
import { User, KeyRound, Save, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface ProfileClientProps {
  currentUser: {
    id: string;
    username: string;
    nama: string;
    role: string;
  };
}

export default function ProfileClient({ currentUser }: ProfileClientProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [nama, setNama] = useState(currentUser.nama);
  const [username, setUsername] = useState(currentUser.username);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim() || !username.trim()) {
      showToast("Nama dan Username tidak boleh kosong.", "error");
      return;
    }

    if (password) {
      if (password.length < 6) {
        showToast("Password baru minimal harus 6 karakter.", "error");
        return;
      }
      if (password !== confirmPassword) {
        showToast("Konfirmasi password baru tidak cocok.", "error");
        return;
      }
    }

    startTransition(async () => {
      const res = await updateProfileAction(nama, username, password || undefined);
      if (res?.error) {
        showToast(res.error, "error");
      } else if (res?.success) {
        showToast(res.message || "Profil berhasil diperbarui!", "success");
        setPassword("");
        setConfirmPassword("");
      }
    });
  };

  const roleColors: Record<string, string> = {
    WAKA: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    BK: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    WALAS: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    GURU: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    OSIS: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Profil Saya</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Perbarui data pribadi Anda seperti nama lengkap, username, dan kata sandi masuk.
        </p>
      </div>

      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 sm:p-8 space-y-6">
        {/* User Identity Banner */}
        <div className="flex items-center gap-4 p-4 bg-slate-950/40 border border-slate-900/60 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white leading-tight truncate">{currentUser.nama}</h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">@{currentUser.username}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${roleColors[currentUser.role] || "bg-slate-800 text-slate-300"}`}>
            {currentUser.role}
          </span>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Nama Lengkap
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                required
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <span className="text-xs font-bold">@</span>
              </div>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-slate-600"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
              Catatan: Mengubah username akan memengaruhi nama pengguna saat Anda melakukan login berikutnya.
            </p>
          </div>

          <hr className="border-slate-850 my-6" />

          <div className="bg-slate-950/20 border border-slate-900/60 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              Ubah Kata Sandi (Opsional)
            </h4>
            <p className="text-[10px] text-slate-400 leading-normal">
              Biarkan kolom di bawah ini kosong jika Anda tidak ingin memperbarui kata sandi masuk Anda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full px-3.5 pr-10 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full px-3.5 pr-10 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-emerald-400/10 cursor-pointer"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-emerald-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
