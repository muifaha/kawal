import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import RujukanClient from "./RujukanClient";

export const revalidate = 0;

export default async function RujukanPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // 1. Ambil seluruh Kelas dan Siswa Aktif untuk dirujuk
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

  // 2. Ambil Riwayat Rujukan BK
  let rawReferrals: any[] = [];

  if (user.role === "BK" || user.role === "WAKA") {
    rawReferrals = await prisma.rujukanSiswa.findMany({
      include: {
        siswa: {
          include: {
            riwayatKelas: {
              where: { tahunAjaran: { isActive: true } },
              include: { kelas: true },
            },
          },
        },
        pembuat: true,
      },
      orderBy: {
        tanggal: "desc",
      },
    });
  } else {
    rawReferrals = await prisma.rujukanSiswa.findMany({
      where: {
        pembuatId: user.id,
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
        pembuat: true,
      },
      orderBy: {
        tanggal: "desc",
      },
    });
  }

  const referrals = rawReferrals.map((ref) => ({
    id: ref.id,
    siswaId: ref.siswaId,
    studentName: ref.siswa.nama,
    studentNis: ref.siswa.nis,
    kelasNama: ref.siswa.riwayatKelas[0]?.kelas.nama || "-",
    pembuatNama: ref.pembuat.nama,
    pembuatRole: ref.pembuat.role,
    kategori: ref.kategori,
    deskripsi: ref.deskripsi,
    status: ref.status,
    tindakLanjut: ref.tindakLanjut,
    tanggal: ref.tanggal,
  }));

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">Sistem Rujukan BK</h1>
        <p className="text-sm text-slate-400 mt-1">
          Rujuk siswa ke Bimbingan Konseling atas temuan indikasi emosional, akademis, perilaku, atau kebutuhan bimbingan khusus.
        </p>
      </div>

      <RujukanClient user={user} classes={classes} initialReferrals={referrals} />
    </SidebarLayout>
  );
}
