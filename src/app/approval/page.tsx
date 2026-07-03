import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import ApprovalClient from "./ApprovalClient";

export const revalidate = 0;

export default async function ApprovalPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Hanya Guru BK yang memiliki akses ke halaman approval
  if (user.role !== "BK") {
    redirect("/dashboard?error=unauthorized");
  }

  // Ambil Kategori Pelanggaran (Parent & Child)
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

  // Ambil semua laporan pelanggaran yang berstatus PENDING
  // Urutkan berdasarkan tanggal terlama (asc) agar diproses sesuai urutan masuk
  const pendingReports = await prisma.laporanPelanggaran.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      siswa: {
        include: {
          riwayatKelas: {
            where: {
              tahunAjaran: { isActive: true },
            },
            include: {
              kelas: true,
            },
          },
          // Ambil riwayat poin saat ini (yg sudah APPROVED) untuk info visual di detail pane
          pelanggaran: {
            where: { status: "APPROVED" },
            include: { detailPelanggaran: true },
          },
          remisi: true,
        },
      },
      detailPelanggaran: {
        include: {
          kategori: true,
        },
      },
      pelapor: true,
    },
    orderBy: {
      tanggal: "asc",
    },
  });

  // Transformasikan data agar menyertakan hitungan poin berjalan siswa
  const transformedReports = pendingReports.map((report) => {
    const totalViolations = report.siswa.pelanggaran.reduce(
      (sum, v) => sum + v.detailPelanggaran.poin,
      0
    );
    const totalRemissions = report.siswa.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0);
    const currentPoints = Math.max(0, totalViolations - totalRemissions);

    return {
      id: report.id,
      siswaId: report.siswa.id,
      siswaNama: report.siswa.nama,
      siswaNis: report.siswa.nis,
      siswaKelas: report.siswa.riwayatKelas[0]?.kelas.nama || "-",
      currentPoints: currentPoints,
      violationDetailId: report.detailPelanggaran.id,
      violationName: report.detailPelanggaran.nama,
      violationCategory: report.detailPelanggaran.kategori.nama,
      violationPoin: report.detailPelanggaran.poin,
      pelaporNama: report.pelapor.nama,
      pelaporRole: report.pelapor.role,
      tanggal: report.tanggal,
      notes: report.notes,
    };
  });

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">Persetujuan Pelanggaran</h1>
        <p className="text-sm text-slate-400 mt-1">
          Daftar laporan pelanggaran siswa yang diajukan oleh guru piket dan wali kelas. Setujui untuk meresmikan penambahan poin.
        </p>
      </div>

      <ApprovalClient initialReports={transformedReports} categories={categories} />
    </SidebarLayout>
  );
}
