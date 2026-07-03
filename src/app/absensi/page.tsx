import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import AbsensiClient from "./AbsensiClient";

export const revalidate = 0;

export default async function AbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Hanya Guru BK yang diizinkan mengakses halaman ini
  if (user.role !== "BK") {
    redirect("/dashboard?error=unauthorized");
  }

  // Ambil kelas aktif di tahun ajaran berjalan yang ditugaskan ke Guru BK ini beserta daftar siswanya
  const dbClasses = await prisma.kelas.findMany({
    where: {
      tahunAjaran: {
        isActive: true,
      },
      bkId: user.id,
    },
    include: {
      siswaKelas: {
        where: {
          siswa: {
            status: "AKTIF",
          },
        },
        include: {
          siswa: true,
        },
      },
    },
    orderBy: {
      nama: "asc",
    },
  });

  const classes = dbClasses.map((c) => ({
    id: c.id,
    nama: c.nama,
    tahunAjaranId: c.tahunAjaranId,
    walasId: c.walasId,
    bkId: c.bkId,
    siswa: c.siswaKelas.map((sk) => sk.siswa).sort((a, b) => a.nama.localeCompare(b.nama)),
  }));

  // Ambil settings untuk libur sabtu/minggu
  const settingsList = await prisma.appSetting.findMany();
  const settings: Record<string, string> = {};
  settingsList.forEach((s) => {
    settings[s.key] = s.value;
  });

  // Ambil daftar hari libur nasional
  const dbHolidays = await prisma.hariLibur.findMany();
  const holidays = dbHolidays.map((h) => ({
    date: h.tanggal.toISOString().split("T")[0],
    keterangan: h.keterangan,
  }));

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">Catat Absensi Harian</h1>
        <p className="text-sm text-slate-400 mt-1">
          Pilih kelas, tanggal, dan ubah kehadiran siswa dengan cepat menggunakan mouse atau tombol keyboard.
        </p>
      </div>

      <AbsensiClient classes={classes} settings={settings} holidays={holidays} initialClassId={classId || ""} />
    </SidebarLayout>
  );
}
