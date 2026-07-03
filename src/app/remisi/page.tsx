import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import RemisiClient from "./RemisiClient";

export const revalidate = 0;

export default async function RemisiPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Hanya Guru BK yang diizinkan mengakses halaman pengelolaan remisi
  if (user.role !== "BK") {
    redirect("/dashboard?error=unauthorized");
  }

  // 1. Ambil data kelas dan siswa aktif untuk form drop-down
  const dbClasses = await prisma.kelas.findMany({
    where: {
      tahunAjaran: { isActive: true },
    },
    include: {
      siswaKelas: {
        where: {
          siswa: { status: "AKTIF" },
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

  // 2. Ambil daftar master remisi kondisional
  const masterRemisiList = await prisma.masterRemisi.findMany({
    orderBy: { nama: "asc" },
  });

  // 3. Ambil log riwayat transaksi remisi yang sudah pernah terjadi
  const dbHistory = await prisma.transaksiRemisi.findMany({
    include: {
      siswa: {
        include: {
          riwayatKelas: {
            where: { tahunAjaran: { isActive: true } },
            include: { kelas: true },
          },
        },
      },
      masterRemisi: true,
      approver: true,
    },
    orderBy: {
      tanggal: "desc",
    },
  });

  const history = dbHistory.map((h) => ({
    ...h,
    siswa: {
      ...h.siswa,
      kelas: h.siswa.riwayatKelas[0]?.kelas || null,
    },
  }));

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">Remisi (Pengurangan Poin)</h1>
        <p className="text-sm text-slate-400 mt-1">
          Kelola potongan poin pelanggaran siswa. Mendukung pemberian remisi kondisional manual dan pemindaian remisi otomatis bulanan.
        </p>
      </div>

      <RemisiClient classes={classes} masterRemisiList={masterRemisiList} initialHistory={history} />
    </SidebarLayout>
  );
}
