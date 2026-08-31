"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { JenisKepesertaan, KategoriPrestasi, TingkatPrestasi } from "@prisma/client";

const ALLOWED_ROLES = ["PEMBINA_OSIS", "WAKA", "BK", "WALAS", "GURU"];

function saveBase64Image(base64Data: string, prefix: string): string | null {
  try {
    if (!base64Data || typeof base64Data !== "string" || !base64Data.includes(";base64,")) {
      return null;
    }
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const parts = base64Data.split(";base64,");
    const mimeMatch = parts[0].match(/data:(image\/[a-zA-Z0-9+\-+.]+)/i);
    const rawExt = mimeMatch ? (mimeMatch[1].split("/")[1] || "jpg") : "jpg";
    const ext = rawExt.toLowerCase() === "jpeg" ? "jpg" : rawExt.toLowerCase();

    const cleanBase64 = parts[1].replace(/\s/g, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const fullPath = path.join(uploadDir, filename);

    fs.writeFileSync(fullPath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Save base64 image error:", err);
    return null;
  }
}

/**
 * Menginput data prestasi siswa (Individu / Tim).
 * Otomatis memberikan remisi 10% dari poin pelanggaran aktif siswa.
 * Aturan: Remisi hanya berlaku 1 kali per jenjang/tingkat kejuaraan untuk setiap siswa.
 */
export async function reportPrestasiAction(payload: {
  studentIds: string[];
  jenisKepesertaan: "INDIVIDU" | "TIM";
  namaTim?: string;
  namaPrestasi: string;
  waktuPelaksanaan: string; // YYYY-MM-DD
  penyelenggara: string;
  kategori: "BERJENJANG" | "TIDAK_BERJENJANG";
  tingkat: "KECAMATAN" | "KOTA" | "PROVINSI" | "NASIONAL" | "INTERNASIONAL";
  catatan?: string;
  fotoPiagamBase64?: string;
  fotoKegiatanBase64?: string;
}) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Sesi Anda telah berakhir. Silakan login kembali." };
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return { error: "Akses ditolak. Anda tidak memiliki wewenang untuk mencatat prestasi siswa." };
  }

  const {
    studentIds,
    jenisKepesertaan,
    namaTim,
    namaPrestasi,
    waktuPelaksanaan,
    penyelenggara,
    kategori,
    tingkat,
    catatan,
    fotoPiagamBase64,
    fotoKegiatanBase64,
  } = payload;

  if (!studentIds || studentIds.length === 0) {
    return { error: "Siswa penerima/anggota tim prestasi wajib dipilih (minimal 1 siswa)." };
  }

  if (!namaPrestasi || !waktuPelaksanaan || !penyelenggara) {
    return { error: "Nama prestasi, waktu pelaksanaan, dan penyelenggara wajib diisi." };
  }

  if (jenisKepesertaan === "TIM" && (!namaTim || namaTim.trim() === "")) {
    return { error: "Nama Tim / Kontingen wajib diisi untuk kategori kepesertaan Tim." };
  }

  try {
    // 1. Simpan Foto Piagam & Kegiatan jika ada
    const fotoPiagamPath = fotoPiagamBase64 ? saveBase64Image(fotoPiagamBase64, "piagam") : null;
    const fotoKegiatanPath = fotoKegiatanBase64 ? saveBase64Image(fotoKegiatanBase64, "kegiatan") : null;

    const buktiArr: string[] = [];
    if (fotoPiagamPath) buktiArr.push(fotoPiagamPath);
    if (fotoKegiatanPath) buktiArr.push(fotoKegiatanPath);

    let totalRemissionStudents = 0;
    let totalRemissionPoinSum = 0;

    // 3. Simpan record PrestasiSiswa & Anggota & Remisi 10% (sekali per jenjang per siswa)
    const newPrestasi = await prisma.$transaction(async (tx) => {
      const record = await tx.prestasiSiswa.create({
        data: {
          jenisKepesertaan: jenisKepesertaan as JenisKepesertaan,
          namaTim: jenisKepesertaan === "TIM" ? namaTim : null,
          namaPrestasi,
          waktuPelaksanaan: new Date(`${waktuPelaksanaan}T00:00:00`),
          penyelenggara,
          kategori: kategori as KategoriPrestasi,
          tingkat: tingkat as TingkatPrestasi,
          isRemisiOtomatis: true,
          poinRemisi: 0,
          catatan: catatan || null,
          fotoPiagam: fotoPiagamPath,
          fotoKegiatan: fotoKegiatanPath,
          pelaporId: user.id,
          anggota: {
            create: studentIds.map((sid) => ({
              siswaId: sid,
            })),
          },
        },
        include: {
          pelapor: true,
          anggota: {
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
          },
        },
      });

      // Proses remisi poin 10% per siswa jika belum pernah klaim remisi di jenjang/tingkat yang sama
      for (const sid of studentIds) {
        // Cek apakah siswa ini sudah pernah mendapatkan prestasi di jenjang/tingkat yang sama
        const existingLevelPrestasi = await tx.prestasiSiswaAnggota.findFirst({
          where: {
            siswaId: sid,
            prestasi: {
              tingkat: tingkat as TingkatPrestasi,
              id: { not: record.id },
            },
          },
        });

        // Jika siswa belum pernah mengklaim remisi di jenjang ini, berikan remisi 10% dari poin berjalan saat ini
        if (!existingLevelPrestasi) {
          const student = await tx.siswa.findUnique({
            where: { id: sid },
            include: {
              pelanggaran: {
                where: { status: "APPROVED" },
                include: { detailPelanggaran: true },
              },
              remisi: true,
            },
          });

          if (student) {
            const totalViolations = student.pelanggaran.reduce(
              (sum, v) => sum + v.detailPelanggaran.poin,
              0
            );
            const totalRemissions = student.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0);
            const currentPoints = Math.max(0, totalViolations - totalRemissions);

            if (currentPoints > 0) {
              // Remisi 10% dari poin berjalan
              const pointsToReduce = Math.max(0.1, Math.round(currentPoints * 0.10 * 100) / 100);

              await tx.transaksiRemisi.create({
                data: {
                  siswaId: sid,
                  jenis: "KONDISIONAL",
                  poinDikurangi: pointsToReduce,
                  approverId: user.id,
                  tanggal: new Date(`${waktuPelaksanaan}T00:00:00`),
                  bukti: buktiArr,
                },
              });

              totalRemissionStudents++;
              totalRemissionPoinSum += pointsToReduce;
            }
          }
        }
      }

      // Update poinRemisi rata-rata / sum pada record prestasi jika ada remisi yang berlaku
      if (totalRemissionPoinSum > 0) {
        await tx.prestasiSiswa.update({
          where: { id: record.id },
          data: {
            poinRemisi: Math.round((totalRemissionPoinSum / studentIds.length) * 100) / 100,
          },
        });
      }

      return record;
    });

    revalidatePath("/dashboard");
    revalidatePath("/prestasi");
    revalidatePath("/remisi");
    revalidatePath("/pelanggaran");

    const countText = studentIds.length === 1 ? "1 siswa" : `${studentIds.length} siswa`;
    let remissionText = "";
    if (totalRemissionStudents > 0) {
      remissionText = ` serta remisi poin 10% berhasil diberikan kepada ${totalRemissionStudents} siswa!`;
    } else {
      remissionText = " (remisi 10% tidak berlaku karena siswa sudah pernah mendapatkan prestasi di jenjang ini / poin 0).";
    }

    return {
      success: true,
      message: `Prestasi "${namaPrestasi}" untuk ${countText} berhasil dicatat${remissionText}`,
      newPrestasi,
    };
  } catch (error: any) {
    console.error("Report prestasi error:", error);
    return { error: `Terjadi kesalahan saat menyimpan data prestasi: ${error.message || error}` };
  }
}

/**
 * Mendapatkan daftar seluruh prestasi siswa.
 */
export async function getPrestasiListAction() {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Silakan login terlebih dahulu." };
  }

  try {
    const list = await prisma.prestasiSiswa.findMany({
      orderBy: {
        waktuPelaksanaan: "desc",
      },
      include: {
        pelapor: {
          select: { id: true, nama: true, role: true },
        },
        anggota: {
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
        },
      },
    });

    const formatted = list.map((item) => ({
      ...item,
      anggota: item.anggota.map((a) => ({
        id: a.siswa.id,
        nis: a.siswa.nis,
        nama: a.siswa.nama,
        kelasNama: a.siswa.riwayatKelas[0]?.kelas.nama || "-",
      })),
    }));

    return { success: true, data: formatted };
  } catch (error: any) {
    console.error("Get prestasi list error:", error);
    return { error: "Gagal mengambil data prestasi siswa." };
  }
}

/**
 * Menghapus data prestasi siswa.
 */
export async function deletePrestasiAction(prestasiId: string) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Sesi Anda telah berakhir. Silakan login kembali." };
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return { error: "Akses ditolak. Anda tidak memiliki wewenang untuk menghapus data prestasi." };
  }

  try {
    const existing = await prisma.prestasiSiswa.findUnique({
      where: { id: prestasiId },
    });

    if (!existing) {
      return { error: "Data prestasi tidak ditemukan." };
    }

    await prisma.prestasiSiswa.delete({
      where: { id: prestasiId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/prestasi");
    revalidatePath("/remisi");

    return { success: true, message: `Data prestasi "${existing.namaPrestasi}" berhasil dihapus.` };
  } catch (error: any) {
    console.error("Delete prestasi error:", error);
    return { error: "Gagal menghapus data prestasi siswa." };
  }
}

/**
 * Mengupdate data prestasi siswa.
 */
export async function updatePrestasiAction(payload: {
  id: string;
  namaPrestasi: string;
  waktuPelaksanaan: string; // YYYY-MM-DD
  penyelenggara: string;
  kategori: "BERJENJANG" | "TIDAK_BERJENJANG";
  tingkat: "KECAMATAN" | "KOTA" | "PROVINSI" | "NASIONAL" | "INTERNASIONAL";
  catatan?: string;
  fotoPiagamBase64?: string;
  fotoKegiatanBase64?: string;
}) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Sesi Anda telah berakhir. Silakan login kembali." };
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return { error: "Akses ditolak. Anda tidak memiliki wewenang untuk memperbarui data prestasi." };
  }

  const { id, namaPrestasi, waktuPelaksanaan, penyelenggara, kategori, tingkat, catatan, fotoPiagamBase64, fotoKegiatanBase64 } = payload;

  if (!id || !namaPrestasi || !waktuPelaksanaan || !penyelenggara) {
    return { error: "Semua kolom utama wajib diisi." };
  }

  try {
    const existing = await prisma.prestasiSiswa.findUnique({
      where: { id },
    });

    if (!existing) {
      return { error: "Data prestasi tidak ditemukan." };
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let fotoPiagamPath = existing.fotoPiagam;
    if (fotoPiagamBase64) {
      const saved = saveBase64Image(fotoPiagamBase64, "piagam");
      if (saved) fotoPiagamPath = saved;
    }

    let fotoKegiatanPath = existing.fotoKegiatan;
    if (fotoKegiatanBase64) {
      const saved = saveBase64Image(fotoKegiatanBase64, "kegiatan");
      if (saved) fotoKegiatanPath = saved;
    }

    const updated = await prisma.prestasiSiswa.update({
      where: { id },
      data: {
        namaPrestasi,
        waktuPelaksanaan: new Date(`${waktuPelaksanaan}T00:00:00`),
        penyelenggara,
        kategori: kategori as KategoriPrestasi,
        tingkat: tingkat as TingkatPrestasi,
        catatan: catatan || null,
        fotoPiagam: fotoPiagamPath,
        fotoKegiatan: fotoKegiatanPath,
      },
      include: {
        pelapor: {
          select: { id: true, nama: true, role: true },
        },
        anggota: {
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
        },
      },
    });

    const formattedUpdated = {
      ...updated,
      anggota: updated.anggota.map((a) => ({
        id: a.siswa.id,
        nis: a.siswa.nis,
        nama: a.siswa.nama,
        kelasNama: a.siswa.riwayatKelas[0]?.kelas.nama || "-",
      })),
    };

    revalidatePath("/dashboard");
    revalidatePath("/prestasi");

    return {
      success: true,
      message: `Data prestasi "${namaPrestasi}" berhasil diperbarui.`,
      updatedPrestasi: formattedUpdated,
    };
  } catch (error: any) {
    console.error("Update prestasi error:", error);
    return { error: `Gagal memperbarui data prestasi: ${error.message || error}` };
  }
}
