"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
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
    const totalRemissions = student.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0);
    const currentPoints = Math.max(0, totalViolations - totalRemissions);

    if (currentPoints === 0) {
      return { error: `Siswa ${student.nama} memiliki 0 poin. Tidak memerlukan remisi.` };
    }

    // 3. Hitung pemotongan poin (persentase dari poin saat ini, min 1)
    const pointsToReduce = Math.max(
      1,
      Math.round(currentPoints * (masterRemisi.persentasePengurangan / 100))
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
 * Menjalankan pencarian Remisi Otomatis Bulanan.
 * Mengurangi 10% poin untuk seluruh siswa aktif yang bersih dari pelanggaran selama 30 hari terakhir.
 */
export async function runAutomaticRemissionAction() {
  const user = await getSessionUser();

  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Hanya Guru BK yang dapat memicu remisi otomatis." };
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Ambil seluruh siswa aktif
    const activeStudents = await prisma.siswa.findMany({
      where: { status: "AKTIF" },
      include: {
        pelanggaran: {
          where: { status: "APPROVED" },
          include: { detailPelanggaran: true },
        },
        remisi: true,
      },
    });

    let processedCount = 0;
    const transactions = [];

    for (const student of activeStudents) {
      // Hitung poin saat ini
      const totalViolations = student.pelanggaran.reduce(
        (sum, v) => sum + v.detailPelanggaran.poin,
        0
      );
      const totalRemissions = student.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0);
      const currentPoints = Math.max(0, totalViolations - totalRemissions);

      // Siswa harus memiliki poin > 0 untuk menerima remisi
      if (currentPoints === 0) continue;

      // Cek apakah ada pelanggaran yang disahkan dalam 30 hari terakhir
      const hasRecentViolations = await prisma.laporanPelanggaran.findFirst({
        where: {
          siswaId: student.id,
          status: "APPROVED",
          tanggal: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Jika bersih dari pelanggaran selama 30 hari terakhir, berikan remisi 10%
      if (!hasRecentViolations) {
        const pointsToReduce = Math.max(1, Math.round(currentPoints * 0.1));

        transactions.push(
          prisma.transaksiRemisi.create({
            data: {
              siswaId: student.id,
              jenis: "OTOMATIS",
              poinDikurangi: pointsToReduce,
              approverId: user.id,
            },
          })
        );
        processedCount++;
      }
    }

    if (transactions.length > 0) {
      await prisma.$transaction(transactions);
    }

    revalidatePath("/dashboard");
    revalidatePath("/remisi");
    revalidatePath("/pelanggaran");

    return {
      success: true,
      message: `Pemindaian selesai. Sebanyak ${processedCount} siswa berhasil mendapatkan Remisi Otomatis Bulanan (potongan 10% poin karena bersih dari pelanggaran selama 30 hari).`,
    };
  } catch (error) {
    console.error("Run automatic remission error:", error);
    return { error: "Terjadi kesalahan saat menjalankan pemindaian remisi otomatis." };
  }
}

/**
 * Memeriksa dan menerapkan remisi otomatis (potongan 10% poin)
 * jika siswa tidak melakukan pelanggaran baru dalam 30 hari terakhir.
 * Pengecekan ini dioptimalkan agar hanya berjalan sekali sehari per aplikasi (via AppSetting date check).
 */
export async function checkAndApplyAutomaticRemissions() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Cek apakah pengecekan otomatis sudah pernah dilakukan hari ini
    const lastCheck = await prisma.appSetting.findUnique({
      where: { key: "last_automatic_remission_check" },
    });

    if (lastCheck && lastCheck.value === todayStr) {
      // Sudah dijalankan hari ini, lewati
      return { success: true, message: "Pengecekan remisi otomatis sudah berjalan hari ini." };
    }

    // 2. Cari seluruh siswa aktif dengan poin pelanggaran
    const activeStudents = await prisma.siswa.findMany({
      where: { status: "AKTIF" },
      include: {
        pelanggaran: {
          where: { status: "APPROVED" },
          include: { detailPelanggaran: true },
        },
        remisi: true,
      },
    });

    const transactions = [];
    let processedCount = 0;

    for (const student of activeStudents) {
      // Hitung poin net berjalan
      const totalViolations = student.pelanggaran.reduce(
        (sum, v) => sum + v.detailPelanggaran.poin,
        0
      );
      const totalRemissions = student.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0);
      const currentPoints = Math.max(0, totalViolations - totalRemissions);

      // Lewati jika siswa tidak memiliki poin
      if (currentPoints === 0) continue;

      // Cari tanggal pelanggaran disetujui terakhir
      let lastViolationDate = student.createdAt;
      student.pelanggaran.forEach((v) => {
        if (v.approvedAt && v.approvedAt > lastViolationDate) {
          lastViolationDate = v.approvedAt;
        }
      });

      // Cari tanggal remisi otomatis terakhir
      let lastRemissionDate = student.createdAt;
      student.remisi.forEach((r) => {
        if (r.jenis === "OTOMATIS" && r.tanggal > lastRemissionDate) {
          lastRemissionDate = r.tanggal;
        }
      });

      // Tentukan batas/baseline pembanding
      const baselineDate = lastViolationDate > lastRemissionDate ? lastViolationDate : lastRemissionDate;

      // Hitung selisih hari antara baselineDate dan today
      const diffTime = Math.abs(today.getTime() - baselineDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Jika selisih hari >= 30 hari
      if (diffDays >= 30) {
        const pointsToReduce = Math.max(1, Math.round(currentPoints * 0.1));

        transactions.push(
          prisma.transaksiRemisi.create({
            data: {
              siswaId: student.id,
              jenis: "OTOMATIS",
              poinDikurangi: pointsToReduce,
              tanggal: today,
            },
          })
        );
        processedCount++;
      }
    }

    // Jalankan semua penambahan transaksi remisi dalam satu database transaction
    if (transactions.length > 0) {
      await prisma.$transaction(transactions);
    }

    // 3. Catat tanggal pengecekan sukses hari ini
    await prisma.appSetting.upsert({
      where: { key: "last_automatic_remission_check" },
      update: { value: todayStr },
      create: { key: "last_automatic_remission_check", value: todayStr },
    });

    if (processedCount > 0) {
      revalidatePath("/dashboard");
      revalidatePath("/remisi");
    }

    return {
      success: true,
      message: `Pengecekan remisi otomatis selesai. ${processedCount} siswa menerima pengurangan poin 10%.`,
    };
  } catch (error) {
    console.error("Check and apply automatic remissions error:", error);
    return { error: "Terjadi kesalahan saat memproses remisi otomatis." };
  }
}
