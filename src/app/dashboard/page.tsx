import React from "react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { checkAndApplyAutomaticRemissions } from "@/app/actions/remisi";

export const revalidate = 0; // Disable caching to ensure real-time statistics

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Pemicu remisi otomatis di background ( rolling 20 hari clean period )
  await checkAndApplyAutomaticRemissions();

  const activeTA = await prisma.tahunAjaran.findFirst({
    where: { isActive: true },
  });

  const rangeMulai = activeTA
    ? (activeTA.semesterAktif === "GANJIL" ? activeTA.ganjilMulai : activeTA.genapMulai)
    : null;
  const rangeSelesai = activeTA
    ? (activeTA.semesterAktif === "GANJIL" ? activeTA.ganjilSelesai : activeTA.genapSelesai)
    : null;


  // Ambil settings di awal
  const settingsList = await prisma.appSetting.findMany();
  const settings: Record<string, string> = {};
  settingsList.forEach((s) => {
    settings[s.key] = s.value;
  });

  // 2. Filter data berdasarkan Role Walas (di tahun ajaran aktif)
  let studentFilter: any = {
    status: "AKTIF",
    riwayatKelas: {
      some: {
        tahunAjaran: { isActive: true },
      },
    },
  };

  if (user.role === "WALAS") {
    const walasClass = await prisma.kelas.findFirst({
      where: {
        walasId: user.id,
        tahunAjaran: { isActive: true },
      },
    });
    if (walasClass) {
      studentFilter = {
        status: "AKTIF",
        riwayatKelas: {
          some: {
            kelasId: walasClass.id,
            tahunAjaran: { isActive: true },
          },
        },
      };
    } else {
      studentFilter = {
        id: "none",
      };
    }
  } else if (user.role === "BK") {
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

  // Date filter for active semester
  let attendanceFilter: any = {
    siswa: studentFilter,
  };

  if (activeTA) {
    const isGanjil = activeTA.semesterAktif === "GANJIL";
    const startDate = isGanjil ? activeTA.ganjilMulai : activeTA.genapMulai;
    const endDate = isGanjil ? activeTA.ganjilSelesai : activeTA.genapSelesai;

    if (startDate || endDate) {
      attendanceFilter.tanggal = {};
      if (startDate) {
        attendanceFilter.tanggal.gte = new Date(startDate);
      }
      if (endDate) {
        attendanceFilter.tanggal.lte = new Date(endDate);
      }
    }
  }

  // 3. Query Daftar Kelas untuk filter (hanya di tahun ajaran aktif)
  let classesFilter: any = {
    tahunAjaran: { isActive: true },
  };

  if (user.role === "WALAS") {
    classesFilter.walasId = user.id;
  } else if (user.role === "BK") {
    classesFilter.bkId = user.id;
  }

  const classes = await prisma.kelas.findMany({
    where: classesFilter,
    orderBy: { nama: "asc" },
  });
  classes.sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' }));

  // 4. Query Statistik Utama
  const totalSiswa = await prisma.siswa.count({
    where: studentFilter,
  });

  // Hitung jumlah absensi hari ini (tidak hadir) dengan timezone-safe Jakarta
  const getJakartaDateParts = () => {
    const options = { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" } as const;
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    return { y, m, d };
  };

  const { y: jkY, m: jkM, d: jkD } = getJakartaDateParts();
  const todayJakartaStr = `${jkY}-${jkM}-${jkD}`;
  const today = new Date(`${todayJakartaStr}T00:00:00.000Z`);

  // Check if today is a holiday
  const todayHoliday = await prisma.hariLibur.findFirst({
    where: {
      tanggal: today,
    },
  });

  const dayOfWeek = today.getUTCDay(); // 0 = Minggu, 6 = Sabtu
  const isWeekendHoliday =
    (dayOfWeek === 6 && settings.libur_sabtu === "true") ||
    (dayOfWeek === 0 && settings.libur_minggu !== "false");

  let attendanceRate: number | string = 100;

  if (todayHoliday) {
    attendanceRate = "Hari Libur";
  } else if (isWeekendHoliday) {
    attendanceRate = "Hari Libur";
  } else {
    const totalRecordedToday = await prisma.absensi.count({
      where: {
        tanggal: today,
        siswa: studentFilter,
      },
    });

    if (totalRecordedToday === 0) {
      attendanceRate = "Belum Ada Absensi";
    } else {
      const totalAbsenToday = await prisma.absensi.count({
        where: {
          tanggal: today,
          status: { in: ["S", "I", "A", "D"] },
          siswa: studentFilter,
        },
      });
      attendanceRate = Math.round(((totalRecordedToday - totalAbsenToday) / totalRecordedToday) * 100);
    }
  }

  // Laporan pelanggaran dalam 30 hari terakhir
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const violationsMonthCount = await prisma.laporanPelanggaran.count({
    where: {
      status: "APPROVED",
      tanggal: { gte: thirtyDaysAgo },
      siswa: studentFilter,
    },
  });

  // 5. Query & Hitung akumulasi poin siswa (Top 5 Pelanggar & Siswa Terancam)
  const allActiveStudents = await prisma.siswa.findMany({
    where: studentFilter,
    include: {
      riwayatKelas: {
        where: { tahunAjaran: { isActive: true } },
        include: {
          kelas: {
            include: {
              bk: true,
            },
          },
        },
      },
      pelanggaran: {
        where: { status: "APPROVED" },
        include: { detailPelanggaran: true },
      },
      remisi: true,
      pemanggilan: true,
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
  });


  const studentRankings = allActiveStudents
    .map((student) => {
      const totalViolations = student.pelanggaran.reduce(
        (sum, v) => sum + v.detailPelanggaran.poin,
        0
      );
      const totalRemissions = student.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0);
      const finalPoints = Math.max(0, totalViolations - totalRemissions);

      return {
        id: student.id,
        nama: student.nama,
        nis: student.nis,
        kelas: student.riwayatKelas[0]?.kelas.nama || "-",
        points: finalPoints,
      };
    })
    .sort((a, b) => b.points - a.points);

  const topRankings = studentRankings.slice(0, 5);
  const threatStudentsCount = studentRankings.filter((s) => s.points >= 50).length;

  // 6. Data Rekap Absensi Siswa
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
    };
  });

  // 7. Data Rekap Pelanggaran Siswa & Remisi (Ledger Gabungan)
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
        } 
      },
      detailPelanggaran: { include: { kategori: true } },
      pelapor: true,
    },
    orderBy: { tanggal: "desc" },
  });

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
    violationName: rem.jenis === "OTOMATIS" ? "Remisi Otomatis (Clean Period)" : `Remisi: ${rem.masterRemisi?.nama || "Kondisional"}`,
    kategoriNama: "REMISI",
    poin: -rem.poinDikurangi, // Poin negatif untuk remisi
    tanggal: rem.tanggal.toISOString(),
    status: "APPROVED",
    pelaporName: rem.approver?.nama || "Sistem",
    notes: rem.jenis === "OTOMATIS" ? "Pengurangan poin otomatis karena bersih dari pelanggaran selama 30 hari." : "Pengurangan poin melalui tindakan remisi.",
    isCensored: false,
  }));

  const handlingRecapPart = handlings.map((h) => ({
    id: h.id,
    studentName: h.siswa.nama,
    studentNis: h.siswa.nis,
    kelasNama: h.siswa.riwayatKelas[0]?.kelas.nama || "-",
    violationName: h.kasus,
    kategoriNama: "PENANGANAN",
    poin: 0, // Penanganan tidak menambah/mengurangi poin secara langsung
    tanggal: h.tanggal.toISOString(),
    status: "APPROVED",
    pelaporName: h.petugas.nama,
    notes: h.solusi,
    isCensored: false,
  }));

  // Gabungkan dan urutkan berdasarkan tanggal terbaru
  const violationRecap = [...violationRecapPart, ...remissionRecapPart, ...handlingRecapPart].sort(
    (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
  );

  const dailyAttendance = attendanceRecords.map((r) => {
    const year = r.tanggal.getFullYear();
    const month = String(r.tanggal.getMonth() + 1).padStart(2, "0");
    const day = String(r.tanggal.getDate()).padStart(2, "0");
    return {
      studentId: r.siswaId,
      date: `${year}-${month}-${day}`,
      status: r.status,
    };
  });

  // Query daftar hari libur
  const dbHolidays = await prisma.hariLibur.findMany({
    orderBy: { tanggal: "asc" },
  });
  const holidays = dbHolidays.map((h) => {
    const year = h.tanggal.getFullYear();
    const month = String(h.tanggal.getMonth() + 1).padStart(2, "0");
    const day = String(h.tanggal.getDate()).padStart(2, "0");
    return {
      date: `${year}-${month}-${day}`,
      keterangan: h.keterangan,
    };
  });

  // 8. Kelas Paling Banyak Tidak Hadir Hari Ini
  const todayAbsences = await prisma.absensi.findMany({
    where: {
      tanggal: today,
      status: { in: ["S", "I", "A", "D"] },
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
    },
  });

  const absentClassCounts: Record<string, number> = {};
  todayAbsences.forEach((abs) => {
    const className = abs.siswa.riwayatKelas[0]?.kelas.nama || "-";
    absentClassCounts[className] = (absentClassCounts[className] || 0) + 1;
  });

  const topAbsentClasses = Object.entries(absentClassCounts)
    .map(([nama, count]) => ({ nama, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 9. Siswa dengan Alfa Terbanyak
  const alphaCounts = await prisma.absensi.groupBy({
    by: ["siswaId"],
    where: {
      status: "A",
      siswa: studentFilter,
      ...(attendanceFilter.tanggal ? { tanggal: attendanceFilter.tanggal } : {}),
    },
    _count: {
      siswaId: true,
    },
    orderBy: {
      _count: {
        siswaId: "desc",
      },
    },
    take: 5,
  });

  const alphaStudentIds = alphaCounts.map((item) => item.siswaId);
  const alphaStudentsDetail = await prisma.siswa.findMany({
    where: {
      id: { in: alphaStudentIds },
    },
    include: {
      riwayatKelas: {
        where: { tahunAjaran: { isActive: true } },
        include: { kelas: true },
      },
    },
  });

  const topAlphaStudents = alphaCounts
    .map((item) => {
      const student = alphaStudentsDetail.find((s) => s.id === item.siswaId);
      return {
        nama: student?.nama || "Unknown",
        nis: student?.nis || "-",
        kelas: student?.riwayatKelas[0]?.kelas.nama || "-",
        count: item._count.siswaId,
      };
    })
    .sort((a, b) => b.count - a.count);

  // 10. Kelas dengan Pelanggaran Terbanyak (Frekuensi)
  const approvedViolations = await prisma.laporanPelanggaran.findMany({
    where: {
      status: "APPROVED",
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
    },
  });

  const violationClassCounts: Record<string, number> = {};
  approvedViolations.forEach((v) => {
    const className = v.siswa.riwayatKelas[0]?.kelas.nama || "-";
    violationClassCounts[className] = (violationClassCounts[className] || 0) + 1;
  });

  const topViolationClasses = Object.entries(violationClassCounts)
    .map(([nama, count]) => ({ nama, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Settings sudah dimuat di awal halaman

  const threshold1 = parseInt(settings.threshold_1 || "25", 10);
  const threshold2 = parseInt(settings.threshold_2 || "50", 10);
  const threshold3 = parseInt(settings.threshold_3 || "75", 10);

  const thresholdAlfa1 = parseInt(settings.threshold_alfa_1 || "3", 10);
  const thresholdAlfa2 = parseInt(settings.threshold_alfa_2 || "5", 10);
  const thresholdAlfa3 = parseInt(settings.threshold_alfa_3 || "7", 10);

  // Hitung daftar pemanggilan
  const summonsList: any[] = [];
  allActiveStudents.forEach((student) => {
    // 1. Pemanggilan Berdasarkan Poin Pelanggaran Net
    const totalViolations = student.pelanggaran.reduce(
      (sum, v) => sum + v.detailPelanggaran.poin,
      0
    );
    const totalRemissions = student.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0);
    const netPoints = Math.max(0, totalViolations - totalRemissions);

    let qualifiedPointsLevel = 0;
    let qualifiedPointsThreshold = 0;
    if (netPoints >= threshold3) { qualifiedPointsLevel = 3; qualifiedPointsThreshold = threshold3; }
    else if (netPoints >= threshold2) { qualifiedPointsLevel = 2; qualifiedPointsThreshold = threshold2; }
    else if (netPoints >= threshold1) { qualifiedPointsLevel = 1; qualifiedPointsThreshold = threshold1; }

    let maxTriggeredPointsLevel = 0;
    let maxThresholdPoints = 0;

    student.pemanggilan.forEach((p) => {
      if (p.thresholdPoints <= 100) {
        const lvl = p.thresholdPoints === threshold3 ? 3 : p.thresholdPoints === threshold2 ? 2 : 1;
        if (lvl > maxTriggeredPointsLevel) {
          maxTriggeredPointsLevel = lvl;
          maxThresholdPoints = p.thresholdPoints;
        }
      }
    });

    if (qualifiedPointsLevel > maxTriggeredPointsLevel) {
      maxTriggeredPointsLevel = qualifiedPointsLevel;
      maxThresholdPoints = qualifiedPointsThreshold;
    }

    if (maxTriggeredPointsLevel > 0) {
      const dbSummons = student.pemanggilan.find(
        (p) => p.thresholdPoints === maxThresholdPoints
      );
      const status = dbSummons ? dbSummons.status : "PENDING";
      const activeClass = student.riwayatKelas[0]?.kelas;

      summonsList.push({
        id: `${student.id}-${maxThresholdPoints}`,
        studentId: student.id,
        nama: student.nama,
        nis: student.nis,
        kelas: activeClass?.nama || "-",
        points: netPoints,
        thresholdPoints: maxThresholdPoints,
        level: maxTriggeredPointsLevel,
        status: status,
        type: "POIN",
        bkNama: activeClass?.bk?.nama || null,
        bkNip: activeClass?.bk?.nip || null,
      });
    }

    // 2. Pemanggilan Berdasarkan Absensi Alfa
    const alphaCount = student.absensi?.length || 0;

    let qualifiedAlfaLevel = 0;
    let qualifiedAlfaThreshold = 0;
    if (alphaCount >= thresholdAlfa3) { qualifiedAlfaLevel = 3; qualifiedAlfaThreshold = 100 + thresholdAlfa3; }
    else if (alphaCount >= thresholdAlfa2) { qualifiedAlfaLevel = 2; qualifiedAlfaThreshold = 100 + thresholdAlfa2; }
    else if (alphaCount >= thresholdAlfa1) { qualifiedAlfaLevel = 1; qualifiedAlfaThreshold = 100 + thresholdAlfa1; }

    let maxTriggeredAlfaLevel = 0;
    let maxThresholdAlfaPoints = 0;

    student.pemanggilan.forEach((p) => {
      if (p.thresholdPoints > 100) {
        const thresholdAlfaVal = p.thresholdPoints - 100;
        const lvl = thresholdAlfaVal === thresholdAlfa3 ? 3 : thresholdAlfaVal === thresholdAlfa2 ? 2 : 1;
        if (lvl > maxTriggeredAlfaLevel) {
          maxTriggeredAlfaLevel = lvl;
          maxThresholdAlfaPoints = p.thresholdPoints;
        }
      }
    });

    if (qualifiedAlfaLevel > maxTriggeredAlfaLevel) {
      maxTriggeredAlfaLevel = qualifiedAlfaLevel;
      maxThresholdAlfaPoints = qualifiedAlfaThreshold;
    }

    if (maxTriggeredAlfaLevel > 0) {
      const dbSummons = student.pemanggilan.find(
        (p) => p.thresholdPoints === maxThresholdAlfaPoints
      );
      const status = dbSummons ? dbSummons.status : "PENDING";
      const activeClass = student.riwayatKelas[0]?.kelas;

      summonsList.push({
        id: `${student.id}-${maxThresholdAlfaPoints}`,
        studentId: student.id,
        nama: student.nama,
        nis: student.nis,
        kelas: activeClass?.nama || "-",
        points: netPoints,
        thresholdPoints: maxThresholdAlfaPoints,
        level: maxTriggeredAlfaLevel,
        status: status,
        type: "ALFA",
        alphaCount: alphaCount,
        bkNama: activeClass?.bk?.nama || null,
        bkNip: activeClass?.bk?.nip || null,
      });
    }
  });


  // Urutkan: PENDING di atas, level tertinggi di atas, lalu alfabetis nama
  summonsList.sort((a, b) => {
    if (a.status === "PENDING" && b.status === "SELESAI") return -1;
    if (a.status === "SELESAI" && b.status === "PENDING") return 1;
    if (a.level !== b.level) return b.level - a.level;
    return a.nama.localeCompare(b.nama);
  });

  const wakaUser = await prisma.user.findFirst({
    where: { role: "WAKA" },
    select: { nama: true, nip: true },
  });

  // Load referrals for dashboard summary (only relevant for BK/Waka)
  let pendingReferrals: any[] = [];
  if (user.role === "BK" || user.role === "WAKA") {
    const rawPendingReferrals = await prisma.rujukanSiswa.findMany({
      where: {
        status: "PENDING",
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

    pendingReferrals = rawPendingReferrals.map((ref) => ({
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
      tanggal: ref.tanggal,
    }));
  }
  // Load today's schedule for teacher/walas
  let todaySchedules: any[] = [];
  const todayDay = new Date().getDay();
  
  if (user.role === "GURU" || user.role === "WALAS") {
    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);

    const rawTodaySchedules = await prisma.jadwalPelajaran.findMany({
      where: {
        guruId: user.id,
        hari: todayDay,
      },
      include: {
        kelas: true,
        mapel: true,
        jurnal: {
          where: {
            tanggal: todayDate,
          },
        },
      },
      orderBy: { jamMulai: "asc" },
    });

    todaySchedules = rawTodaySchedules.map((s) => ({
      id: s.id,
      kelasNama: s.kelas.nama,
      mapelNama: s.mapel.nama,
      hari: s.hari,
      jamMulai: s.jamMulai,
      jamSelesai: s.jamSelesai,
      filled: s.jurnal.length > 0,
    }));
  }

  // 6. Get classes that haven't submitted attendance today
  let classesNotSubmittedToday: any[] = [];
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  
  const targetDate = new Date(`${todayStr}T00:00:00.000Z`);

  const todayDayOfWeek = new Date().getDay();
  const isWeekend = todayDayOfWeek === 0 || todayDayOfWeek === 6;
  const isHolidayToday = await prisma.hariLibur.findUnique({
    where: { tanggal: targetDate },
  });

  if (!isWeekend && !isHolidayToday) {
    let checkClassFilter: any = {
      tahunAjaran: { isActive: true },
    };

    if (user.role === "BK") {
      checkClassFilter.bkId = user.id;
    } else if (user.role === "WALAS") {
      checkClassFilter.walasId = user.id;
    }

    const classesWithAttendanceCounts = await prisma.kelas.findMany({
      where: checkClassFilter,
      select: {
        id: true,
        nama: true,
        walas: {
          select: {
            nama: true,
          },
        },
        siswaKelas: {
          where: {
            siswa: {
              status: "AKTIF",
              absensi: {
                some: {
                  tanggal: targetDate,
                },
              },
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    classesNotSubmittedToday = classesWithAttendanceCounts
      .filter((c) => c.siswaKelas.length === 0)
      .map((c) => ({
        id: c.id,
        nama: c.nama,
        walasNama: c.walas?.nama || "Belum Ditentukan",
      }));
    classesNotSubmittedToday.sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' }));
  }

  const dbPeriods = await prisma.jamPelajaran.findMany();
  const periods = dbPeriods.map((p) => ({
    id: p.id,
    hariTipe: p.hariTipe,
    jamKe: p.jamKe,
    waktuMulai: p.waktuMulai,
    waktuSelesai: p.waktuSelesai,
    isIstirahat: p.isIstirahat,
    keterangan: p.keterangan,
  }));

  return (
    <DashboardClient
      user={user}
      activeTA={activeTA}
      wakaUser={wakaUser}
      pendingReferrals={pendingReferrals}
      todaySchedules={todaySchedules}
      periods={periods}
      classes={classes.map((c) => ({ id: c.id, nama: c.nama }))}
      classesNotSubmittedToday={classesNotSubmittedToday}
      stats={{
        totalSiswa,
        attendanceRate,
        violationsMonthCount,
        threatStudentsCount,
      }}
      studentRankings={topRankings}
      attendanceRecap={attendanceRecap}
      violationRecap={violationRecap}
      dailyAttendance={dailyAttendance}
      holidays={holidays}
      topAbsentClasses={topAbsentClasses}
      topAlphaStudents={topAlphaStudents}
      topViolationClasses={topViolationClasses}
      summonsList={summonsList}
      thresholds={{ threshold1, threshold2, threshold3 }}
      settings={settings}
    />
  );
}

