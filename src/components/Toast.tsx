"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => {
          let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          let styles = "bg-slate-950/90 border border-emerald-500/30 text-emerald-400";

          if (t.type === "error") {
            icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
            styles = "bg-slate-950/90 border border-rose-500/30 text-rose-400";
          } else if (t.type === "warning") {
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
            styles = "bg-slate-950/90 border border-amber-500/30 text-amber-400";
          } else if (t.type === "info") {
            icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;
            styles = "bg-slate-950/90 border border-sky-500/30 text-sky-400";
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-slide-in-right ${styles}`}
            >
              {icon}
              <div className="flex-1 text-xs font-semibold leading-relaxed pr-2">{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white transition-colors focus:outline-none shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
