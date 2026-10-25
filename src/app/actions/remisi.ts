"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getTodayWibStr } from "@/lib/dateUtils";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { getUploadDir } from "@/lib/uploadHelper";
import { isPrestasiRemisi } from "@/lib/remisiUtils";

/**
 * Menerapkan remisi kondisional manual ke siswa (misal Bawa Pohon).
 * Mengurangi poin berdasarkan persentase atau poin tetap dari poin berjalan saat ini.
 */
export async function applyConditionalRemisiAction(
  studentId: string,
  masterRemisiId: string,
  filesFormData?: FormData
) {
  const user = await getSessionUser();

  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Hanya Guru BK yang dapat memberikan remisi." };
  }

  if (!studentId || !masterRemisiId) {
    return { error: "Siswa dan jenis remisi wajib dipilih." };
  }

  try {
    // 1. Dapatkan info remisi
    const masterRemisi = await prisma.masterRemisi.findUnique({
      where: { id: masterRemisiId },
    });

    if (!masterRemisi || masterRemisi.isActive === false) {
      return { error: "Jenis remisi tidak aktif atau tidak ditemukan." };
    }

    // 1b. Remisi prestasi tidak dapat dilakukan secara manual oleh BK
    if (isPrestasiRemisi(masterRemisi.nama)) {
      return {
        error:
          "Remisi prestasi tidak dapat dilakukan secara manual oleh BK. Remisi prestasi diproses otomatis saat input prestasi siswa atau silakan hubungi Admin.",
      };
    }

    // 2. Dapatkan data siswa dan hitung poin berjalan saat ini
    const student = await prisma.siswa.findUnique({
      where: { id: studentId },
      include: {
        pelanggaran: {
          where: { status: "APPROVED" },
          include: { detailPelanggaran: true },
        },
        remisi: true,
      },
    });

    if (!student) {
      return { error: "Siswa tidak ditemukan." };
    }

    const totalViolations = student.pelanggaran.reduce(
      (sum, v) => sum + v.detailPelanggaran.poin,
      0
    );
    const totalRemissions = Math.round(student.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0) * 100) / 100;
    const currentPoints = Math.max(0, Math.round((totalViolations - totalRemissions) * 100) / 100);

    if (currentPoints === 0) {
      return { error: `Siswa ${student.nama} memiliki 0 poin. Tidak memerlukan remisi.` };
    }

    // 3. Hitung pemotongan poin (berdasarkan persentase atau poin tetap)
    let pointsToReduce = 0;
    if (masterRemisi.tipePengurangan === "POIN_TETAP") {
      pointsToReduce = masterRemisi.poinPengurangan || 0;
    } else {
      const pct = masterRemisi.persentasePengurangan || 0;
      pointsToReduce = Math.max(0.1, Math.round(currentPoints * (pct / 100) * 100) / 100);
    }

    const actualDeduction = Math.min(currentPoints, pointsToReduce);
    if (actualDeduction <= 0) {
      return { error: "Nilai pengurangan poin harus lebih dari 0." };
    }

    // 3.5 Proses upload file bukti jika ada
    let uploadedBukti: string[] = [];
    if (filesFormData) {
      const files = filesFormData.getAll("files") as File[];
      for (const file of files) {
        if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
          
          const uploadDir = getUploadDir();
          const fullPath = path.join(uploadDir, filename);
          fs.writeFileSync(fullPath, buffer);
          uploadedBukti.push(`/uploads/${filename}`);
        }
      }
    }

    // 4. Catat transaksi remisi
    await prisma.transaksiRemisi.create({
      data: {
        siswaId: student.id,
        jenis: "KONDISIONAL",
        masterRemisiId: masterRemisi.id,
        poinDikurangi: actualDeduction,
        approverId: user.id,
        bukti: uploadedBukti,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/remisi");
    revalidatePath("/pelanggaran");

    const deductionLabel = masterRemisi.tipePengurangan === "POIN_TETAP"
      ? `-${actualDeduction} poin tetap`
      : `${actualDeduction} poin (${masterRemisi.persentasePengurangan}%)`;

    return {
      success: true,
      message: `Remisi "${masterRemisi.nama}" berhasil diberikan ke ${student.nama}. Poin dikurangi sebesar ${deductionLabel}.`,
    };
  } catch (error) {
    console.error("Apply conditional remisi error:", error);
    return { error: "Terjadi kesalahan saat menerapkan remisi." };
  }
}

/**
 * Core function untuk memproses remisi otomatis 10% bagi siswa yang 30 hari bersih dari pelanggaran.
 */
export async function processAutomaticRemissions(options?: { forceRun?: boolean; approverId?: string }) {
  const today = new Date();
  const todayStr = getTodayWibStr(); // YYYY-MM-DD in Asia/Jakarta

  // 1. Cek apakah pengecekan otomatis sudah pernah dilakukan hari ini (kecuali jika forceRun = true)
  if (!options?.forceRun) {
    const lastCheck = await prisma.appSetting.findUnique({
      where: { key: "last_automatic_remission_check" },
    });

    if (lastCheck && lastCheck.value === todayStr) {
      return { success: true, message: "Pengecekan remisi otomatis sudah berjalan hari ini.", processedCount: 0 };
    }
  }

  // Dapatkan konfigurasi Master Remisi Otomatis dari database
  const autoRemisi = await prisma.masterRemisi.findFirst({
    where: { jenis: "OTOMATIS" },
  });

  // Jika aturan remisi otomatis dinonaktifkan oleh admin, catat pemeriksaan dan hentikan eksekusi
  if (autoRemisi && autoRemisi.isActive === false) {
    await prisma.appSetting.upsert({
      where: { key: "last_automatic_remission_check" },
      update: { value: todayStr },
      create: { key: "last_automatic_remission_check", value: todayStr },
    });
    return { success: true, processedCount: 0, message: "Remisi otomatis sedang dinonaktifkan." };
  }

  const durationDays = autoRemisi?.hariTanpaPelanggaran && autoRemisi.hariTanpaPelanggaran > 0 ? autoRemisi.hariTanpaPelanggaran : 30;
  const reductionPercent = (autoRemisi?.persentasePengurangan ?? 10) / 100;
  const autoRemisiId = autoRemisi?.id || null;

  // 2. Ambil seluruh siswa aktif yang memiliki sekurang-kurangnya 1 pelanggaran APPROVED
  const activeStudents = await prisma.siswa.findMany({
    where: {
      status: "AKTIF",
      pelanggaran: {
        some: {
          status: "APPROVED",
        },
      },
    },
    select: {
      id: true,
      nama: true,
      createdAt: true,
      pelanggaran: {
        where: { status: "APPROVED" },
        select: {
          tanggal: true,
          approvedAt: true,
          detailPelanggaran: { select: { poin: true } },
        },
      },
      remisi: {
        select: {
          jenis: true,
          tanggal: true,
          poinDikurangi: true,
        },
      },
    },
  });

  const transactions = [];
  let processedCount = 0;

  for (const student of activeStudents) {
    // Hitung poin net berjalan saat ini
    const totalViolations = student.pelanggaran.reduce(
      (sum, v) => sum + v.detailPelanggaran.poin,
      0
    );
    const totalRemissions = Math.round(student.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0) * 100) / 100;
    const currentPoints = Math.max(0, Math.round((totalViolations - totalRemissions) * 100) / 100);

    // Lewati jika siswa tidak memiliki poin (> 0)
    if (currentPoints <= 0) continue;

    // Cari tanggal pelanggaran disetujui/tercatat terakhir (bisa dari approvedAt atau tanggal)
    let lastViolationDate = student.createdAt;
    student.pelanggaran.forEach((v) => {
      const vDate = v.approvedAt || v.tanggal;
      if (vDate && vDate > lastViolationDate) {
        lastViolationDate = vDate;
      }
    });

    // Cari tanggal remisi otomatis terakhir
    let lastRemissionDate = student.createdAt;
    student.remisi.forEach((r) => {
      if (r.jenis === "OTOMATIS" && r.tanggal > lastRemissionDate) {
        lastRemissionDate = r.tanggal;
      }
    });

    // Baseline pembanding adalah tanggal terbaru antara pelanggaran terakhir dan remisi otomatis terakhir
    let currentBaseline = lastViolationDate > lastRemissionDate ? lastViolationDate : lastRemissionDate;
    let runningPoints = currentPoints;

    // Iterasi per siklus masa bersih pelanggaran (misal tiap 30 hari) yang sudah lengkap terlewat
    while (runningPoints > 0) {
      const nextTargetDate = new Date(currentBaseline.getTime() + durationDays * 24 * 60 * 60 * 1000);
      if (nextTargetDate > today) {
        break;
      }

      let pointsToReduce = 0;
      if (autoRemisi?.tipePengurangan === "POIN_TETAP") {
        pointsToReduce = autoRemisi.poinPengurangan || 5;
      } else {
        pointsToReduce = Math.max(0.1, Math.round(runningPoints * reductionPercent * 100) / 100);
      }
      const actualDeduction = Math.min(runningPoints, pointsToReduce);
      if (actualDeduction <= 0) break;

      transactions.push(
        prisma.transaksiRemisi.create({
          data: {
            siswaId: student.id,
            jenis: "OTOMATIS",
            masterRemisiId: autoRemisiId,
            poinDikurangi: actualDeduction,
            tanggal: nextTargetDate,
            ...(options?.approverId ? { approverId: options.approverId } : {}),
          },
        })
      );

      runningPoints = Math.max(0, Math.round((runningPoints - actualDeduction) * 100) / 100);
      currentBaseline = nextTargetDate;
      processedCount++;
    }
  }

  // Jalankan transaksi DB jika ada siswa yang berhak menerima remisi
  if (transactions.length > 0) {
    await prisma.$transaction(transactions);
  }

  // Catat tanggal pengecekan sukses hari ini
  await prisma.appSetting.upsert({
    where: { key: "last_automatic_remission_check" },
    update: { value: todayStr },
    create: { key: "last_automatic_remission_check", value: todayStr },
  });

  if (processedCount > 0) {
    revalidatePath("/dashboard");
    revalidatePath("/remisi");
    revalidatePath("/pelanggaran");
  }

  const ruleDesc = autoRemisi?.tipePengurangan === "POIN_TETAP"
    ? `sebesar ${autoRemisi.poinPengurangan || 5} poin`
    : `sebesar ${(autoRemisi?.persentasePengurangan ?? 10)}%`;

  return {
    success: true,
    message: `Pengecekan remisi otomatis selesai. ${processedCount} siswa berhasil menerima pengurangan poin ${ruleDesc} (karena bersih dari pelanggaran selama ${durationDays} hari).`,
    processedCount,
  };
}

/**
 * Menjalankan pencarian Remisi Otomatis Bulanan secara manual (dari menu BK/Remisi).
 */
export async function runAutomaticRemissionAction() {
  const user = await getSessionUser();

  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Hanya Guru BK yang dapat memicu remisi otomatis." };
  }

  try {
    const res = await processAutomaticRemissions({ forceRun: true, approverId: user.id });
    return res;
  } catch (error: any) {
    console.error("Run automatic remission error:", error);
    return { error: error.message || "Terjadi kesalahan saat menjalankan pemindaian remisi otomatis." };
  }
}

/**
 * Memeriksa dan menerapkan remisi otomatis (potongan 10% poin) via Cron / Daily check.
 */
export async function checkAndApplyAutomaticRemissions(forceRun = false) {
  try {
    return await processAutomaticRemissions({ forceRun });
  } catch (error: any) {
    console.error("Check and apply automatic remissions error:", error);
    return { error: error.message || "Terjadi kesalahan saat memproses remisi otomatis." };
  }
}
