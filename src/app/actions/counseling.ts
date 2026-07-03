"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createReferralAction(siswaId: string, kategori: string, deskripsi: string) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Akses ditolak. Silakan login terlebih dahulu." };
  }

  if (!siswaId || !kategori || !deskripsi) {
    return { error: "Semua data rujukan wajib diisi." };
  }

  try {
    const student = await prisma.siswa.findUnique({
      where: { id: siswaId },
    });

    if (!student) {
      return { error: "Siswa tidak ditemukan." };
    }

    await prisma.rujukanSiswa.create({
      data: {
        siswaId,
        pembuatId: user.id,
        kategori,
        deskripsi,
        status: "PENDING",
      },
    });

    revalidatePath("/rujukan");
    revalidatePath("/dashboard");
    return { success: true, message: "Rujukan siswa berhasil dikirim ke BK." };
  } catch (error: any) {
    console.error("Create referral error:", error);
    return { error: error.message || "Gagal membuat rujukan." };
  }
}

export async function updateReferralStatusAction(referralId: string, status: string, tindakLanjut?: string) {
  const user = await getSessionUser();
  if (!user || (user.role !== "BK" && user.role !== "WAKA")) {
    return { error: "Akses ditolak. Hanya Guru BK dan Waka yang dapat memproses rujukan." };
  }

  if (!referralId || !status) {
    return { error: "ID rujukan dan status wajib ditentukan." };
  }

  try {
    await prisma.rujukanSiswa.update({
      where: { id: referralId },
      data: {
        status,
        tindakLanjut: tindakLanjut || null,
      },
    });

    revalidatePath("/rujukan");
    revalidatePath("/dashboard");
    return { success: true, message: "Status rujukan berhasil diperbarui." };
  } catch (error: any) {
    console.error("Update referral status error:", error);
    return { error: error.message || "Gagal memperbarui status rujukan." };
  }
}

export async function createBimbinganAction(
  siswaId: string,
  bidang: string,
  masalah: string,
  solusi: string,
  catatanRahasia?: string
) {
  const user = await getSessionUser();
  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Hanya Guru BK yang dapat menginput bimbingan konseling." };
  }

  if (!siswaId || !bidang || !masalah || !solusi) {
    return { error: "Semua data bimbingan (Siswa, Bidang, Masalah, Solusi) wajib diisi." };
  }

  try {
    // Verifikasi bahwa BK ini ditugaskan ke kelas siswa tersebut
    const siswaWithClass = await prisma.siswa.findUnique({
      where: { id: siswaId },
      include: {
        riwayatKelas: {
          where: { tahunAjaran: { isActive: true } },
          include: { kelas: true },
        },
      },
    });

    if (!siswaWithClass || siswaWithClass.riwayatKelas.length === 0) {
      return { error: "Siswa tidak ditemukan atau belum terdaftar di kelas tahun ajaran aktif." };
    }

    const classId = siswaWithClass.riwayatKelas[0].kelasId;
    const targetClass = await prisma.kelas.findUnique({
      where: { id: classId },
    });

    if (!targetClass || targetClass.bkId !== user.id) {
      return { error: "Akses ditolak. Anda tidak ditugaskan sebagai Guru BK untuk siswa ini." };
    }

    await prisma.bimbinganKonseling.create({
      data: {
        siswaId,
        pembimbingId: user.id,
        bidang,
        masalah,
        solusi,
        catatanRahasia: catatanRahasia || null,
      },
    });

    revalidatePath("/bimbingan");
    revalidatePath("/dashboard");
    return { success: true, message: "Bimbingan konseling berhasil dicatat." };
  } catch (error: any) {
    console.error("Create bimbingan error:", error);
    return { error: error.message || "Gagal mencatat bimbingan konseling." };
  }
}
