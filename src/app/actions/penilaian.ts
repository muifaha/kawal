"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getTeacherClassesAndSubjectsAction() {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    return { error: "Akses ditolak." };
  }

  try {
    // Dapatkan jadwal mengajar guru
    const schedules = await prisma.jadwalPelajaran.findMany({
      where: user.role === "WAKA" ? {} : { guruId: user.id },
      include: {
        kelas: true,
        mapel: true,
      },
      orderBy: { kelas: { nama: "asc" } },
    });

    // Grouping per kelas -> array mapel unik
    const classMap = new Map<string, { id: string; nama: string; mapels: Array<{ id: string; kode: string; nama: string }> }>();

    schedules.forEach((s) => {
      if (!classMap.has(s.kelasId)) {
        classMap.set(s.kelasId, {
          id: s.kelas.id,
          nama: s.kelas.nama,
          mapels: [],
        });
      }
      const cls = classMap.get(s.kelasId)!;
      if (!cls.mapels.some((m) => m.id === s.mapelId)) {
        cls.mapels.push({
          id: s.mapel.id,
          kode: s.mapel.kode,
          nama: s.mapel.nama,
        });
      }
    });

    const classList = Array.from(classMap.values());

    // Jika guru belum/tidak punya jadwal di JadwalPelajaran, berikan opsi semua kelas aktif
    if (classList.length === 0) {
      const activeTa = await prisma.tahunAjaran.findFirst({ where: { isActive: true } });
      const allClasses = await prisma.kelas.findMany({
        where: activeTa ? { tahunAjaranId: activeTa.id } : {},
        orderBy: { nama: "asc" },
      });
      const allMapels = await prisma.mataPelajaran.findMany({ orderBy: { nama: "asc" } });

      return {
        success: true,
        data: allClasses.map((c) => ({
          id: c.id,
          nama: c.nama,
          mapels: allMapels.map((m) => ({ id: m.id, kode: m.kode, nama: m.nama })),
        })),
      };
    }

    return { success: true, data: classList };
  } catch (error: any) {
    console.error("getTeacherClassesAndSubjectsAction error:", error);
    return { error: error.message || "Gagal mengambil daftar kelas & mapel." };
  }
}

export async function getPenilaianKelasListAction(kelasId: string, mapelId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Akses ditolak." };

  try {
    const list = await prisma.penilaianKelas.findMany({
      where: {
        kelasId,
        mapelId,
        ...(user.role === "WAKA" ? {} : { guruId: user.id }),
      },
      include: {
        _count: { select: { nilaiSiswa: true } },
      },
      orderBy: { tanggal: "desc" },
    });

    return {
      success: true,
      data: list.map((item) => ({
        id: item.id,
        namaPenilaian: item.namaPenilaian,
        tanggal: item.tanggal.toISOString().split("T")[0],
        deskripsi: item.deskripsi || "",
        totalTerisi: item._count.nilaiSiswa,
      })),
    };
  } catch (error: any) {
    console.error("getPenilaianKelasListAction error:", error);
    return { error: error.message || "Gagal mengambil daftar penilaian." };
  }
}

export async function createPenilaianKelasAction(payload: {
  kelasId: string;
  mapelId: string;
  namaPenilaian: string;
  tanggal: string;
  deskripsi?: string;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    return { error: "Akses ditolak." };
  }

  if (!payload.kelasId || !payload.mapelId || !payload.namaPenilaian || !payload.tanggal) {
    return { error: "Kelas, Mapel, Nama Penilaian, dan Tanggal wajib diisi." };
  }

  try {
    const newPenilaian = await prisma.penilaianKelas.create({
      data: {
        kelasId: payload.kelasId,
        mapelId: payload.mapelId,
        guruId: user.id,
        namaPenilaian: payload.namaPenilaian.trim(),
        tanggal: new Date(payload.tanggal),
        deskripsi: payload.deskripsi?.trim() || null,
      },
    });

    revalidatePath("/jadwal");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Penilaian baru berhasil ditambahkan.",
      data: newPenilaian,
    };
  } catch (error: any) {
    console.error("createPenilaianKelasAction error:", error);
    return { error: error.message || "Gagal membuat penilaian baru." };
  }
}

export async function deletePenilaianKelasAction(id: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Akses ditolak." };

  try {
    await prisma.penilaianKelas.delete({ where: { id } });
    revalidatePath("/jadwal");
    revalidatePath("/dashboard");
    return { success: true, message: "Penilaian berhasil dihapus." };
  } catch (error: any) {
    console.error("deletePenilaianKelasAction error:", error);
    return { error: error.message || "Gagal menghapus penilaian." };
  }
}

export async function getPenilaianDetailAndStudentsAction(penilaianKelasId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Akses ditolak." };

  try {
    const header = await prisma.penilaianKelas.findUnique({
      where: { id: penilaianKelasId },
      include: {
        kelas: true,
        mapel: true,
        guru: true,
        nilaiSiswa: true,
      },
    });

    if (!header) {
      return { error: "Data penilaian tidak ditemukan." };
    }

    // Ambil daftar siswa kelas aktif
    const activeTa = await prisma.tahunAjaran.findFirst({ where: { isActive: true } });
    const studentRecords = await prisma.siswaKelas.findMany({
      where: {
        kelasId: header.kelasId,
        tahunAjaran: activeTa ? { id: activeTa.id } : { isActive: true },
        siswa: { status: "AKTIF" },
      },
      include: {
        siswa: true,
      },
      orderBy: { siswa: { nama: "asc" } },
    });

    const scoreMap = new Map<string, { id: string; nilai: number; catatan: string }>();
    header.nilaiSiswa.forEach((ns) => {
      scoreMap.set(ns.siswaId, {
        id: ns.id,
        nilai: ns.nilai,
        catatan: ns.catatan || "",
      });
    });

    const students = studentRecords.map((sr) => {
      const existing = scoreMap.get(sr.siswa.id);
      return {
        siswaId: sr.siswa.id,
        nis: sr.siswa.nis,
        nisn: sr.siswa.nisn || "-",
        nama: sr.siswa.nama,
        nilai: existing ? existing.nilai : null,
        catatan: existing ? existing.catatan : "",
      };
    });

    return {
      success: true,
      header: {
        id: header.id,
        kelasNama: header.kelas.nama,
        mapelNama: header.mapel.nama,
        guruNama: header.guru.nama,
        namaPenilaian: header.namaPenilaian,
        tanggal: header.tanggal.toISOString().split("T")[0],
        deskripsi: header.deskripsi || "",
      },
      students,
    };
  } catch (error: any) {
    console.error("getPenilaianDetailAndStudentsAction error:", error);
    return { error: error.message || "Gagal mengambil data rincian siswa." };
  }
}

export async function savePenilaianSiswaAction(payload: {
  penilaianKelasId: string;
  scores: Array<{ siswaId: string; nilai: number; catatan?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    return { error: "Akses ditolak." };
  }

  if (!payload.penilaianKelasId || !payload.scores) {
    return { error: "Data nilai tidak valid." };
  }

  try {
    await prisma.$transaction(
      payload.scores.map((sc) =>
        prisma.penilaianSiswa.upsert({
          where: {
            penilaianKelasId_siswaId: {
              penilaianKelasId: payload.penilaianKelasId,
              siswaId: sc.siswaId,
            },
          },
          update: {
            nilai: Number(sc.nilai),
            catatan: sc.catatan?.trim() || null,
          },
          create: {
            penilaianKelasId: payload.penilaianKelasId,
            siswaId: sc.siswaId,
            nilai: Number(sc.nilai),
            catatan: sc.catatan?.trim() || null,
          },
        })
      )
    );

    revalidatePath("/jadwal");
    revalidatePath("/dashboard");

    return { success: true, message: "Nilai siswa berhasil disimpan!" };
  } catch (error: any) {
    console.error("savePenilaianSiswaAction error:", error);
    return { error: error.message || "Gagal menyimpan nilai siswa." };
  }
}
