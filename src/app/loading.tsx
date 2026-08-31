import React from "react";

export default function Loading() {
  return (
    <div className="w-full min-h-[70vh] p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-48 bg-slate-800/60 rounded-xl" />
        <div className="h-8 w-32 bg-slate-800/60 rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-800/80 rounded-lg" />
              <div className="h-8 w-8 bg-slate-800/80 rounded-lg" />
            </div>
            <div className="h-6 w-16 bg-slate-700/80 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Content / Table Skeleton */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="h-6 w-40 bg-slate-800/80 rounded-lg" />
        <div className="space-y-3 font-mono">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-950/60 rounded-xl w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
