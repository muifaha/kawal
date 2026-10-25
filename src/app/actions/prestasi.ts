"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { JenisKepesertaan, KategoriPrestasi, TingkatPrestasi } from "@prisma/client";
import { getUploadDir } from "@/lib/uploadHelper";

const ALLOWED_ROLES = ["PEMBINA_OSIS", "WAKA", "BK", "WALAS", "GURU"];

function saveBase64Image(base64Data: string, prefix: string): string | null {
  try {
    if (!base64Data || typeof base64Data !== "string" || !base64Data.includes(";base64,")) {
      return null;
    }
    const uploadDir = getUploadDir();

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
 * Otomatis memberikan remisi sesuai bobot poin tingkatan prestasi (Kota/Kab: 10, Prov: 15, Nas/Int: 20, Kec/Sekolah: 5).
 * Aturan: Remisi otomatis hanya berlaku maksimal 1 kali per siswa per tahun pelajaran.
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

    // 2. Cari MasterRemisi yang sesuai dengan tingkat prestasi
    const masterPrestasiList = await prisma.masterRemisi.findMany({
      where: {
        nama: { contains: "prestasi", mode: "insensitive" },
        isActive: true,
      },
    });

    const masterPrestasiIds = masterPrestasiList.map((m) => m.id);

    // Pemetaan tingkatan prestasi ke MasterRemisi
    const matchedMaster = masterPrestasiList.find((m) => {
      const n = m.nama.toLowerCase();
      if (tingkat === "KOTA") return n.includes("kota") || n.includes("kabupaten");
      if (tingkat === "PROVINSI") return n.includes("provinsi");
      if (tingkat === "NASIONAL") return n.includes("nasional");
      if (tingkat === "INTERNASIONAL") return n.includes("internasional") || n.includes("nasional");
      if (tingkat === "KECAMATAN") return n.includes("kecamatan") || n.includes("sekolah");
      return false;
    });

    // Poin default sesuai tingkatan jika belum disetel di Master Remisi
    const defaultPointsMap: Record<string, number> = {
      KECAMATAN: 5,
      KOTA: 10,
      PROVINSI: 15,
      NASIONAL: 20,
      INTERNASIONAL: 20,
    };
    const fallbackPoint = defaultPointsMap[tingkat] || 10;

    let targetDeductionPoints = fallbackPoint;
    let isPercentageScheme = false;
    let targetPercentage = 10;

    if (matchedMaster) {
      if (matchedMaster.tipePengurangan === "POIN_TETAP") {
        targetDeductionPoints =
          matchedMaster.poinPengurangan && matchedMaster.poinPengurangan > 0
            ? matchedMaster.poinPengurangan
            : fallbackPoint;
      } else if (matchedMaster.tipePengurangan === "PERSENTASE") {
        isPercentageScheme = true;
        targetPercentage = matchedMaster.persentasePengurangan || 10;
      }
    }

    // 3. Tentukan rentang tanggal Tahun Ajaran aktif untuk pembatasan 1x per tahun pelajaran
    const activeTA = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });

    let taStartDate: Date;
    let taEndDate: Date;

    if (activeTA?.ganjilMulai && activeTA?.genapSelesai) {
      taStartDate = new Date(activeTA.ganjilMulai);
      taStartDate.setHours(0, 0, 0, 0);
      taEndDate = new Date(activeTA.genapSelesai);
      taEndDate.setHours(23, 59, 59, 999);
    } else if (activeTA?.nama && activeTA.nama.includes("/")) {
      const parts = activeTA.nama.trim().split("/");
      const y1 = parseInt(parts[0], 10);
      const y2 = parseInt(parts[1], 10);
      if (!isNaN(y1) && !isNaN(y2)) {
        taStartDate = new Date(y1, 6, 1, 0, 0, 0, 0);
        taEndDate = new Date(y2, 5, 30, 23, 59, 59, 999);
      } else {
        taStartDate = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
        taEndDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
      }
    } else {
      taStartDate = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
      taEndDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    let totalRemissionStudents = 0;
    let totalRemissionPoinSum = 0;
    let totalSkippedAlreadyUsed = 0;
    let totalSkippedZeroPoints = 0;

    // 4. Simpan record PrestasiSiswa & Anggota & Eksekusi remisi sesuai batasan 1x per tahun pelajaran
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

      // Proses remisi poin per siswa (maksimal 1 kali pengurangan per tahun pelajaran)
      for (const sid of studentIds) {
        // Cek apakah siswa sudah pernah menerima transaksi remisi prestasi di tahun pelajaran ini
        const existingRemisiInTA = await tx.transaksiRemisi.findFirst({
          where: {
            siswaId: sid,
            tanggal: {
              gte: taStartDate,
              lte: taEndDate,
            },
            poinDikurangi: { gt: 0 },
            OR: [
              ...(masterPrestasiIds.length > 0 ? [{ masterRemisiId: { in: masterPrestasiIds } }] : []),
              { masterRemisi: { nama: { contains: "prestasi", mode: "insensitive" } } },
            ],
          },
        });

        // Cek juga apakah siswa sudah terdaftar pada PrestasiSiswa lain di tahun pelajaran ini yang memberikan remisi
        const existingPrestasiWithRemisiInTA = await tx.prestasiSiswaAnggota.findFirst({
          where: {
            siswaId: sid,
            prestasi: {
              id: { not: record.id },
              waktuPelaksanaan: {
                gte: taStartDate,
                lte: taEndDate,
              },
              poinRemisi: { gt: 0 },
            },
          },
        });

        // Jika siswa sudah pernah mengurangi poin prestasi di tahun pelajaran aktif, lewati
        if (existingRemisiInTA || existingPrestasiWithRemisiInTA) {
          totalSkippedAlreadyUsed++;
          continue;
        }

        // Cek poin pelanggaran aktif siswa saat ini
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
          const totalRemissions = Math.round(student.remisi.reduce((sum, r) => sum + r.poinDikurangi, 0) * 100) / 100;
          const currentPoints = Math.max(0, Math.round((totalViolations - totalRemissions) * 100) / 100);

          if (currentPoints > 0) {
            let pointsToReduce = targetDeductionPoints;
            if (isPercentageScheme) {
              pointsToReduce = Math.max(0.1, Math.round(currentPoints * (targetPercentage / 100) * 100) / 100);
            }

            // Pengurangan tidak melebihi poin berjalan siswa
            const actualDeduction = Math.min(currentPoints, pointsToReduce);
            const finalDeduction = Math.round(actualDeduction * 100) / 100;

            if (finalDeduction > 0) {
              await tx.transaksiRemisi.create({
                data: {
                  siswaId: sid,
                  jenis: "KONDISIONAL",
                  masterRemisiId: matchedMaster?.id || null,
                  poinDikurangi: finalDeduction,
                  approverId: user.id,
                  tanggal: new Date(`${waktuPelaksanaan}T00:00:00`),
                  bukti: buktiArr,
                },
              });

              totalRemissionStudents++;
              totalRemissionPoinSum = Math.round((totalRemissionPoinSum + finalDeduction) * 100) / 100;
            }
          } else {
            totalSkippedZeroPoints++;
          }
        }
      }

      // Update poinRemisi rata-rata / sum pada record prestasi jika ada remisi yang berlaku
      if (totalRemissionPoinSum > 0) {
        await tx.prestasiSiswa.update({
          where: { id: record.id },
          data: {
            poinRemisi: Math.round((totalRemissionPoinSum / (totalRemissionStudents || 1)) * 100) / 100,
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
    const tingkatLabel =
      tingkat === "KOTA"
        ? "Kota/Kabupaten"
        : tingkat === "KECAMATAN"
        ? "Kecamatan"
        : tingkat === "PROVINSI"
        ? "Provinsi"
        : tingkat === "NASIONAL"
        ? "Nasional"
        : tingkat === "INTERNASIONAL"
        ? "Internasional"
        : tingkat;

    const deductionLabel = isPercentageScheme
      ? `${targetPercentage}%`
      : `${targetDeductionPoints} poin`;

    let remissionText = "";
    if (totalRemissionStudents > 0) {
      remissionText = ` serta remisi otomatis -${deductionLabel} (Tingkat ${tingkatLabel}) berhasil diberikan kepada ${totalRemissionStudents} siswa.`;
    }

    const details: string[] = [];
    if (totalSkippedAlreadyUsed > 0) {
      details.push(
        `${totalSkippedAlreadyUsed} siswa tidak mendapatkan remisi karena sudah pernah menerima pengurangan prestasi di tahun pelajaran ini (maksimal 1x per TP)`
      );
    }
    if (totalSkippedZeroPoints > 0) {
      details.push(`${totalSkippedZeroPoints} siswa memiliki 0 poin pelanggaran`);
    }

    if (details.length > 0) {
      remissionText += ` (${details.join(", ")})`;
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
      include: { anggota: true },
    });

    if (!existing) {
      return { error: "Data prestasi tidak ditemukan." };
    }

    await prisma.$transaction(async (tx) => {
      // Hapus transaksi remisi terkait jika ada bukti piagam/kegiatan prestasi ini
      const buktiToDelete: string[] = [];
      if (existing.fotoPiagam) buktiToDelete.push(existing.fotoPiagam);
      if (existing.fotoKegiatan) buktiToDelete.push(existing.fotoKegiatan);

      const memberIds = existing.anggota.map((a) => a.siswaId);

      if (memberIds.length > 0 && buktiToDelete.length > 0) {
        await tx.transaksiRemisi.deleteMany({
          where: {
            siswaId: { in: memberIds },
            bukti: { hasSome: buktiToDelete },
          },
        });
      }

      await tx.prestasiSiswa.delete({
        where: { id: prestasiId },
      });
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
