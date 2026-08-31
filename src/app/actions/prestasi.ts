"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { JenisKepesertaan, KategoriPrestasi, TingkatPrestasi } from "@prisma/client";

const ALLOWED_ROLES = ["PEMBINA_OSIS", "WAKA", "BK", "WALAS", "GURU"];

/**
 * Menginput data prestasi siswa (Individu / Tim) beserta remisi poin otomatis jika diaktifkan.
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
  isRemisiOtomatis?: boolean;
  poinRemisi?: number;
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
    isRemisiOtomatis = true,
    poinRemisi = 0,
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
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 1. Simpan Foto Piagam jika ada
    let fotoPiagamPath: string | null = null;
    if (fotoPiagamBase64 && typeof fotoPiagamBase64 === "string" && fotoPiagamBase64.startsWith("data:")) {
      const match = fotoPiagamBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1].split("/")[1] || "png";
        const buffer = Buffer.from(match[2], "base64");
        const filename = `piagam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const fullPath = path.join(uploadDir, filename);
        fs.writeFileSync(fullPath, buffer);
        fotoPiagamPath = `/uploads/${filename}`;
      }
    }

    // 2. Simpan Foto Kegiatan/Penyerahan jika ada
    let fotoKegiatanPath: string | null = null;
    if (fotoKegiatanBase64 && typeof fotoKegiatanBase64 === "string" && fotoKegiatanBase64.startsWith("data:")) {
      const match = fotoKegiatanBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1].split("/")[1] || "png";
        const buffer = Buffer.from(match[2], "base64");
        const filename = `kegiatan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const fullPath = path.join(uploadDir, filename);
        fs.writeFileSync(fullPath, buffer);
        fotoKegiatanPath = `/uploads/${filename}`;
      }
    }

    const buktiArr: string[] = [];
    if (fotoPiagamPath) buktiArr.push(fotoPiagamPath);
    if (fotoKegiatanPath) buktiArr.push(fotoKegiatanPath);

    // 3. Simpan record PrestasiSiswa & Anggota & Remisi dalam 1 Database Transaction
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
          isRemisiOtomatis,
          poinRemisi: Number(poinRemisi) || 0,
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

      // Jika remisi otomatis diaktifkan dan poinRemisi > 0, buat TransaksiRemisi untuk setiap siswa
      if (isRemisiOtomatis && Number(poinRemisi) > 0) {
        for (const sid of studentIds) {
          await tx.transaksiRemisi.create({
            data: {
              siswaId: sid,
              jenis: "KONDISIONAL",
              poinDikurangi: Number(poinRemisi),
              approverId: user.id,
              tanggal: new Date(`${waktuPelaksanaan}T00:00:00`),
              bukti: buktiArr,
            },
          });
        }
      }

      return record;
    });

    revalidatePath("/dashboard");
    revalidatePath("/prestasi");
    revalidatePath("/remisi");
    revalidatePath("/pelanggaran");

    const countText = studentIds.length === 1 ? "1 siswa" : `${studentIds.length} siswa`;
    const remissionText = isRemisiOtomatis && Number(poinRemisi) > 0
      ? ` serta remisi poin sebesar ${poinRemisi} poin berhasil diberikan!`
      : "!";

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
