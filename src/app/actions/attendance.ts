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

  const allowedRoles = ["SEKRETARIS", "WAKA", "BK"];
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
        return { error: "Pengurus/Sekretaris Kelas hanya dapat mencatat atau mengubah absensi untuk HARI INI." };
      }
    } else if (user.role === "BK") {
      if (targetClass.bkId && targetClass.bkId !== user.id) {
        // Guru BK diizinkan mengampu atau memperbarui absensi kelas yang relevan
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

      // Ambil nama sekolah dari AppSetting
      const settingsList = await prisma.appSetting.findMany();
      const settingsMap: Record<string, string> = {};
      settingsList.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      const schoolName = settingsMap.school_name || settingsMap.schoolName || "SMKN KAWAL";

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
_${schoolName} powered by Kawal_`;
      } else {
        waMessage += `
✅ *Hadir Semua*

Terima kasih atas kerja samanya.
_${schoolName} powered by Kawal_`;
      }

      // Kirim via Helper WhatsApp di background tanpa membekukan response
      sendWhatsAppNotification(walas.whatsappNumber!, waMessage).catch((err) =>
        console.error("Async WA notification error:", err)
      );

      revalidatePath("/dashboard");
      revalidatePath("/absensi");
      return {
        success: true,
        message: `Absensi berhasil disimpan dan notifikasi WhatsApp sedang dikirim ke Wali Kelas (${walas.nama}).`,
      };
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
    const isLockedForSekretaris = user?.role === "SEKRETARIS" && dateString !== todayStr;

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

  const allowedRoles = ["BK", "WAKA", "WALAS", "GURU", "SEKRETARIS", "PIKET"];
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

/**
 * Mendapatkan data matriks absensi semesteran siswa untuk suatu kelas (Ganjil: Jul-Des, Genap: Jan-Jun)
 */
export async function getSemesterAttendanceMatrixAction(
  classId: string,
  semester: 1 | 2,
  year: number
) {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Silakan login terlebih dahulu." };
  }

  const allowedRoles = ["BK", "WAKA", "WALAS", "GURU", "SEKRETARIS", "PIKET"];
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

    const startMonth = semester === 1 ? 6 : 0;
    const endMonth = semester === 1 ? 11 : 5;

    const startDate = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, endMonth + 1, 0, 23, 59, 59, 999));

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

    const months = semester === 1
      ? [
          { index: 6, label: "Juli" },
          { index: 7, label: "Agustus" },
          { index: 8, label: "September" },
          { index: 9, label: "Oktober" },
          { index: 10, label: "November" },
          { index: 11, label: "Desember" },
        ]
      : [
          { index: 0, label: "Januari" },
          { index: 1, label: "Februari" },
          { index: 2, label: "Maret" },
          { index: 3, label: "April" },
          { index: 4, label: "Mei" },
          { index: 5, label: "Juni" },
        ];

    // Structure: matrix[studentId][monthIndex] = { H, S, I, A, D }
    const matrix: Record<string, Record<number, { H: number; S: number; I: number; A: number; D: number }>> = {};

    absensiList.forEach((item) => {
      const dObj = new Date(item.tanggal);
      const mIdx = dObj.getUTCMonth();
      if (!matrix[item.siswaId]) {
        matrix[item.siswaId] = {};
      }
      if (!matrix[item.siswaId][mIdx]) {
        matrix[item.siswaId][mIdx] = { H: 0, S: 0, I: 0, A: 0, D: 0 };
      }
      const st = item.status as "H" | "S" | "I" | "A" | "D";
      if (st && matrix[item.siswaId][mIdx][st] !== undefined) {
        matrix[item.siswaId][mIdx][st]++;
      }
    });

    return {
      success: true,
      data: {
        className: targetClass.nama,
        students,
        semester,
        year,
        months,
        matrix,
      },
    };
  } catch (error: any) {
    console.error("Get semester attendance matrix error:", error);
    return { error: "Gagal memuat matriks absensi semester." };
  }
}

/**
 * Mengirimkan rekapitulasi harian absensi seluruh kelas ke Grup WA Sekolah (120363411290554371@g.us).
 * Hanya dapat dipanggil oleh WAKA / BK.
 */
export async function sendDailyAttendanceToWAGroupAction() {
  const user = await getSessionUser();

  if (!user || !["WAKA", "BK"].includes(user.role)) {
    return { error: "Akses ditolak. Hanya Waka Kesiswaan atau Guru BK yang dapat mengirim rekap ke Grup WA." };
  }

  try {
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const targetDate = new Date(`${todayStr}T00:00:00.000Z`);

    const dateFormattedStr = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });

    const settingsList = await prisma.appSetting.findMany();
    const settings: Record<string, string> = {};
    settingsList.forEach((s) => {
      settings[s.key] = s.value;
    });

    const schoolName = settings.school_name || settings.schoolName || "SMK KAWAL";

    // 1. Ambil semua kelas aktif
    const dbClasses = await prisma.kelas.findMany({
      where: { tahunAjaran: { isActive: true } },
      include: {
        siswaKelas: {
          where: { siswa: { status: "AKTIF" } },
          include: { siswa: true },
        },
      },
    });

    // Ranking urutan kelas: X -> XI -> XII
    const getGradeRank = (className: string) => {
      const upper = className.toUpperCase().trim();
      if (upper.startsWith("XII") || upper.startsWith("12")) return 3;
      if (upper.startsWith("XI") || upper.startsWith("11")) return 2;
      if (upper.startsWith("X") || upper.startsWith("10")) return 1;
      return 4;
    };

    dbClasses.sort((a, b) => {
      const rankA = getGradeRank(a.nama);
      const rankB = getGradeRank(b.nama);
      if (rankA !== rankB) return rankA - rankB;
      return a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: "base" });
    });

    // 2. Ambil seluruh absensi hari ini
    const todayAbsensi = await prisma.absensi.findMany({
      where: {
        tanggal: targetDate,
        siswa: {
          riwayatKelas: {
            some: { tahunAjaran: { isActive: true } },
          },
        },
      },
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
    });

    const absensiMap: Record<string, { status: string }> = {};
    todayAbsensi.forEach((a) => {
      absensiMap[a.siswaId] = { status: a.status };
    });

    let totalSiswaSemua = 0;
    let totalS = 0;
    let totalI = 0;
    let totalA = 0;
    let totalD = 0;

    const statusLabel: Record<string, string> = {
      S: "Sakit",
      I: "Izin",
      A: "Alpha",
      D: "Dispensasi",
    };

    const classDetailsText: string[] = [];

    dbClasses.forEach((kelasItem) => {
      const activeStudents = kelasItem.siswaKelas.map((sk) => sk.siswa);
      totalSiswaSemua += activeStudents.length;

      const notPresentList: Array<{ nama: string; status: string }> = [];

      activeStudents.forEach((st) => {
        const record = absensiMap[st.id];
        if (record && ["S", "I", "A", "D"].includes(record.status)) {
          notPresentList.push({ nama: st.nama, status: record.status });
          if (record.status === "S") totalS++;
          if (record.status === "I") totalI++;
          if (record.status === "A") totalA++;
          if (record.status === "D") totalD++;
        }
      });

      if (notPresentList.length === 0) {
        classDetailsText.push(`*Kelas ${kelasItem.nama}*: ✅ Nihil (Hadir Semua)`);
      } else {
        const studentLines = notPresentList
          .map((st) => `  • ${st.nama} - (${statusLabel[st.status] || st.status})`)
          .join("\n");
        classDetailsText.push(`*Kelas ${kelasItem.nama}* (${notPresentList.length} Siswa Tidak Hadir):\n${studentLines}`);
      }
    });

    const totalTidakHadir = totalS + totalI + totalA + totalD;
    const totalHadir = totalSiswaSemua - totalTidakHadir;
    const percentage = totalSiswaSemua > 0 ? ((totalHadir / totalSiswaSemua) * 100).toFixed(1) : "100";

    const waGroupTarget = "120363411290554371@g.us";

    const messageText =
      `📊 *REKAPITULASI ABSENSI HARIAN SEKOLAH*\n` +
      `🏫 *${schoolName}*\n` +
      `📅 *${dateFormattedStr}*\n\n` +
      `📈 *RINGKASAN KEHADIRAN SEKOLAH:*\n` +
      `• Total Siswa : ${totalSiswaSemua} Siswa\n` +
      `• Hadir (H) : ${totalHadir} Siswa\n` +
      `• Sakit (S) : ${totalS} Siswa\n` +
      `• Izin (I) : ${totalI} Siswa\n` +
      `• Alpha (A) : ${totalA} Siswa\n` +
      `• Dispensasi (D) : ${totalD} Siswa\n` +
      `• *Persentase Kehadiran*: *${percentage}%*\n\n` +
      `📋 *RINCIAN KETIDAKHADIRAN PER KELAS (Urut X, XI, XII):*\n` +
      `-----------------------------------------\n\n` +
      classDetailsText.join("\n\n") +
      `\n\n_Pesan ini dikirim otomatis oleh Sistem KAWAL._`;

    const success = await sendWhatsAppNotification(waGroupTarget, messageText);

    if (!success) {
      return { error: "Gagal mengirimkan pesan ke Grup WhatsApp Sekolah. Pastikan WA Gateway aktif." };
    }

    return {
      success: true,
      message: `Berhasil mengirimkan rekap absensi hari ini ke Grup WA Sekolah (120363411290554371@g.us).`,
    };
  } catch (error: any) {
    console.error("Send daily attendance to WA group error:", error);
    return { error: error.message || "Gagal mengirim rekap absensi ke grup WA." };
  }
}
