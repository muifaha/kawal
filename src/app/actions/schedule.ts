"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getTodayWibStr } from "@/lib/dateUtils";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

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

export async function bulkDeleteMataPelajaranAction(ids: string[]) {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan yang dapat menghapus mata pelajaran." };
  }

  if (!ids || ids.length === 0) {
    return { error: "Pilih setidaknya satu mata pelajaran yang ingin dihapus." };
  }

  try {
    const res = await prisma.mataPelajaran.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath("/jadwal");
    return { success: true, message: `Berhasil menghapus ${res.count} mata pelajaran terpilih.` };
  } catch (error: any) {
    console.error("Bulk delete mata pelajaran error:", error);
    return { error: error.message || "Gagal menghapus mata pelajaran terpilih." };
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

export async function bulkDeleteJadwalAction(ids: string[]) {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan yang dapat menghapus jadwal pelajaran." };
  }

  if (!ids || ids.length === 0) {
    return { error: "Pilih setidaknya satu jadwal pelajaran yang ingin dihapus." };
  }

  try {
    const res = await prisma.jadwalPelajaran.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath("/jadwal");
    return { success: true, message: `Berhasil menghapus ${res.count} jadwal pelajaran terpilih.` };
  } catch (error: any) {
    console.error("Bulk delete jadwal error:", error);
    return { error: error.message || "Gagal menghapus jadwal pelajaran terpilih." };
  }
}

// Jurnal Mengajar (GURU/WALAS/WAKA Only)
export async function saveJurnalAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    return { error: "Akses ditolak. Hanya Guru Pengajar yang dapat mengisi jurnal mengajar." };
  }

  const jadwalId = formData.get("jadwalId") as string | null;
  const kelasId = formData.get("kelasId") as string;
  const mapelId = formData.get("mapelId") as string;
  const jamMulaiStr = formData.get("jamMulai") as string;
  const jamSelesaiStr = formData.get("jamSelesai") as string;
  const namaJurnal = formData.get("namaJurnal") as string;
  const kegiatan = formData.get("kegiatan") as string;
  const rencanaAksi = formData.get("rencanaAksi") as string | null;
  // JSON strings
  const absensiJson = formData.get("absensiJson") as string;
  const penilaianJson = formData.get("penilaianJson") as string;

  if (!kelasId || !mapelId || !jamMulaiStr || !jamSelesaiStr || !namaJurnal || !kegiatan) {
    return { error: "Semua data inti jurnal (Kelas, Mapel, Jam, Nama Jurnal, Kegiatan) wajib diisi." };
  }

  try {
    // Check if jadwalId actually exists in JadwalPelajaran table to avoid FK constraint crashes
    let validJadwalId: string | null = null;
    if (jadwalId && jadwalId.trim() !== "") {
      const dbJadwal = await prisma.jadwalPelajaran.findUnique({
        where: { id: jadwalId },
      });
      if (dbJadwal) {
        validJadwalId = dbJadwal.id;
      }
    }

    // 1. Proses upload file foto kegiatan jika ada (maksimal 3)
    const fotoUrls: string[] = [];
    const fotoKeterangans: string[] = [];

    for (let i = 0; i < 3; i++) {
      const file = formData.get(`foto_${i}`);
      const base64Data = formData.get(`fotoBase64_${i}`) as string | null;
      const existingUrl = formData.get(`fotoUrl_${i}`) as string | null;
      const ket = formData.get(`fotoKeterangan_${i}`) as string | null;

      if (file && typeof file === "object" && "arrayBuffer" in file && (file as File).size > 0) {
        const fileObj = file as File;
        const bytes = await fileObj.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `jurnal_${Date.now()}_${i}_${fileObj.name.replace(/\s+/g, "_")}`;

        const uploadDir = path.join(process.cwd(), "public", "uploads", "jurnal");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fullPath = path.join(uploadDir, filename);
        fs.writeFileSync(fullPath, buffer);
        fotoUrls.push(`/uploads/jurnal/${filename}`);
        fotoKeterangans.push(ket || "");
      } else if (base64Data && typeof base64Data === "string" && base64Data.startsWith("data:image")) {
        const rawBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(rawBase64, "base64");
        const ext = base64Data.includes("image/webp") ? ".webp" : ".png";
        const filename = `jurnal_${Date.now()}_${i}${ext}`;

        const uploadDir = path.join(process.cwd(), "public", "uploads", "jurnal");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fullPath = path.join(uploadDir, filename);
        fs.writeFileSync(fullPath, buffer);
        fotoUrls.push(`/uploads/jurnal/${filename}`);
        fotoKeterangans.push(ket || "");
      } else if (existingUrl && typeof existingUrl === "string" && existingUrl.trim() !== "") {
        fotoUrls.push(existingUrl.trim());
        fotoKeterangans.push(ket || "");
      }
    }

    const fotoUrl = fotoUrls.length > 0 ? JSON.stringify(fotoUrls) : null;
    const fotoKeterangan = fotoUrls.length > 0 ? JSON.stringify(fotoKeterangans) : null;

    const existingJurnalId = formData.get("jurnalId") as string | null;
    const jamMulai = parseInt(jamMulaiStr, 10);
    const jamSelesai = parseInt(jamSelesaiStr, 10);

    const todayWibStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const tanggalStr = formData.get("tanggal") as string | null;
    const validTanggalStr = (tanggalStr && /^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)) ? tanggalStr : todayWibStr;
    const targetDate = new Date(`${validTanggalStr}T00:00:00.000Z`);

    const parsedAbsensi = JSON.parse(absensiJson) as Array<{ siswaId: string; status: string }>;
    const parsedPenilaian = JSON.parse(penilaianJson) as Array<{ siswaId: string; nilai: number; keterangan?: string }>;

    // Check existing journal for targetDate or by ID
    let existingTarget = null;
    if (existingJurnalId) {
      existingTarget = await prisma.jurnalMengajar.findUnique({
        where: { id: existingJurnalId },
      });
    } else if (validJadwalId) {
      existingTarget = await prisma.jurnalMengajar.findFirst({
        where: {
          jadwalId: validJadwalId,
          tanggal: targetDate,
          guruId: user.id,
        },
      });
    }

    // 2. Transaksi penyimpanan / pembaruan jurnal
    await prisma.$transaction(async (tx) => {
      let targetJurnalId = "";

      if (existingTarget) {
        targetJurnalId = existingTarget.id;
        const finalFotoUrl = fotoUrl !== null ? fotoUrl : existingTarget.foto;
        const finalFotoKet = fotoKeterangan !== null ? fotoKeterangan : existingTarget.fotoKeterangan;

        await tx.jurnalMengajar.update({
          where: { id: existingTarget.id },
          data: {
            namaJurnal,
            kegiatan,
            rencanaAksi: rencanaAksi ? rencanaAksi.trim() : existingTarget.rencanaAksi,
            foto: finalFotoUrl,
            fotoKeterangan: finalFotoKet,
          },
        });

        // Hapus absensi & penilaian jurnal lama & tulis ulang
        await tx.jurnalAbsensi.deleteMany({
          where: { jurnalId: existingTarget.id },
        });
        await tx.jurnalPenilaian.deleteMany({
          where: { jurnalId: existingTarget.id },
        });
      } else {
        const created = await tx.jurnalMengajar.create({
          data: {
            jadwalId: validJadwalId,
            kelasId,
            guruId: user.id,
            mapelId,
            jamMulai,
            jamSelesai,
            tanggal: targetDate,
            namaJurnal,
            kegiatan,
            rencanaAksi: rencanaAksi ? rencanaAksi.trim() : null,
            foto: fotoUrl,
            fotoKeterangan: fotoKeterangan || null,
          },
        });
        targetJurnalId = created.id;
      }

      // Insert JurnalAbsensi
      if (parsedAbsensi.length > 0 && targetJurnalId) {
        await tx.jurnalAbsensi.createMany({
          data: parsedAbsensi.map((abs) => ({
            jurnalId: targetJurnalId,
            siswaId: abs.siswaId,
            status: abs.status,
          })),
        });
      }

      // Insert JurnalPenilaian (Opsional)
      if (parsedPenilaian.length > 0 && targetJurnalId) {
        await tx.jurnalPenilaian.createMany({
          data: parsedPenilaian
            .filter((p) => p.nilai !== undefined && p.nilai !== null)
            .map((p) => ({
              jurnalId: targetJurnalId,
              siswaId: p.siswaId,
              nilai: Number(p.nilai),
              keterangan: p.keterangan || null,
            })),
        });
      }
      // Delete existing draft if any after successful submission
      if (validJadwalId) {
        await tx.jurnalDraft.deleteMany({
          where: {
            jadwalId: validJadwalId,
            guruId: user.id,
          },
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

// Tambah / Edit Kegiatan Baru Jurnal (GURU/WALAS/WAKA Only)
export async function createCustomActivityJurnalAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    return { error: "Akses ditolak." };
  }

  const existingJurnalId = formData.get("jurnalId") as string | null;
  const namaJurnal = formData.get("namaJurnal") as string;
  const tanggalStr = formData.get("tanggal") as string;
  const jamMulaiStr = (formData.get("jamMulai") as string) || "";
  const jamSelesaiStr = (formData.get("jamSelesai") as string) || "";
  const waktuStr = (formData.get("waktu") as string) || "";
  const rencanaAksi = (formData.get("rencanaAksi") as string) || "";
  let targetKelasId = formData.get("kelasId") as string;
  let targetMapelId = formData.get("mapelId") as string;
  const kegiatan = formData.get("kegiatan") as string;

  if (!targetKelasId) {
    const firstKelas = await prisma.kelas.findFirst();
    if (firstKelas) {
      targetKelasId = firstKelas.id;
    } else {
      const firstTA = await prisma.tahunAjaran.findFirst();
      let taId = firstTA?.id;
      if (!taId) {
        const newTA = await prisma.tahunAjaran.create({ data: { nama: "2025/2026", isActive: true } });
        taId = newTA.id;
      }
      const newKelas = await prisma.kelas.create({ data: { nama: "KEGIATAN UMUM", tahunAjaranId: taId } });
      targetKelasId = newKelas.id;
    }
  }

  if (!targetMapelId) {
    const firstMapel = await prisma.mataPelajaran.findFirst();
    if (firstMapel) {
      targetMapelId = firstMapel.id;
    } else {
      const newMapel = await prisma.mataPelajaran.create({ data: { kode: "KEG-01", nama: "Kegiatan Pembelajaran" } });
      targetMapelId = newMapel.id;
    }
  }

  if (!namaJurnal || !kegiatan) {
    return { error: "Nama Kegiatan dan Deskripsi Kegiatan wajib diisi." };
  }

  try {
    const fotoUrls: string[] = [];
    const fotoKeterangans: string[] = [];

    for (let i = 0; i < 3; i++) {
      const file = formData.get(`foto_${i}`);
      const base64Data = formData.get(`fotoBase64_${i}`) as string | null;
      const existingUrl = formData.get(`fotoUrl_${i}`) as string | null;
      const ket = formData.get(`fotoKeterangan_${i}`) as string | null;

      if (file && typeof file === "object" && "arrayBuffer" in file && (file as File).size > 0) {
        const fileObj = file as File;
        const bytes = await fileObj.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `jurnal_kegiatan_${Date.now()}_${i}_${fileObj.name.replace(/\s+/g, "_")}`;

        const uploadDir = path.join(process.cwd(), "public", "uploads", "jurnal");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fullPath = path.join(uploadDir, filename);
        fs.writeFileSync(fullPath, buffer);
        fotoUrls.push(`/uploads/jurnal/${filename}`);
        fotoKeterangans.push(ket || "");
      } else if (base64Data && typeof base64Data === "string" && base64Data.startsWith("data:image")) {
        const rawBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(rawBase64, "base64");
        const ext = base64Data.includes("image/webp") ? ".webp" : ".png";
        const filename = `jurnal_kegiatan_${Date.now()}_${i}${ext}`;

        const uploadDir = path.join(process.cwd(), "public", "uploads", "jurnal");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fullPath = path.join(uploadDir, filename);
        fs.writeFileSync(fullPath, buffer);
        fotoUrls.push(`/uploads/jurnal/${filename}`);
        fotoKeterangans.push(ket || "");
      } else if (existingUrl && typeof existingUrl === "string" && existingUrl.trim() !== "") {
        fotoUrls.push(existingUrl.trim());
        fotoKeterangans.push(ket || "");
      }
    }

    const fotoUrl = fotoUrls.length > 0 ? JSON.stringify(fotoUrls) : null;
    const fotoKeterangan = fotoUrls.length > 0 ? JSON.stringify(fotoKeterangans) : null;

    let targetDate: Date;
    if (tanggalStr && /^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)) {
      targetDate = new Date(`${tanggalStr}T00:00:00.000Z`);
    } else {
      const todayStr = getTodayWibStr();
      targetDate = new Date(`${todayStr}T00:00:00.000Z`);
    }

    let timeLabel = "";
    if (jamMulaiStr && jamSelesaiStr) {
      timeLabel = `${jamMulaiStr.trim()} - ${jamSelesaiStr.trim()}`;
    } else if (waktuStr) {
      timeLabel = waktuStr.trim();
    }

    const titleWithTime = timeLabel ? `${namaJurnal.trim()} (${timeLabel})` : namaJurnal.trim();

    if (existingJurnalId && existingJurnalId.trim() !== "") {
      const existing = await prisma.jurnalMengajar.findUnique({
        where: { id: existingJurnalId },
      });
      if (existing) {
        const finalFotoUrl = fotoUrl !== null ? fotoUrl : existing.foto;
        const finalFotoKet = fotoKeterangan !== null ? fotoKeterangan : existing.fotoKeterangan;

        const updatedJurnal = await prisma.jurnalMengajar.update({
          where: { id: existingJurnalId },
          data: {
            tanggal: targetDate,
            namaJurnal: titleWithTime,
            kegiatan: kegiatan.trim(),
            rencanaAksi: rencanaAksi ? rencanaAksi.trim() : existing.rencanaAksi,
            foto: finalFotoUrl,
            fotoKeterangan: finalFotoKet,
          },
        });

        revalidatePath("/jadwal");
        revalidatePath("/dashboard");

        return {
          success: true,
          message: "Kegiatan tambahan berhasil diperbarui!",
          data: updatedJurnal,
        };
      }
    }

    const newJurnal = await prisma.jurnalMengajar.create({
      data: {
        kelasId: targetKelasId,
        guruId: user.id,
        mapelId: targetMapelId,
        jamMulai: 1,
        jamSelesai: 1,
        tanggal: targetDate,
        namaJurnal: titleWithTime,
        kegiatan: kegiatan.trim(),
        rencanaAksi: rencanaAksi ? rencanaAksi.trim() : null,
        foto: fotoUrl,
        fotoKeterangan,
      },
    });

    revalidatePath("/jadwal");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Kegiatan baru berhasil ditambahkan ke Jurnal Mengajar!",
      data: newJurnal,
    };
  } catch (error: any) {
    console.error("createCustomActivityJurnalAction error:", error);
    return { error: error.message || "Gagal menyimpan kegiatan." };
  }
}

// Ambil detail lengkap jurnal beserta daftar siswa & absensi untuk PDF/Cetak
export async function getJurnalFullDetailAction(jurnalId: string) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Akses ditolak." };
  }

  try {
    const jurnal = await prisma.jurnalMengajar.findUnique({
      where: { id: jurnalId },
      include: {
        kelas: true,
        guru: true,
        mapel: true,
        absensi: {
          include: {
            siswa: true,
          },
          orderBy: {
            siswa: { nama: "asc" },
          },
        },
      },
    });

    if (!jurnal) {
      return { error: "Data jurnal mengajar tidak ditemukan." };
    }

    const appSettingsList = await prisma.appSetting.findMany();
    const schoolSettings: Record<string, string> = {};
    appSettingsList.forEach((s) => {
      schoolSettings[s.key] = s.value;
    });

    return { success: true, jurnal, schoolSettings };
  } catch (error: any) {
    console.error("getJurnalFullDetailAction error:", error);
    return { error: "Gagal memuat data detail jurnal." };
  }
}

// Auto-Save Draft Jurnal Action
export async function saveJurnalDraftAction(payload: {
  jadwalId: string;
  namaJurnal?: string;
  kegiatan?: string;
  photosJson?: string;
  attendanceJson?: string;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    return { error: "Akses ditolak." };
  }

  if (!payload.jadwalId) {
    return { error: "Jadwal ID tidak valid." };
  }

  try {
    const draft = await prisma.jurnalDraft.upsert({
      where: {
        jadwalId_guruId: {
          jadwalId: payload.jadwalId,
          guruId: user.id,
        },
      },
      update: {
        namaJurnal: payload.namaJurnal || null,
        kegiatan: payload.kegiatan || null,
        photosJson: payload.photosJson || null,
        attendanceJson: payload.attendanceJson || null,
      },
      create: {
        jadwalId: payload.jadwalId,
        guruId: user.id,
        namaJurnal: payload.namaJurnal || null,
        kegiatan: payload.kegiatan || null,
        photosJson: payload.photosJson || null,
        attendanceJson: payload.attendanceJson || null,
      },
    });

    const timeStr = draft.updatedAt.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return { success: true, message: `Draf tersimpan otomatis pukul ${timeStr}`, updatedAt: timeStr };
  } catch (error: any) {
    console.error("Save draft error:", error);
    return { error: error.message || "Gagal menyimpan draf otomatis." };
  }
}

// Get Jurnal Draft Action
export async function getJurnalDraftAction(jadwalId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Akses ditolak." };

  try {
    const draft = await prisma.jurnalDraft.findUnique({
      where: {
        jadwalId_guruId: {
          jadwalId,
          guruId: user.id,
        },
      },
    });

    if (!draft) return { success: true, draft: null };

    const timeStr = draft.updatedAt.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return {
      success: true,
      draft: {
        namaJurnal: draft.namaJurnal || "",
        kegiatan: draft.kegiatan || "",
        photosJson: draft.photosJson || "[]",
        attendanceJson: draft.attendanceJson || "[]",
        updatedAt: timeStr,
      },
    };
  } catch (error: any) {
    console.error("Get draft error:", error);
    return { error: error.message || "Gagal mengambil draf." };
  }
}

// Import Excel Schedule (WAKA Only)
export async function importJadwalExcelAction(fileBase64: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "WAKA") {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan yang dapat mengimpor file jadwal." };
  }

  if (!fileBase64) {
    return { error: "File Excel jadwal wajib diunggah." };
  }

  try {
    const base64Data = fileBase64.replace(/^data:.*;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const wb = XLSX.read(buffer, { type: "buffer" });

    const dayMap: Record<string, number> = {
      SENIN: 1,
      SELASA: 2,
      RABU: 3,
      KAMIS: 4,
      JUMAT: 5,
      SABTU: 6,
      MINGGU: 7,
    };

    const normalizeTeacherName = (name: string): string => {
      return name
        .replace(/(S\.Pd|M\.Pd|S\.Kom|S\.E|S\.H|S\.Sn|S\.Ag|Drs|Dra|Hj|H|M\.T|M\.TI|M\.Si)\.?/gi, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
    };

    const generateUsername = (name: string): string => {
      const clean = normalizeTeacherName(name).toLowerCase();
      return clean ? `guru_${clean}` : `guru_${Date.now()}`;
    };

    const generateMapelCode = (name: string, existingCodes: Set<string>): string => {
      const words = name.trim().split(/\s+/);
      let baseCode = "";
      if (words.length >= 2) {
        baseCode = words.map((w) => w[0]).join("").toUpperCase();
      } else {
        baseCode = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5);
      }

      if (!baseCode) baseCode = "MAPEL";

      let candidate = `MP-${baseCode}`;
      let counter = 1;
      while (existingCodes.has(candidate)) {
        candidate = `MP-${baseCode}${counter}`;
        counter++;
      }
      existingCodes.add(candidate);
      return candidate;
    };

    // 1. Dapatkan atau buat Tahun Ajaran Aktif (Default: 2026/2027)
    let activeTa = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
    });

    if (!activeTa) {
      activeTa = await prisma.tahunAjaran.upsert({
        where: { nama: "2026/2027" },
        update: { isActive: true },
        create: {
          nama: "2026/2027",
          isActive: true,
          semesterAktif: "GANJIL",
        },
      });
    }

    const defaultPasswordHash = await bcrypt.hash("guru123", 10);

    const existingUsers = await prisma.user.findMany({ select: { id: true, nama: true } });
    const existingMapel = await prisma.mataPelajaran.findMany({ select: { id: true, nama: true, kode: true } });
    const existingKelas = await prisma.kelas.findMany({
      where: { tahunAjaranId: activeTa.id },
      select: { id: true, nama: true },
    });

    const userMapByNama = new Map<string, string>();
    const userMapByNormNama = new Map<string, string>();
    existingUsers.forEach((u) => {
      userMapByNama.set(u.nama.trim().toUpperCase(), u.id);
      userMapByNormNama.set(normalizeTeacherName(u.nama), u.id);
    });

    const mapelMapByNama = new Map<string, string>();
    const existingMapelCodes = new Set<string>();
    existingMapel.forEach((m) => {
      mapelMapByNama.set(m.nama.trim().toUpperCase(), m.id);
      existingMapelCodes.add(m.kode);
    });

    const kelasMapByNama = new Map<string, string>();
    existingKelas.forEach((k) => kelasMapByNama.set(k.nama.trim().toUpperCase(), k.id));

    let createdGuruCount = 0;
    let createdMapelCount = 0;
    let createdKelasCount = 0;
    let totalJadwalCreated = 0;

    for (const sheetName of wb.SheetNames) {
      if (sheetName.toUpperCase() === "DAFTAR KELAS") continue;

      const className = sheetName.trim();
      if (!className) continue;

      let kelasId = kelasMapByNama.get(className.toUpperCase());
      if (!kelasId) {
        const newKelas = await prisma.kelas.create({
          data: {
            nama: className,
            tahunAjaranId: activeTa.id,
          },
        });
        kelasId = newKelas.id;
        kelasMapByNama.set(className.toUpperCase(), kelasId);
        createdKelasCount++;
      }

      await prisma.jadwalPelajaran.deleteMany({
        where: { kelasId },
      });

      const sheet = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      let currentDay = 1;

      const rawSlots: {
        hari: number;
        jamKe: number;
        guruId: string;
        mapelId: string;
      }[] = [];

      for (const row of json) {
        if (!row || row.length === 0) continue;

        const cell0 = String(row[0] || "").trim().toUpperCase();
        if (dayMap[cell0]) {
          currentDay = dayMap[cell0];
        }

        const jamKeVal = row[1];
        const waktuVal = String(row[2] || "").trim();
        const guruVal = String(row[3] || "").trim();
        const mapelVal = String(row[4] || "").trim();

        if (
          cell0 === "HARI" ||
          waktuVal.toUpperCase() === "WAKTU" ||
          guruVal.toUpperCase() === "GURU"
        ) {
          continue;
        }

        const isSpecialActivity = [
          "UPACARA",
          "ISTIRAHAT",
          "ISHOMA",
          "BUDAYA BERSIH DAN SEHAT",
          "BUDAYA LITERASI",
          "BUDAYA APRESIASI SENI",
          "BUDAYA RELIGI",
        ].some(
          (act) =>
            guruVal.toUpperCase().includes(act) || mapelVal.toUpperCase().includes(act)
        );

        if (isSpecialActivity || jamKeVal === "-" || !jamKeVal) {
          continue;
        }

        const jamKe = parseInt(String(jamKeVal), 10);
        if (isNaN(jamKe) || !guruVal || !mapelVal) continue;

        let guruId =
          userMapByNama.get(guruVal.toUpperCase()) ||
          userMapByNormNama.get(normalizeTeacherName(guruVal));
        if (!guruId) {
          const username = generateUsername(guruVal);
          const newGuru = await prisma.user.create({
            data: {
              username,
              passwordHash: defaultPasswordHash,
              nama: guruVal,
              role: "GURU",
            },
          });
          guruId = newGuru.id;
          userMapByNama.set(guruVal.toUpperCase(), guruId);
          userMapByNormNama.set(normalizeTeacherName(guruVal), guruId);
          createdGuruCount++;
        }

        let mapelId = mapelMapByNama.get(mapelVal.toUpperCase());
        if (!mapelId) {
          const kode = generateMapelCode(mapelVal, existingMapelCodes);
          const newMapel = await prisma.mataPelajaran.create({
            data: {
              kode,
              nama: mapelVal,
            },
          });
          mapelId = newMapel.id;
          mapelMapByNama.set(mapelVal.toUpperCase(), mapelId);
          createdMapelCount++;
        }

        rawSlots.push({
          hari: currentDay,
          jamKe,
          guruId,
          mapelId,
        });
      }

      // Merge consecutive slots for the same class, day, guru, and mapel
      const mergedBlocks: {
        hari: number;
        jamMulai: number;
        jamSelesai: number;
        guruId: string;
        mapelId: string;
      }[] = [];

      // Sort raw slots by hari asc, jamKe asc
      rawSlots.sort((a, b) => {
        if (a.hari !== b.hari) return a.hari - b.hari;
        return a.jamKe - b.jamKe;
      });

      for (const slot of rawSlots) {
        const lastBlock = mergedBlocks[mergedBlocks.length - 1];
        if (
          lastBlock &&
          lastBlock.hari === slot.hari &&
          lastBlock.guruId === slot.guruId &&
          lastBlock.mapelId === slot.mapelId &&
          slot.jamKe === lastBlock.jamSelesai + 1
        ) {
          // Merge consecutive slot
          lastBlock.jamSelesai = slot.jamKe;
        } else {
          // New schedule block
          mergedBlocks.push({
            hari: slot.hari,
            jamMulai: slot.jamKe,
            jamSelesai: slot.jamKe,
            guruId: slot.guruId,
            mapelId: slot.mapelId,
          });
        }
      }

      // Save merged blocks to Database
      for (const block of mergedBlocks) {
        await prisma.jadwalPelajaran.create({
          data: {
            kelasId,
            guruId: block.guruId,
            mapelId: block.mapelId,
            hari: block.hari,
            jamMulai: block.jamMulai,
            jamSelesai: block.jamSelesai,
          },
        });
        totalJadwalCreated++;
      }
    }

    revalidatePath("/jadwal");
    return {
      success: true,
      message: `Import jadwal Excel berhasil diselesaikan! (${totalJadwalCreated} slot jadwal dimasukkan, ${createdKelasCount} kelas baru, ${createdGuruCount} guru baru, ${createdMapelCount} mapel baru).`,
    };
  } catch (error: any) {
    console.error("Import jadwal Excel error:", error);
    return { error: `Gagal mengimpor file Excel: ${error.message || error}` };
  }
}

export async function getDailyAttendanceMatrixAction(dateStr: string) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Akses ditolak." };
  }

  try {
    const dateObj = new Date(`${dateStr}T12:00:00.000Z`);
    const dayNumber = dateObj.getUTCDay() === 0 ? 7 : dateObj.getUTCDay();
    const dayNames: Record<number, string> = {
      1: "SENIN",
      2: "SELASA",
      3: "RABU",
      4: "KAMIS",
      5: "JUMAT",
      6: "SABTU",
      7: "MINGGU",
    };
    const dayTipe = dayNames[dayNumber] || "SENIN";

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const classes = await prisma.kelas.findMany({
      include: {
        siswaKelas: {
          include: {
            siswa: true,
          },
          orderBy: {
            siswa: { nama: "asc" },
          },
        },
      },
    });

    const schedules = await prisma.jadwalPelajaran.findMany({
      where: { hari: dayNumber },
      include: {
        kelas: true,
        guru: true,
        mapel: true,
      },
      orderBy: { jamMulai: "asc" },
    });

    const journals = await prisma.jurnalMengajar.findMany({
      where: {
        tanggal: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        kelas: true,
        guru: true,
        mapel: true,
        absensi: {
          include: {
            siswa: true,
          },
        },
      },
      orderBy: { jamMulai: "asc" },
    });

    const appSettingsList = await prisma.appSetting.findMany();
    const schoolSettings: Record<string, string> = {};
    appSettingsList.forEach((s) => {
      schoolSettings[s.key] = s.value;
    });

    return {
      success: true,
      dateStr,
      dayTipe,
      classes,
      schedules,
      journals,
      schoolSettings,
    };
  } catch (error: any) {
    console.error("getDailyAttendanceMatrixAction error:", error);
    return { error: "Gagal mengambil data matriks kehadiran." };
  }
}

// Hapus Kegiatan Tambahan (Non-KBM Custom Activity)
export async function deleteCustomActivityJurnalAction(jurnalId: string) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Akses ditolak." };
  }

  try {
    const existing = await prisma.jurnalMengajar.findUnique({
      where: { id: jurnalId },
      include: { kelas: true, mapel: true },
    });

    if (!existing) {
      return { error: "Data jurnal tidak ditemukan." };
    }

    if (existing.guruId !== user.id && user.role !== "WAKA") {
      return { error: "Anda tidak memiliki akses untuk menghapus jurnal ini." };
    }

    const isCustom =
      !existing.jadwalId ||
      existing.kelas?.nama === "KEGIATAN UMUM" ||
      existing.mapel?.nama === "Kegiatan Pembelajaran";

    if (!isCustom) {
      return { error: "Hanya jurnal kegiatan tambahan yang dapat dihapus." };
    }

    await prisma.jurnalAbsensi.deleteMany({
      where: { jurnalId },
    });

    await prisma.jurnalMengajar.delete({
      where: { id: jurnalId },
    });

    revalidatePath("/jadwal");
    revalidatePath("/dashboard");

    return { success: true, message: "Kegiatan tambahan berhasil dihapus." };
  } catch (error: any) {
    console.error("deleteCustomActivityJurnalAction error:", error);
    return { error: error.message || "Gagal menghapus kegiatan tambahan." };
  }
}


