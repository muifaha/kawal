import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import AdministrasiClient from "./AdministrasiClient";

export const revalidate = 0;

export default async function AdministrasiPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "WAKA" && user.role !== "WALAS" && user.role !== "GURU")) {
    redirect("/dashboard");
  }

  // 1. Ambil Tahun Pelajaran Aktif
  const activeTA = await prisma.tahunAjaran.findFirst({
    where: { isActive: true },
  });

  // 2. Ambil Daftar Kelas
  const classes = await prisma.kelas.findMany({
    where: {
      tahunAjaran: { isActive: true },
    },
    include: {
      walas: true,
      tahunAjaran: true,
    },
    orderBy: { nama: "asc" },
  });
  classes.sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: "base" }));

  // 3. Ambil Daftar Mata Pelajaran
  const mapelList = await prisma.mataPelajaran.findMany({
    orderBy: { nama: "asc" },
  });

  // 4. Ambil Pengaturan Sekolah
  const settingsList = await prisma.appSetting.findMany();
  const schoolSettings: Record<string, string> = {};
  settingsList.forEach((s) => {
    schoolSettings[s.key] = s.value;
  });

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
          Cetak Administrasi Guru (Buku Administrasi Per Kelas)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Cetak paket dokumen lengkap administrasi guru per kelas (Sampul, Tupoksi, Agenda Kegiatan, Daftar Hadir, Rekap Nilai Formatif & Sumatif, Rekap Rapor, dan Lembar Pengesahan) siap cetak ke PDF.
        </p>
      </div>

      <AdministrasiClient
        user={user}
        classes={classes}
        mapelList={mapelList}
        activeTA={activeTA}
        schoolSettings={schoolSettings}
      />
    </SidebarLayout>
  );
}
