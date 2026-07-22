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

  // Proteksi server-side: Hanya Guru BK yang bisa mencatat absensi
  if (!user || user.role !== "BK") {
    return { error: "Akses ditolak. Hanya Guru BK yang dapat menginput absensi harian." };
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

    if (targetClass.bkId !== user.id) {
      return { error: "Akses ditolak. Anda tidak ditugaskan sebagai Guru BK untuk kelas ini." };
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

Berikut ini daftar hadir murid kelas *${kelasInfo.nama}* pada hari *${formattedDate}*:
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
_SMAN 6 Tangerang powered by Kawal_`;
      } else {
        waMessage += `
✅ *Hadir Semua*

Terima kasih atas kerja samanya.
_SMAN 6 Tangerang powered by Kawal_`;
      }

      // Kirim via Helper WhatsApp (akan mencetak log mock jika API Key default)
      const waSent = await sendWhatsAppNotification(walas.whatsappNumber!, waMessage);
      
      revalidatePath("/dashboard");
      revalidatePath("/absensi");

      if (waSent) {
        return { success: true, message: `Absensi berhasil disimpan dan notifikasi WhatsApp berhasil dikirim ke Wali Kelas (${walas.nama}).` };
      } else {
        return { success: true, message: "Absensi berhasil disimpan, namun gagal mengirim notifikasi WhatsApp (cek log server)." };
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/absensi");
    return { success: true, message: "Absensi berhasil disimpan. (Wali Kelas belum terdaftar atau tidak memiliki nomor WA)." };
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

    return { success: true, data: records.map(r => ({ studentId: r.siswaId, status: r.status })) };
  } catch (error) {
    console.error("Get attendance error:", error);
    return { error: "Gagal memuat data absensi sebelumnya." };
  }
}
