"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function getAdministrasiGuruDataAction({
  kelasId,
  mapelId,
  semester = "GANJIL",
  tahunAjaranId,
}: {
  kelasId: string;
  mapelId: string;
  semester?: "GANJIL" | "GENAP";
  tahunAjaranId?: string;
}) {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new Error("Pengguna tidak terautentikasi.");
    }

    // 1. Tahun Ajaran Target atau Aktif
    let targetTA;
    if (tahunAjaranId) {
      targetTA = await prisma.tahunAjaran.findUnique({
        where: { id: tahunAjaranId },
      });
    } else {
      targetTA = await prisma.tahunAjaran.findFirst({
        where: { isActive: true },
      });
    }

    if (!targetTA) {
      throw new Error("Tahun Pelajaran tidak ditemukan.");
    }

    // 2. Data Kelas dan Roster Siswa
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      include: {
        walas: true,
        siswaKelas: {
          where: { tahunAjaranId: targetTA.id },
          include: {
            siswa: true,
          },
        },
      },
    });

    if (!kelas) {
      throw new Error("Data Kelas tidak ditemukan.");
    }

    // Urutkan siswa berdasarkan nama
    const students = kelas.siswaKelas
      .map((sk) => sk.siswa)
      .sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: "base" }));

    // 3. Data Mata Pelajaran
    const mapel = await prisma.mataPelajaran.findUnique({
      where: { id: mapelId },
    });

    if (!mapel) {
      throw new Error("Data Mata Pelajaran tidak ditemukan.");
    }

    // Find all mapel IDs matching this subject name (in case of duplicate codes)
    const matchingMapels = await prisma.mataPelajaran.findMany({
      where: { nama: mapel.nama },
    });
    const mapelIds = matchingMapels.map((m) => m.id);

    // 4. Data Guru Pengajar (Cari guru pengampu jurnal/jadwal untuk kelas & mapel ini)
    const primaryJournal = await prisma.jurnalMengajar.findFirst({
      where: { kelasId, mapelId: { in: mapelIds } },
      include: { guru: true },
      orderBy: { tanggal: "desc" },
    });
    const primaryJadwal = await prisma.jadwalPelajaran.findFirst({
      where: { kelasId, mapelId: { in: mapelIds } },
      include: { guru: true },
    });

    const guru = primaryJournal?.guru || primaryJadwal?.guru || (await prisma.user.findUnique({ where: { id: user.id } }));

    if (!guru) {
      throw new Error("Data Guru tidak ditemukan.");
    }

    // 5. App Settings / Pengaturan Sekolah
    const settingsList = await prisma.appSetting.findMany();
    const schoolSettings: Record<string, string> = {};
    settingsList.forEach((s) => {
      schoolSettings[s.key] = s.value;
    });

    // Determine semester date bounds if present
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (semester === "GANJIL") {
      startDate = targetTA.ganjilMulai || undefined;
      endDate = targetTA.ganjilSelesai || undefined;
    } else {
      startDate = targetTA.genapMulai || undefined;
      endDate = targetTA.genapSelesai || undefined;
    }

    // 6. Data Jurnal Mengajar (Agenda Kegiatan Pembelajaran & Kehadiran)
    const journalWhere: any = {
      kelasId,
      mapelId: { in: mapelIds },
    };
    if (startDate && endDate) {
      journalWhere.tanggal = {
        gte: startDate,
        lte: endDate,
      };
    }

    const journals = await prisma.jurnalMengajar.findMany({
      where: journalWhere,
      include: {
        absensi: {
          include: {
            siswa: true,
          },
        },
        penilaian: true,
        guru: true,
      },
      orderBy: [
        { tanggal: "asc" },
        { jamMulai: "asc" },
      ],
    });

    // 7. Data Penilaian Formatif & Sumatif
    const penilaianWhere: any = {
      kelasId,
      mapelId: { in: mapelIds },
    };

    const penilaianKelasList = await prisma.penilaianKelas.findMany({
      where: penilaianWhere,
      include: {
        nilaiSiswa: true,
      },
      orderBy: { tanggal: "asc" },
    });

    // Separate into Formatif and Sumatif
    const formatifPenilaian = penilaianKelasList.filter(
      (p) => p.jenisPenilaian === "FORMATIF" || p.jenisPenilaian.toLowerCase().includes("formatif")
    );
    const sumatifPenilaian = penilaianKelasList.filter(
      (p) =>
        p.jenisPenilaian === "SUMATIF" ||
        p.jenisPenilaian.toLowerCase().includes("sumatif") ||
        p.jenisPenilaian === "PAS" ||
        p.jenisPenilaian === "PTS"
    );

    // 8. Data Tujuan Pembelajaran (TP)
    const tpList = await prisma.tujuanPembelajaran.findMany({
      where: {
        mapelId: { in: mapelIds },
        guruId: guru.id,
        semester: semester === "GANJIL" ? 1 : 2,
      },
      orderBy: { kodeTp: "asc" },
    });

    // 9. Process Attendance Matrix
    // Build array of meetings and map student attendance per meeting
    const attendanceMatrix = students.map((siswa) => {
      const recordsByJournal: Record<string, string> = {};
      let countS = 0;
      let countI = 0;
      let countA = 0;
      let countH = 0;

      journals.forEach((journal) => {
        const absRecord = journal.absensi.find((a) => a.siswaId === siswa.id);
        const st = absRecord ? absRecord.status : "H"; // Default Hadir if no explicit absent record
        recordsByJournal[journal.id] = st;
        if (st === "S") countS++;
        else if (st === "I") countI++;
        else if (st === "A") countA++;
        else countH++;
      });

      return {
        siswaId: siswa.id,
        nis: siswa.nis,
        nisn: siswa.nisn || "-",
        nama: siswa.nama,
        records: recordsByJournal,
        countS,
        countI,
        countA,
        countH,
      };
    });

    // 10. Process Formative Grades Matrix
    const formativeMatrix = students.map((siswa) => {
      const grades: Record<string, number | null> = {};
      let total = 0;
      let count = 0;

      formatifPenilaian.forEach((p) => {
        const ns = p.nilaiSiswa.find((n) => n.siswaId === siswa.id);
        const val = ns ? ns.nilai : null;
        grades[p.id] = val;
        if (val !== null && !isNaN(val)) {
          total += val;
          count++;
        }
      });

      const average = count > 0 ? Math.round((total / count) * 100) / 100 : null;

      return {
        siswaId: siswa.id,
        nis: siswa.nis,
        nisn: siswa.nisn || "-",
        nama: siswa.nama,
        grades,
        average,
      };
    });

    // 11. Process Summative Grades Matrix
    const summativeMatrix = students.map((siswa) => {
      const grades: Record<string, number | null> = {};
      let total = 0;
      let count = 0;

      sumatifPenilaian.forEach((p) => {
        const ns = p.nilaiSiswa.find((n) => n.siswaId === siswa.id);
        const val = ns ? ns.nilai : null;
        grades[p.id] = val;
        if (val !== null && !isNaN(val)) {
          total += val;
          count++;
        }
      });

      const average = count > 0 ? Math.round((total / count) * 100) / 100 : null;

      return {
        siswaId: siswa.id,
        nis: siswa.nis,
        nisn: siswa.nisn || "-",
        nama: siswa.nama,
        grades,
        average,
      };
    });

    // 12. Process Final Report Summary
    const reportSummary = students.map((siswa) => {
      const formObj = formativeMatrix.find((f) => f.siswaId === siswa.id);
      const sumObj = summativeMatrix.find((s) => s.siswaId === siswa.id);

      const naFormatif = formObj?.average ?? null;
      const naSumatif = sumObj?.average ?? null;

      let finalGrade: number | null = null;
      if (naFormatif !== null && naSumatif !== null) {
        finalGrade = Math.round(((naFormatif + naSumatif) / 2) * 100) / 100;
      } else if (naFormatif !== null) {
        finalGrade = naFormatif;
      } else if (naSumatif !== null) {
        finalGrade = naSumatif;
      }

      let description = "Menunjukkan penguasaan materi yang baik.";
      if (finalGrade !== null) {
        if (finalGrade >= 90) {
          description = "Menunjukkan penguasaan kompetensi yang sangat memuaskan dan istimewa.";
        } else if (finalGrade >= 80) {
          description = "Menunjukkan penguasaan kompetensi yang baik dalam seluruh tujuan pembelajaran.";
        } else if (finalGrade >= 70) {
          description = "Menunjukkan penguasaan kompetensi yang cukup dan sesuai standar kriteria minimum.";
        } else {
          description = "Perlu pendampingan lebih lanjut untuk meningkatkan penguasaan materi pembelajaran.";
        }
      }

      return {
        siswaId: siswa.id,
        nis: siswa.nis,
        nisn: siswa.nisn || "-",
        nama: siswa.nama,
        naFormatif,
        naSumatif,
        finalGrade,
        description,
      };
    });

    return {
      success: true,
      data: {
        kelas: {
          id: kelas.id,
          nama: kelas.nama,
          walasNama: kelas.walas?.nama || "-",
          walasNip: kelas.walas?.nip || "-",
        },
        mapel: {
          id: mapel.id,
          kode: mapel.kode,
          nama: mapel.nama,
        },
        guru: {
          id: guru.id,
          nama: guru.nama,
          nip: guru.nip || "-",
          ttd: guru.ttd || null,
        },
        tahunAjaran: {
          id: targetTA.id,
          nama: targetTA.nama,
          semester,
        },
        schoolSettings,
        journals: journals.map((j) => ({
          id: j.id,
          tanggal: j.tanggal.toISOString(),
          namaJurnal: j.namaJurnal,
          kegiatan: j.kegiatan,
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
          rencanaAksi: j.rencanaAksi,
          absensi: j.absensi.map((a) => ({
            siswaId: a.siswaId,
            status: a.status,
          })),
        })),
        students,
        formatifPenilaian: formatifPenilaian.map((p) => ({
          id: p.id,
          namaPenilaian: p.namaPenilaian,
          tpCode: p.tpCode || "-",
          tanggal: p.tanggal.toISOString(),
        })),
        sumatifPenilaian: sumatifPenilaian.map((p) => ({
          id: p.id,
          namaPenilaian: p.namaPenilaian,
          tpCode: p.tpCode || "-",
          tanggal: p.tanggal.toISOString(),
        })),
        tujuanPembelajaran: tpList,
        attendanceMatrix,
        formativeMatrix,
        summativeMatrix,
        reportSummary,
      },
    };
  } catch (error: any) {
    console.error("Get Administrasi Guru error:", error);
    return { error: error.message || "Gagal mengambil data administrasi guru." };
  }
}
