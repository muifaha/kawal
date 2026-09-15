"use client";

import React, { Suspense } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import MateriManager from "@/components/MateriManager";

interface MateriClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
}

export default function MateriClient({ user }: MateriClientProps) {
  return (
    <SidebarLayout user={user}>
      <div className="max-w-7xl mx-auto space-y-6">
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Materi...</div>}>
          <MateriManager user={user} />
        </Suspense>
      </div>
    </SidebarLayout>
  );
}
