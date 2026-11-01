import { prisma } from "@/lib/prisma";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { formatPoin } from "@/lib/attendanceUtils";

interface ViolationNotificationReport {
  id: string;
  siswaId: string;
  detailPelanggaranId: string;
  notes?: string | null;
  tanggal: Date;
  pelapor: {
    nama: string;
    role: string;
  };
  approver?: {
    nama: string;
    role: string;
  } | null;
  detailPelanggaran: {
    nama: string;
    poin: number;
    kategori: {
      nama: string;
    };
  };
  siswa: {
    id: string;
    nama: string;
    nis: string;
    riwayatKelas: Array<{
      kelas: {
        id: string;
        nama: string;
        walasId: string | null;
        walas?: {
          id: string;
          nama: string;
          whatsappNumber: string | null;
        } | null;
      };
    }>;
  };
}

/**
 * Mengirim notifikasi WhatsApp ke Wali Kelas untuk laporan pelanggaran yang telah disahkan (APPROVED).
 * Mendeteksi kelas siswa saat ini, menghitung total akumulasi poin pelanggaran siswa (setelah remisi),
 * dan mengirim pesan dengan format terstandar mirip pesan kehadiran kelas.
 */
export async function notifyWalasForViolations(reportIds: string[]): Promise<boolean> {
  if (!reportIds || reportIds.length === 0) return false;

  try {
    // 1. Ambil data laporan pelanggaran yang berstatus APPROVED
    const reports = await prisma.laporanPelanggaran.findMany({
      where: {
        id: { in: reportIds },
        status: "APPROVED",
      },
      include: {
        detailPelanggaran: {
          include: {
            kategori: true,
          },
        },
        pelapor: {
          select: {
            nama: true,
            role: true,
          },
        },
        approver: {
          select: {
            nama: true,
            role: true,
          },
        },
        siswa: {
          include: {
            riwayatKelas: {
              where: {
                tahunAjaran: { isActive: true },
              },
              include: {
                kelas: {
                  include: {
                    walas: {
                      select: {
                        id: true,
                        nama: true,
                        whatsappNumber: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (reports.length === 0) return false;

    // 2. Ambil nama sekolah dari AppSetting
    const settingsList = await prisma.appSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    const schoolName = settingsMap.school_name || settingsMap.schoolName || "SMKN KAWAL";

    // 3. Kumpulkan siswaId unik dan hitung total poin akumulasi untuk setiap siswa
    const uniqueStudentIds = Array.from(new Set(reports.map((r) => r.siswaId)));
    const studentTotalPointsMap = new Map<string, number>();

    await Promise.all(
      uniqueStudentIds.map(async (studentId) => {
        const [violations, remissions] = await Promise.all([
          prisma.laporanPelanggaran.findMany({
            where: {
              siswaId: studentId,
              status: "APPROVED",
            },
            include: {
              detailPelanggaran: true,
            },
          }),
          prisma.transaksiRemisi.findMany({
            where: {
              siswaId: studentId,
            },
            select: {
              poinDikurangi: true,
            },
          }),
        ]);

        const totalViolations = violations.reduce(
          (sum, v) => sum + (v.detailPelanggaran?.poin || 0),
          0
        );
        const totalRemissions = remissions.reduce(
          (sum, r) => sum + (r.poinDikurangi || 0),
          0
        );
        const totalPoin = Math.max(
          0,
          Math.round((totalViolations - totalRemissions) * 100) / 100
        );
        studentTotalPointsMap.set(studentId, totalPoin);
      })
    );

    // 4. Kelompokkan laporan berdasarkan Wali Kelas (walasId / walas.whatsappNumber)
    interface WalasGroup {
      walas: {
        id: string;
        nama: string;
        whatsappNumber: string;
      };
      kelasNama: string;
      reports: Array<{
        siswaNama: string;
        siswaNis: string;
        violationName: string;
        kategoriNama: string;
        poin: number;
        totalPoin: number;
        notes?: string | null;
        tanggal: Date;
        pelaporText: string;
      }>;
    }

    const walasGroupMap = new Map<string, WalasGroup>();

    for (const report of reports) {
      // Dapatkan kelas aktif siswa, atau fallback ke riwayat kelas manapun
      let kelas:
        | {
            id: string;
            nama: string;
            walas?: {
              id: string;
              nama: string;
              whatsappNumber: string | null;
            } | null;
          }
        | null
        | undefined = report.siswa.riwayatKelas[0]?.kelas;
      if (!kelas) {
        const fallback = await prisma.siswaKelas.findFirst({
          where: { siswaId: report.siswa.id },
          orderBy: { createdAt: "desc" },
          include: {
            kelas: {
              include: {
                walas: {
                  select: {
                    id: true,
                    nama: true,
                    whatsappNumber: true,
                  },
                },
              },
            },
          },
        });
        kelas = fallback?.kelas;
      }

      if (!kelas || !kelas.walas || !kelas.walas.whatsappNumber) {
        // Wali Kelas belum diatur atau nomor WhatsApp belum diisi
        continue;
      }

      const walas = {
        id: kelas.walas.id,
        nama: kelas.walas.nama,
        whatsappNumber: kelas.walas.whatsappNumber,
      };

      const pelaporText =
        report.pelapor.role === "BK"
          ? `${report.pelapor.nama} - Guru BK`
          : report.approver
          ? `${report.pelapor.nama} (${report.pelapor.role}) • Disahkan oleh BK: ${report.approver.nama}`
          : `${report.pelapor.nama} - ${report.pelapor.role}`;

      const totalPoin = studentTotalPointsMap.get(report.siswa.id) ?? report.detailPelanggaran.poin;

      const groupKey = `${walas.id}_${kelas.id}`;
      if (!walasGroupMap.has(groupKey)) {
        walasGroupMap.set(groupKey, {
          walas,
          kelasNama: kelas.nama,
          reports: [],
        });
      }

      walasGroupMap.get(groupKey)!.reports.push({
        siswaNama: report.siswa.nama,
        siswaNis: report.siswa.nis,
        violationName: report.detailPelanggaran.nama,
        kategoriNama: report.detailPelanggaran.kategori.nama,
        poin: report.detailPelanggaran.poin,
        totalPoin,
        notes: report.notes,
        tanggal: report.tanggal,
        pelaporText,
      });
    }

    // 5. Susun dan kirim pesan WhatsApp ke masing-masing Wali Kelas
    for (const [, group] of walasGroupMap) {
      const { walas, kelasNama, reports: groupReports } = group;
      if (groupReports.length === 0) continue;

      const firstReport = groupReports[0];
      const formattedDate = new Date(firstReport.tanggal).toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Jakarta",
      });

      let waMessage = `Yth. Wali Kelas *${kelasNama}* (${walas.nama})

Berikut ini pemberitahuan catatan pelanggaran siswa kelas *${kelasNama}* pada hari *${formattedDate}* (Dicatat oleh: ${firstReport.pelaporText}):
`;

      if (groupReports.length === 1) {
        const item = groupReports[0];
        waMessage += `
⚠️ *Laporan Pelanggaran Siswa*
• *Nama Siswa*: ${item.siswaNama}
• *NIS*: ${item.siswaNis || "-"}
• *Kelas*: ${kelasNama}
• *Jenis Pelanggaran*: ${item.violationName} (${item.kategoriNama})
• *Poin Pelanggaran*: +${formatPoin(item.poin)} Poin
• *Total Akumulasi Poin Siswa*: ${formatPoin(item.totalPoin)} Poin
${item.notes ? `• *Keterangan / Catatan*: ${item.notes}\n` : ""}
Mohon perhatian dan kerja samanya untuk memberikan pembinaan serta tindak lanjut kepada siswa yang bersangkutan. Terima kasih.
_${schoolName} powered by Kawal_`;
      } else {
        const detailSiswaText = groupReports
          .map((item, idx) => {
            return `${idx + 1}. *${item.siswaNama}* (NIS: ${item.siswaNis || "-"})
   • Pelanggaran: ${item.violationName} (${item.kategoriNama})
   • Poin: +${formatPoin(item.poin)} Poin
   • Total Akumulasi Poin: ${formatPoin(item.totalPoin)} Poin${item.notes ? `\n   • Keterangan: ${item.notes}` : ""}`;
          })
          .join("\n\n");

        waMessage += `
⚠️ *Laporan Pelanggaran Siswa (${groupReports.length} Siswa)*
${detailSiswaText}

Mohon perhatian dan kerja samanya untuk memberikan pembinaan serta tindak lanjut kepada siswa yang bersangkutan. Terima kasih.
_${schoolName} powered by Kawal_`;
      }

      // Kirim via Helper WhatsApp di background tanpa membekukan request
      sendWhatsAppNotification(walas.whatsappNumber, waMessage).catch((err) =>
        console.error(`[WA ERROR] Gagal mengirim notifikasi pelanggaran ke Walas ${walas.nama}:`, err)
      );
    }

    return true;
  } catch (error) {
    console.error("notifyWalasForViolations error:", error);
    return false;
  }
}
