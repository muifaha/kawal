import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarLayout from "@/components/SidebarLayout";
import { redirect } from "next/navigation";
import RekapPelanggaranClient from "./RekapPelanggaranClient";

export const revalidate = 0;

export default async function RekapPelanggaranPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["BK", "WAKA", "WALAS", "GURU", "SEKRETARIS", "PIKET"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard?error=unauthorized");
  }

  const classWhereFilter: any = {
    tahunAjaran: {
      isActive: true,
    },
  };

  let studentFilter: any = {};

  if (user.role === "WALAS") {
    classWhereFilter.walasId = user.id;
    const walasClasses = await prisma.kelas.findMany({
      where: classWhereFilter,
      select: { id: true },
    });
    const walasClassIds = walasClasses.map((c) => c.id);
    studentFilter = {
      riwayatKelas: {
        some: {
          kelasId: { in: walasClassIds },
          tahunAjaran: { isActive: true },
        },
      },
    };
  } else if (user.role === "SEKRETARIS") {
    classWhereFilter.sekretarisId = user.id;
    const sekrClasses = await prisma.kelas.findMany({
      where: classWhereFilter,
      select: { id: true },
    });
    const sekrClassIds = sekrClasses.map((c) => c.id);
    studentFilter = {
      riwayatKelas: {
        some: {
          kelasId: { in: sekrClassIds },
          tahunAjaran: { isActive: true },
        },
      },
    };
  } else if (user.role === "BK") {
    classWhereFilter.bkId = user.id;
  }

  const dbClasses = await prisma.kelas.findMany({
    where: {
      tahunAjaran: {
        isActive: true,
      },
    },
    select: {
      id: true,
      nama: true,
    },
    orderBy: {
      nama: "asc",
    },
  });

  const classes = dbClasses
    .map((c) => ({
      id: c.id,
      nama: c.nama,
    }))
    .sort((a, b) =>
      a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: "base" })
    );

  const activeTA = await prisma.tahunAjaran.findFirst({
    where: { isActive: true },
  });

  const isGanjil = activeTA?.semesterAktif === "GANJIL";
  const startDate = activeTA ? (isGanjil ? activeTA.ganjilMulai : activeTA.genapMulai) : undefined;
  const endDate = activeTA ? (isGanjil ? activeTA.ganjilSelesai : activeTA.genapSelesai) : undefined;

  const attendanceFilter: any = {
    siswa: studentFilter,
  };
  if (startDate && endDate) {
    attendanceFilter.tanggal = {
      gte: startDate,
      lte: endDate,
    };
  }

  // 1. Reports (Laporan Pelanggaran)
  const reports = await prisma.laporanPelanggaran.findMany({
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
      detailPelanggaran: { include: { kategori: true } },
      pelapor: true,
    },
    orderBy: { tanggal: "desc" },
  });

  // 2. Remissions (Transaksi Remisi)
  const remissions = await prisma.transaksiRemisi.findMany({
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
      masterRemisi: true,
      approver: true,
    },
    orderBy: { tanggal: "desc" },
  });

  // 3. Handlings (Penanganan Siswa)
  const handlings = await prisma.penangananSiswa.findMany({
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
    orderBy: { tanggal: "desc" },
  });

  const violationRecapPart = reports.map((r) => ({
    id: r.id,
    studentName: r.siswa.nama,
    studentNis: r.siswa.nis,
    kelasNama: r.siswa.riwayatKelas[0]?.kelas.nama || "-",
    violationName: r.detailPelanggaran.nama,
    kategoriNama: r.detailPelanggaran.kategori.nama,
    poin: r.detailPelanggaran.poin,
    tanggal: r.tanggal.toISOString(),
    status: r.status,
    pelaporName: r.pelapor.nama,
    notes: r.notes,
    isCensored: r.isCensored,
  }));

  const remissionRecapPart = remissions.map((rem) => ({
    id: rem.id,
    studentName: rem.siswa.nama,
    studentNis: rem.siswa.nis,
    kelasNama: rem.siswa.riwayatKelas[0]?.kelas.nama || "-",
    violationName:
      rem.jenis === "OTOMATIS"
        ? "Remisi Otomatis (Clean Period)"
        : `Remisi: ${rem.masterRemisi?.nama || "Kondisional"}`,
    kategoriNama: "REMISI",
    poin: -rem.poinDikurangi,
    tanggal: rem.tanggal.toISOString(),
    status: "APPROVED",
    pelaporName: rem.approver?.nama || "Sistem",
    notes:
      rem.jenis === "OTOMATIS"
        ? "Pengurangan poin otomatis karena bersih dari pelanggaran selama 30 hari."
        : "Pengurangan poin melalui tindakan remisi.",
    isCensored: false,
  }));

  const handlingRecapPart = handlings.map((h) => ({
    id: h.id,
    studentName: h.siswa.nama,
    studentNis: h.siswa.nis,
    kelasNama: h.siswa.riwayatKelas[0]?.kelas.nama || "-",
    violationName: h.kasus,
    kategoriNama: "PENANGANAN",
    poin: 0,
    tanggal: h.tanggal.toISOString(),
    status: "APPROVED",
    pelaporName: h.petugas.nama,
    notes: h.solusi,
    isCensored: false,
  }));

  const violationRecap = [...violationRecapPart, ...remissionRecapPart, ...handlingRecapPart].sort(
    (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
  );

  // 4. Attendance Data (for Student Detail View)
  const studentsWithClass = await prisma.siswa.findMany({
    where: studentFilter,
    include: {
      riwayatKelas: {
        where: { tahunAjaran: { isActive: true } },
        include: { kelas: true },
      },
    },
    orderBy: { nama: "asc" },
  });

  const attendanceRecords = await prisma.absensi.findMany({
    where: attendanceFilter,
  });

  const attendanceMap: Record<string, { H: number; S: number; I: number; A: number; D: number }> = {};
  studentsWithClass.forEach((s) => {
    attendanceMap[s.id] = { H: 0, S: 0, I: 0, A: 0, D: 0 };
  });

  attendanceRecords.forEach((rec) => {
    if (attendanceMap[rec.siswaId]) {
      const status = rec.status as "H" | "S" | "I" | "A" | "D";
      attendanceMap[rec.siswaId][status]++;
    }
  });

  const attendanceRecap = studentsWithClass.map((s) => {
    const counts = attendanceMap[s.id];
    const totalHari = counts.H + counts.S + counts.I + counts.A + counts.D;
    return {
      studentId: s.id,
      nama: s.nama,
      nis: s.nis,
      kelasNama: s.riwayatKelas[0]?.kelas.nama || "-",
      H: counts.H,
      S: counts.S,
      I: counts.I,
      A: counts.A,
      D: counts.D,
      totalHari,
      netPoints: 0,
    };
  });

  return (
    <SidebarLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
          Rekap Pelanggaran
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Tampilan rekapitulasi poin pelanggaran, riwayat laporan, dan statistik pelanggaran siswa.
        </p>
      </div>

      <RekapPelanggaranClient
        user={user}
        classes={classes}
        violationRecap={violationRecap}
        attendanceRecap={attendanceRecap}
      />
    </SidebarLayout>
  );
}
