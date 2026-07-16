"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ViolationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

/**
 * Mengirimkan laporan pelanggaran siswa.
 * Jika dilaporkan oleh BK, status otomatis APPROVED.
 * Jika dilaporkan oleh Guru/Walas, status PENDING menunggu ACC BK.
 */
export async function reportViolationAction(
  studentIds: string[],
  violationDetailId: string,
  notes?: string,
  filesFormData?: FormData
) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Sesi Anda telah berakhir. Silakan login kembali." };
  }

  if (!studentIds || studentIds.length === 0 || !violationDetailId) {
    return { error: "Siswa (minimal satu) dan jenis pelanggaran wajib dipilih." };
  }

  try {
    // Constraint check for OSIS role
    if (user.role === "OSIS") {
      const violationDetail = await prisma.detailPelanggaran.findUnique({
        where: { id: violationDetailId },
        include: { kategori: true },
      });
      if (!violationDetail) {
        return { error: "Jenis pelanggaran tidak ditemukan." };
      }
      const isUpacara =
        violationDetail.nama.toLowerCase().includes("upacara") ||
        violationDetail.kategori.nama.toLowerCase().includes("upacara");
      if (!isUpacara) {
        return { error: "OSIS hanya diperbolehkan melaporkan poin terkait upacara." };
      }
    }

    // 1. Proses upload file bukti jika ada
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

    // 2. Tentukan status persetujuan berdasarkan role pelapor
    const isBK = user.role === "BK";
    const status = isBK ? ViolationStatus.APPROVED : ViolationStatus.PENDING;

    // 3. Buat record laporan pelanggaran untuk setiap siswa dalam transaksi
    const newReports = await prisma.$transaction(async (tx) => {
      const records = [];
      for (const studentId of studentIds) {
        const record = await tx.laporanPelanggaran.create({
          data: {
            siswaId: studentId,
            detailPelanggaranId: violationDetailId,
            pelaporId: user.id,
            status: status,
            notes: notes || null,
            approverId: isBK ? user.id : null,
            approvedAt: isBK ? new Date() : null,
            bukti: uploadedBukti,
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
        });
        records.push({
          ...record,
          siswa: {
            ...record.siswa,
            kelas: record.siswa.riwayatKelas[0]?.kelas || null,
          },
        });
      }
      return records;
    });

    revalidatePath("/dashboard");
    revalidatePath("/pelanggaran");
    revalidatePath("/approval");

    const message = isBK
      ? `Laporan pelanggaran untuk ${studentIds.length} siswa berhasil disimpan dan disahkan.`
      : `Laporan pelanggaran untuk ${studentIds.length} siswa berhasil diajukan. Menunggu verifikasi Guru BK.`;

    return { success: true, message, newReports };
  } catch (error) {
    console.error("Report violation error:", error);
    return { error: "Terjadi kesalahan saat membuat laporan pelanggaran." };
  }
}

/**
 * Mendapatkan daftar kategori dan item detail pelanggaran.
 */
export async function getViolationOptions() {
  try {
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
    return { success: true, data: categories };
  } catch (error) {
    console.error("Get violation options error:", error);
    return { error: "Gagal memuat kategori pelanggaran." };
  }
}

/**
 * Mengubah status sensor (censor/blur) dari suatu laporan pelanggaran.
 * Hanya dapat dilakukan oleh BK atau WAKA.
 */
export async function toggleCensorViolationAction(reportId: string, isCensored: boolean) {
  const user = await getSessionUser();
  if (!user || (user.role !== "BK" && user.role !== "WAKA")) {
    return { error: "Akses ditolak. Hanya Guru BK atau Waka Kesiswaan yang dapat mengubah status sensor." };
  }

  try {
    await prisma.laporanPelanggaran.update({
      where: { id: reportId },
      data: { isCensored },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pelanggaran");
    revalidatePath("/approval");

    return { 
      success: true, 
      message: isCensored 
        ? "Laporan pelanggaran berhasil disensor." 
        : "Sensor laporan pelanggaran berhasil dibatalkan." 
    };
  } catch (error) {
    console.error("Toggle censor violation error:", error);
    return { error: "Terjadi kesalahan saat mengubah status sensor." };
  }
}

/**
 * Menghapus laporan pelanggaran.
 * Hanya dapat dilakukan oleh Guru BK.
 */
export async function deleteViolationReportAction(reportId: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Hanya Guru BK yang diperbolehkan menghapus laporan pelanggaran." };
  }

  try {
    await prisma.laporanPelanggaran.delete({
      where: { id: reportId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pelanggaran");
    revalidatePath("/approval");

    return { success: true, message: "Laporan pelanggaran berhasil dihapus." };
  } catch (error: any) {
    console.error("Delete violation report error:", error);
    return { error: error.message || "Gagal menghapus laporan pelanggaran." };
  }
}

/**
 * Memperbarui laporan pelanggaran (jenis pelanggaran dan catatan).
 * Hanya dapat dilakukan oleh Guru BK.
 */
export async function updateViolationReportAction(
  reportId: string,
  violationDetailId: string,
  notes?: string
) {
  const user = await getSessionUser();
  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Hanya Guru BK yang diperbolehkan mengubah laporan pelanggaran." };
  }

  try {
    const updated = await prisma.laporanPelanggaran.update({
      where: { id: reportId },
      data: {
        detailPelanggaranId: violationDetailId,
        notes: notes || null,
      },
      include: {
        detailPelanggaran: {
          include: { kategori: true },
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pelanggaran");
    revalidatePath("/approval");

    return {
      success: true,
      message: "Laporan pelanggaran berhasil diperbarui.",
      detailPelanggaran: updated.detailPelanggaran,
      notes: updated.notes,
    };
  } catch (error: any) {
    console.error("Update violation report error:", error);
    return { error: error.message || "Gagal memperbarui laporan pelanggaran." };
  }
}
