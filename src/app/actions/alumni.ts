"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Memverifikasi alumni berdasarkan NISN (atau NIS) dan Tanggal Lahir.
 */
export async function verifyAlumniAction(payload: {
  identifier: string; // NISN atau NIS
  tanggalLahir?: string; // YYYY-MM-DD
}) {
  try {
    const { identifier, tanggalLahir } = payload;
    const cleanId = identifier.trim();

    if (!cleanId) {
      return { error: "Silakan masukkan NISN atau NIS Anda." };
    }

    // Cari siswa berdasarkan NISN atau NIS
    const siswa = await prisma.siswa.findFirst({
      where: {
        OR: [{ nisn: cleanId }, { nis: cleanId }],
      },
      include: {
        riwayatKelas: {
          include: {
            kelas: true,
            tahunAjaran: true,
          },
          orderBy: { tahunAjaran: { nama: "desc" } },
        },
        tracerStudy: true,
      },
    });

    if (!siswa) {
      return {
        error:
          "Data siswa tidak ditemukan. Mohon pastikan NISN / NIS yang Anda masukkan sudah benar.",
      };
    }

    // Verifikasi Tanggal Lahir jika diisi & siswa memiliki record tanggalLahir
    if (tanggalLahir && siswa.tanggalLahir) {
      const inputDate = new Date(tanggalLahir).toISOString().split("T")[0];
      const dbDate = new Date(siswa.tanggalLahir).toISOString().split("T")[0];
      if (inputDate !== dbDate) {
        return {
          error:
            "Tanggal lahir tidak cocok dengan data sekolah. Silakan periksa kembali.",
        };
      }
    }

    const lastClass = siswa.riwayatKelas[0]?.kelas.nama || "Alumni";

    return {
      success: true,
      siswa: {
        id: siswa.id,
        nis: siswa.nis,
        nisn: siswa.nisn || siswa.nis,
        nama: siswa.nama,
        status: siswa.status,
        kelasTerakhir: lastClass,
        tanggalLahir: siswa.tanggalLahir
          ? new Date(siswa.tanggalLahir).toISOString().split("T")[0]
          : null,
      },
      existingTracer: siswa.tracerStudy ? siswa.tracerStudy : null,
    };
  } catch (error: any) {
    console.error("Verify alumni error:", error);
    return { error: "Terjadi kesalahan server saat memverifikasi data alumni." };
  }
}

/**
 * Menyimpan / memperbarui pengisian survei Tracer Study alumni.
 */
export async function submitTracerStudyAction(payload: {
  siswaId: string;
  statusUtama: string;

  // 1. BEKERJA
  namaPerusahaan?: string;
  posisiJabatan?: string;
  bidangPekerjaan?: string;
  waktuTungguKerja?: string;
  kisaranPendapatan?: string;

  // 2. KULIAH / KEDINASAN
  namaPerguruanTinggi?: string;
  jenjangPendidikan?: string;
  fakultasProdi?: string;
  jalurMasuk?: string;
  statusPembiayaan?: string;

  // 3. BERWIRAUSAHA
  namaUsaha?: string;
  bidangUsaha?: string;
  statusKepemilikan?: string;
  jumlahKaryawan?: string;

  // 4. PELATIHAN / KURSUS / BLK
  namaLembaga?: string;
  bidangKeahlian?: string;
  durasiProgram?: string;
  rencanaPasca?: string;

  // 5. SEDANG MENCARI PEKERJAAN
  lamaMencariKerja?: string;
  saluranPencarian?: string;
  kendalaUtama?: string;
  bantuanSekolah?: string;

  // 6. MENGURUS KELUARGA / ALASAN PRIBADI
  alasanUtamaKeluarga?: string;
  rencanaMasaDepan?: string;

  // 7. GAP YEAR / PERSIAPAN SELEKSI
  targetSeleksi?: string;
  aktivitasPengisi?: string;

  // EVALUASI SEKOLAH & UMPAN BALIK
  relevansiKurikulum?: string;
  penilaianFasilitas?: string;
  penilaianBKK?: string;
  saranSekolah?: string;
}) {
  try {
    const { siswaId, statusUtama, ...dataFields } = payload;

    if (!siswaId || !statusUtama) {
      return { error: "Siswa ID dan Status Utama wajib diisi." };
    }

    const siswa = await prisma.siswa.findUnique({
      where: { id: siswaId },
    });

    if (!siswa) {
      return { error: "Siswa tidak ditemukan." };
    }

    // Simpan atau update record Tracer Study
    const tracer = await prisma.tracerStudy.upsert({
      where: { siswaId },
      create: {
        siswaId,
        statusUtama,
        ...dataFields,
      },
      update: {
        statusUtama,
        ...dataFields,
      },
    });

    // Update status siswa menjadi LULUS jika belum LULUS
    if (siswa.status !== "LULUS") {
      await prisma.siswa.update({
        where: { id: siswaId },
        data: { status: "LULUS" },
      });
    }

    revalidatePath("/rekap-alumni");
    revalidatePath("/alumni");

    return {
      success: true,
      message: "Terima kasih! Data Tracer Study Anda telah berhasil disimpan.",
      tracer,
    };
  } catch (error: any) {
    console.error("Submit tracer study error:", error);
    return {
      error: `Gagal menyimpan data Tracer Study: ${error.message || error}`,
    };
  }
}

/**
 * Mengambil daftar rekapitulasi data Tracer Study Alumni (akses BK/WAKA/Staf).
 */
export async function getAlumniTracerListAction() {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Sesi Anda telah berakhir. Silakan login kembali." };
  }

  const allowedRoles = ["WAKA", "BK", "WALAS", "GURU"];
  if (!allowedRoles.includes(user.role)) {
    return { error: "Akses ditolak. Anda tidak memiliki wewenang." };
  }

  try {
    const alumniList = await prisma.siswa.findMany({
      where: {
        OR: [{ status: "LULUS" }, { tracerStudy: { isNot: null } }],
      },
      include: {
        riwayatKelas: {
          include: { kelas: true, tahunAjaran: true },
          orderBy: { tahunAjaran: { nama: "desc" } },
        },
        tracerStudy: true,
      },
      orderBy: { nama: "asc" },
    });

    const formatted = alumniList.map((s) => ({
      siswaId: s.id,
      nama: s.nama,
      nis: s.nis,
      nisn: s.nisn || "-",
      statusSiswa: s.status,
      kelasTerakhir: s.riwayatKelas[0]?.kelas.nama || "-",
      tahunLulus: s.riwayatKelas[0]?.tahunAjaran.nama || "-",
      tracer: s.tracerStudy,
    }));

    return { success: true, data: formatted };
  } catch (error: any) {
    console.error("Get alumni tracer list error:", error);
    return { error: "Gagal mengambil data rekapitulasi alumni." };
  }
}
