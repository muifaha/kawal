import React from "react";
import { RefreshCw } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all">
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <RefreshCw className="w-5 h-5 text-emerald-400 absolute animate-spin" style={{ animationDuration: "3s" }} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-white tracking-wide">Memuat Halaman...</p>
          <p className="text-xs text-slate-400">Mohon tunggu sebentar</p>
        </div>
      </div>
    </div>
  );
}
