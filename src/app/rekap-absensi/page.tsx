import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import RekapAbsensiClient from "./RekapAbsensiClient";

export const revalidate = 0;

export default async function RekapAbsensiPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["BK", "WAKA", "WALAS", "GURU", "SEKRETARIS"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard?error=unauthorized");
  }

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

  const dbClasses = await prisma.kelas.findMany({
    where: classWhereFilter,
    select: {
      id: true,
      nama: true,
    },
    orderBy: {
      nama: "asc",
    },
  });

  const classes = dbClasses.map((c) => ({
    id: c.id,
    nama: c.nama,
  })).sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' }));

  const settingsList = await prisma.appSetting.findMany();
  const settings: Record<string, string> = {};
  settingsList.forEach((s) => {
    settings[s.key] = s.value;
  });

  const dbHolidays = await prisma.hariLibur.findMany();
  const holidays = dbHolidays.map((h) => ({
    date: h.tanggal.toISOString().split("T")[0],
    keterangan: h.keterangan,
  }));

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
          Rekap Matriks Kehadiran Bulanan
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Tampilan matriks tanggal (1 s.d. 31) beserta statistik kehadiran dan poin pelanggaran siswa.
        </p>
      </div>

      <RekapAbsensiClient
        classes={classes}
        settings={settings}
        holidays={holidays}
        userRole={user.role}
      />
    </SidebarLayout>
  );
}
