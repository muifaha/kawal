import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import ViolationClient from "./ViolationClient";

export const revalidate = 0;

export default async function PelanggaranPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // 1. Ambil Kategori Pelanggaran (Parent & Child)
  const categories = await prisma.kategoriPelanggaran.findMany({
    include: {
      details: {
        orderBy: {
          nama: "asc",
        },
      },
    },
    orderBy: {
      nama: "asc",
    },
  });

  // 2. Ambil seluruh Kelas dan Siswa Aktif untuk dilaporkan
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

  // 3. Ambil Riwayat Pelanggaran berdasarkan Hak Akses
  let rawHistory: any[] = [];

  if (user.role === "BK") {
    // BK melihat seluruh laporan beserta status persetujuannya (Pending, Approved, Rejected)
    rawHistory = await prisma.laporanPelanggaran.findMany({
      include: {
        siswa: {
          include: {
            riwayatKelas: {
              where: { tahunAjaran: { isActive: true } },
              include: { kelas: true },
            },
          },
        },
        detailPelanggaran: {
          include: { kategori: true },
        },
        pelapor: true,
      },
      orderBy: {
        tanggal: "desc",
      },
    });
  } else {
    // Wali Kelas, Guru, dan Waka melihat riwayat laporan yang mereka usulkan sendiri beserta statusnya
    rawHistory = await prisma.laporanPelanggaran.findMany({
      where: {
        pelaporId: user.id,
      },
      include: {
        siswa: {
          include: {
            riwayatKelas: {
              where: { tahunAjaran: { isActive: true } },
              include: { kelas: true },
            },
          },
        },
        detailPelanggaran: {
          include: { kategori: true },
        },
        pelapor: true,
      },
      orderBy: {
        tanggal: "desc",
      },
    });
  }

  const history = rawHistory.map((h) => ({
    ...h,
    siswa: {
      ...h.siswa,
      kelas: h.siswa.riwayatKelas[0]?.kelas || null,
    },
  }));

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">Laporan Pelanggaran Siswa</h1>
        <p className="text-sm text-slate-400 mt-1">
          Laporkan poin pelanggaran baru bagi siswa. Riwayat pelanggaran hanya dapat diakses oleh Wali Kelas dan Guru BK.
        </p>
      </div>

      <ViolationClient user={user} classes={classes} categories={categories} initialHistory={history} />
    </SidebarLayout>
  );
}
