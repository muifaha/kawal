"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { formatDateWib } from "@/lib/dateUtils";
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
        jenisPenilaian: (item as any).jenisPenilaian || "FORMATIF",
        materi: (item as any).materi || "",
        tpCode: (item as any).tpCode || "",
        tanggal: formatDateWib(item.tanggal),
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
  jenisPenilaian?: string;
  materi?: string;
  tpCode?: string;
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
        jenisPenilaian: payload.jenisPenilaian || "FORMATIF",
        materi: payload.materi?.trim() || null,
        tpCode: payload.tpCode?.trim() || null,
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
        jenisPenilaian: (header as any).jenisPenilaian || "FORMATIF",
        materi: (header as any).materi || "",
        tpCode: (header as any).tpCode || "",
        tanggal: formatDateWib(header.tanggal),
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

export async function getRekapRaporKurikulumMerdekaAction(kelasId: string, mapelId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Akses ditolak." };

  try {
    const activeTa = await prisma.tahunAjaran.findFirst({ where: { isActive: true } });

    // Fetch all active students in class
    const studentRecords = await prisma.siswaKelas.findMany({
      where: {
        kelasId,
        tahunAjaran: activeTa ? { id: activeTa.id } : { isActive: true },
        siswa: { status: "AKTIF" },
      },
      include: { siswa: true },
      orderBy: { siswa: { nama: "asc" } },
    });

    // Fetch all penilaian headers for this class & mapel
    const penilaianList = await prisma.penilaianKelas.findMany({
      where: {
        kelasId,
        mapelId,
        ...(user.role === "WAKA" ? {} : { guruId: user.id }),
      },
      include: {
        nilaiSiswa: true,
      },
      orderBy: { tanggal: "asc" },
    });

    // Collect all unique Materi names for Sumatif
    const sumatifMateriSet = new Set<string>();
    penilaianList.forEach((p) => {
      const jenis = (p as any).jenisPenilaian || "FORMATIF";
      if (jenis === "SUMATIF") {
        const mat = (p as any).materi?.trim() || p.namaPenilaian;
        sumatifMateriSet.add(mat);
      }
    });

    const materiList = Array.from(sumatifMateriSet);

    // Build matrix per student
    const studentRows = studentRecords.map((sr) => {
      const siswaId = sr.siswa.id;

      const formatifScores: Array<{ nama: string; materi: string; nilai: number }> = [];
      const sumatifByMateri = new Map<string, number[]>(); // materi -> array of scores
      let uasScore: number | null = null;

      // Track highest and lowest TP/Materi scores for draft description
      const allTpScores: Array<{ name: string; score: number }> = [];

      penilaianList.forEach((p) => {
        const ns = p.nilaiSiswa.find((n) => n.siswaId === siswaId);
        if (ns && ns.nilai !== null && !isNaN(ns.nilai)) {
          const jenis = (p as any).jenisPenilaian || "FORMATIF";
          const mat = (p as any).materi?.trim() || p.namaPenilaian;

          if (jenis === "FORMATIF") {
            formatifScores.push({ nama: p.namaPenilaian, materi: mat, nilai: ns.nilai });
            allTpScores.push({ name: `${mat} (${p.namaPenilaian})`, score: ns.nilai });
          } else if (jenis === "SUMATIF") {
            const arr = sumatifByMateri.get(mat) || [];
            arr.push(ns.nilai);
            sumatifByMateri.set(mat, arr);
            allTpScores.push({ name: mat, score: ns.nilai });
          } else if (jenis === "PAS_UAS") {
            uasScore = ns.nilai;
            allTpScores.push({ name: "PAS/UAS", score: ns.nilai });
          }
        }
      });

      // 1. Rata-rata Formatif (NA_F)
      const naF = formatifScores.length > 0
        ? Number((formatifScores.reduce((acc, curr) => acc + curr.nilai, 0) / formatifScores.length).toFixed(1))
        : null;

      // 2. Rata-rata Sumatif per Materi (NA_S per Materi)
      const sumatifMateriScores: Record<string, number | null> = {};
      const validSumatifValues: number[] = [];

      materiList.forEach((mat) => {
        const scores = sumatifByMateri.get(mat) || [];
        if (scores.length > 0) {
          const avgMat = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
          sumatifMateriScores[mat] = avgMat;
          validSumatifValues.push(avgMat);
        } else {
          sumatifMateriScores[mat] = null;
        }
      });

      // Rata-rata Seluruh Sumatif Materi (Rata-rata NA_S)
      const avgSumatifMateri = validSumatifValues.length > 0
        ? Number((validSumatifValues.reduce((a, b) => a + b, 0) / validSumatifValues.length).toFixed(1))
        : null;

      // 3. Nilai Rapor Akhir
      // Formula Kurikulum Merdeka: (Sum(NA_S) + UAS) / (Jumlah Materi + 1)
      let nilaiRapor: number | null = null;
      let nilaiRaporBobot: number | null = null;

      if (validSumatifValues.length > 0) {
        const sumSumatif = validSumatifValues.reduce((a, b) => a + b, 0);
        if (uasScore !== null) {
          nilaiRapor = Number(((sumSumatif + uasScore) / (validSumatifValues.length + 1)).toFixed(1));
          nilaiRaporBobot = Number(((avgSumatifMateri! * 0.6) + (uasScore * 0.4)).toFixed(1));
        } else {
          nilaiRapor = avgSumatifMateri;
          nilaiRaporBobot = avgSumatifMateri;
        }
      } else if (uasScore !== null) {
        nilaiRapor = uasScore;
        nilaiRaporBobot = uasScore;
      }

      // 4. Generate Draft Deskripsi Capaian Kompetensi
      let deskripsiCapaian = "";
      if (allTpScores.length > 0) {
        const sorted = [...allTpScores].sort((a, b) => b.score - a.score);
        const highest = sorted[0];
        const lowest = sorted[sorted.length - 1];

        if (highest.score >= 80 && lowest.score < 75 && highest.name !== lowest.name) {
          deskripsiCapaian = `Menunjukkan penguasaan yang sangat baik dalam ${highest.name}, serta perlu bimbingan lebih lanjut dalam ${lowest.name}.`;
        } else if (highest.score >= 80) {
          deskripsiCapaian = `Menunjukkan penguasaan yang sangat baik dan konsisten dalam ${highest.name}.`;
        } else if (lowest.score < 75) {
          deskripsiCapaian = `Perlu bimbingan dan pemantauan lebih lanjut terutama dalam materi ${lowest.name}.`;
        } else {
          deskripsiCapaian = `Menunjukkan penguasaan materi pembelajaran yang cukup baik secara umum.`;
        }
      } else {
        deskripsiCapaian = "Belum ada data nilai penilaian yang terisi.";
      }

      return {
        siswaId: sr.siswa.id,
        nis: sr.siswa.nis,
        nisn: sr.siswa.nisn || "-",
        nama: sr.siswa.nama,
        naFormatif: naF,
        sumatifMateriScores,
        avgSumatifMateri,
        uasScore,
        nilaiRapor,
        nilaiRaporBobot,
        deskripsiCapaian,
      };
    });

    return {
      success: true,
      materiList,
      students: studentRows,
    };
  } catch (error: any) {
    console.error("getRekapRaporKurikulumMerdekaAction error:", error);
    return { error: error.message || "Gagal mengambil rekapitulasi nilai rapor." };
  }
}

function extractTingkatKelas(nama: string): string {
  if (!nama) return "X";
  const clean = nama.trim().toUpperCase();
  if (clean.startsWith("XII") || clean.startsWith("12")) return "XII";
  if (clean.startsWith("XI") || clean.startsWith("11")) return "XI";
  if (clean.startsWith("X") || clean.startsWith("10")) return "X";
  if (clean.startsWith("IX") || clean.startsWith("9")) return "IX";
  if (clean.startsWith("VIII") || clean.startsWith("8")) return "VIII";
  if (clean.startsWith("VII") || clean.startsWith("7")) return "VII";
  const parts = clean.split(/[\s\-_]+/);
  return parts[0] || "X";
}

export async function getTujuanPembelajaranListAction(kelasId: string, mapelId: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Akses ditolak." };

  try {
    const targetKelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      select: { nama: true },
    });

    const tingkatKelas = targetKelas ? extractTingkatKelas(targetKelas.nama) : "X";
    const activeTa = await prisma.tahunAjaran.findFirst({ where: { isActive: true } });
    const activeSemester = activeTa?.semesterAktif === "GENAP" ? 2 : 1;

    const list = await prisma.tujuanPembelajaran.findMany({
      where: {
        mapelId,
        ...(user.role === "WAKA" ? {} : { guruId: user.id }),
        OR: [
          { tingkatKelas },
          { kelasId },
        ],
      },
      orderBy: [{ semester: "asc" }, { kodeTp: "asc" }],
    });

    return {
      success: true,
      data: list,
      tingkatKelas,
      activeSemester,
    };
  } catch (error: any) {
    console.error("getTujuanPembelajaranListAction error:", error);
    return { error: error.message || "Gagal mengambil daftar TP & Materi." };
  }
}

export async function createTujuanPembelajaranAction(payload: {
  kelasId: string;
  mapelId: string;
  materi: string;
  kodeTp: string;
  deskripsi?: string;
  semester?: number;
  tingkatKelas?: string;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    return { error: "Akses ditolak." };
  }

  if (!payload.kelasId || !payload.mapelId || !payload.materi || !payload.kodeTp) {
    return { error: "Kelas, Mapel, Lingkup Materi, dan Kode TP wajib diisi." };
  }

  try {
    let tingkat = payload.tingkatKelas;
    if (!tingkat) {
      const targetKelas = await prisma.kelas.findUnique({
        where: { id: payload.kelasId },
        select: { nama: true },
      });
      tingkat = targetKelas ? extractTingkatKelas(targetKelas.nama) : "X";
    }

    const activeTa = await prisma.tahunAjaran.findFirst({ where: { isActive: true } });
    const targetSemester = payload.semester || (activeTa?.semesterAktif === "GENAP" ? 2 : 1);
    const targetMateri = payload.materi.trim();

    // Ambil daftar TP yang sudah ada untuk (guru, mapel, tingkat, semester, materi)
    const existingList = await prisma.tujuanPembelajaran.findMany({
      where: {
        mapelId: payload.mapelId,
        tingkatKelas: tingkat,
        semester: targetSemester,
        materi: targetMateri,
        ...(user.role === "WAKA" ? {} : { guruId: user.id }),
      },
      select: { kodeTp: true },
    });

    const numbers = existingList.map((item) => {
      const match = item.kodeTp.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const expectedNextNum = maxNum + 1;

    // Ekstrak angka dari input
    const inputMatch = payload.kodeTp.match(/\d+/);
    const inputNum = inputMatch ? parseInt(inputMatch[0], 10) : NaN;

    if (isNaN(inputNum) || inputNum <= 0) {
      return { error: "Kode TP harus berupa angka (contoh: 1, 2, 3)." };
    }

    if (inputNum > expectedNextNum) {
      return {
        error: `Kode TP harus berurutan untuk materi "${targetMateri}"! TP ${inputNum} tidak dapat dibuat sebelum TP ${expectedNextNum} dibuat.`,
      };
    }

    const formattedKodeTp = `TP ${inputNum}`;

    const isDuplicate = existingList.some((item) => item.kodeTp.trim().toUpperCase() === formattedKodeTp.toUpperCase());
    if (isDuplicate) {
      return { error: `Kode ${formattedKodeTp} sudah ada untuk materi "${targetMateri}". Silakan gunakan Kode TP ${expectedNextNum}.` };
    }

    const newItem = await prisma.tujuanPembelajaran.create({
      data: {
        guruId: user.id,
        kelasId: payload.kelasId,
        mapelId: payload.mapelId,
        tingkatKelas: tingkat,
        materi: payload.materi.trim(),
        kodeTp: formattedKodeTp,
        deskripsi: payload.deskripsi?.trim() || null,
        semester: targetSemester,
      },
    });

    revalidatePath("/jadwal");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `${formattedKodeTp} & Materi berhasil ditambahkan.`,
      data: newItem,
    };
  } catch (error: any) {
    console.error("createTujuanPembelajaranAction error:", error);
    return { error: error.message || "Gagal membuat TP & Materi." };
  }
}

export async function deleteTujuanPembelajaranAction(id: string) {
  const user = await getSessionUser();
  if (!user || (user.role !== "GURU" && user.role !== "WALAS" && user.role !== "WAKA")) {
    return { error: "Akses ditolak." };
  }

  try {
    await prisma.tujuanPembelajaran.delete({ where: { id } });
    revalidatePath("/jadwal");
    revalidatePath("/dashboard");
    return { success: true, message: "TP & Materi berhasil dihapus." };
  } catch (error: any) {
    console.error("deleteTujuanPembelajaranAction error:", error);
    return { error: error.message || "Gagal menghapus TP & Materi." };
  }
}


