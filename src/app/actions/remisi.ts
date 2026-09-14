"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getTodayWibStr } from "@/lib/dateUtils";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

/**
 * Menerapkan remisi kondisional manual ke siswa (misal Bawa Pohon).
 * Mengurangi poin berdasarkan persentase dari poin berjalan saat ini.
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

    if (!masterRemisi) {
      return { error: "Jenis remisi tidak ditemukan." };
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

    // 3. Hitung pemotongan poin (persentase dari poin saat ini)
    const pointsToReduce = Math.max(
      0.1,
      Math.round(currentPoints * (masterRemisi.persentasePengurangan / 100) * 100) / 100
    );

    // 3.5 Proses upload file bukti jika ada
    let uploadedBukti: string[] = [];
    if (filesFormData) {
      const files = filesFormData.getAll("files") as File[];
      for (const file of files) {
        if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
          
          const uploadDir = path.join(process.cwd(), "public", "uploads");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
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
        poinDikurangi: pointsToReduce,
        approverId: user.id,
        bukti: uploadedBukti,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/remisi");
    revalidatePath("/pelanggaran");

    return {
      success: true,
      message: `Remisi "${masterRemisi.nama}" berhasil diberikan ke ${student.nama}. Poin dikurangi sebesar ${pointsToReduce} (${masterRemisi.persentasePengurangan}%).`,
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
    const baselineDate = lastViolationDate > lastRemissionDate ? lastViolationDate : lastRemissionDate;

    // Hitung selisih hari dari baselineDate ke hari ini
    const diffTime = today.getTime() - baselineDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Jika selisih hari >= 30 hari
    if (diffDays >= 30) {
      const pointsToReduce = Math.max(0.1, Math.round(currentPoints * 0.1 * 100) / 100);

      transactions.push(
        prisma.transaksiRemisi.create({
          data: {
            siswaId: student.id,
            jenis: "OTOMATIS",
            poinDikurangi: pointsToReduce,
            tanggal: today,
            ...(options?.approverId ? { approverId: options.approverId } : {}),
          },
        })
      );
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

  return {
    success: true,
    message: `Pengecekan remisi otomatis selesai. ${processedCount} siswa berhasil menerima pengurangan poin 10% (karena bersih dari pelanggaran selama 30 hari).`,
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
