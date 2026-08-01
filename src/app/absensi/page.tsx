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
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const { classId, date } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["BK", "WAKA", "WALAS", "GURU", "SEKRETARIS"];
  if (!user || !allowedRoles.includes(user.role)) {
    redirect("/dashboard?error=unauthorized");
  }

  // Filter kelas berdasarkan peran user
  const classWhereFilter: any = {
    tahunAjaran: {
      isActive: true,
    },
  };

  if (user.role === "SEKRETARIS") {
    classWhereFilter.sekretarisId = user.id;
  } else if (user.role === "BK") {
    classWhereFilter.bkId = user.id;
  } else if (user.role === "WALAS") {
    classWhereFilter.walasId = user.id;
  }

  // Ambil kelas aktif di tahun ajaran berjalan yang ditugaskan ke user beserta daftar siswanya
  const dbClasses = await prisma.kelas.findMany({
    where: classWhereFilter,
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
    sekretarisId: c.sekretarisId,
    siswa: c.siswaKelas.map((sk) => sk.siswa).sort((a, b) => a.nama.localeCompare(b.nama)),
  }));
  classes.sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' }));

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

      <AbsensiClient
        classes={classes}
        settings={settings}
        holidays={holidays}
        initialClassId={classId || ""}
        initialDate={date || ""}
        userRole={user.role}
      />
    </SidebarLayout>
  );
}
