import React, { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import PenangananClient from "./PenangananClient";

export const revalidate = 0;

export default async function PenangananPage({
  searchParams,
}: {
  searchParams: Promise<any>;
}) {
  // Await the searchParams promise (Next.js 15+ standard) to avoid warning logs
  await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Waka dan BK diizinkan mengakses halaman ini
  if (user.role !== "BK" && user.role !== "WAKA") {
    redirect("/dashboard?error=unauthorized");
  }

  // 1. Filter data siswa dan logs berdasarkan Role
  let studentFilter: any = {
    status: "AKTIF",
    riwayatKelas: {
      some: {
        tahunAjaran: { isActive: true },
      },
    },
  };

  if (user.role === "BK") {
    const bkClasses = await prisma.kelas.findMany({
      where: {
        bkId: user.id,
        tahunAjaran: { isActive: true },
      },
      select: { id: true },
    });
    const bkClassIds = bkClasses.map((c) => c.id);
    if (bkClassIds.length > 0) {
      studentFilter = {
        status: "AKTIF",
        riwayatKelas: {
          some: {
            kelasId: { in: bkClassIds },
            tahunAjaran: { isActive: true },
          },
        },
      };
    } else {
      studentFilter = {
        id: "none",
      };
    }
  }

  // 2. Ambil list siswa untuk form input (hanya jika BK)
  let students: any[] = [];
  if (user.role === "BK") {
    // Ambil settings di awal
    const settingsList = await prisma.appSetting.findMany();
    const settings: Record<string, string> = {};
    settingsList.forEach((s) => {
      settings[s.key] = s.value;
    });

    const activeTA = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });

    const rangeMulai = activeTA
      ? (activeTA.semesterAktif === "GANJIL" ? activeTA.ganjilMulai : activeTA.genapMulai)
      : null;
    const rangeSelesai = activeTA
      ? (activeTA.semesterAktif === "GANJIL" ? activeTA.ganjilSelesai : activeTA.genapSelesai)
      : null;

    const threshold1 = parseInt(settings.threshold_1 || "25", 10);
    const threshold2 = parseInt(settings.threshold_2 || "50", 10);
    const threshold3 = parseInt(settings.threshold_3 || "75", 10);

    const thresholdAlfa1 = parseInt(settings.threshold_alfa_1 || "3", 10);
    const thresholdAlfa2 = parseInt(settings.threshold_alfa_2 || "5", 10);
    const thresholdAlfa3 = parseInt(settings.threshold_alfa_3 || "7", 10);

    const dbStudents = await prisma.siswa.findMany({
      where: studentFilter,
      include: {
        riwayatKelas: {
          where: { tahunAjaran: { isActive: true } },
          include: { kelas: true },
        },
        pelanggaran: {
          where: { status: "APPROVED" },
          include: {
            detailPelanggaran: {
              include: { kategori: true },
            },
          },
        },
        remisi: true,
        pemanggilan: true, // Ambil semua pemanggilan untuk cek status
        absensi: {
          where: {
            status: "A",
            ...(rangeMulai && rangeSelesai ? {
              tanggal: {
                gte: rangeMulai,
                lte: rangeSelesai,
              },
            } : {}),
          },
        },
      },
      orderBy: { nama: "asc" },
    });

    students = dbStudents.map((s) => {
      const totalViolations = s.pelanggaran.reduce((sum, p) => sum + p.detailPelanggaran.poin, 0);
      const totalRemissions = s.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0);
      const netPoints = Math.max(0, totalViolations - totalRemissions);

      const activeWarnings: any[] = [];

      // Point-based warnings calculation
      let maxTriggeredPointsLevel = 0;
      let maxThresholdPoints = 0;
      s.pemanggilan.forEach((p) => {
        if (p.thresholdPoints <= 100) {
          const lvl = p.thresholdPoints === threshold3 ? 3 : p.thresholdPoints === threshold2 ? 2 : 1;
          if (lvl > maxTriggeredPointsLevel) {
            maxTriggeredPointsLevel = lvl;
            maxThresholdPoints = p.thresholdPoints;
          }
        }
      });
      let qualifiedPointsLevel = 0;
      let qualifiedPointsThreshold = 0;
      if (netPoints >= threshold3) { qualifiedPointsLevel = 3; qualifiedPointsThreshold = threshold3; }
      else if (netPoints >= threshold2) { qualifiedPointsLevel = 2; qualifiedPointsThreshold = threshold2; }
      else if (netPoints >= threshold1) { qualifiedPointsLevel = 1; qualifiedPointsThreshold = threshold1; }

      if (qualifiedPointsLevel > maxTriggeredPointsLevel) {
        maxTriggeredPointsLevel = qualifiedPointsLevel;
        maxThresholdPoints = qualifiedPointsThreshold;
      }

      if (maxTriggeredPointsLevel > 0) {
        const dbWarning = s.pemanggilan.find((w) => w.thresholdPoints === maxThresholdPoints);
        const status = dbWarning ? dbWarning.status : "PENDING";
        if (status === "PENDING") {
          activeWarnings.push({
            id: dbWarning ? dbWarning.id : `virtual-${maxThresholdPoints}`,
            level: maxTriggeredPointsLevel,
            thresholdPoints: maxThresholdPoints,
            tanggal: dbWarning ? dbWarning.createdAt.toISOString() : new Date().toISOString(),
          });
        }
      }

      // Alpha-based warnings calculation
      const alphaCount = s.absensi?.length || 0;
      let maxTriggeredAlfaLevel = 0;
      let maxThresholdAlfaPoints = 0;
      s.pemanggilan.forEach((p) => {
        if (p.thresholdPoints > 100) {
          const thresholdAlfaVal = p.thresholdPoints - 100;
          const lvl = thresholdAlfaVal === thresholdAlfa3 ? 3 : thresholdAlfaVal === thresholdAlfa2 ? 2 : 1;
          if (lvl > maxTriggeredAlfaLevel) {
            maxTriggeredAlfaLevel = lvl;
            maxThresholdAlfaPoints = p.thresholdPoints;
          }
        }
      });
      let qualifiedAlfaLevel = 0;
      let qualifiedAlfaThreshold = 0;
      if (alphaCount >= thresholdAlfa3) { qualifiedAlfaLevel = 3; qualifiedAlfaThreshold = 100 + thresholdAlfa3; }
      else if (alphaCount >= thresholdAlfa2) { qualifiedAlfaLevel = 2; qualifiedAlfaThreshold = 100 + thresholdAlfa2; }
      else if (alphaCount >= thresholdAlfa1) { qualifiedAlfaLevel = 1; qualifiedAlfaThreshold = 100 + thresholdAlfa1; }

      if (qualifiedAlfaLevel > maxTriggeredAlfaLevel) {
        maxTriggeredAlfaLevel = qualifiedAlfaLevel;
        maxThresholdAlfaPoints = qualifiedAlfaThreshold;
      }

      if (maxTriggeredAlfaLevel > 0) {
        const dbWarning = s.pemanggilan.find((w) => w.thresholdPoints === maxThresholdAlfaPoints);
        const status = dbWarning ? dbWarning.status : "PENDING";
        if (status === "PENDING") {
          activeWarnings.push({
            id: dbWarning ? dbWarning.id : `virtual-${maxThresholdAlfaPoints}`,
            level: maxTriggeredAlfaLevel,
            thresholdPoints: maxThresholdAlfaPoints,
            tanggal: dbWarning ? dbWarning.createdAt.toISOString() : new Date().toISOString(),
          });
        }
      }

      return {
        id: s.id,
        nis: s.nis,
        nama: s.nama,
        kelasNama: s.riwayatKelas[0]?.kelas.nama || "-",
        points: netPoints,
        violations: s.pelanggaran.map((p) => ({
          id: p.id,
          nama: p.detailPelanggaran.nama,
          kategori: p.detailPelanggaran.kategori.nama,
          poin: p.detailPelanggaran.poin,
          tanggal: p.tanggal.toISOString(),
        })),
        activeWarnings,
      };
    });
  }

  // 3. Ambil log penanganan siswa
  const dbLogs = await prisma.penangananSiswa.findMany({
    where: {
      siswa: studentFilter,
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
      petugas: true,
    },
    orderBy: {
      tanggal: "desc",
    },
  });

  const logs = dbLogs.map((l) => ({
    id: l.id,
    siswaNama: l.siswa.nama,
    siswaNis: l.siswa.nis,
    kelasNama: l.siswa.riwayatKelas[0]?.kelas.nama || "-",
    kasus: l.kasus,
    solusi: l.solusi,
    bukti: l.bukti,
    petugasNama: l.petugas.nama,
    tanggal: l.tanggal.toISOString(),
  }));

  // 4. Ambil list kelas untuk filter di log
  let classesFilter: any = {
    tahunAjaran: { isActive: true },
  };
  if (user.role === "BK") {
    classesFilter.bkId = user.id;
  }
  const classes = await prisma.kelas.findMany({
    where: classesFilter,
    orderBy: { nama: "asc" },
  });

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">Penanganan Siswa</h1>
        <p className="text-sm text-slate-400 mt-1">
          {user.role === "BK"
            ? "Catat penanganan, solusi, serta unggah bukti dokumen bimbingan & konseling terhadap siswa."
            : "Lihat log riwayat bimbingan & konseling/penanganan siswa di sekolah."}
        </p>
      </div>

      <Suspense fallback={<div className="text-white text-sm">Memuat data penanganan...</div>}>
        <PenangananClient user={user} students={students} initialLogs={logs} classes={classes.map(c => c.nama)} />
      </Suspense>
    </SidebarLayout>
  );
}
