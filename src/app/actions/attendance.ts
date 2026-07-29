"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";

interface AttendanceItem {
  studentId: string;
  status: "H" | "S" | "I" | "A" | "D";
}

/**
 * Menyimpan absensi kelas secara bulk dan mengirimkan notifikasi WA ke Wali Kelas.
 */
export async function saveAttendanceAction(
  classId: string,
  dateString: string,
  items: AttendanceItem[]
) {
  const user = await getSessionUser();

  if (!user) {
    return { error: "Silakan login terlebih dahulu." };
  }

  const allowedRoles = ["BK", "WAKA", "WALAS", "GURU", "SEKRETARIS"];
  if (!allowedRoles.includes(user.role)) {
    return { error: "Akses ditolak. Peran Anda tidak memiliki wewenang untuk mencatat absensi." };
  }

  if (!classId || !dateString || items.length === 0) {
    return { error: "Data input tidak lengkap." };
  }

  try {
    const targetClass = await prisma.kelas.findUnique({
      where: { id: classId },
    });

    if (!targetClass) {
      return { error: "Kelas tidak ditemukan." };
    }

    // Pengecekan Otorisasi Berdasarkan Peran
    if (user.role === "SEKRETARIS") {
      if (targetClass.sekretarisId !== user.id) {
        return { error: "Akses ditolak. Anda tidak ditugaskan sebagai Pengurus/Sekretaris untuk kelas ini." };
      }

      // Format tanggal hari ini di WIB (Asia/Jakarta) YYYY-MM-DD
      const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
      if (dateString !== todayStr) {
        return { error: "Pengurus/Sekretaris Kelas hanya dapat mencatat absensi untuk hari ini." };
      }

      // Cek apakah absensi kelas ini pada hari ini sudah pernah disimpan
      const targetDateCheck = new Date(`${dateString}T00:00:00.000Z`);
      const existingCount = await prisma.absensi.count({
        where: {
          tanggal: targetDateCheck,
          siswa: {
            riwayatKelas: {
              some: {
                kelasId: classId,
                tahunAjaran: { isActive: true },
              },
            },
          },
        },
      });

      if (existingCount > 0) {
        return { error: "Absensi hari ini sudah pernah disimpan dan terkunci. Perubahan data hanya dapat dilakukan oleh Guru BK." };
      }
    } else if (user.role === "BK") {
      if (targetClass.bkId && targetClass.bkId !== user.id) {
        // Guru BK diizinkan mengampu atau memperbarui absensi kelas yang relevan
      }
    } else if (user.role === "WALAS") {
      if (targetClass.walasId !== user.id) {
        return { error: "Akses ditolak. Anda hanya dapat mencatat absensi untuk kelas binaan Anda." };
      }
    }

    const targetDate = new Date(`${dateString}T00:00:00.000Z`);

    // 1. Simpan/Upsert absensi untuk seluruh siswa secara transaksional
    await prisma.$transaction(
      items.map((item) =>
        prisma.absensi.upsert({
          where: {
            siswaId_tanggal: {
              siswaId: item.studentId,
              tanggal: targetDate,
            },
          },
          update: {
            status: item.status,
            pencatatId: user.id,
          },
          create: {
            siswaId: item.studentId,
            tanggal: targetDate,
            status: item.status,
            pencatatId: user.id,
          },
        })
      )
    );

    // 2. Ambil informasi Kelas dan Wali Kelas untuk Notifikasi WhatsApp
    const kelasInfo = await prisma.kelas.findUnique({
      where: { id: classId },
      include: {
        walas: true,
        siswaKelas: {
          where: {
            siswaId: { in: items.map((i) => i.studentId) },
            tahunAjaran: { isActive: true },
          },
          include: {
            siswa: true,
          },
        },
      },
    });

    if (kelasInfo && kelasInfo.walas && kelasInfo.walas.whatsappNumber) {
      const walas = kelasInfo.walas;
      const notHadirItems = items.filter((item) => item.status !== "H");

      // Format tanggal Indonesia (timezone-safe Jakarta)
      const formattedDate = targetDate.toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Jakarta",
      });

      let waMessage = `Yth. Wali Kelas *${kelasInfo.nama}*

Berikut ini daftar hadir murid kelas *${kelasInfo.nama}* pada hari *${formattedDate}* (Dicatat oleh: ${user.nama} - ${user.role}):
`;

      if (notHadirItems.length > 0) {
        const detailSiswaText = notHadirItems
          .map((item, index) => {
            const siswa = kelasInfo.siswaKelas.find((s) => s.siswaId === item.studentId)?.siswa;
            const statusMap = { S: "Sakit", I: "Izin", A: "Alpha", D: "Dispensasi" };
            const statusLabel = statusMap[item.status as keyof typeof statusMap] || item.status;
            return `${index + 1}. *${siswa?.nama}* (${statusLabel})`;
          })
          .join("\n");

        waMessage += `
⚠️ *Tidak Hadir: ${notHadirItems.length} Siswa*
${detailSiswaText}

Mohon perhatian dan tindak lanjutnya terhadap kehadiran siswa tersebut. Terima kasih.
_SMKN KAWAL powered by Kawal_`;
      } else {
        waMessage += `
✅ *Hadir Semua*

Terima kasih atas kerja samanya.
_SMKN KAWAL powered by Kawal_`;
      }

      // Kirim via Helper WhatsApp
      const waSent = await sendWhatsAppNotification(walas.whatsappNumber!, waMessage);
      
      revalidatePath("/dashboard");
      revalidatePath("/absensi");

      if (waSent) {
        return { success: true, message: `Absensi berhasil disimpan dan notifikasi WhatsApp dikirim ke Wali Kelas (${walas.nama}).` };
      } else {
        return { success: true, message: "Absensi berhasil disimpan." };
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/absensi");
    return { success: true, message: "Absensi berhasil disimpan." };
  } catch (error) {
    console.error("Save attendance action error:", error);
    return { error: "Terjadi kesalahan sistem saat menyimpan absensi." };
  }
}

/**
 * Mengambil riwayat absensi kelas pada tanggal tertentu untuk di-load ke form.
 */
export async function getAttendanceAction(classId: string, dateString: string) {
  try {
    const user = await getSessionUser();
    const targetDate = new Date(`${dateString}T00:00:00.000Z`);

    const records = await prisma.absensi.findMany({
      where: {
        tanggal: targetDate,
        siswa: {
          riwayatKelas: {
            some: {
              kelasId: classId,
              tahunAjaran: { isActive: true },
            },
          },
        },
      },
    });

    const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
    const isRecorded = records.length > 0;
    const isLockedForSekretaris = user?.role === "SEKRETARIS" && (isRecorded || dateString !== todayStr);

    return {
      success: true,
      data: records.map((r) => ({ studentId: r.siswaId, status: r.status })),
      isRecorded,
      isLockedForSekretaris,
    };
  } catch (error) {
    console.error("Get attendance error:", error);
    return { error: "Gagal memuat data absensi sebelumnya." };
  }
}

/**
 * Mendapatkan data matriks absensi bulanan siswa untuk suatu kelas
 */
export async function getMonthlyAttendanceMatrixAction(
  classId: string,
  month: number, // 0-indexed (0 = Jan, 11 = Dec)
  year: number
) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Silakan login terlebih dahulu." };
  }

  const allowedRoles = ["BK", "WAKA", "WALAS", "GURU", "SEKRETARIS"];
  if (!allowedRoles.includes(user.role)) {
    return { error: "Akses ditolak." };
  }

  try {
    const targetClass = await prisma.kelas.findUnique({
      where: { id: classId },
      include: {
        siswaKelas: {
          where: {
            siswa: { status: "AKTIF" },
          },
          include: {
            siswa: true,
          },
        },
      },
    });

    if (!targetClass) {
      return { error: "Kelas tidak ditemukan." };
    }

    if (user.role === "SEKRETARIS" && targetClass.sekretarisId !== user.id) {
      return { error: "Akses ditolak. Anda tidak memiliki akses ke kelas ini." };
    }

    const students = targetClass.siswaKelas
      .map((sk) => sk.siswa)
      .sort((a, b) => a.nama.localeCompare(b.nama));

    const studentIds = students.map((s) => s.id);

    const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const absensiList = await prisma.absensi.findMany({
      where: {
        siswaId: { in: studentIds },
        tanggal: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        siswaId: true,
        tanggal: true,
        status: true,
      },
    });

    const violations = await prisma.laporanPelanggaran.findMany({
      where: {
        siswaId: { in: studentIds },
        status: "APPROVED",
      },
      select: {
        siswaId: true,
        detailPelanggaran: { select: { poin: true } },
      },
    });

    const studentPoinMap: Record<string, number> = {};
    violations.forEach((v) => {
      studentPoinMap[v.siswaId] = (studentPoinMap[v.siswaId] || 0) + (v.detailPelanggaran?.poin || 0);
    });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const matrix: Record<string, Record<number, string>> = {};

    absensiList.forEach((item) => {
      const dObj = new Date(item.tanggal);
      const dayNum = dObj.getUTCDate();
      if (!matrix[item.siswaId]) {
        matrix[item.siswaId] = {};
      }
      matrix[item.siswaId][dayNum] = item.status;
    });

    return {
      success: true,
      data: {
        className: targetClass.nama,
        students,
        daysInMonth,
        matrix,
        studentPoinMap,
      },
    };
  } catch (error: any) {
    console.error("Get monthly attendance matrix error:", error);
    return { error: "Gagal memuat matriks absensi." };
  }
}
