"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs";

// Jam Pelajaran Settings (WAKA Only)
export async function saveJamPelajaranAction(
  hariTipe: string,
  jamKe: number,
  waktuMulai: string,
  waktuSelesai: string,
  isIstirahat: boolean,
  keterangan?: string,
  id?: string
) {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan yang dapat mengelola jam pelajaran." };
  }

  if (!hariTipe || jamKe === undefined || !waktuMulai || !waktuSelesai) {
    return { error: "Semua kolom utama jam pelajaran wajib diisi." };
  }

  try {
    if (id) {
      await prisma.jamPelajaran.update({
        where: { id },
        data: { hariTipe, jamKe, waktuMulai, waktuSelesai, isIstirahat, keterangan: keterangan || null },
      });
    } else {
      await prisma.jamPelajaran.create({
        data: { hariTipe, jamKe, waktuMulai, waktuSelesai, isIstirahat, keterangan: keterangan || null },
      });
    }

    revalidatePath("/jadwal");
    return { success: true, message: "Pengaturan jam pelajaran berhasil disimpan." };
  } catch (error: any) {
    console.error("Save jam pelajaran error:", error);
    return { error: error.message || "Gagal menyimpan jam pelajaran." };
  }
}

export async function deleteJamPelajaranAction(id: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan yang dapat menghapus jam pelajaran." };
  }

  try {
    await prisma.jamPelajaran.delete({ where: { id } });
    revalidatePath("/jadwal");
    return { success: true, message: "Jam pelajaran berhasil dihapus." };
  } catch (error: any) {
    console.error("Delete jam pelajaran error:", error);
    return { error: error.message || "Gagal menghapus jam pelajaran." };
  }
}

// Mata Pelajaran (WAKA Only)
export async function saveMataPelajaranAction(kode: string, nama: string, id?: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan yang dapat mengelola mata pelajaran." };
  }

  if (!kode || !nama) {
    return { error: "Kode dan nama mata pelajaran wajib diisi." };
  }

  try {
    if (id) {
      await prisma.mataPelajaran.update({
        where: { id },
        data: { kode, nama },
      });
    } else {
      await prisma.mataPelajaran.create({
        data: { kode, nama },
      });
    }

    revalidatePath("/jadwal");
    return { success: true, message: "Mata pelajaran berhasil disimpan." };
  } catch (error: any) {
    console.error("Save mata pelajaran error:", error);
    return { error: error.message || "Gagal menyimpan mata pelajaran." };
  }
}

export async function deleteMataPelajaranAction(id: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan yang dapat menghapus mata pelajaran." };
  }

  try {
    await prisma.mataPelajaran.delete({ where: { id } });
    revalidatePath("/jadwal");
    return { success: true, message: "Mata pelajaran berhasil dihapus." };
  } catch (error: any) {
    console.error("Delete mata pelajaran error:", error);
    return { error: error.message || "Gagal menghapus mata pelajaran." };
  }
}

// Jadwal Pelajaran (WAKA Only)
export async function saveJadwalAction(
  kelasId: string,
  guruId: string,
  mapelId: string,
  hari: number,
  jamMulai: number,
  jamSelesai: number,
  id?: string
) {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan yang dapat mengelola jadwal pelajaran." };
  }

  if (!kelasId || !guruId || !mapelId || !hari || !jamMulai || !jamSelesai) {
    return { error: "Semua kolom jadwal pelajaran wajib ditentukan." };
  }

  try {
    if (id) {
      await prisma.jadwalPelajaran.update({
        where: { id },
        data: { kelasId, guruId, mapelId, hari, jamMulai, jamSelesai },
      });
    } else {
      await prisma.jadwalPelajaran.create({
        data: { kelasId, guruId, mapelId, hari, jamMulai, jamSelesai },
      });
    }

    revalidatePath("/jadwal");
    return { success: true, message: "Jadwal pelajaran berhasil disimpan." };
  } catch (error: any) {
    console.error("Save jadwal error:", error);
    return { error: error.message || "Gagal menyimpan jadwal pelajaran." };
  }
}

export async function deleteJadwalAction(id: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan yang dapat menghapus jadwal pelajaran." };
  }

  try {
    await prisma.jadwalPelajaran.delete({ where: { id } });
    revalidatePath("/jadwal");
    return { success: true, message: "Jadwal pelajaran berhasil dihapus." };
  } catch (error: any) {
    console.error("Delete jadwal error:", error);
    return { error: error.message || "Gagal menghapus jadwal pelajaran." };
  }
}

// Jurnal Mengajar (GURU/WALAS Only)
export async function saveJurnalAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS")) {
    return { error: "Akses ditolak. Hanya Guru Pengajar yang dapat mengisi jurnal mengajar." };
  }

  const jadwalId = formData.get("jadwalId") as string | null;
  const kelasId = formData.get("kelasId") as string;
  const mapelId = formData.get("mapelId") as string;
  const jamMulaiStr = formData.get("jamMulai") as string;
  const jamSelesaiStr = formData.get("jamSelesai") as string;
  const namaJurnal = formData.get("namaJurnal") as string;
  const kegiatan = formData.get("kegiatan") as string;
  // JSON strings
  const absensiJson = formData.get("absensiJson") as string;
  const penilaianJson = formData.get("penilaianJson") as string;

  if (!kelasId || !mapelId || !jamMulaiStr || !jamSelesaiStr || !namaJurnal || !kegiatan) {
    return { error: "Semua data inti jurnal (Kelas, Mapel, Jam, Nama Jurnal, Kegiatan) wajib diisi." };
  }

  try {
    // 1. Proses upload file foto kegiatan jika ada (maksimal 3)
    const fotoUrls: string[] = [];
    const fotoKeterangans: string[] = [];

    for (let i = 0; i < 3; i++) {
      const file = formData.get(`foto_${i}`) as File | null;
      const ket = formData.get(`fotoKeterangan_${i}`) as string | null;

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `jurnal_${Date.now()}_${i}_${file.name.replace(/\s+/g, "_")}`;

        const uploadDir = path.join(process.cwd(), "public", "uploads", "jurnal");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fullPath = path.join(uploadDir, filename);
        fs.writeFileSync(fullPath, buffer);
        fotoUrls.push(`/uploads/jurnal/${filename}`);
        fotoKeterangans.push(ket || "");
      }
    }

    const fotoUrl = fotoUrls.length > 0 ? JSON.stringify(fotoUrls) : null;
    const fotoKeterangan = fotoUrls.length > 0 ? JSON.stringify(fotoKeterangans) : null;

    const jamMulai = parseInt(jamMulaiStr, 10);
    const jamSelesai = parseInt(jamSelesaiStr, 10);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Midnight UTC safe

    const parsedAbsensi = JSON.parse(absensiJson) as Array<{ siswaId: string; status: string }>;
    const parsedPenilaian = JSON.parse(penilaianJson) as Array<{ siswaId: string; nilai: number; keterangan?: string }>;

    // 2. Transaksi penyimpanan jurnal
    await prisma.$transaction(async (tx) => {
      const jurnal = await tx.jurnalMengajar.create({
        data: {
          jadwalId: jadwalId || null,
          kelasId,
          guruId: user.id,
          mapelId,
          jamMulai,
          jamSelesai,
          tanggal: today,
          namaJurnal,
          kegiatan,
          foto: fotoUrl,
          fotoKeterangan: fotoKeterangan || null,
        },
      });

      // Insert JurnalAbsensi (Terisolasi dari BK)
      if (parsedAbsensi.length > 0) {
        await tx.jurnalAbsensi.createMany({
          data: parsedAbsensi.map((abs) => ({
            jurnalId: jurnal.id,
            siswaId: abs.siswaId,
            status: abs.status,
          })),
        });
      }

      // Insert JurnalPenilaian (Opsional)
      if (parsedPenilaian.length > 0) {
        await tx.jurnalPenilaian.createMany({
          data: parsedPenilaian
            .filter((p) => p.nilai !== undefined && p.nilai !== null)
            .map((p) => ({
              jurnalId: jurnal.id,
              siswaId: p.siswaId,
              nilai: Number(p.nilai),
              keterangan: p.keterangan || null,
            })),
        });
      }
    });

    revalidatePath("/jadwal");
    revalidatePath("/dashboard");
    return { success: true, message: "Jurnal mengajar berhasil disimpan." };
  } catch (error: any) {
    console.error("Save jurnal error:", error);
    return { error: error.message || "Gagal menyimpan jurnal mengajar." };
  }
}
