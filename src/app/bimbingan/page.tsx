import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import BimbinganClient from "./BimbinganClient";

export const revalidate = 0;

export default async function BimbinganPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Hanya BK, WAKA, dan WALAS yang diizinkan masuk halaman ini
  if (user.role !== "BK" && user.role !== "WAKA" && user.role !== "WALAS") {
    redirect("/dashboard");
  }

  // 1. Ambil seluruh Kelas dan Siswa Aktif untuk dicatat bimbingannya
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

  // 2. Ambil Riwayat Bimbingan Konseling berdasarkan Hak Akses
  let rawHistory: any[] = [];

  if (user.role === "BK" || user.role === "WAKA") {
    rawHistory = await prisma.bimbinganKonseling.findMany({
      include: {
        siswa: {
          include: {
            riwayatKelas: {
              where: { tahunAjaran: { isActive: true } },
              include: { kelas: true },
            },
          },
        },
        pembimbing: true,
      },
      orderBy: {
        tanggal: "desc",
      },
    });
  } else if (user.role === "WALAS") {
    const walasClass = await prisma.kelas.findFirst({
      where: {
        walasId: user.id,
        tahunAjaran: { isActive: true },
      },
    });

    if (walasClass) {
      rawHistory = await prisma.bimbinganKonseling.findMany({
        where: {
          siswa: {
            riwayatKelas: {
              some: {
                kelasId: walasClass.id,
                tahunAjaran: { isActive: true },
              },
            },
          },
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
          pembimbing: true,
        },
        orderBy: {
          tanggal: "desc",
        },
      });
    }
  }

  const isAuthorizedToSeeConfidential = user.role === "BK" || user.role === "WAKA";

  const history = rawHistory.map((h) => ({
    id: h.id,
    siswaId: h.siswaId,
    studentName: h.siswa.nama,
    studentNis: h.siswa.nis,
    kelasNama: h.siswa.riwayatKelas[0]?.kelas.nama || "-",
    pembimbingNama: h.pembimbing.nama,
    bidang: h.bidang,
    masalah: h.masalah,
    solusi: h.solusi,
    catatanRahasia: isAuthorizedToSeeConfidential ? h.catatanRahasia : null,
    tanggal: h.tanggal,
  }));

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">Bimbingan & Konseling Siswa</h1>
        <p className="text-sm text-slate-400 mt-1">
          Modul pencatatan bimbingan umum non-pelanggaran terbagi menjadi 4 bidang utama (Pribadi, Sosial, Belajar, dan Karir).
        </p>
      </div>

      <BimbinganClient user={user} classes={classes} initialHistory={history} />
    </SidebarLayout>
  );
}
