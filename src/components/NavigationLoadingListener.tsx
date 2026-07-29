"use client";

import React, { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";

function LoadingListenerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Hide loading indicator when navigation finishes
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  // Listen for clicks on internal links
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        target.target !== "_blank" &&
        href !== pathname
      ) {
        setIsLoading(true);
      }
    };

    const handleFormSubmit = () => {
      setIsLoading(true);
    };

    document.addEventListener("click", handleAnchorClick);
    document.addEventListener("submit", handleFormSubmit);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      document.removeEventListener("submit", handleFormSubmit);
    };
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <>
      {/* Glowing top progress line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 z-[99999] animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />

      {/* Floating loading badge */}
      <div className="fixed top-4 right-4 z-[99999] animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none">
        <div className="px-4 py-2.5 bg-slate-900/95 border border-emerald-500/40 backdrop-blur-md rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs text-white font-bold">
          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
          <span>Memuat data...</span>
        </div>
      </div>
    </>
  );
}

export default function NavigationLoadingListener() {
  return (
    <Suspense fallback={null}>
      <LoadingListenerContent />
    </Suspense>
  );
}
