import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import KesiswaanClient from "./KesiswaanClient";

export const revalidate = 0;

export default async function KesiswaanPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Hanya Waka Kesiswaan yang memiliki wewenang mengelola data master
  if (user.role !== "WAKA") {
    redirect("/dashboard?error=unauthorized");
  }

  // 1. Ambil data Pengguna (Guru / BK / Walas / Waka)
  const users = await prisma.user.findMany({
    orderBy: { nama: "asc" },
  });

  // 2. Ambil data Kelas aktif
  const classes = await prisma.kelas.findMany({
    where: {
      tahunAjaran: { isActive: true },
    },
    include: {
      walas: true,
      bk: true, // Tambahkan include Guru BK
      tahunAjaran: true,
    },
    orderBy: { nama: "asc" },
  });

  // 3. Ambil data Siswa aktif di tahun ajaran aktif
  const dbStudents = await prisma.siswa.findMany({
    where: {
      status: "AKTIF",
      riwayatKelas: {
        some: {
          tahunAjaran: { isActive: true },
        },
      },
    },
    include: {
      riwayatKelas: {
        where: {
          tahunAjaran: { isActive: true },
        },
        include: {
          kelas: true,
        },
      },
    },
    orderBy: { nama: "asc" },
  });

  const students = dbStudents.map((s) => ({
    id: s.id,
    nis: s.nis,
    nama: s.nama,
    status: s.status,
    kelasId: s.riwayatKelas[0]?.kelas.id || "",
    kelas: s.riwayatKelas[0]?.kelas || null,
  }));

  // 4. Ambil data Kategori & Detail Pelanggaran
  const violationCategories = await prisma.kategoriPelanggaran.findMany({
    include: {
      details: {
        orderBy: { nama: "asc" },
      },
    },
    orderBy: { nama: "asc" },
  });

  // 5. Ambil data Master Remisi
  const masterRemisiList = await prisma.masterRemisi.findMany({
    orderBy: { nama: "asc" },
  });

  // 6. Ambil data Hari Libur
  const holidayList = await prisma.hariLibur.findMany({
    orderBy: { tanggal: "asc" },
  });

  // 7. Ambil data Tahun Ajaran
  const tahunAjaranList = await prisma.tahunAjaran.findMany({
    orderBy: { nama: "desc" },
  });

  // 8. Ambil data settings
  const settingsList = await prisma.appSetting.findMany();
  const settings: Record<string, string> = {};
  settingsList.forEach((s) => {
    settings[s.key] = s.value;
  });
  const loggedInWaka = users.find((u) => u.id === user.id) || null;

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">Manajemen Kesiswaan (Master Admin)</h1>
        <p className="text-sm text-slate-400 mt-1">
          Pusat kendali data master sekolah. Tambah, perbarui, dan hapus akun guru, siswa, kelas aktif, serta instrumen pelanggaran.
        </p>
      </div>

      <KesiswaanClient
        initialUsers={users}
        initialClasses={classes}
        initialStudents={students}
        categories={violationCategories}
        initialRemissions={masterRemisiList}
        initialHolidays={holidayList}
        initialTahunAjaran={tahunAjaranList}
        settings={settings}
        wakaUser={loggedInWaka}
      />
    </SidebarLayout>
  );
}
