"use client";

import React from "react";
import SidebarLayout from "@/components/SidebarLayout";
import PenilaianManager from "@/components/PenilaianManager";

interface PenilaianClientProps {
  user: {
    id: string;
    username: string;
    role: string;
    nama: string;
  };
}

export default function PenilaianClient({ user }: PenilaianClientProps) {
  return (
    <SidebarLayout user={user}>
      <div className="max-w-7xl mx-auto space-y-6">
        <PenilaianManager user={user} defaultMode="KELAS" />
      </div>
    </SidebarLayout>
  );
}
