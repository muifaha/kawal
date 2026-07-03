"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ViolationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Menyetujui (ACC) satu laporan pelanggaran.
 */
export async function approveViolationAction(reportId: string) {
  const user = await getSessionUser();

  // Proteksi server-side: Hanya Guru BK yang memiliki otoritas approval
  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Anda tidak memiliki wewenang untuk menyetujui pelanggaran." };
  }

  try {
    await prisma.laporanPelanggaran.update({
      where: { id: reportId },
      data: {
        status: ViolationStatus.APPROVED,
        approverId: user.id,
        approvedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pelanggaran");
    revalidatePath("/approval");

    return { success: true, message: "Laporan pelanggaran berhasil disetujui." };
  } catch (error) {
    console.error("Approve violation error:", error);
    return { error: "Terjadi kesalahan saat menyetujui laporan pelanggaran." };
  }
}

/**
 * Menolak laporan pelanggaran.
 */
export async function rejectViolationAction(reportId: string) {
  const user = await getSessionUser();

  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Anda tidak memiliki wewenang untuk menolak laporan." };
  }

  try {
    await prisma.laporanPelanggaran.update({
      where: { id: reportId },
      data: {
        status: ViolationStatus.REJECTED,
        approverId: user.id,
        approvedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pelanggaran");
    revalidatePath("/approval");

    return { success: true, message: "Laporan pelanggaran ditolak." };
  } catch (error) {
    console.error("Reject violation error:", error);
    return { error: "Terjadi kesalahan saat menolak laporan pelanggaran." };
  }
}

/**
 * Menyetujui banyak laporan pelanggaran sekaligus (Bulk Action).
 */
export async function bulkApproveViolationsAction(reportIds: string[]) {
  const user = await getSessionUser();

  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Anda tidak memiliki wewenang untuk menyetujui pelanggaran." };
  }

  if (!reportIds || reportIds.length === 0) {
    return { error: "Tidak ada laporan yang dipilih." };
  }

  try {
    await prisma.laporanPelanggaran.updateMany({
      where: {
        id: { in: reportIds },
        status: ViolationStatus.PENDING,
      },
      data: {
        status: ViolationStatus.APPROVED,
        approverId: user.id,
        approvedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pelanggaran");
    revalidatePath("/approval");

    return { success: true, message: `${reportIds.length} laporan pelanggaran berhasil disetujui sekaligus.` };
  } catch (error) {
    console.error("Bulk approve violations error:", error);
    return { error: "Terjadi kesalahan saat menyetujui laporan secara massal." };
  }
}

/**
 * Memperbarui data laporan pelanggaran (detail pelanggaran / poin & catatan) oleh BK sebelum di-ACC.
 */
export async function updateViolationReportAction(
  reportId: string,
  detailPelanggaranId: string,
  notes: string | null
) {
  const user = await getSessionUser();

  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Anda tidak memiliki wewenang untuk mengedit laporan." };
  }

  if (!detailPelanggaranId) {
    return { error: "Jenis pelanggaran wajib dipilih." };
  }

  try {
    const updated = await prisma.laporanPelanggaran.update({
      where: { id: reportId },
      data: {
        detailPelanggaranId,
        notes,
      },
      include: {
        detailPelanggaran: {
          include: {
            kategori: true,
          },
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pelanggaran");
    revalidatePath("/approval");

    return { 
      success: true, 
      message: "Laporan pelanggaran berhasil diperbarui.",
      data: {
        violationDetailId: updated.detailPelanggaran.id,
        violationName: updated.detailPelanggaran.nama,
        violationCategory: updated.detailPelanggaran.kategori.nama,
        violationPoin: updated.detailPelanggaran.poin,
        notes: updated.notes,
      }
    };
  } catch (error) {
    console.error("Update violation report error:", error);
    return { error: "Terjadi kesalahan saat memperbarui laporan pelanggaran." };
  }
}
